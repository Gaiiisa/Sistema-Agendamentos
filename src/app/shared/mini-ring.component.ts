import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mini-ring',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg [attr.width]="size" [attr.height]="size"
         [attr.viewBox]="'0 0 ' + size + ' ' + size" style="display:block">
      <circle [attr.cx]="cx" [attr.cy]="cx" [attr.r]="r"
              fill="none" stroke="var(--surface-3)"
              [attr.stroke-width]="sw"/>
      <circle [attr.cx]="cx" [attr.cy]="cx" [attr.r]="r"
              fill="none" [attr.stroke]="cor"
              [attr.stroke-width]="sw"
              stroke-linecap="round"
              [attr.stroke-dasharray]="circ"
              [attr.stroke-dashoffset]="offset"
              transform="rotate(-90)"
              [attr.transform-origin]="cx + ' ' + cx"/>
      @if (label) {
        <text [attr.x]="cx" [attr.y]="cx + 4"
              text-anchor="middle" font-size="11" font-weight="700"
              fill="currentColor">{{ label }}</text>
      }
    </svg>`,
})
export class MiniRingComponent implements OnChanges {
  @Input() pct = 0;
  @Input() cor = 'var(--accent)';
  @Input() size = 52;
  @Input() label = '';

  cx = 26; r = 20; sw = 5; circ = 0; offset = 0;

  ngOnChanges() {
    this.cx = this.size / 2;
    this.r = (this.size - 10) / 2;
    this.sw = Math.max(3, this.size * 0.1);
    this.circ = 2 * Math.PI * this.r;
    const p = Math.min(100, Math.max(0, this.pct));
    this.offset = this.circ * (1 - p / 100);
  }
}
