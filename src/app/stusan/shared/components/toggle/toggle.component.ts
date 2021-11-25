import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'thevatra-toggle',
  templateUrl: './toggle.component.html',
  styleUrls: ['./toggle.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: ToggleComponent,
    },
  ],
})
export class ToggleComponent implements ControlValueAccessor {
  value = false;
  disabled = false;
  touched = false;
  get icon(): string | null {
    if (!!this.iconOn || !!this.iconOff) {
      return !!this.value ? this.iconOn : this.iconOff;
    }
    return null;
  }
  @Input('icon-off') iconOff: string;
  @Input('icon-on') iconOn: string;
  constructor(private cdr: ChangeDetectorRef) { }
  onChange = (on: boolean) => { };
  onTouched = () => { };
  writeValue(value: boolean): void {
    this.value = value;
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
      this.value = !this.value;
      this.onChange(this.value);
      this.cdr.markForCheck();
    }
  }

}
