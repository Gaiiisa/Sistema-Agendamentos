import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from '../icon.component';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="topbar">
      <div class="tb-spacer"></div>
      <div class="tb-page">
        <span class="tb-title">{{ title }}</span>
        @if (sub) { <span class="tb-sub">{{ sub }}</span> }
      </div>
      <div class="tb-actions">
        @if (newLabel) {
          <button class="btn btn-primary" (click)="onNew.emit()">
            <app-icon name="plus" [size]="14"></app-icon>
            {{ newLabel }}
          </button>
        }
      </div>
    </div>`,
})
export class TopbarComponent {
  @Input() title = '';
  @Input() sub = '';
  @Input() newLabel = '';
  @Output() onNew = new EventEmitter<void>();
}
