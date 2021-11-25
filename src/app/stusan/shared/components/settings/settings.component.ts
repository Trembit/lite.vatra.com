import {
  Component, OnInit, ChangeDetectionStrategy, Inject, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, OnDestroy
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ThemeType } from '@enums';
import { MediaService, Resolution } from '@shared/services/media.service';
import { PopupRef } from '@shared/services/popup/popup.ref';
import { SettingsService } from '@shared/services/settings.service';
import { StateService } from '@shared/services/state.service';


@Component({
  selector: 'thevatra-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent implements OnInit, AfterViewInit, OnDestroy {
  destroyed$ = new Subject<boolean>();

  public stream: MediaStream | null;
  form: FormGroup;
  videoInputs: any[] = [];
  audioInputs: any[] = [];
  videoResolutions: any[] = [];
  resolutionFailed = false;
  resolutionSelectionAvailable = true;
  @ViewChild('preview') preview: ElementRef<HTMLVideoElement>;

  get audioInput(): string {
    return this.form.get('mic')?.value || undefined;
  }

  constructor(
    private dialogRef: PopupRef<SettingsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder,
    private settingsService: SettingsService,
    private stateService: StateService,
    private media: MediaService,
    private cdr: ChangeDetectorRef,
  ) { }

  async ngAfterViewInit(): Promise<void> {
    await this.settingsService.updateDevices();
    this.stateService.isLoggedIn$.pipe(takeUntil(this.destroyed$)).subscribe((isLoggedIn) => {
      this.resolutionSelectionAvailable = !isLoggedIn;
    });
    if (this.data.stream) {
      const previewStream = this.data.stream.clone();
      this.data.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      await this.setPreview(previewStream);
    } else {
      const videoDeviceId = this.stateService.videoDeviceId;
      this.getVideoPreview(videoDeviceId).then(async (stream) => {
        if (!videoDeviceId) {
          await this.settingsService.updateDevices();
        }
        await this.setPreview(stream);
      });
    }
  }

  optionsFromDevices(devices: MediaDeviceInfo[]) {
    return devices.map((device) => {
      return { label: device.label, value: device.deviceId };
    });
  }

  optionsFromResolutions(resolutions: Resolution[]) {
    return resolutions.map(this.optionFromResolution);
  }

  optionFromResolution(resolution: Resolution) {
    return { label: resolution.name, value: resolution };
  }

  ngOnInit(): void {
    this.settingsService.getDevices().pipe(takeUntil(this.destroyed$)).subscribe((devices) => {
      this.videoInputs = this.optionsFromDevices(devices.videoDevices);
      this.audioInputs = this.optionsFromDevices(devices.audioDevices);
      this.cdr.markForCheck();
    });
    this.form = this.fb.group({
      theme: [this.stateService.theme === ThemeType.Dark, [Validators.required]],
      camera: [this.stateService.videoDeviceId, [Validators.required]],
      resolution: ['', this.resolutionSelectionAvailable ? [Validators.required] : []],
      simulcast: [this.stateService.simulcastEnabled],
      mic: [this.stateService.audioDeviceId, [Validators.required]],
    });
    this.form.get('theme')?.valueChanges.pipe(takeUntil(this.destroyed$)).subscribe((isDark) => {
      this.stateService.theme = isDark ? ThemeType.Dark : ThemeType.Light;
      this.cdr.markForCheck();
    });
    this.form.get('camera')?.valueChanges.pipe(takeUntil(this.destroyed$)).subscribe((deviceId) => {

      this.stateService.videoDeviceId = deviceId;
      this.resolutionFailed = false;
      this.updatePreview(deviceId);
    });
    this.form.get('resolution')?.valueChanges.pipe(takeUntil(this.destroyed$)).subscribe((resolution) => {
      if (this.stream) {
        this.media.applyResolution(this.stream, resolution).then((success) => {
          if (success) {
            this.stateService.resolution = resolution;
            this.resolutionFailed = false;
          } else {
            this.resolutionFailed = true;
            this.form.get('resolution')?.setValue(this.getCurrentResolution(this.stream), {
              onlySelf: true, emitModelToViewChange: true, emitEvent: false, emitViewToModelChange: true
            });
          }
          this.cdr.markForCheck();
        });
      }
    });
    this.form.get('simulcast')?.valueChanges.pipe(takeUntil(this.destroyed$)).subscribe((enabled) => {
      this.stateService.simulcastEnabled = enabled;
    });
    this.form.get('mic')?.valueChanges.pipe(takeUntil(this.destroyed$)).subscribe((deviceId) => {
      this.stateService.audioDeviceId = deviceId;
    });
    this.dialogRef.overlay.backdropClick().pipe(takeUntil(this.destroyed$)).subscribe(() => {
      this.close();
    });
    this.dialogRef.overlay.keydownEvents().pipe(takeUntil(this.destroyed$)).subscribe((event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        this.close();
      }
    });
  }

  async updatePreview(deviceId: string) {
    if (this.stream) {
      this.stopStream(this.stream);
    }
    const stream = await this.getVideoPreview(deviceId);
    await this.updateResolutions(stream);
    await this.setPreview(stream);

  }

  async updateResolutions(stream: MediaStream) {
    const supported = await this.media.getSupportedResolutions(stream, true);
    this.videoResolutions = this.optionsFromResolutions(supported);
    this.cdr.markForCheck();
  }


  async setPreview(stream: MediaStream): Promise<void> {
    this.preview.nativeElement.srcObject = stream;
    this.preview.nativeElement.muted = true;
    this.stream = stream;
    await this.updateForm(this.stream);
    return this.preview.nativeElement.play();
  }

  async updateForm(stream: MediaStream): Promise<void> {
    const data: any = {};
    await this.updateResolutions(stream);
    let resolution: any = this.getCurrentResolution(stream);
    if (resolution) {
      resolution = this.optionFromResolution(resolution);
      if (resolution) {
        data.resolution = resolution.value;
      }
    }
    const mic: string | null = this.getCurrentAudioId(stream) || null;
    if (mic) {
      if (mic === 'default') {
        const defaultMic = await this.settingsService.getDefaultAudioDevice();
        if (defaultMic) {
          data.mic = defaultMic.deviceId;
        }
      } else {
        data.mic = mic;
      }
    }
    const camera: string | null = this.getCurrentVideoId(stream) || null;
    if (camera) {
      if (camera === 'default') {
        const defaultCam = await this.settingsService.getDefaultVideoDevice();
        if (defaultCam) {
          data.camera = defaultCam.deviceId;
        }
      } else {
        data.camera = camera;
      }
    }
    this.form.patchValue(data, { emitEvent: false });
  }

  getVideoPreview(deviceId?: string | null): Promise<MediaStream> {
    const constraints = {
      video: !!deviceId ? {
        deviceId: {
          exact: deviceId,
        },
      } : true,
      audio: !!this.audioInput ? {
        deviceId: {
          exact: this.audioInput,
        },
      } : true,
    };
    return this.media.getMediaStream(constraints);
  }

  stopStream(stream = this.stream) {
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
      stream = null;
    }
  }

  close(): void {
    this.dialogRef.close({ stream: this.stream?.clone(), changed: this.form.touched });
    this.stopStream();
  }

  getCurrentResolution(stream: MediaStream | null): Resolution | null {
    if (stream) {
      return this.media.getStreamResolution(stream);
    }
    return null;
  }

  getCurrentVideoId(stream: MediaStream | null): string | null {
    if (stream) {
      return this.media.getStreamVideoId(stream);
    }
    return null;
  }

  getCurrentAudioId(stream: MediaStream | null): string | null {
    if (stream) {
      return this.media.getStreamAudioId(stream);
    }
    return null;
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
