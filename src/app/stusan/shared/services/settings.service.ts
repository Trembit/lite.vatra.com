import { Injectable } from '@angular/core';
import { Observable, from, Observer, BehaviorSubject, Subject, merge } from 'rxjs';
import { map } from 'rxjs/operators';


const isSetsEqual = (a: any, b: any) => a.size === b.size && [...a].every(value => b.has(value));

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private devices$ = new BehaviorSubject<MediaDeviceInfo[]>([]);
  get devices(): MediaDeviceInfo[] {
    return this.devices$.getValue();
  }

  constructor() {
    this.updateDevices();
    navigator.mediaDevices.ondevicechange = async () => { // device list changed (eg. user disconnected usb mic)
      await this.updateDevices();
    };
  }

  updateDevices(): Promise<boolean> {
    return this.getAllDevices().then(devices => {
      if (!isSetsEqual(new Set(devices), new Set(this.devices))) {
        this.devices$.next(devices);
      }
      return true;
    }).catch(error => {
      console.log('[settings] error: ', error);
      return false;
    });
  }

  getLabelByKind(kind: string): string {
    let label: string;
    switch (kind) {
      case 'videoinput':
        label = 'Camera';
        break;
      case 'audioinput':
        label = 'Microphone';
        break;
      case 'audiooutput':
        label = 'Speaker';
        break;
      default:
        label = 'Device';
        break;
    }
    return label;
  }

  private getAllDevices(): Promise<MediaDeviceInfo[]> {
    return navigator.mediaDevices.enumerateDevices().then(devices => {
      const countByType = { audioinput: 0, videoinput: 0, audiooutput: 0 };
      return devices.map(device => {
        let label = device.label;
        if (label === '') {
          label = `${this.getLabelByKind(device.kind)} #${countByType[device.kind]++}`;
        }
        return { ...device.toJSON(), label };
      }).filter(device => device.deviceId.length > 32);
    });
  }

  getDefaultAudioDevice(): Promise<MediaDeviceInfo | null> {
    return this.getDefaultDevice('audio');
  }

  getDefaultVideoDevice(): Promise<MediaDeviceInfo | null> {
    return this.getDefaultDevice('video');
  }

  getDefaultDevice(type: 'audio' | 'video'): Promise<MediaDeviceInfo | null> {
    return navigator.mediaDevices.enumerateDevices().then(devices => {
      const kind = type === 'audio' ? 'audioinput' : 'videoinput';
      devices = devices.filter(device => device.kind === kind);
      const defaultDevice = devices.find(device => device.deviceId === 'default');
      if (defaultDevice) {
        const realDevice = devices.find((device) => {
          return device.deviceId !== 'default' && device.groupId === defaultDevice.groupId && defaultDevice.label.endsWith(device.label);
        });
        if (realDevice) {
          return realDevice;
        }
      }
      return null;
    });
  }



  public getDevices(): Observable<{ videoDevices: Array<MediaDeviceInfo>, audioDevices: Array<MediaDeviceInfo> }> {
    return this.devices$.pipe(map((devices) => {
      return {
        audioDevices: devices.filter((device) => device.kind === 'audioinput'),
        videoDevices: devices.filter((device) => device.kind === 'videoinput'),
      };
    }));

  }
}
