import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, Input, ViewChild, ElementRef, TemplateRef, HostBinding } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { PopupRef } from '@shared/services/popup/popup.ref';
import { PopupService } from '@shared/services/popup/popup.service';

@Component({
  selector: 'thevatra-dropdown',
  templateUrl: './dropdown.component.html',
  styleUrls: ['./dropdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: DropdownComponent,
    },
  ],
})
export class DropdownComponent implements ControlValueAccessor {
  value: any;
  touched = false;
  opened = false;
  popup: PopupRef | null;
  filteredOptions: any[] = [];
  optionsArray: any[] = [];
  @HostBinding('class.disabled') disabled = false;
  @Input() set options(opts: { label: string, value: any }[]) {
    this.optionsArray = opts;
    if (Array.isArray(opts)) {
      this.setDisabledState(opts.length < 2);
    } else {
      this.setDisabledState(true);
    }
    // this.filteredOptions = opts.filter(option => option.value !== this.value);
  }
  get options() {
    return this.optionsArray.filter(option => option.value !== this.value);
  }
  @Input() placeholder: string;
  @ViewChild('origin') origin: ElementRef<any>;
  @ViewChild('dropdown') dropdown: TemplateRef<any>;

  get textValue(): string {
    const selected = this.optionsArray.find((option) => option.value === this.value);
    if (selected) {
      return selected.label;
    } else {
      return this.placeholder || 'Select';
    }
  }

  constructor(private cdr: ChangeDetectorRef, private popupService: PopupService) { }
  onChange = (on: boolean) => { };
  onTouched = () => { };
  writeValue(value: boolean): void {
    this.value = value;
    this.cdr.markForCheck();
  }
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  markAsTouched() {
    if (!this.touched) {
      this.onTouched();
      this.touched = true;
      this.cdr.markForCheck();
    }
  }

  setDisabledState(disabled: boolean) {
    this.disabled = disabled;
    this.cdr.markForCheck();
  }

  toggle(): void {
    if (!this.disabled) {
      this.opened ? this.close() : this.open();
    }
  }

  open(): void {
    this.popup = this.popupService.dropdown(this.origin, this.dropdown);
    this.opened = true;
    this.popup.afterClosed$.subscribe((result) => {
      this.popup = null;
      this.opened = false;
      this.cdr.markForCheck();
    });
    this.cdr.markForCheck();
  }

  close(): void {
    if (this.popup) {
      this.popup.close();
    }
  }

  select(value: any): void {
    this.markAsTouched();
    this.value = value;
    this.onChange(this.value);
    this.close();
  }

}
