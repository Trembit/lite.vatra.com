import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LayoutType, ThemeType } from '@enums';
import { environment } from '../../../../environments/environment';
import { CustomizationService } from '../../services/customization.service';

@Injectable({
  providedIn: 'root',
})
export class StateService {
  get isCamBanned() { // user banned access for cam
    return (this.getSavedState('isCamBanned') == null) ? false : this.getSavedState('isCamBanned') === 'true';
  }
  set isCamBanned(value: boolean) {
    this.saveState('isCamBanned', value);
  }

  get playLeaveSound() {
    return this.getSavedState('playLeaveSound') || 0;
  }
  set playLeaveSound(value: number) {
    this.saveState('playLeaveSound', value);
  }

  get videoEnabled() { // flag for audioTrack.enabled(paused from docs)
    return (this.getSavedState('videoEnabled') == null) ? true : this.getSavedState('videoEnabled') === 'true';
  }
  set videoEnabled(value: boolean) {
    this.saveState('videoEnabled', value);
  }
  get audioEnabled() { // flag for audioTrack.enabled(paused from docs)
    return (this.getSavedState('audioEnabled') == null) ? true : this.getSavedState('audioEnabled') === 'true';
  }
  set audioEnabled(value: boolean) {
    this.saveState('audioEnabled', value);
  }

  get constraints(): any {
    const saved = this.getSavedState('constraints', 'object') as any;
    if (saved) {
      return saved;
    }

    return {

      video: { aspectRatio: 1.77777778, width: 640, height: 360, frameRate: 24 },
      audio: {
        echoCancellation: this.customizationService.config.mediaEchoCancellation,
        autoGainControl: this.customizationService.config.mediaAutoGainControl,
        noiseSuppression: this.customizationService.config.mediaNoiseSuppression,
      } };
  }
  set constraints(constraints: object) {
    this.saveState('constraints', JSON.stringify(constraints));
  }

  get resolution(): any {
    const saved = this.getSavedState('resolution', 'object') as any;
    if (saved) {
      return saved;
    }
    return { width: 'any', height: 'any' };
  }
  set resolution(resolution: object) {
    this.saveState('resolution', JSON.stringify(resolution));
  }

  roomId$ = new BehaviorSubject<string | number | null>(this.getRoomId() || null);
  get roomId() {
    return this.roomId$.getValue();
  }
  set roomId(value: string | number | null) {
    this.saveState('roomId', value);
    this.roomId$.next(value);
  }

  userName$ = new BehaviorSubject<string | null>(this.getSavedState('userName') || null);
  get userName() {
    return this.userName$.getValue();
  }
  set userName(value: string | null) {
    this.saveState('userName', value);
    this.userName$.next(value);
  }

  roomName$ = new BehaviorSubject<string | null>(this.getSavedState('roomName') || null);
  get roomName() {
    return this.roomName$.getValue();
  }
  set roomName(value: string | null) {
    this.saveState('roomName', value);
    this.roomName$.next(value);
  }

  startTime$ = new BehaviorSubject<number | null>(this.getSavedState('startTime') || null);
  get startTime() {
    return this.startTime$.getValue();
  }
  set startTime(value: number | null) {
    this.saveState('startTime', value);
    this.startTime$.next(value);
  }

  isLoggedIn$ = new BehaviorSubject<boolean | null>(this.getSavedState('isLoggedIn', 'boolean'));
  get isLoggedIn() {
    return this.isLoggedIn$.getValue();
  }
  set isLoggedIn(value: boolean | null) {
    this.saveState('isLoggedIn', value);
    this.isLoggedIn$.next(value);
  }

  isMicEnabled$ = new BehaviorSubject<boolean | null>(this.getSavedState('isMicEnabled', 'boolean') || true);
  get isMicEnabled() {
    return this.isMicEnabled$.getValue();
  }
  set isMicEnabled(value: boolean | null) {
    this.saveState('isMicEnabled', value);
    this.isMicEnabled$.next(value);
  }

  isCamEnabled$ = new BehaviorSubject<boolean | null>(this.getSavedState('isCamEnabled', 'boolean'));
  get isCamEnabled() {
    return this.isCamEnabled$.getValue();
  }
  set isCamEnabled(value: boolean | null) {
    this.saveState('isCamEnabled', value);
    this.isCamEnabled$.next(value);
  }

  get simulcastEnabled(): boolean {
    return this.getSavedState('simulcast', 'boolean');
  }
  set simulcastEnabled(enabled: boolean) {
    this.saveState('simulcast', enabled);
  }

  theme$ = new BehaviorSubject<ThemeType>(this.getTheme());
  get theme() {
    return this.theme$.getValue();
  }
  set theme(value: ThemeType) {
    if (value === null) {
      this.saveState('theme', null);
      value = ThemeType.Light;
    } else {
      this.saveState('theme', value);
    }
    this.theme$.next(value);
  }

