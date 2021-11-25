import { Component, OnInit, AfterContentInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';

import { JanusService } from '@shared/services/janus.service';
import { StateService } from '@shared/services/state.service';
import { CreateRoomDto, CreateRoomResponse, RoomExistsDto, RoomExistsResponse } from '@models';
import { SettingsComponent } from '@shared/components/settings/settings.component';
import { SettingsService } from '@shared/services/settings.service';
import { PopupService } from '@shared/services/popup/popup.service';
import { MediaService } from '@shared/services/media.service';
import { CustomizationService } from '../services/customization.service';
import { CustomizationModel } from '../models/customization.model';
import { SoundService } from '@shared/services/sound.service';

@Component({
  selector: 'stusan-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit, OnDestroy, AfterContentInit {
  destroyed$ = new Subject<boolean>();

  @ViewChild('videoPreview') protected videoPreview: ElementRef<HTMLVideoElement>;
  public loginForm: FormGroup;
  public microphoneAccess: string;
  public previewStream: MediaStream | null;

  public isSirius = false;
  public customConfig: CustomizationModel;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private janusService: JanusService,
    public stateService: StateService,
    private soundService: SoundService,
    private settingsService: SettingsService,
    private popupService: PopupService,
    private media: MediaService,
    public customizationService: CustomizationService,
  ) {
    this.stateService.isCamBanned = false;
    this.media.devicesGetUserMedia(); // check access to cam

    this.isSirius = customizationService.isSirius();
    this.customConfig = customizationService.config;
   }

  ngOnInit(): void {
    const params = new URL(window.location.href).searchParams;

    if (1 === this.stateService.playLeaveSound ) { // We need to use few values as we have reload on logout
      this.soundService.playLeave();
      this.stateService.playLeaveSound = 0;
    } else if (2 === this.stateService.playLeaveSound ) {
      this.stateService.playLeaveSound = 1;
    }

    const skip = params.get('skipPrejoin');
    const username = params.get('userName');
    this.initLoginForm(
      this.route.snapshot.paramMap.get('roomName') || this.stateService.roomName || '', username || this.stateService.userName || ''
    );
    if (skip) {
      this.stateService.isCamEnabled = true;
      this.stateService.isMicEnabled = true;
      this.onSubmit().then();
    }
    this.settingsService.getDevices().subscribe(({ audioDevices, videoDevices }) => {
      if (audioDevices?.length && !audioDevices[0].deviceId) {
        this.microphoneAccess = 'access_denied';
      }
    });
    if (!this.stateService.videoEnabled && this.stateService.isCamEnabled) {
      this.stateService.isCamEnabled = false; // turn of preview
    }
  }

  ngAfterContentInit(): void {
    this.stateService.isCamEnabled$.pipe(takeUntil(this.destroyed$)).subscribe((isCamEnabled) => {
      if (isCamEnabled) {
        this.initVideoPreview(this.stateService.videoDeviceId);
      }
      else if (isCamEnabled === null) {
        this.stateService.isCamEnabled = true;
      } else { // @here: the place to check for no device enter
        this.stopVideoPreview();
        this.stateService.videoEnabled = false;
      }
    });
  }

  public accessMicrophone(): void {
    // TODO: In Chrome we need to repload page after change permission
    // from(navigator.mediaDevices.getUserMedia({ audio: true }))
    //   .pipe(takeUntil(this.destroyed$))
    //   .subscribe(res => {
    //     this.microphoneAccess = '';
    //   }, err => {
    //     this.microphoneAccess = 'access_denied';
    //   });
  }

  protected async initVideoPreview(preview: string | null | MediaStream): Promise<void> {
    if (this.previewStream) {
      this.stopVideoPreview();
    }
    if (preview instanceof MediaStream) {
      this.previewStream = preview;
      this.videoPreview.nativeElement.srcObject = this.previewStream;
      this.media.saveConstraints(preview);
      this.microphoneAccess = '';
    } else {
      this.media.getMediaStream(this.stateService.constraints).then((stream) => {
        this.previewStream = stream;
        this.videoPreview.nativeElement.srcObject = this.previewStream;
        this.microphoneAccess = '';
      }).catch((error) => {
        if (error.name === 'ConstraintNotSatisfiedError') {
          console.error(`Current resolution is not supported by your device.`);
        } else if (error.name === 'PermissionDeniedError') {
          console.error('Permissions have not been granted to use your camera and ' +
            'microphone, you need to allow the page access to your devices');
        } else if ('NotAllowedError' === error.name) { // User blocked cam
          // console.error(`[loginC] cam is banned `, error);
          // this.microphoneAccess = 'access_denied';
          this.stateService.isCamBanned = true;
        } else if ('NotFoundError' === error.name) { // user don't have cam
          this.stateService.isCamBanned = true;
        } else {
          console.error(`[loginC] getMediaStream error: ${error.name} :: `, error);
        }
      });
    }
  }

  protected initLoginForm(roomname: string, username = ''): void {
    this.loginForm = this.fb.group({
      roomName: [roomname, [
        Validators.required,
        Validators.minLength(4),
        Validators.maxLength(50),
      ]],
      userName: [username, [
        Validators.required,
        Validators.minLength(4),
        Validators.maxLength(50),
      ]],
    });
    this.loginForm.get('userName')?.valueChanges.subscribe((value) => {
      this.loginForm.get('userName')?.setValue(value.replace(/\s+/g, ' '), { emitEvent: false });
    });
  }

  public toggleMic(): void {
    this.stateService.isMicEnabled = !this.stateService.isMicEnabled;
    this.stateService.audioEnabled = this.stateService.isMicEnabled;
  }

  public toggleCam(): void {
    this.stateService.isCamEnabled = !this.stateService.isCamEnabled;
    this.stateService.videoEnabled = this.stateService.isCamEnabled;
  }

  public stopVideoPreview(): void {
    if (this.previewStream) {
      this.previewStream.getTracks().forEach((track) => {
        track.enabled = false;
      });
      this.previewStream = null;
    }
  }

  public openSettings(): void {
    this.popupService.dialog(SettingsComponent, { stream: this.previewStream, closeByEsc: false, panelClass: 'settings-dialog' }, '195px')
      .afterClosed$.subscribe((result: any) => {
        if (!!result.data) {
          this.initVideoPreview(result.data.stream);
        }
      });
  }

  public async onSubmit(): Promise<void> {
    const roomName: string = (this.loginForm.get('roomName') as FormControl).value;
    const userName: string = (this.loginForm.get('userName') as FormControl).value;
    let roomId: number;
    this.stateService.userName = userName;

    // Check if such room already exists
    const roomExists: RoomExistsResponse = await this.janusService.roomExists(roomName);
    if (!(roomExists as RoomExistsDto).exists) {
      // Room doesn't exists, create new one
      const createRoomResponse: CreateRoomResponse = await this.janusService.createRoom(roomName);
      roomId = (createRoomResponse as CreateRoomDto).room;
    } else {
      roomId = (roomExists as RoomExistsDto).room;
    }

    this.stateService.startTime = Date.now();
    this.stateService.isLoggedIn = true;
    this.stateService.roomId = roomId;
    if (this.previewStream) {
      this.media.saveConstraints(this.previewStream);
      this.stopVideoPreview();
    }

    this.router.navigate(['/', roomName]);
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
