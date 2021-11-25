import {Component, OnInit, ChangeDetectionStrategy, Output, EventEmitter} from '@angular/core';

@Component({
  selector: 'thevatra-mic-warning-popup',
  templateUrl: './mic-warning-popup.component.html',
  styleUrls: ['./mic-warning-popup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MicWarningPopupComponent implements OnInit {

  @Output() accessMicrophone = new EventEmitter();
  constructor() { }

  ngOnInit(): void {
  }

}
