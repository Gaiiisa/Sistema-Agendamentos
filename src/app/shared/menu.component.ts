import { Component, ElementRef, HostListener, Input } from '@angular/core';
import { IconComponent } from '../icon.component';

export interface MenuItem {
  label?: string;
  icon?: string;
  onClick?: () => void;
  danger?: boolean;
  divider?: boolean;
}

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div style="position: relative">
      <button class="icon-btn" style="width:32px;height:32px" (click)="open = !open">
        <app-icon name="dots" [size]="18"></app-icon>
      </button>
      @if (open) {
        <div style="position:absolute;right:0;top:110%;z-index:30;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-md);box-shadow:var(--sh-pop);padding:5px;min-width:168px">
          @for (it of items; track $index) {
            @if (it.divider) {
              <div class="divider" style="margin:5px 0"></div>
            } @else {
              <button (click)="run(it)"
                [style.color]="it.danger ? 'var(--st-faltou)' : 'var(--text)'"
                style="display:flex;align-items:center;gap:9px;width:100%;text-align:left;padding:8px 10px;border-radius:7px;font-size:13.5px;font-weight:500"
                (mouseenter)="bg($event, 'var(--surface-2)')" (mouseleave)="bg($event, 'transparent')">
                @if (it.icon) { <app-icon [name]="it.icon" [size]="15"></app-icon> }
                {{ it.label }}
              </button>
            }
          }
        </div>
      }
    </div>`,
})
export class MenuComponent {
  @Input() items: MenuItem[] = [];
  open = false;

  constructor(private el: ElementRef) {}

  @HostListener('document:mousedown', ['$event'])
  onDoc(e: MouseEvent) {
    if (this.open && !this.el.nativeElement.contains(e.target)) this.open = false;
  }

  run(it: MenuItem) {
    this.open = false;
    it.onClick?.();
  }
  bg(e: Event, color: string) {
    (e.currentTarget as HTMLElement).style.background = color;
  }
}
