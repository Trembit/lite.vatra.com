import { Injectable } from '@angular/core';

@Injectable({  providedIn: 'root' })
export class SoundService {
  private joinAudio: HTMLAudioElement;
  private leaveAudio: HTMLAudioElement;

  constructor() { }

  public playJoin() {
    if (!this.joinAudio) {
      this.joinAudio = new Audio('../../../../assets/media/join.mp3');
    }
    // this.joinAudio.play();
  }
  public playLeave() {
    if (!this.leaveAudio) {
      this.leaveAudio = new Audio('../../../../assets/media/leave.mp3');
    }
    // this.leaveAudio.play();
  }
}
