import { Injectable } from '@angular/core';
import defaultsDeep from 'lodash.defaultsdeep';
import { BehaviorSubject } from 'rxjs';
import { StateService } from './state.service';

export type Resolution = {
  name: string;
  width: number;
  height: number;
  alt?: number;
};

export const RESOLUTIONS: Resolution[] = [
  { name: 'SD', width: 320, height: 240, alt: 180 },
  { name: 'HQ', width: 640, height: 480, alt: 360 },
  { name: 'HD', width: 1280, height: 960, alt: 720 },
];



@Injectable({
  providedIn: 'root',
})
export class MediaService {
  camera$ = new BehaviorSubject<MediaStream | null>(null);
  set camera(stream: MediaStream | null) {
    if (stream === null) {
      this.camera?.getTracks().forEach((track) => track.stop());
    } else {
      this.saveConstraints(stream);
    }
    this.camera$.next(stream);
  }
  get camera(): MediaStream | null {
    return this.camera$.getValue();
  }

  get cameraIsAlive(): boolean {
    const video = this.camera?.getVideoTracks()[0];
    if (video) {
      return video.readyState === 'live';
    }
    return false;
  }

  private defaultsContraints: MediaStreamConstraints = {
    video: {
      aspectRatio: 1.77777777778,

      width: 640,
      height: 360,
      frameRate: 24,
    },
    audio: true,
  };
  private prevConstraints: MediaStreamConstraints = this.state.constraints;
  constructor(private state: StateService) {
    this.state.videoDeviceId$.subscribe((deviceId) => {
      if (!!deviceId) {
        defaultsDeep(this.defaultsContraints, { video: { deviceId: { exact: deviceId } } });
      }
    });
    this.state.audioDeviceId$.subscribe((deviceId) => {
      if (!!deviceId) {
        defaultsDeep(this.defaultsContraints, { audio: { deviceId: { exact: deviceId } } });
      }
    });
  }

  async getMediaStream(options?: MediaStreamConstraints): Promise<MediaStream> {
    const constraints = {};
    defaultsDeep(constraints, options, this.prevConstraints, this.defaultsContraints);
    return navigator.mediaDevices.getUserMedia(constraints);
  }

  devicesGetUserMedia() {
    navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      .then((stream) => {
        // console.log('[ms] stream: ', stream)
      })
      .catch((error) => {
        if ('NotAllowedError' === error.name) { // User blocked cam
          this.state.isCamBanned = true;
        } else if ('NotFoundError' === error.name) { // user don't have cam
          this.state.isCamBanned = true;
        }
      });
  }

  saveConstraints(stream: MediaStream) {
    this.prevConstraints = { video: this.getSettingsForOffer(stream) || undefined };
    this.state.constraints = this.prevConstraints;
  }

  getSettingsForOffer(stream?: MediaStream | null): { deviceId?: string, width?: number, height?: number } | null {
    if (stream) {
      const video = stream.getVideoTracks()[0];
      if (video) {
        if (video.readyState === 'live') {
          const settings = video.getSettings();
          return {
            width: settings.width,
            height: settings.height,
            deviceId: settings.deviceId,
          };
        } else {
          if (this.prevConstraints) {
            const settings = (this.prevConstraints.video as any);
            return {
              width: settings.width,
              height: settings.height,
              deviceId: settings.deviceId,
            };
          }
        }
      }
    } else {
      if (this.prevConstraints) {
        const settings = (this.prevConstraints.video as any);
        if (settings) {
          return {
            width: settings.width,
            height: settings.height,
            deviceId: settings.deviceId,
          };
        }
      }
    }
    return null;
  }

  private isResolutionSupported(track: MediaStreamTrack, resolution: Resolution, onlyWidth = false,
                                alternateHeight = false
    ): Promise<boolean> {
    if (resolution.width && resolution.height) {
      const constraints: MediaTrackConstraints = {
        width: { exact: resolution.width },
        height: resolution.height,
      };
      if (!onlyWidth) {
        constraints.height = { exact: resolution.height };
      }
      if (alternateHeight) {
        constraints.height = { exact: resolution.alt };
      }
      return track.applyConstraints(constraints).then(() => {
        return true;
      }).catch(async (error) => {
        if (error.name === 'OverconstrainedError' && error.constraint === 'height' && !alternateHeight) {
          return await this.isResolutionSupported(track, resolution, onlyWidth, true);
        } else {
          return false;
        }
      });
    } else {
      return Promise.resolve(false);
    }
  }

  async getSupportedResolutions(stream: MediaStream, onlyWidth = false): Promise<any[]> {
    const supported: Resolution[] = [];
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      if (videoTrack.getCapabilities) {
        const capabilities: any = videoTrack.getCapabilities() || null;
        if (capabilities) {
          return Promise.resolve(RESOLUTIONS.filter((resolution) => {
            let comparator = capabilities.width.max >= resolution.width && capabilities.width.min <= resolution.width;
            if (!onlyWidth) {
              comparator = capabilities.width.max >= resolution.width && capabilities.width.min <= resolution.width &&
                capabilities.height.max >= resolution.height && capabilities.height.min <= resolution.height;
            }
            return comparator;
          }));
        }
      } else {
        return Promise.resolve(RESOLUTIONS);
      }
    }
    return Promise.resolve(supported);
  }

  async getSupportedResolutionsByApplying(incomingStream: MediaStream, onlyWidth = false): Promise<any[]> {
    const stream = incomingStream.clone();
    const supported: any[] = [];
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      for (const resolution of RESOLUTIONS) {
        if (await this.isResolutionSupported(videoTrack, resolution, onlyWidth)) {
          supported.push(resolution);
        }
      }
      /* Concurrent version seems buggy
      supported = await Promise.all(RESOLUTIONS.map(async (resolution) => {
        return this.isResolutionSupported(videoTrack, resolution, onlyWidth).then((supported) => {
          return supported ? resolution : false;
        });
      }));
      supported = supported.filter(supported => !!supported);
      */
      // this.stopStream(stream);
      return supported;
    } else {
      this.stopStream(stream);
      return Promise.resolve([]);
    }
  }

  getStreamResolution(stream: MediaStream): Resolution | null {
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      const settings = videoTrack.getSettings();
      return RESOLUTIONS.find((resolution) => {
        return resolution.width === settings.width && (resolution.height === settings.height || resolution.alt === settings.height);
      }) || null;
    }
    return null;
  }

  getStreamVideoId(stream: MediaStream): string | null {
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      const settings = videoTrack.getSettings();
      return settings.deviceId || null;
    }
    return null;
  }

  getStreamAudioId(stream: MediaStream): string | null {
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      const settings = audioTrack.getSettings();
      return settings.deviceId || null;
    }
    return null;
  }

  applyResolution(stream: MediaStream, resolution: Resolution, alternateHeight = false): Promise<boolean> {
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      const constraints = {
        width: { exact: resolution.width },
        height: { exact: alternateHeight ? resolution.alt : resolution.height },
      };
      return videoTrack.applyConstraints(constraints).then(() => true).catch(async (error) => {
        if (error.name === 'OverconstrainedError' && error.constraint === 'height' && !alternateHeight) {
          return await this.applyResolution(stream, resolution, true);
        } else {
          return false;
        }
      });
    }
    return Promise.resolve(false);
  }

  stopStream(stream: MediaStream) {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  }

}
