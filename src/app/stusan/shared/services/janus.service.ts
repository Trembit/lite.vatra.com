import { Injectable } from '@angular/core';
import { Platform } from '@angular/cdk/platform';

// @ts-ignore
import callstats from 'callstats-js/callstats.min';
import { BehaviorSubject, Subject, Observable, Observer } from 'rxjs';
import Janus, { JanusJS } from '../../../../assets/stusan/scripts/janus/janus';
import adapter from 'webrtc-adapter';
import { Md5 } from 'md5-typescript';
import { StateService } from './state.service';
import { environment } from '../../../../environments/environment';
import {
  CreateRoomDto,
  CreateRoomResponse,
  JanusErrorDto,
  JoinRoomDto,
  JoinRoomResponse,
  RoomExistsDto,
  RoomExistsResponse,
  Video,
  Participants,
  JanusInterface,
} from '@models';
import { VideoType } from '@enums';
import { MediaService } from './media.service';
import { MessageData, MicState, MicStates } from '../../models/text-message.dto';
import { SoundService } from './sound.service';
import { CustomizationService } from '../../services/customization.service';

@Injectable({
  providedIn: 'root',
})
export class JanusService {
  public userIds: number[] = [];

  public simulcast = false;
  private reconnectAttempts = 0;

  protected janus: any; // @ref: JanusInterface
  protected videoRoomPlugin: any; // @ref: JanusJS.PluginHandle
  protected videoRoomScreenSharePlugin: any; // @ref: JanusJS.PluginHandle;
  public dc: RTCDataChannel;
  private initPromise: Promise<void>;
  private createSessionPromise: Promise<void>;
  private attachVideoRoomPluginPromise: Promise<void>;
  private localUserId: number;
  public localScreenShareId: number;
  public roomInfoSubject = new Subject<JoinRoomDto>();
  public connection$ = new BehaviorSubject<boolean>(false);

  public micState$ = new BehaviorSubject<MicState>({ userId: 0, enabled: true });
  public micStates: MicStates = {}; // object of states { userId: true|false}
  public firstMessageSent = false;

  public camState$ = new BehaviorSubject<MicState>({ userId: 0, enabled: true });
  public camStates: MicStates = {}; // object of states { userId: true|false}

  public localStream$ = new BehaviorSubject<MediaStream | null>(null);
  private videosArray: Video[] = [];

  get videos(): Video[] {
    return this.videosArray;
  }
  set videos(videos: Video[]) {
    this.videosArray = videos;
    this.videos$.next(videos);
  }
  public videos$ = new BehaviorSubject<Video[]>([]);
  mutes = new BehaviorSubject<{ type: 'audio' | 'video', on: boolean } | null>(null);

  constructor(
    private stateService: StateService,
    private customizationService: CustomizationService,
    private soundService: SoundService,
    private media: MediaService,
    private platform: Platform,
  ) {
    this.localUserId = this.getRandomId();
    this.mutes.subscribe((mute) => {
      if (mute) {
        if (mute.type === 'video') {
          this.stateService.isCamEnabled = mute.on;
        }
        if (mute.type === 'audio') {
          this.stateService.isMicEnabled = mute.on;
        }
      }
    });
  }

  public getLocalUserId() {
    return this.localUserId;
  }

