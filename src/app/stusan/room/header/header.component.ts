import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { interval, pipe } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { JanusService } from '@shared/services/janus.service';
import { StateService } from '@shared/services/state.service';
import { LayoutType } from '@enums';
import { CustomizationModel } from '../../models/customization.model';
import { CustomizationService } from '../../services/customization.service';


@UntilDestroy()
@Component({
  selector: 'stusan-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent implements OnInit {
  public roomName?: string;

  public isSirius = false;
  public customConfig: CustomizationModel;

  constructor(
    public janusService: JanusService,
    public stateService: StateService,
    public customizationService: CustomizationService,
    private cdr: ChangeDetectorRef,
  ) {
    this.isSirius = customizationService.isSirius();
    this.customConfig = customizationService.config;
  }

  public startTimer$ = interval(1000).pipe(
    map((seconds: number) => {
      if (this.stateService.startTime) {
        return new Date(Date.now() - this.stateService.startTime)
          .toUTCString()
          .substring(17, 25);
      } else {
        return new Date();
      }
      // In order to get rid of time offset
    }),
    startWith('00:00:00'),
    pipe(untilDestroyed(this)),
  );

  public LayoutTypeEnum = LayoutType;

  ngOnInit(): void {
    this.stateService.roomName$.subscribe((name) => {
      if (name) { this.roomName = name; }
      this.cdr.markForCheck();
    });
  }

  public setLayoutType(layoutType: LayoutType): void {
    this.stateService.layoutType$.next(layoutType);
  }
}
