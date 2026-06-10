import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from '../icon.component';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [IconComponent],
  template: `
    <header class="topbar">
      <div class="col" style="line-height:1.2">
        <div class="tb-title">{{ title }}</div>
        @if (sub) { <div class="tb-sub">{{ sub }}</div> }
      </div>
      <div class="tb-right">
        <button class="icon-btn">
          <app-icon name="search" [size]="18"></app-icon>
        </button>
        <button class="icon-btn">
          <span class="dot"></span>
          <app-icon name="bell" [size]="18"></app-icon>
        </button>
        <button class="btn btn-primary" (click)="onNew.emit()">
          <app-icon name="plus" [size]="17"></app-icon> Novo agendamento
        </button>
      </div>
    </header>`,
})
export class TopbarComponent {
  @Input() title = '';
  @Input() sub = '';
  @Output() onNew = new EventEmitter<void>();
}
