import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import * as Sentry from '@sentry/browser';
import { BehaviorSubject, Subject } from 'rxjs';
// @ts-ignore
import callstats from 'callstats-js/callstats.min';

import { StateService } from '@shared/services/state.service';
import { JanusService } from '@shared/services/janus.service';
import { PopupService } from '@shared/services/popup/popup.service';
import { SettingsComponent } from '@shared/components/settings/settings.component';
import { MediaService } from '@shared/services/media.service';
import { PopupRef } from '@shared/services/popup/popup.ref';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'stusan-controls',
  templateUrl: './controls.component.html',
  styleUrls: ['./controls.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ControlsComponent implements OnInit, OnDestroy {
  destroyed$ = new Subject<boolean>();

  @ViewChild('settingsButton', { read: ElementRef }) settingsButton: ElementRef<any>;
  public roomUrl: string = window.location.href;
  public isInviteParticipantShown = new BehaviorSubject<boolean>(false);
  public isInviteParticipantSuccessShown = new BehaviorSubject<boolean>(false);
  public isInviteParticipantSuccessTimer: ReturnType<typeof setTimeout>;
  cameraMuting = false;
  micMuting = false;
  settings: PopupRef<any> | null;

  constructor(
    private router: Router,
    public stateService: StateService,
    public janusService: JanusService,
    private cdr: ChangeDetectorRef,
    private popupService: PopupService,
    private media: MediaService,
  ) { }

  ngOnInit(): void {
    this.stateService.isMicEnabled$.pipe(takeUntil(this.destroyed$)).subscribe(() => { this.cdr.markForCheck(); });
    this.stateService.isCamEnabled$.pipe(takeUntil(this.destroyed$)).subscribe(() => { this.cdr.markForCheck(); });
    this.janusService.mutes.pipe(takeUntil(this.destroyed$)).subscribe((mute) => {
      if (mute) {
        if (mute.type === 'video') {
          this.cameraMuting = false;
          this.janusService.sendDCVideoMessage();
        } else if (mute.type === 'audio') {
          this.janusService.sendDCMessage();
          this.micMuting = false;
        }
        this.cdr.markForCheck();
      }
    });
  }

  public async toggleMic(): Promise<void> {
    if (!this.micMuting) {
      this.micMuting = true;
      this.cdr.markForCheck();
      this.janusService.sendAudio(!this.stateService.audioEnabled);
    }
  }

  public toggleCam(): void {
    if (!this.cameraMuting) {
      this.cameraMuting = true;
      this.cdr.markForCheck();
      this.janusService.sendVideo(!this.stateService.videoEnabled);
    }
  }

  public toggleMirror(): void {}

  public finishCall(): void {
    callstats.sendFabricEvent(this.janusService.getVideoRoomPC(), callstats.fabricEvent.fabricTerminated, this.stateService.roomId);
    Sentry.configureScope(scope => scope.setUser(null));

    this.stateService.clearState();
    if (this.stateService.playLeaveSound !== -1) {
      this.stateService.playLeaveSound = 2; // 2 - reload + play, 1 - play + set to zero
    }
    this.janusService.finishCall();
    this.router.navigate(['/']).then(() => {
      // TODO: This workaround fix issues after finishing call
      //  In future we need remove this code and handle in proper way the finishing call
      window.location.reload();
    });
  }

  public toogleShareScreen(): void {
    this.stateService.isScreenShareEnabled$.next(!this.stateService.isScreenShareEnabled$.value);
    this.janusService.switchShareScreen(this.stateService.isScreenShareEnabled$.value);
  }

  public toggleInviteParticipant(): void {
    if (this.isInviteParticipantShown.value || this.isInviteParticipantSuccessShown.value) {
      this.isInviteParticipantShown.next(false);
    } else {
      this.isInviteParticipantShown.next(true);
    }
    this.isInviteParticipantSuccessShown.next(false);
    clearTimeout(this.isInviteParticipantSuccessTimer);
  }

  public copyRoomUrl(): void {
    navigator.clipboard.writeText(this.roomUrl).then((result) => {
      this.isInviteParticipantShown.next(false);
      this.isInviteParticipantSuccessShown.next(true);
      clearTimeout(this.isInviteParticipantSuccessTimer);

      this.isInviteParticipantSuccessTimer = setTimeout(() => {
        this.isInviteParticipantSuccessShown.next(false);
      }, 3000);
    }, (error) => {
      this.isInviteParticipantSuccessShown.next(false);
    });
  }

  public raiseHand(): void {

  }

  public toggleChat(): void {
    this.stateService.isChatShown$.next(!this.stateService.isChatShown$.value);
    this.stateService.isSettingsShown$.next(false);
  }

  public toggleSettings(): void {
    if (this.settings) {
      this.closeSettings();
    } else {
      this.openSettings();
    }
  }
  private openSettings() {
    const origin = this.settingsButton.nativeElement;
    this.settings = this.popupService.settings(origin, SettingsComponent, { stream: this.media.camera, closeByEsc: false });
    this.settings.afterClosed$.pipe(takeUntil(this.destroyed$)).subscribe((result: any) => {
      this.settings = null;
      if (!!result.data.changed) {
        if (result.data.stream instanceof MediaStream) {
          this.media.saveConstraints(result.data.stream);
          this.janusService.replaceVideo(result.data.stream);
        }
      }
    });
  }

  private closeSettings() {
    this.settings?.close();
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
