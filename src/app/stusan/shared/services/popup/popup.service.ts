import { ConnectionPositionPair, FlexibleConnectedPositionStrategyOrigin, Overlay } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { ElementRef, Injectable, Injector, TemplateRef, InjectionToken } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { PopupComponent } from './popup.component';
import { PopupContent, PopupRef } from './popup.ref';


export const POPUP_DATA = new InjectionToken<{}>('Popup data from parent');

export interface PopupParams<T> {
  width?: string | number;
  height?: string | number;
  panelClass?: string;
  origin: HTMLElement | ElementRef;
  content: PopupContent;
  data?: T;
  location?: string;
}

@Injectable({
  providedIn: 'root',
})

export class PopupService {
  dropdownPositions: ConnectionPositionPair[] = [
    {
      originX: 'start',
      originY: 'bottom',
      overlayX: 'start',
      overlayY: 'top',
    },
  ];
  menuPositions: ConnectionPositionPair[] = [
    {
      originX: 'center',
      originY: 'bottom',
      overlayX: 'center',
      overlayY: 'top',
    },
  ];
  tooltipPositions: ConnectionPositionPair[] = [
    {
      originX: 'end',
      originY: 'center',
      overlayX: 'start',
      overlayY: 'bottom',
    },
  ];
  settingsPositions: ConnectionPositionPair[] = [
    {
      originX: 'start',
      originY: 'top',
      overlayX: 'end',
      overlayY: 'bottom',
    },
  ];
  constructor(
    private overlay: Overlay,
    private injector: Injector,
  ) { }

  dropdown<T>(origin: ElementRef, dropdown: TemplateRef<any>, data?: any): PopupRef<T> {
    const originRect = origin.nativeElement.getBoundingClientRect();
    const overlayRef = this.overlay.create({
      width: originRect.width,
      hasBackdrop: true,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      positionStrategy: this.dropdownPositionStrategy(origin),
      backdropClass: 'dropdown-backdrop',
      panelClass: data?.panelClass || 'dropdown-panel',
    });
    const popupRef = new PopupRef<T>(overlayRef, dropdown, data);
    const injector = Injector.create({
      parent: this.injector,
      providers: [
        { provide: PopupRef, useValue: popupRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    overlayRef.attach(new ComponentPortal(PopupComponent, null, injector));
    return popupRef;
  }

  dropdownPositionStrategy(origin: FlexibleConnectedPositionStrategyOrigin) {
    return this.overlay.position()
      .flexibleConnectedTo(origin)
      .withPositions(this.dropdownPositions)
      .withFlexibleDimensions()
      .withViewportMargin(5)
      .withPush(false);
  }

  modal<T>(dialog: any, data?: any, top = '80px'): PopupRef<T> {
    const overlayRef = this.overlay.create({
      hasBackdrop: true,
      scrollStrategy: this.overlay.scrollStrategies.noop(),
      positionStrategy: this.overlay.position().global().centerHorizontally().top(top),
      backdropClass: 'modal-backdrop',
      panelClass: 'modal-panel',
    });
    const popupRef = new PopupRef<T>(overlayRef, dialog, { ...data, closeByEsc: false });
    const injector = Injector.create({
      parent: this.injector,
      providers: [
        { provide: PopupRef, useValue: popupRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    overlayRef.attach(new ComponentPortal(PopupComponent, null, injector));
    return popupRef;
  }

  dialog<T>(dialog: any, data?: any, top = '80px'): PopupRef<T> {
    const overlayRef = this.overlay.create({
      hasBackdrop: true,
      scrollStrategy: this.overlay.scrollStrategies.block(),
      positionStrategy: this.overlay.position().global().centerHorizontally().top(top),
      backdropClass: 'dialog-backdrop',
      panelClass: ['dialog-panel'].concat(data?.panelClass || []),
    });
    const popupRef = new PopupRef<T>(overlayRef, dialog, data);
    const injector = Injector.create({
      parent: this.injector,
      providers: [
        { provide: PopupRef, useValue: popupRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    overlayRef.attach(new ComponentPortal(PopupComponent, null, injector));
    return popupRef;
  }

  settings<T>(origin: ElementRef, dialog: any, data?: any): PopupRef<T> {
    const overlayRef = this.overlay.create({
      hasBackdrop: true,
      scrollStrategy: this.overlay.scrollStrategies.block(),
      positionStrategy: this.settingsStrategy(origin),
      backdropClass: 'dialog-backdrop',
      panelClass: ['dialog-panel'].concat(data?.panelClass || []),
    });
    const popupRef = new PopupRef<T>(overlayRef, dialog, data);
    const injector = Injector.create({
      parent: this.injector,
      providers: [
        { provide: PopupRef, useValue: popupRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    overlayRef.attach(new ComponentPortal(PopupComponent, null, injector));
    return popupRef;
  }

  settingsStrategy(origin: FlexibleConnectedPositionStrategyOrigin) {
    return this.overlay.position()
      .flexibleConnectedTo(origin)
      .withPositions(this.settingsPositions)
      .withFlexibleDimensions()
      .withViewportMargin(5)
      .withPush(false);
  }



  tooltipStrategy(origin: FlexibleConnectedPositionStrategyOrigin) {
    return this.overlay.position()
      .flexibleConnectedTo(origin)
      .withPositions(this.tooltipPositions)
      .withFlexibleDimensions()
      .withViewportMargin(5)
      .withPush(false);
  }

  tooltip<T>(origin: ElementRef, tooltip: string | TemplateRef<any>, data: any = null): PopupRef<T> {
    const overlayRef = this.overlay.create({
      hasBackdrop: false,
      scrollStrategy: this.overlay.scrollStrategies.close(),
      positionStrategy: this.tooltipStrategy(origin),
      panelClass: 'tooltip-panel',
    });
    const popupRef = new PopupRef<T>(overlayRef, tooltip, data);
    const injector = Injector.create({
      parent: this.injector,
      providers: [
        { provide: PopupRef, useValue: popupRef },
      ],
    });
    overlayRef.attach(new ComponentPortal(PopupComponent, null, injector));
    return popupRef;
  }
}
