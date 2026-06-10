import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { IconComponent } from '../icon.component';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="overlay" (mousedown)="close.emit()">
      <div class="modal" [style.maxWidth]="wide ? '720px' : null" (mousedown)="$event.stopPropagation()">
        <div class="modal-head">
          <div class="modal-title">{{ title }}</div>
          <button class="icon-btn" style="margin-left:auto;width:32px;height:32px" (click)="close.emit()">
            <app-icon name="x" [size]="18"></app-icon>
          </button>
        </div>
        <div class="modal-body"><ng-content></ng-content></div>
        <div class="modal-foot"><ng-content select="[modalFoot]"></ng-content></div>
      </div>
    </div>`,
})
export class ModalComponent {
  @Input() title = '';
  @Input() wide = false;
  @Output() close = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEsc() { this.close.emit(); }
}
