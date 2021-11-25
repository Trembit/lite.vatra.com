import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { PopupContent, PopupRef } from './popup.ref';

@Component({
  templateUrl: './popup.component.html',
})
export class PopupComponent implements OnInit {
  renderMethod: 'text' | 'template' | 'component' = 'component';
  content: any;
  context: any;

  @ViewChild('template', { static: false }) template: any;

  constructor(private popupRef: PopupRef) {
  }

  ngOnInit() {
    this.content = this.popupRef.content;
    if (this.content instanceof TemplateRef) {
      this.renderMethod = 'template';
      const data = this.popupRef.data;
      this.context = {
        close: this.popupRef.close.bind(this.popupRef),
        data,
      };
    } else if (typeof (this.content) === 'string') {
      this.renderMethod = 'text';
      this.context = {
        close: this.popupRef.close.bind(this.popupRef),
      };
    }

  }
}
