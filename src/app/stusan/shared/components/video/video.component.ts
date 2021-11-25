import { Component, ChangeDetectionStrategy, Input, AfterViewInit, ViewChild, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
// @ts-ignore
import { WebRTCStats } from '@peermetrics/webrtc-stats';

import { Video, MicState, ConnectionInfoModel } from '@models';
import { JanusService, StateService } from '@shared/services';

@Component({
  selector: 'thevatra-video',
  templateUrl: './video.component.html',
  styleUrls: ['./video.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class VideoComponent implements AfterViewInit, OnDestroy, OnInit {
  destroyed$ = new Subject<boolean>();

  public isSelfVideo = false;
  public showTech = false;
  public techData: ConnectionInfoModel = {};
  private webrtcStats: WebRTCStats = null;
  public mutedMic = false;
  public mutedCam = true;
  public id = 0;
  private input: Video;
  private stream: MediaStream;
  @ViewChild('video') videoEl: ElementRef<HTMLVideoElement>;
  get video(): HTMLVideoElement {
    return this.videoEl.nativeElement;
  }
  @Input() layoutName = 'leader';
  @Input('source') set source(video: Video) {

    if (video) {
      this.id = video.id;
      // this.mutedMic = !!video.mutedMic;
      this.mutedCam = !!video.mutedCam;
      this.input = video;
      this.setStream(video.stream);
    }
  }
  @Input('isHidden') set isHidden(value: boolean) {
    if (this.input && this.input.pluginHandle) {
      if (this.id === this.janusService.getLocalUserId()) {
        // console.log('[send] STOP sending - owner video');
        return;
      }
      if (this.id === this.janusService.localScreenShareId) {
        // console.log('[send] STOP sending - share screen');
        return;
      }
      this.input.pluginHandle.send({ message: { request: 'configure', video: !value },
        success: (res: any) => {
          // console.log(`[send] (${!value}) success res: `, res);
        },
        error: (res: any) => {
          // console.log(`[send] (${!value}) success res: `, res);
        } });
    }
  }
  get isMine(): boolean {
    return !this.input?.remote;
  }
  get isPlaying(): boolean {
    return !this.video.paused || false;
  }
  get name(): string {
    return this.input?.name || '';
  }
  constructor(private el: ElementRef, public janusService: JanusService,
              public stateService: StateService) { }

  changeStream() {
    // console.log('this.input.pluginHandle: ', this.input);
    this.input.pluginHandle.send({ message: { substream: 1, request: 'configure' }});
  }

  ngOnInit() {
    // Load mic state on Init
    this.mutedMic = !this.janusService.micStates[this.id];
    if (undefined === this.janusService.camStates[this.id] && this.input.type === 'screen') {
      this.mutedCam = false;
    } else {
      this.mutedCam = !this.janusService.camStates[this.id];
    }

    // Subscribe to mic events for future changes
    this.janusService.micState$.pipe(
        filter((micState: MicState) => micState.userId === this.id),
        takeUntil(this.destroyed$),
      ).subscribe((micState: MicState) => {
        this.mutedMic = !micState.enabled;
        if (this.input) {
          this.input.mutedMic = this.mutedMic; // Save mic state in video Obj
        }

      });

    this.janusService.camState$.pipe(
      filter((camState: MicState) => camState.userId === this.id),
      takeUntil(this.destroyed$),
    ).subscribe((camState: MicState) => {
      if (camState.userId === this.janusService.localScreenShareId) {
        return;
      }
      this.mutedCam = !camState.enabled;
      if (this.input) {
        this.input.mutedCam = this.mutedCam; // Save mic state in video Obj
      }
      // console.log('[Vc] mutedCam: ', this.mutedCam, ' this.id: ', this.id );

    });

    this.isSelfVideo = this.id === this.janusService.getLocalUserId();
  }

  toggleTechInfo(event: MouseEvent) {
    this.showTech = !this.showTech;
    if (this.showTech) {
      this.getStatsFromWebrtc();
    } else {
      this.webrtcStats.removePeer(this.id);
    }

    event.stopPropagation();
  }

  getStatsFromWebrtc() {
    this.techData =  { };
    if (this.input.stream && this.input.stream.getVideoTracks() &&
      this.input.stream.getVideoTracks()[0] && this.input.stream.getVideoTracks()[0].getSettings()
      ) {
      this.techData = this.input.stream.getVideoTracks()[0].getSettings();
    }
    const inputPc = this.input.pluginHandle.webrtcStuff.pc;
    this.webrtcStats = new WebRTCStats({ getStatsInterval: 3000 });
    if (!this.webrtcStats) {
      return;
    }
    this.webrtcStats.addPeer({
      pc: inputPc,
      peerId: this.id, // any string that helps you identify this peer,
      // remote: false // optional, override the global remote flag
    });
    this.webrtcStats.on('stats', (ev: any) => {
      if (ev.data.video.outbound && ev.data.video.outbound[0]?.encoderImplementation) {
        this.techData.videoCodec = ev.data.video.outbound[0]?.encoderImplementation;
      }
      if ((this.input.pluginHandle as any).videoCodec) {
        this.techData.videoCodec = (this.input.pluginHandle as any).videoCodec;
      }
      this.techData.bitrate = this.getStringBitrate(ev.data.video);
    });
  }

  private getStringBitrate(videInfo: any) {
    let inbound = '0';
    if (videInfo.inbound && videInfo.inbound[0]) {
      if (videInfo.inbound[0].bitrate) {
        inbound = (videInfo.inbound[0].bitrate / 1024).toFixed(2) + ' Kbps';
      }

      if (videInfo.inbound[0].frameHeight && videInfo.inbound[0].frameWidth) {
        this.techData.width = videInfo.inbound[0].frameWidth;
        this.techData.height = videInfo.inbound[0].frameHeight;
      }
    }
    let outbound = '0';
    if (videInfo.outbound && videInfo.outbound.length) {
      const outStream = videInfo.outbound.find((streamOut: any) => streamOut.bitrate);
      if (outStream) {

        outbound = (outStream.bitrate / 1024).toFixed(2) + ' Kbps';
      }
    }

    // console.log(this.id + ' out: ', videInfo.outbound);
    // console.log(this.id + ' in: ', videInfo.inbound);
    // [' + videInfo.outbound.length + '] - for simulcast
    return ' in: ' + inbound + ', out: ' + outbound + '[' + videInfo.outbound.length + ']';
  }

  setStream(stream: MediaStream) {
    this.stream = stream;
    if (!this.isMine) {
      if (!!stream) {
        stream.onremovetrack = (event) => { console.log('onremovetrack error: ', event); };
        stream.onaddtrack = (event) => { console.log('onAddTrack error: ', event); };
      }
      this.stream.addEventListener('addtrack', (event) => {
        console.log('add', event);
      });
      this.stream.addEventListener('removetrack', (event) => {
        console.log('remove', event);
      });
    }
    if (this.videoEl) {
      this.playVideo();
    }
  }
  playVideo() {
    this.video.srcObject = this.stream;
    this.video.muted = this.isMine;
    // let promise = this.video.play();
    setTimeout(() => {
      const promise = this.video.play()
      .then(() => {
          // console.log('[playVideo] play');
        }).catch((error) => {
          console.error('[playVideo] err: ', error);
        });
      if (promise !== undefined) {
          promise.catch(error => {
              // Auto-play was prevented
              // Show a UI element to let the user manually start playback
              console.error('[playVideo+promise] err: ', error);
          }).then(() => {
              // Auto-play started
              // console.info('[playVideo+promise] Started ... ');
          });
        }
    }, 50);
  }

  ngAfterViewInit(): void {
    if (!this.isPlaying) {
      this.playVideo();
    }
  }

  fullScreen() {
    this.el.nativeElement.requestFullscreen().then(() => {
      console.log('[fullScreen] ok');
    });
  }

  ngOnDestroy() {
    if (this.webrtcStats) {
      this.webrtcStats.removePeer(this.id);
    }
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
