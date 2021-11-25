import { OverlayRef } from '@angular/cdk/overlay';
import { TemplateRef, Type } from '@angular/core';
import { Subject } from 'rxjs';

export interface PopupCloseEvent<T = any> {
  type: 'backdropClick' | 'close' | 'escKey';
  data: T;
}

export type PopupContent = TemplateRef<any> | Type<any> | string;

export class PopupRef<T = any> {
  private afterClosed = new Subject<PopupCloseEvent<T>>();
  private onKeyDown = new Subject<KeyboardEvent>();
  afterClosed$ = this.afterClosed.asObservable();
  onKeyDown$ = this.onKeyDown.asObservable();

  constructor(
    public overlay: OverlayRef,
    public content: PopupContent,
    public data: any,

  ) {
    overlay.backdropClick().subscribe(() => {
      if (!data || data.closeByClick === true) {
        this._close('backdropClick');
      }
    });
    overlay.keydownEvents().subscribe((event: KeyboardEvent) => {
      this.onKeyDown.next(event);
      if (event.code === 'Escape' && (!data || data.closeByEsc !== false)) {
        this._close('escKey');
      }
    });

  }

  close(data?: any) {
    this._close('close', data);
  }

  private _close(type: PopupCloseEvent['type'], data?: any) {
    this.overlay.dispose();
    this.afterClosed.next({
      type,
      data,
    });
    this.afterClosed.complete();
  }
}
