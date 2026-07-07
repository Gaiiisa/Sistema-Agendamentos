import { Component, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { IconComponent } from '../icon.component';

@Component({
  selector: 'app-checkbox',
  standalone: true,
  imports: [CommonModule, IconComponent],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CheckboxComponent), multi: true }],
  template: `
    <span class="chk" [class.disabled]="disabled" tabindex="0"
      role="checkbox" [attr.aria-checked]="value"
      (click)="toggle()"
      (keydown.space)="onSpace($event)"
      (keydown.enter)="onSpace($event)">
      <span class="checkbox" [class.on]="value">
        @if (value) { <app-icon name="check" [size]="11"></app-icon> }
      </span>
      @if (label) { <span class="chk-txt">{{ label }}</span> }
      <ng-content></ng-content>
    </span>
  `,
  styles: [`
    .chk {
      display: inline-flex; align-items: center; gap: 8px;
      cursor: pointer; font-size: 14px; user-select: none;
    }
    .chk:focus { outline: none; }
    .chk:focus .checkbox {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-soft);
    }
    .chk.disabled { opacity: .55; cursor: not-allowed; }
    .chk-txt { font-weight: 500; color: var(--text); }
  `],
})
export class CheckboxComponent implements ControlValueAccessor {
  @Input() label?: string;
  @Input() disabled = false;
  @Input() value = false;
  @Output() valueChange = new EventEmitter<boolean>();

  private onChange: (v: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(v: any) { this.value = !!v; }
  registerOnChange(fn: (v: boolean) => void) { this.onChange = fn; }
  registerOnTouched(fn: () => void) { this.onTouched = fn; }
  setDisabledState(d: boolean) { this.disabled = d; }

  toggle() {
    if (this.disabled) return;
    this.value = !this.value;
    this.valueChange.emit(this.value);
    this.onChange(this.value);
    this.onTouched();
  }

  onSpace(ev: Event) { ev.preventDefault(); this.toggle(); }
}