  // TODO: Use 1 peer connection for all users!!!!! https://janus.conf.meetecho.com/mvideoroomtest.html
  private init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = new Promise((resolve, reject) => {
        Janus.init({ dependencies: Janus.useDefaultDependencies({ adapter }), callback: () => { resolve(); }, });
      });
    }

    return this.initPromise;
  }

  private async createSession(): Promise<void> {
    await this.init();

    if (!Janus.isWebrtcSupported()) {
      throw new Error('No WebRTC support');
    }

    if (!this.createSessionPromise) {
      this.createSessionPromise = new Promise((resolve, reject) => {
        this.janus = new Janus(
          {
            server: this.customizationService.config.server,
            success: () => { // The session was successfully created and is ready to be used
              resolve();
            },
            error: (error) => { // The session was NOT successfully created
              console.error('[session] Can\'t create session: ', error, ' sessionId: ', this.janus.getSessionId());
              reject(error);
            },
            destroyed: () => { // The session was destroyed and can't be used any more.
              // TODO: redirect to login page
            },
          });
      });
    }

    return this.createSessionPromise;
  }

  public reconnectSession(): void {
    if (this.reconnectAttempts++ > 5) {
      this.stateService.clearState();
      this.finishCall();
      window.location.reload(); // @dev: this is eq to logout

      return;
    }
    setTimeout(() => {
      if (this.janus?.reconnect) {
        this.janus.reconnect({
          success: () => {
            this.reconnectAttempts = 0;
            console.log('Session successfully reclaimed:', this.janus.getSessionId());
            this.soundService.playJoin();
            this.stateService.playLeaveSound = 0;
          },
          error: (error: any) => {
            console.error('[Session] Failed to reconnect[' + this.reconnectAttempts + '] error: ', error);
            if (error.indexOf('No such session') !== -1) {
              console.log('[Js] recconect with create new session ');
              location.reload();
            }
            this.reconnectSession();
          },
        });
      }
    }, 2000);
  }
  private async attachVideoRoomPlugin(): Promise<void> {
    await this.createSession();

    if (!this.attachVideoRoomPluginPromise) {
      this.attachVideoRoomPluginPromise = new Promise((resolve, reject) => {
        // Video room https://janus.conf.meetecho.com/videoroomtest.js
        this.janus.attach(
          {
            plugin: 'janus.plugin.videoroom',
            success: (pluginHandle: any ) => { // JanusJS.PluginHandle
              this.videoRoomPlugin = pluginHandle;
              resolve();
            },
            error: (error: string) => {
              console.error('Can\'t attach video room plugin to Janus', error);
              reject(error);
            },
            consentDialog: (on: boolean) => {
              // We can show here popup, explaining user what he should allow audio & video in the browser
            },
            iceState: (state: string) => {
              if (state === 'disconnected') {
                this.soundService.playLeave();
                this.stateService.playLeaveSound = -1; // mark for login page to not play Leave sound
                this.reconnectSession();
              }
              console.log('[P] ICE state changed to ' + state);
            },
            mediaState: (medium: 'audio' | 'video', on: boolean) => {
              this.mutes.next({ type: medium, on });
              // console.log('[P] Janus ' + (on ? 'started' : 'stopped') + ' receiving our ' + medium);
            },
            webrtcState: (on: boolean) => {
              this.connection$.next(on);
              if (on) {
                this.createCsFabric();
                this.configureDataChannel();
              }
            },
            ondataopen: (data: string) => {
              // console.log('[P] The DataChannel is available! data: ', data);
            },
            ondata: (data: any) => {
              // console.log('[P] data: ', data);
            },
            onmessage: (msg: any, jsep: any) => { // TODO: anys
              const event = msg.videoroom;
              // console.log('[P] msg:  ', msg);
              if (event) {
                if (event === 'joined') {
                  if (msg.id) {
                    const existedUserId = this.userIds.find((userId) => userId !== msg.id);
                    if (!existedUserId) {
                      this.userIds.push(msg.id);
                    }
                  }

                  this.roomInfoSubject.next(msg);
                  // Publisher/manager created, negotiate WebRTC and attach to existing feeds, if any

                  // User might change setting on login screen, use them
                  const settings: any = {}; // TODO: any
                  if (this.stateService.audioDeviceId$.value) {

                    settings.audioDeviceId = this.stateService.audioDeviceId$.value;
                  }
                  if (this.stateService.videoDeviceId$.value) {
                    settings.videoDeviceId = this.stateService.videoDeviceId$.value;
                  }
                  this.createOffer(settings);
                  this.soundService.playJoin(); // You Entered the room

                  // Any new feed to attach to
                  const publishers = msg.publishers;
                  if (publishers) {
                    // console.log('!!! new publishers 1 !!!', publishers);
                    this.addPublishers(publishers);
                  }
                } else if (event === 'destroyed') {
                  // The room has been destroyed
                } else if (event === 'event') {
                  // Any new feed to attach to?
                  const publishers = msg.publishers;
                  if (publishers) {
                    // @todo: try to avoid setTimeout usage
                    setTimeout(() => {
                      this.sendDCMessage(); // message to DC about mic state as we have new users
                      this.sendDCVideoMessage(publishers[0].id);
                    }, 1000);
                    // console.log('!!! new publishers 2 !!!', publishers);
                    this.soundService.playJoin();
                    this.addPublishers(publishers);
                  } else if (msg.leaving || msg.unpublished) {
                    // One of the publishers has gone away
                    if (msg.unpublished && msg.unpublished === 'ok') {
                      // That's us
                      this.videoRoomPlugin.hangup();
                      return;
                    }

                    const leftParticipantId = msg.leaving || msg.unpublished;
                    const leftParticipant = this.videos.find((video: Video) => video.id === leftParticipantId);
                    if (leftParticipant) {
                      leftParticipant.pluginHandle.detach(null);

                      this.videos = this.videos.filter((video: Video) => video.id !== leftParticipantId);
                      this.soundService.playLeave(); // Somebody leaves
                    }
                    if (msg.leaving) {
                      this.userIds = this.userIds.filter((id) => id !== msg.leaving);
                    }
                  } else if (msg.error) {
                    const errorCodesMap: { [key: number]: string; } = {};
                    errorCodesMap[426] = 'This is a no such room';
                    const errorHumanDescription = errorCodesMap[msg.error_code] || 'Janus error';
                    const errorMessage = `Error code:${msg.error_code}. ${errorHumanDescription}. ${msg.error}`;
                    if (434 === msg.error_code || 425 === msg.error_code) {
                      // console.info(`[info]  ${msg.error}`);
                    } else {
                      console.error('[event] Error', errorMessage);
                      // alert(errorMessage);
                    }
                  }
                }
              }

              if (jsep) { // Without this video will be lost in 10 seconds
                this.videoRoomPlugin.handleRemoteJsep({ jsep });
                // Check if any of the media we wanted to publish has been rejected (e.g., wrong or unsupported codec)
              }
            },
            onlocaltrack: (mediaStreamTrack: MediaStreamTrack) => {

              let videoStream = this.localStream$.value; // : MediaStream
              if (!videoStream) {
                videoStream = new MediaStream();
              }
              videoStream.addTrack(mediaStreamTrack);
              this.localStream$.next(videoStream);
              this.videos = this.videos.filter((video: Video) => video.remote !== false || video.type === 'screen');
              this.videos = [...this.videos, {
                stream: videoStream,
                pluginHandle: this.videoRoomPlugin,
                id: this.localUserId,
                name: this.stateService.userName,
                remote: false,
                type: VideoType.Video,
              }];

            },
            onlocalstream: (stream: MediaStream) => {
              // We have a local stream to display
              this.localStream$.next(stream);

              // If we will change audio or video settings, new local stream will be added,
              // so each time remove previous local streams
              this.videos = this.videos.filter((video: Video) => video.remote !== false || video.type === 'screen');
              this.videos = [...this.videos, {
                stream,
                pluginHandle: this.videoRoomPlugin,
                id: this.localUserId,
                name: this.stateService.userName,
                remote: false,
                type: VideoType.Video,
              }];

            },
            onremotestream: (stream: MediaStream) => { },
            oncleanup: () => {
              // PeerConnection with the plugin closed, clean the UI. The plugin handle is still valid so we can create a new one
              this.localStream$.next(null);
            },
            detached: () => {
              // console.log('Connection with the plugin closed, get rid of its features. The plugin handle is not valid anymore');
            },
          });
      });
    }

    return this.attachVideoRoomPluginPromise;
  }

  // Send local state of mic in DataChannel
  sendDCMessage() {
    const micEnabled = this.stateService.audioEnabled;
    this.micStates[this.localUserId] = !!micEnabled;

    const message = { feed: this.localUserId, type: 'audio', enabled: micEnabled };
    if (this.dc && this.dc.readyState === 'open') {
      this.dc.send(JSON.stringify(message));
      // console.log('[dc] SEND message:  ', message);
    } else {
      console.error('[DC] can\'t sendDCMessage current state: ', this.dc?.readyState);
    }

    this.micState$.next({ userId: this.localUserId, enabled: !!micEnabled}); // Warn Brother (local Video)
  }

  sendDCVideoMessage(videoId = 0) {
    let messageVideoId = this.localUserId;
    let videoEnabled = this.stateService.videoEnabled;

    if (videoId && videoId === this.localScreenShareId) {
      messageVideoId = videoId;
      videoEnabled = true; // screehShare Video ON
    }
    this.camStates[messageVideoId] = !!videoEnabled;

    const message = { feed: messageVideoId, type: 'video', enabled: videoEnabled };
    this.dcSend(message);

    this.camState$.next({ userId: messageVideoId, enabled: !!videoEnabled}); // Warn Brother (local Video)
  }

  private dcSend(message: any) {
    if (this.dc && this.dc.readyState === 'open') {
      this.dc.send(JSON.stringify(message));
      // console.log('[dc] SEND Video message:  ', message, ' this.localScreenShareId: ', this.localScreenShareId);
    } else {
      console.error('[DC] can\'t sendDCVideoMessage current state: ', this.dc?.readyState);
    }
  }

  configureDataChannel() { // dc: RTCDataChannel
    const pc = this.videoRoomPlugin.webrtcStuff.pc;
    this.dc = (this.videoRoomPlugin.webrtcStuff.dataChannel as any).JanusDataChannel;
    if (!this.dc) {
      return;
    }

    this.dc.onopen = () => {
      if (this.dc.readyState === 'open') {
        this.sendDCMessage();
      } else {
        console.error('[DC] can"t send current state: ', this.dc.readyState);
      }
    };

  }

  private dataChannelOnData(data: any) {
    if (!this.isJson(data)) {
      return;
    }

    const messageObj: MessageData = JSON.parse(data);
    // console.log('[dc] GOT message:  ', messageObj);
    if (messageObj.feed) {
      if (!messageObj.type) {
        return;
      }
      if (messageObj.type === 'audio') {
        this.micState$.next({ userId: messageObj.feed, enabled: messageObj.enabled});
        this.micStates[messageObj.feed] = messageObj.enabled; // save states to keep data in service
      } else if (messageObj.type === 'video' && messageObj.feed !== this.localUserId) { // don't allow controll cam from remote
        // console.log('[Js] messageObj.feed: ', messageObj.feed, ' localUserId: ', this.localUserId);
        this.camState$.next({ userId: messageObj.feed, enabled: messageObj.enabled});
        this.camStates[messageObj.feed] = messageObj.enabled; // save states to keep data in service
      }

      if (messageObj.type === 'audio' || messageObj.type === 'video') {
        if (!this.firstMessageSent) {
          this.sendDCMessage(); // message back on join with current state
          this.sendDCVideoMessage();
          this.firstMessageSent = true;
        }
      }
    } else {
      // video handler
    }
  }

  private addPublishers(publishers: any) {
    for (const i in publishers) {
      const id = publishers[i].id;
      const display = publishers[i].display;
      const audio = publishers[i].audio_codec;
      const video = publishers[i].video_codec;
      this.userIds.push(id);
      this.newRemoteFeed(id, display, audio, video);
    }
  }

  public async roomExists(roomName: string): Promise<RoomExistsResponse> {
    await this.attachVideoRoomPlugin();

    const roomId: any = this.roomIdFromName(roomName);

    const result: RoomExistsResponse = await new Promise<RoomExistsResponse>((resolve, reject) => {
      this.videoRoomPlugin.send({
        message: {
          request: 'exists',
          room: roomId,
        },
        success: (data: RoomExistsDto) => {
          resolve(data);
        },
        error: (error: JanusErrorDto) => {
          console.error('Can\'t check if room exists', error);
          reject(error);
        },
      });
    });

    return result;
  }

  public async createRoom(roomName: string): Promise<CreateRoomResponse> {
    await this.attachVideoRoomPlugin();


    const result: CreateRoomResponse = await new Promise<CreateRoomResponse>((resolve, reject) => {
      this.videoRoomPlugin.send({
        message: {
          request: 'create',
          room: this.roomIdFromName(roomName),
          description: roomName,
          publishers: 30,
          audiocodec: 'opus',
          videocodec: 'h264',
          h264_profile: '42e01f',
          bitrate: this.customizationService.config.bitrate,
          bitrate_cap: true,
          audiolevel_ext: true,
          audiolevel_event: true,
          audio_active_packets: 100,
          audio_level_average: 40,
          notify_joining: true,
          videoorient_ext: true,
          fir_freq: 1,
        },
        success: (data: CreateRoomDto) => {
          resolve(data);
        },
        error: (error: JanusErrorDto) => {
          console.error('Can\'t create room', error);
          reject(error);
        },
      });
    });

    return result;
  }

  public publishAboutJoin(userName: string): Observable<any> {
    return new Observable((observer: Observer<any>) => {
      this.videoRoomPlugin.send({
        message: {
          request: 'publish',
          display: userName,
          audiocodec: 'opus',
          videocodec: 'h264',
          audio_level_average: 40,
          audio_active_packets: 25,
          audio: true,
          video: true,
          data: true,
          keyframe: true,
        },
        success: (data: any) => {
          observer.next(data);
        },
        error: ((err: any) => {
          observer.error(err);
        }),
      });
    });
  }

  public async joinRoom(roomId: any, userName: string): Promise<JoinRoomResponse> {
    try {
      await this.attachVideoRoomPlugin();
    } catch (error) {
      console.log('[Join] attachVideoRoomPlugin error: ', error);
      return Promise.reject();
    }

    const result: JoinRoomResponse = await new Promise<JoinRoomResponse>((resolve, reject) => {
      this.videoRoomPlugin.send({
        message: {
          request: 'join',
          ptype: 'publisher',
          room: roomId,
          display: userName,
          id: environment.janus.stringRoomIds ? this.localUserId.toString() : this.localUserId,
          keyframe: true,
        },
        success: (data: JoinRoomDto) => {
          resolve(data);
        },
        error: (error: JanusErrorDto) => {
          console.error('Can\'t join room', error);
          reject(error);
        },
      });
    });

    return result;
  }

  public async getRoomsList(): Promise<void> { // TODO: specify dto type
    try {
      await this.attachVideoRoomPlugin();
    } catch (error) {
      return Promise.reject();
    }

    const result: Promise<any> = await new Promise<any>((resolve, reject) => { // TODO: any
      this.videoRoomPlugin.send({
        message: {
          request: 'list',
        },
        success: (data: any) => {
          resolve(data);
        },
        error: (error: JanusErrorDto) => {
          console.error('Can\'t get room list');
          reject(error);
        },
      });
    });

    return result;
  }
  public sendVideo(send = true): any {
    const media = !!send ? { addVideo: true, video: true } as any : { removeVideo: true };
    if (!!media.addVideo) {
      media.video = this.stateService.videoDeviceId ? this.media.getSettingsForOffer() : true;
    }
    if (!this.stateService.isMicEnabled) {
      media.removeAudio = true;
    } else {
      media.audio = true;
    }
    // ---- media Stream
    const stream = this.localStream$.value; // : MediaStream
    if (media.removeVideo && !media.addVideo) {
      const videoTrack = (stream as MediaStream).getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = false;
      }
      this.stateService.videoEnabled = false;
      this.mutes.next({ type: 'video', on: false });
      // send DCMessage
      return;
    } else if (media.addVideo) {
      const videoTrack = stream ? (stream as MediaStream).getVideoTracks()[0] : null;
      if (videoTrack) {
        videoTrack.enabled = true;
        this.stateService.videoEnabled = true;
      }
      this.mutes.next({ type: 'video', on: true });
      // send DCMessage
    }
    // ---- EOF media Stream
  }

  public replaceVideo(stream: MediaStream): any {
    const settings = this.media.getSettingsForOffer(stream);
    stream.getTracks().forEach((track) => track.stop());
    console.log('replace video');
    this.videoRoomPlugin.createOffer({
      media: {
        replaceVideo: true,
        video: settings,
      },
      success: (jsep: any) => {
        (this.videoRoomPlugin as any).send({ message: { audioSend: true, videoSend: true }, jsep });

        // ---- media Stream: Sync Enabled state for streams
        const streamValue = this.localStream$.value;
        const videoTrack = (streamValue as MediaStream).getVideoTracks()[0];
        videoTrack.enabled = this.stateService.videoEnabled;
        this.mutes.next({ type: 'video', on: this.stateService.videoEnabled });

        const audioTrack = (streamValue as MediaStream).getAudioTracks()[0];
        audioTrack.enabled = this.stateService.audioEnabled;
        this.mutes.next({ type: 'audio', on: this.stateService.audioEnabled });
        // ---- EOF media Stream

      },
      error: (error: any) => {
        console.error('[replaceVideo] error', error);
      },
    });
  }

  public sendAudio(send = true): any {
    const media = !!send ? { addAudio: true, audio: true } as any : { removeAudio: true };
    if (!!media.addAudio) {
      media.audio = this.stateService.audioDeviceId ? { deviceId: this.stateService.audioDeviceId } : true;
    }
    if (!this.stateService.isCamEnabled) {
      media.removeVideo = true;
    }

    // ---- media Stream
    const stream = this.localStream$.value; // : MediaStream
    if (media.removeAudio && !media.addAudio) {
      const audioTrack = (stream as MediaStream).getAudioTracks()[0];
      audioTrack.enabled = false;
      this.stateService.audioEnabled = false;
      // send DCMessage
    } else if (media.addAudio) {
      // console.log('[sendAudio] Add media', media);

      const audioTrack = stream ? (stream as MediaStream).getAudioTracks()[0] : null;
      if (audioTrack) {
        audioTrack.enabled = true;
        this.stateService.audioEnabled = true;
      }
      // send DCMessage
    }
    this.mutes.next({ type: 'audio', on: !!this.stateService.audioEnabled });
    // ---- EOF media Stream
  }

  public async createOffer(parameters: any, stream?: MediaStream): Promise<void> { // TODO: any
    // Wait until video room plugin will be available
    await this.attachVideoRoomPluginPromise;

    const pluginHandler = parameters.shareScreen ? this.videoRoomScreenSharePlugin : this.videoRoomPlugin;
    const media: any = parameters.shareScreen ? { // TODO: any
      video: 'screen', // Enable screen share
      audioSend: false, // Do or do not send audio
      videoRecv: false, // Do or do not receive video
    } : {
      audioRecv: true, // Do or do not receive audio
      videoRecv: true, // Do or do not receive video
      // force to true
      audioSend: true, //  this.stateService.isMicEnabled, // Do or do not send audio
      // force to true and later updated with stateService.videoEnabled
      videoSend: true, // this.stateService.isCamEnabled, // Do or do not send video
      data: true,
    };

    if (parameters.audioDeviceId) {
      media.audio = { deviceId: { exact: parameters.audioDeviceId } };
    }

    if (parameters.videoDeviceId) {
      media.video = { deviceId: { exact: parameters.videoDeviceId } };
    }

    if (parameters.replaceAudio) { // This is only needed in case of a renegotiation
      media.replaceAudio = parameters.replaceAudio;
    }

    if (parameters.replaceVideo) { // This is only needed in case of a renegotiation
      media.replaceVideo = parameters.replaceVideo;
    }
    if (!parameters.shareScreen) {
      media.video = this.stateService.constraints.video;
    }

    if (this.stateService.isCamBanned) { // user Blocked access to cam
      media.audio = false;
      media.video = false;
    }
    let simulcast = null;
    if (this.stateService.simulcastEnabled) {

      if (this.platform.FIREFOX) {
        simulcast = { simulcast: true };
      } else if (this.platform.BLINK) {
        simulcast = { simulcast2: true };
      }
    }
    console.log('[CreateOffer] simulcast media:  ', media);
    pluginHandler.createOffer(
      {
        media,
        ...simulcast,
        success: (jsep: JanusJS.JSEP) => {
          pluginHandler.send({
            message: {
              request: 'configure',
              // Both forced to true - later handled with stateService flags
              audio: true, // parameters.shareScreen ? true : this.stateService.isMicEnabled,
              video: true, // parameters.shareScreen ? true : this.stateService.isCamEnabled
            },
            jsep,
          });
          // @here: enabled = false
          if (!this.stateService.videoEnabled) {
            this.videoEnabledFalse();
          }
          if (!this.stateService.audioEnabled) {
            this.audioEnabledFalse();
          }
        },
        error: (error: JanusErrorDto) => {
          console.error('[js] Can\'t create offer', error);
          // User didn't give a permission to share his screen
          if (parameters.shareScreen) {
            this.stateService.isScreenShareEnabled$.next(false);
          }
        },
      });
  }

  private videoEnabledFalse() {
    const s = this.localStream$.value; // : MediaStream
    if (!s) {
      return;
    }
    const videoTrack = (s as MediaStream).getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = false;
    }
    this.stateService.videoEnabled = false;
    this.mutes.next({ type: 'video', on: false });
  }

  private audioEnabledFalse() {
    const s = this.localStream$.value; // : MediaStream
    if (!s) {
      return;
    }
    const audioTrack = (s as MediaStream).getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = false;
    }
    audioTrack.enabled = false;
    this.stateService.audioEnabled = false;
    this.mutes.next({ type: 'audio', on: false });
  }

  public newRemoteFeed(id: string, display: string, audio: string, video: string): void {
    // A new feed has been published, create a new plugin handle and attach to it as a subscriber
    let remoteFeed: any = null; // TODO: any
    this.janus.attach(
      {
        plugin: 'janus.plugin.videoroom',
        success: (pluginHandle: JanusJS.PluginHandle) => {
          remoteFeed = pluginHandle;
          remoteFeed.simulcastStarted = false;
          // We wait for the plugin to send us an offer
          const subscribe = {
            request: 'join',
            room: this.stateService.roomId,
            ptype: 'subscriber',
            feed: id,
            keyframe: true,
            offer_video: true,
          };

          // For example, if the publisher is VP8 and this is Safari, let's avoid video
          if (Janus.webRTCAdapter.browserDetails.browser === 'safari' &&
            (video === 'vp9' || (video === 'vp8' && !Janus.safariVp8))) {

            console.warn('Publisher is using ' + video + ', but Safari doesn\'t support it: disabling video');
            subscribe.offer_video = false;
          }
          remoteFeed.videoCodec = video;
          remoteFeed.send({ message: subscribe });
        },
        error: (error: string) => {
          console.error('[newRemoteFeed] Can\'t attach video room plugin to Janus error: ', error);
        },
        onmessage: (msg: any, jsep: any) => { // TODO: anys
          this.videoRoomPlugin.send({
            message: {
              request: 'listparticipants',
              room: this.stateService.roomId,
            },
            success: (data: { participants: Participants[] }) => {

            },
            error: (error: any) => {
              // TODO: handle if can't find participant
              console.log('[listparticipants] error: ', error);
            },
          });


          const event = msg.videoroom;
          if (msg.error) {
            console.error('[msg] Error', msg.error);
          } else if (event) {
            if (event === 'attached') {
              // Subscriber created and attached
              remoteFeed.rfid = msg.id;
              remoteFeed.rfdisplay = msg.display;

              // if (!remoteFeed.spinner) {
              //   // var target = document.getElementById('videoremote'+remoteFeed.rfindex);
              //   // remoteFeed.spinner = new Spinner({top:100}).spin(target);
              // } else {
              //   // remoteFeed.spinner.spin();
              // }
              //
              // // $('#remote'+remoteFeed.rfindex).removeClass('hide').html(remoteFeed.rfdisplay).show();
            } else if (event === 'event') {
              // Check if we got a simulcast-related event from this publisher
              // const substream = msg.substream;
              // const temporal = msg.temporal;
              // if ((substream !== null && substream !== undefined) || (temporal !== null && temporal !== undefined)) {
              //   if (!remoteFeed.simulcastStarted) {
              //     remoteFeed.simulcastStarted = true;
              //   }
              // }
            } else {
              // What has just happened?
            }
          }

          if (jsep) {
            // Answer and attach
            remoteFeed.createAnswer({
                jsep,
                media: { audioSend: false, videoSend: false, data: true },	// We want recvonly audio/video TODO: !!!!
                success: (jsepObj: JanusJS.JSEP) => {
                  remoteFeed.send({ message: { request: 'start', room: this.stateService.roomId }, jsep: jsepObj });
                },
                error: (error: JanusErrorDto) => {
                  console.error('[createAnswer] WebRTC error', error);
                },
              });
          }
        },
        iceState: (state: string) => {
          // console.log('[S] ICE state of this WebRTC PC (feed #' + remoteFeed.rfindex + ') changed to ' + state);
        },
        webrtcState: (on: boolean) => {
          // console.log('[S] Janus says this WebRTC PC (feed #' + remoteFeed.rfindex + ') is ' + (on ? 'up' : 'down') + ' now');
          if (on) {
            this.configureDataChannel();
          }
        },
        onlocalstream: (stream: MediaStream) => {
          // The subscriber stream is recvonly, we don't expect anything here
        },
        ondataopen: (data: string) => {
          // console.log('[S] The DataChannel is available! data: ', data);
        },
        ondata: (data: any) => this.dataChannelOnData(data),
        onremotetrack: (mediaStreamTrack: MediaStreamTrack) => {
          const isRemoteFeedExists = this.videos.find((videoObj: Video) => videoObj.id === remoteFeed.rfid);
          if (!isRemoteFeedExists) {
            const knownId = this.userIds.find((userId) => userId === remoteFeed.rfid); // check if no publisher with this remoteFeed.rfid
            if (!knownId) {
              return;
            }
            const videoStream = new MediaStream();
            videoStream.addTrack(mediaStreamTrack);
            this.videos = [...this.videos, {
              audioKindAdded: 'audio' === mediaStreamTrack.kind,
              videoKindAdded: 'video' === mediaStreamTrack.kind,
              stream: videoStream,
              pluginHandle: remoteFeed,
              id: remoteFeed.rfid,
              name: remoteFeed.rfdisplay,
              remote: true,
              type: VideoType.Video, // TODO: determine is it video or screen
            }];
          } else { // already exist: check/add new track
            const stream = isRemoteFeedExists.stream;
            if ('video' === mediaStreamTrack.kind && isRemoteFeedExists.videoKindAdded === false) {
              stream.addTrack(mediaStreamTrack);
              isRemoteFeedExists.videoKindAdded = true;
            }
            if ('audio' === mediaStreamTrack.kind && isRemoteFeedExists.audioKindAdded === false) {
              stream.addTrack(mediaStreamTrack);
              isRemoteFeedExists.audioKindAdded = true;
            }
          }
        },
        onremotestream: (streamObj: MediaStream) => {
          const isRemoteFeedExists = this.videos.find((videoObj: Video) => videoObj.id === remoteFeed.rfid);
          if (!isRemoteFeedExists) {
            this.videos = [...this.videos, {
              stream: streamObj,
              pluginHandle: remoteFeed,
              id: remoteFeed.rfid,
              name: remoteFeed.rfdisplay,
              remote: true,
              type: VideoType.Video, // TODO: determine is it video or screen
            }];
          }
          // Show the video, hide the spinner and show the resolution when we get a playing event
          // $("#remotevideo"+remoteFeed.rfindex).bind("playing", function () {
          //   // remoteFeed.spinner.stop();
          //   if (Janus.webRTCAdapter.browserDetails.browser === 'firefox') {
          //     // Firefox Stable has a bug: width and height are not immediately available after a playing
          //   }
          // });
          // Janus.attachMediaStream($('#remotevideo'+remoteFeed.rfindex).get(0), stream);
          // const videoTracks = stream.getVideoTracks();
          // if (!videoTracks || videoTracks.length === 0) {
          //   // No remote video
          // } else {
          //   // Show video
          // }
        },
        oncleanup: () => { },
      });
  }

  public startShareScreen(): void {
    // Screen share https://janus.conf.meetecho.com/screensharingtest.js?2
    this.janus.attach(
      {
        plugin: 'janus.plugin.videoroom',
        success: (pluginHandle: JanusJS.PluginHandle) => {
          this.videoRoomScreenSharePlugin = pluginHandle;

          this.localScreenShareId = this.getRandomId();
          this.camStates[this.localScreenShareId] = true; // Warn All, that screen not muted

          this.videoRoomScreenSharePlugin.send({
            message: {
              request: 'join',
              room: this.stateService.roomId,
              ptype: 'publisher',
              display: this.stateService.userName + ' screen',
              id: this.localScreenShareId,
            },
          });
        },
        error: (error: string) => {
          console.error('Can\'t attach video room plugin to Janus for screen share, error: ', error);
        },
        consentDialog: (on: boolean) => { },
        iceState: (state: string) => { },
        mediaState: (medium: 'audio' | 'video', on: boolean) => { },
        webrtcState: (on: boolean) => { },
        onmessage: (msg: any, jsep: any) => { // TODO: anys
          const event = msg.videoroom;

          if (event) {
            if (event === 'joined') {
              this.createOffer({ shareScreen: true });
            } else if (event === 'event') {
              console.log('[jS] Screen event', msg);
            }
          }
          if (jsep) {
            this.videoRoomScreenSharePlugin.handleRemoteJsep({ jsep });
          }
        },
        onlocaltrack: (mediaStreamTrack: MediaStreamTrack) => {
          const videoStream = new MediaStream();
          videoStream.addTrack(mediaStreamTrack);
          this.videos = [...this.videos, {
            stream: videoStream,
            pluginHandle: this.videoRoomScreenSharePlugin,
            id: this.localScreenShareId,
            name: this.stateService.userName + ' screen',
            remote: false,
            type: VideoType.Screen,
          }];
          // User stop screen sharing
          mediaStreamTrack.onended = () => {
            this.stateService.isScreenShareEnabled$.next(false);
            this.videoRoomScreenSharePlugin.detach(null);
          };
        },
        onlocalstream: (stream: MediaStream) => {
          this.videos = [...this.videos, {
            stream,
            pluginHandle: this.videoRoomScreenSharePlugin,
            id: this.localScreenShareId,
            name: this.stateService.userName + ' screen',
            remote: false,
            type: VideoType.Screen,
          }];

          // User stop screen sharing
          stream.getVideoTracks()[0].onended = () => {
            this.stateService.isScreenShareEnabled$.next(false);
            this.videoRoomScreenSharePlugin.detach(null);
          };
        },
        onremotestream: (stream: MediaStream) => { },
        oncleanup: () => { },
        detached: () => { },
      });
  }

  public stopShareScreen(): void {
    this.videoRoomScreenSharePlugin.detach(null);
  }

  public roomIdFromName = (roomName: string): any => {
    const roomIdNumber = this.hashCode(roomName);
    return environment.janus.stringRoomIds ? `${roomIdNumber}` : roomIdNumber;
  }

  public hashCode = (s: string): number => {
    const md5: string = Md5.init(s);
    let hash = 0;
    for (let i = 0; i < md5.length; i++) {
      const character = md5.charCodeAt(i);
      // tslint:disable-next-line:no-bitwise
      hash = ((hash << 5 >>> 0) - hash) + character;
      // tslint:disable-next-line:no-bitwise
      hash = hash >>> 0; // Convert to 32bit integer
    }
    return hash;
  }

  public getRandomId(): number {
    return Math.floor(1000000000000000 + Math.random() * 9000000000000000);
  }

  public switchMic(on: boolean): void {
    if (on) {
      this.videoRoomPlugin.unmuteAudio();
    } else {
      this.videoRoomPlugin.muteAudio();
    }
  }

  public switchCam(on: boolean): void {
    if (on) {
      this.videoRoomPlugin.unmuteVideo();
    } else {
      this.videoRoomPlugin.muteVideo();
    }
  }

  public switchShareScreen(on: boolean): void {
    if (on) {
      this.startShareScreen();
    } else {
      this.stopShareScreen();
    }
  }

  createCsFabric(): void {
    const fabricAttributes = {
      remoteEndpointType: callstats.endpointType.peer,
      fabricTransmissionDirection: callstats.transmissionDirection.sendrecv,
    };

    callstats.addNewFabric(this.getVideoRoomPC(), this.stateService.userName, callstats.fabricUsage.multiplex,
      this.stateService.roomId, fabricAttributes);
  }

  public getVideoRoomPC() {
    return this.videoRoomPlugin.webrtcStuff.pc;
  }

  public finishCall(): void {
    this.videoRoomPlugin.send({ message: { request: 'hangup' } });
    this.videoRoomPlugin.hangup();
    // TODO: clean this class properties
  }

  private isJson(str: string) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
  }
}
