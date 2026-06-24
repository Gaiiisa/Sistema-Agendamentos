import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-gauge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" style="width:100%;display:block">
      <path [attr.d]="arcPath(0, 180)" fill="none" stroke="var(--surface-3)"
            [attr.stroke-width]="sw" stroke-linecap="round"/>
      <path [attr.d]="arcPath(0, sweep)" fill="none" [attr.stroke]="cor"
            [attr.stroke-width]="sw" stroke-linecap="round"/>
      <text [attr.x]="W/2" [attr.y]="H - 10"
            text-anchor="middle" font-size="22" font-weight="800"
            fill="currentColor">{{ texto || pct + '%' }}</text>
    </svg>`,
})
export class GaugeComponent implements OnChanges {
  @Input() pct = 0;
  @Input() cor = 'var(--accent)';
  @Input() texto = '';

  readonly W = 160; readonly H = 90; readonly sw = 12;
  sweep = 0;

  ngOnChanges() {
    this.sweep = Math.min(180, Math.max(0, this.pct / 100 * 180));
  }

  arcPath(startDeg: number, endDeg: number): string {
    const cx = this.W / 2, cy = this.H - 14, r = (this.W - this.sw * 2) / 2;
    const s = this.toRad(startDeg - 180);
    const e = this.toRad(endDeg - 180);
    const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e);
    const large = (endDeg - startDeg) > 180 ? 1 : 0;
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }
  private toRad(deg: number) { return deg * Math.PI / 180; }
}
