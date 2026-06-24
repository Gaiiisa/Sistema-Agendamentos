import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sparkline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg [attr.width]="w" [attr.height]="h" [attr.viewBox]="'0 0 ' + w + ' ' + h"
         style="display:block;overflow:visible">
      <polyline [attr.points]="pts" fill="none"
                [attr.stroke]="cor" stroke-width="1.8"
                stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
})
export class SparklineComponent implements OnChanges {
  @Input() pontos: number[] = [];
  @Input() cor = 'var(--accent)';
  @Input() w = 64;
  @Input() h = 24;

  pts = '';

  ngOnChanges() {
    const ps = this.pontos;
    if (ps.length < 2) { this.pts = ''; return; }
    const min = Math.min(...ps);
    const max = Math.max(...ps);
    const range = max - min || 1;
    const pad = 2;
    this.pts = ps.map((v, i) => {
      const x = pad + (i / (ps.length - 1)) * (this.w - pad * 2);
      const y = this.h - pad - ((v - min) / range) * (this.h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }
}
