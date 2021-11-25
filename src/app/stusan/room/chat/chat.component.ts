import { Component, OnInit, ChangeDetectionStrategy, HostBinding } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { StateService } from '@shared/services/state.service';

@UntilDestroy()
@Component({
  selector: 'stusan-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComponent implements OnInit {
  @HostBinding('class.opened') isOpened: boolean;

  constructor(
    private stateService: StateService,
  ) {
  }

  ngOnInit(): void {
    this.stateService.isChatShown$
      .pipe(untilDestroyed(this))
      .subscribe((isChatShown: boolean) => {
        this.isOpened = isChatShown;
      });
  }

  public closeMenu(): void {
    this.stateService.isChatShown$.next(false);
  }
}