  audioDeviceId$ = new BehaviorSubject<string | null>(this.getSavedState('audioDeviceId') || null);
  get audioDeviceId() {
    return this.audioDeviceId$.getValue();
  }
  set audioDeviceId(value: string | null) {
    this.saveState('audioDeviceId', value);
    this.audioDeviceId$.next(value);
  }

  audioOutputDeviceId$ = new BehaviorSubject<string | null>(this.getSavedState('audioOutputDeviceId') || null);
  get audioOutputDeviceId() {
    return this.audioOutputDeviceId$.getValue();
  }
  set audioOutputDeviceId(value: string | null) {
    this.saveState('audioOutputDeviceId', value);
    this.audioOutputDeviceId$.next(value);
  }

  videoDeviceId$ = new BehaviorSubject<string | null>(this.getSavedState('videoDeviceId') || null);
  get videoDeviceId() {
    return this.videoDeviceId$.getValue();
  }
  set videoDeviceId(value: string | null) {
    this.saveState('videoDeviceId', value);
    this.videoDeviceId$.next(value);
  }

  layoutType$ = new BehaviorSubject<LayoutType>(this.getSavedState('layoutType') || LayoutType.Tile);
  get layoutType() {
    return this.layoutType$.getValue();
  }
  set layoutType(value: LayoutType) {
    this.saveState('layoutType', value);
    this.layoutType$.next(value);
  }

  isChatShown$ = new BehaviorSubject<boolean>(this.getSavedState('isChatShown', 'boolean'));
  get isChatShown() {
    return this.isChatShown$.getValue();
  }
  set isChatShown(value: boolean) {
    this.saveState('isChatShown', value);
    this.isChatShown$.next(value);
  }

  isSettingsShown$ = new BehaviorSubject<boolean>(this.getSavedState('isSettingsShown', 'boolean'));
  get isSettingsShown() {
    return this.isSettingsShown$.getValue();
  }
  set isSettingsShown(value: boolean) {
    this.saveState('isSettingsShown', value);
    this.isSettingsShown$.next(value);
  }

  observedFields = [this.roomId, this.userName, this.roomName, this.startTime, this.isLoggedIn, this.isMicEnabled, this.isCamEnabled,
  this.theme, this.audioDeviceId, this.audioOutputDeviceId, this.videoDeviceId, this.layoutType, this.isChatShown, this.isSettingsShown];


  public isScreenShareEnabled$ = new BehaviorSubject<boolean>(false);


  constructor(public customizationService: CustomizationService) {
    // Save values when user refresh page

  }

  getRoomId() {
    const roomIdData = this.getSavedState<string>('roomId');
    if (!!roomIdData) {
      if (environment.janus.stringRoomIds) {
        return roomIdData;
      } else {
        return parseInt(roomIdData, 10);
      }
    } else {
      return null;
    }
  }

  getTheme(): ThemeType {
    return this.getSavedState('theme') || ThemeType.Light;
  }


  getSavedState<T>(key: string, type?: string): T | false {
    // console.log(`getSavedState ${key}`);
    try {
      let saved = localStorage.getItem(key) as unknown;
      if (!!type) {
        saved = this.castValueToType(saved, type);
      }
      if (saved === 'null') {
        saved = null;
      }
      return saved as T;
    } catch (e) {
      console.log('Storage is not available.', this.getAnyClass(e));
      if (e instanceof DOMException) {
        console.log('Using mock responses.');
        if (e instanceof DOMException && key === 'roomName') {
          return ('room123456' as unknown) as T;
        } else if (e instanceof DOMException && key === 'roomId') {
          return (2687219796 as unknown) as T;
        } else if (e instanceof DOMException && key === 'isLoggedIn') {
          return (true as unknown) as T;
        } else if (e instanceof DOMException && key === 'userName') {
          return ('User' as unknown) as T;
        }
      }
      return (null as unknown) as T;
    }
  }

  private getAnyClass(obj: any): string {
    if (typeof obj === 'undefined') {
      return 'undefined';
    }
    if (obj === null) {
      return 'null';
    }
    return obj.constructor.name;
  }

  saveState(key: string, value: any): void {
    try {
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value.toString());
      }
    } catch (e) {
      console.log('Storage is not available.', e);
    }
  }

  castValueToType(value: unknown, type: string) {
    if (type === 'boolean') {
      if (value === null) {
        return null;
      }
      if (!value) {
        return false;
      }
      if (typeof value === 'string') {
        return JSON.parse(value);
      }
    }
    if (type === 'object') {
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (error) {
          console.log('[State]', error, value);
        }
      }
    }
    return value;
  }

  clearState(): void {
    this.roomId = null;
    this.startTime = null;
    this.isLoggedIn = false;
  }
}
