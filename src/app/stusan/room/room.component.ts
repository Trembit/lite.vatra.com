import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as Sentry from '@sentry/browser';
// @ts-ignore
import callstats from 'callstats-js/callstats.min';

import { JanusService } from '@shared/services/janus.service';
import { StateService } from '@shared/services/state.service';
import { JoinRoomResponse, RoomExistsDto, RoomExistsResponse } from '@models';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'stusan-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomComponent implements OnInit {
  isLoggedIn: boolean | null = this.stateService.isLoggedIn;
  connecting = true;
  constructor(
    private router: Router,
    public stateService: StateService,
    public janusService: JanusService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) { }

  async ngOnInit(): Promise<void> {
    this.janusService.connection$.subscribe((connected) => {
      this.connecting = !connected;
      this.cdr.markForCheck();
    });
    const roomName = this.route.snapshot.paramMap.get('roomName');

    // TODO: use canLoad
    if (!this.isLoggedIn) {
      this.router.navigate(['/login', roomName], { skipLocationChange: true });
      return;
    }

    let roomId: any = this.stateService.roomId;
    const userName = this.stateService.userName;

    // Join room
    if (userName) {
      callstats.initialize(environment.callstats.appId, environment.callstats.appSecret, userName);

      this.janusService.roomInfoSubject.subscribe(({ id }) => {
        Sentry.setUser({ roomId, userName, roomName, id });
      });

      if (roomName) {
        const jsRoomId = this.janusService.roomIdFromName(roomName);
        if (roomId !== jsRoomId) { // url was corrected
          roomId = jsRoomId;
          const roomExists: RoomExistsResponse = await this.janusService.roomExists(roomName);
          if (!(roomExists as RoomExistsDto).exists) { // Room doesn't exists, create new one
            await this.janusService.createRoom(roomName);
          }
        }
      }

      const joinRoomResponse: JoinRoomResponse = await this.janusService.joinRoom(roomId, userName);
      this.janusService.publishAboutJoin(userName).subscribe(data => {
        this.stateService.roomName = roomName;
        this.stateService.roomId = roomId;
        // TODO: handle case when success published participant
      });
    }
  }

}
