import { Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { IconComponent } from '../icon.component';

export interface SelectOption {
  value: any;
  label: string;
  icon?: string;
  color?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule, IconComponent],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SelectComponent), multi: true }],
  template: `
    <div class="sel-root" [class.disabled]="disabled" [class.open]="open">
      <button #trigger type="button" class="sel-trigger" (click)="toggle()" [disabled]="disabled"
        [attr.aria-expanded]="open" [attr.aria-haspopup]="'listbox'">
        <span class="sel-label" [class.placeholder]="!hasLabel">
          @if (selected?.icon) {
            <app-icon [name]="selected!.icon!" [size]="14"
              [style.color]="selected!.color || null"></app-icon>
          }
          <span class="sel-txt" [style.color]="selected?.color || null">{{ triggerLabel }}</span>
        </span>
        <app-icon name="chevD" [size]="14" class="sel-chev"></app-icon>
      </button>
      @if (open) {
        <div class="sel-panel" role="listbox"
          [style.top.px]="panelTop" [style.left.px]="panelLeft" [style.width.px]="panelWidth">
          @if (allowCreate) {
            <input #search class="sel-search"
              [value]="filter"
              (input)="filter = $any($event.target).value; hi = -1"
              (keydown)="onSearchKey($event)"
              placeholder="Pesquisar">
          }
          @for (o of visibleOptions; track $index; let i = $index) {
            <button type="button" class="sel-opt"
              [class.on]="isSelected(o)" [class.hi]="hi === i" [disabled]="o.disabled"
              (mouseenter)="hi = i" (click)="pick(o)" role="option">
              @if (o.icon) {
                <app-icon [name]="o.icon" [size]="14" [style.color]="o.color || null"></app-icon>
              }
              <span class="sel-opt-lbl" [style.color]="o.color || null">{{ o.label }}</span>
              @if (isSelected(o)) { <app-icon name="check" [size]="14" class="sel-tick"></app-icon> }
            </button>
          }
          @if (allowCreate && filter.trim() && !hasExactMatch) {
            <button type="button" class="sel-opt sel-opt-create" (click)="pickCreate()" role="option">
              <app-icon name="plus" [size]="14"></app-icon>
              <span class="sel-opt-lbl">Criar “{{ filter.trim() }}”</span>
            </button>
          }
          @if (!visibleOptions.length && !(allowCreate && filter.trim())) {
            <div class="sel-empty">Sem opções</div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .sel-root { position: relative; width: 100%; }
    .sel-trigger {
      width: 100%; padding: 8px 34px 8px 11px; border-radius: var(--r-md);
      border: 1px solid var(--border-strong);
      background: var(--surface); color: var(--text);
      font-size: 14px; line-height: 1.5;
      display: flex; align-items: center; gap: 8px; cursor: pointer;
      text-align: left; position: relative; margin: 0;
      transition: border-color .12s, box-shadow .12s;
    }
    .sel-trigger:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
    .sel-trigger:disabled, .sel-root.disabled .sel-trigger { opacity: .55; cursor: not-allowed; }
    .sel-label {
      display: inline-flex; align-items: center; gap: 6px;
      flex: 1; min-width: 0;
    }
    .sel-txt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sel-label.placeholder .sel-txt { color: var(--text-3); }
    .sel-chev {
      position: absolute; right: 11px; color: var(--text-3);
      transition: transform .12s;
    }
    .sel-root.open .sel-chev { transform: rotate(180deg); }
    .sel-panel {
      position: fixed;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--r-md); box-shadow: var(--sh-lg);
      padding: 4px; max-height: 280px; overflow-y: auto; z-index: 2000;
      animation: sel-in .12s ease;
    }
    @keyframes sel-in {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: none; }
    }
    .sel-opt {
      display: flex; align-items: center; gap: 8px; width: 100%;
      padding: 8px 10px; border-radius: 6px; background: none; border: none;
      font-size: 13.5px; text-align: left; color: var(--text); cursor: pointer;
    }
    .sel-opt.hi { background: var(--surface-2); }
    .sel-opt.on { font-weight: 600; }
    .sel-opt:disabled { opacity: .45; cursor: not-allowed; }
    .sel-opt-lbl { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sel-tick { color: var(--accent); }
    .sel-empty { padding: 10px; text-align: center; color: var(--text-3); font-size: 13px; }
    .sel-search {
      width: 100%; padding: 7px 10px; margin-bottom: 4px;
      border: 1px solid var(--border); border-radius: 6px;
      background: var(--surface-2); color: var(--text);
      font-size: 13px; font-family: inherit; outline: none;
    }
    .sel-search:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
    .sel-opt-create { color: var(--accent-text); font-weight: 600; }
    .sel-opt-create:hover, .sel-opt-create.hi { background: var(--accent-soft); }
  `],
})
export class SelectComponent implements ControlValueAccessor {
  @Input() options: SelectOption[] = [];
  @Input() placeholder?: string;
  @Input() disabled = false;
  @Input() value: any = null;
  @Input() allowCreate = false;
  @Output() valueChange = new EventEmitter<any>();

