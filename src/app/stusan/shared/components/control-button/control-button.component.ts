import { Component, ChangeDetectionStrategy, Input } from '@angular/core';

@Component({
  selector: 'stusan-control-button',
  templateUrl: './control-button.component.html',
  styleUrls: ['./control-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ControlButtonComponent {
  @Input() label: string;
  @Input() iconBg: string;
  @Input() iconColor: string;
  @Input() ariaLabel?: string;

}
