import { Component, ChangeDetectionStrategy, Input } from '@angular/core';

@Component({
  selector: 'stusan-icon',
  templateUrl: './icon.component.html',
  styleUrls: ['./icon.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
  @Input() icon: string;

  constructor() { }
}