  @ViewChild('trigger') triggerRef?: ElementRef<HTMLButtonElement>;
  @ViewChild('search') searchRef?: ElementRef<HTMLInputElement>;

  open = false;
  hi = -1;
  filter = '';
  panelTop = 0;
  panelLeft = 0;
  panelWidth = 0;

  private onChange: (v: any) => void = () => {};
  private onTouched: () => void = () => {};
  private scrollHandler = () => this.close();

  constructor(private host: ElementRef<HTMLElement>) {}

  writeValue(v: any) { this.value = v; }
  registerOnChange(fn: (v: any) => void) { this.onChange = fn; }
  registerOnTouched(fn: () => void) { this.onTouched = fn; }
  setDisabledState(d: boolean) { this.disabled = d; }

  get selected(): SelectOption | undefined {
    return this.options.find(o => o.value === this.value);
  }
  get hasLabel(): boolean {
    return !!this.selected || (this.allowCreate && this.value != null && this.value !== '');
  }
  get triggerLabel(): string {
    if (this.selected) return this.selected.label;
    if (this.allowCreate && this.value != null && this.value !== '') return String(this.value);
    return this.placeholder ?? 'Selecione…';
  }
  get visibleOptions(): SelectOption[] {
    if (!this.allowCreate || !this.filter.trim()) return this.options;
    const f = this.filter.trim().toLowerCase();
    return this.options.filter(o => o.label.toLowerCase().includes(f));
  }
  get hasExactMatch(): boolean {
    const f = this.filter.trim().toLowerCase();
    return !!f && this.options.some(o => o.label.toLowerCase() === f);
  }

  isSelected(o: SelectOption): boolean { return o.value === this.value; }

  toggle() {
    if (this.disabled) return;
    if (this.open) { this.close(); return; }
    this.positionPanel();
    this.open = true;
    this.filter = '';
    this.hi = this.options.findIndex(o => o.value === this.value);
    this.onTouched();
    window.addEventListener('scroll', this.scrollHandler, true);
    if (this.allowCreate) {
      setTimeout(() => this.searchRef?.nativeElement.focus(), 0);
    }
  }

  close() {
    if (!this.open) return;
    this.open = false;
    this.hi = -1;
    this.filter = '';
    window.removeEventListener('scroll', this.scrollHandler, true);
  }

  pickCreate() {
    const v = this.filter.trim();
    if (!v) return;
    const match = this.options.find(o => o.label.toLowerCase() === v.toLowerCase());
    if (match) { this.pick(match); return; }
    this.value = v;
    this.valueChange.emit(v);
    this.onChange(v);
    this.close();
  }

  onSearchKey(ev: KeyboardEvent) {
    if (ev.key === 'ArrowDown') { ev.preventDefault(); this.moveHi(1); return; }
    if (ev.key === 'ArrowUp')   { ev.preventDefault(); this.moveHi(-1); return; }
    if (ev.key === 'Escape')    { ev.preventDefault(); this.close(); return; }
    if (ev.key === 'Enter') {
      ev.preventDefault();
      const opts = this.visibleOptions;
      if (this.hi >= 0 && this.hi < opts.length) this.pick(opts[this.hi]);
      else this.pickCreate();
    }
  }

  private positionPanel() {
    const btn = this.triggerRef?.nativeElement;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const gap = 4;
    const maxPanelH = 280;
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const above = spaceBelow < 200 && spaceAbove > spaceBelow;
    this.panelWidth = r.width;
    this.panelLeft = r.left;
    this.panelTop = above
      ? Math.max(8, r.top - Math.min(maxPanelH, spaceAbove - gap) - gap)
      : r.bottom + gap;
  }

  @HostListener('window:resize')
  onResize() { if (this.open) this.close(); }

  pick(o: SelectOption) {
    if (o.disabled) return;
    this.value = o.value;
    this.valueChange.emit(o.value);
    this.onChange(o.value);
    this.close();
  }

  @HostListener('document:mousedown', ['$event'])
  onDocDown(ev: MouseEvent) {
    if (!this.open) return;
    if (!this.host.nativeElement.contains(ev.target as Node)) this.close();
  }

  @HostListener('keydown', ['$event'])
  onKey(ev: KeyboardEvent) {
    if (this.disabled || ev.defaultPrevented) return;
    if (!this.open) {
      if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'ArrowDown') {
        ev.preventDefault(); this.toggle();
      }
      return;
    }
    if (ev.key === 'Escape') { ev.preventDefault(); this.close(); return; }
    if (ev.key === 'ArrowDown') { ev.preventDefault(); this.moveHi(1); return; }
    if (ev.key === 'ArrowUp')   { ev.preventDefault(); this.moveHi(-1); return; }
    if (ev.key === 'Enter') {
      ev.preventDefault();
      const opts = this.visibleOptions;
      if (this.hi >= 0 && this.hi < opts.length) this.pick(opts[this.hi]);
    }
  }

  private moveHi(step: number) {
    const opts = this.visibleOptions;
    if (!opts.length) return;
    let idx = this.hi;
    for (let i = 0; i < opts.length; i++) {
      idx = (idx + step + opts.length) % opts.length;
      if (!opts[idx].disabled) break;
    }
    this.hi = idx;
  }
}
