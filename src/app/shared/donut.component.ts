import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DonutFatia { valor: number; cor: string; label: string; }

@Component({
  selector: 'app-donut',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg [attr.width]="size" [attr.height]="size"
         [attr.viewBox]="'0 0 ' + size + ' ' + size" style="display:block">
      @for (s of slices; track s.label) {
        <circle [attr.cx]="cx" [attr.cy]="cx" [attr.r]="r"
                fill="none" [attr.stroke]="s.cor"
                [attr.stroke-width]="sw"
                [attr.stroke-dasharray]="s.dash"
                [attr.stroke-dashoffset]="s.offset"
                transform="rotate(-90)"
                [attr.transform-origin]="cx + ' ' + cx"/>
      }
      @if (tampaCentro) {
        <text [attr.x]="cx" [attr.y]="cx + 5"
              text-anchor="middle" font-size="13" font-weight="800"
              fill="currentColor">{{ tampaCentro }}</text>
      }
    </svg>`,
})
export class DonutComponent implements OnChanges {
  @Input() fatias: DonutFatia[] = [];
  @Input() size = 120;
  @Input() tampaCentro = '';

  cx = 60; r = 46; sw = 14;
  slices: { cor: string; label: string; dash: string; offset: number }[] = [];

  ngOnChanges() {
    this.cx = this.size / 2;
    this.sw = this.size * 0.12;
    this.r = (this.size - this.sw) / 2 - 2;
    const circ = 2 * Math.PI * this.r;
    const total = this.fatias.reduce((s, f) => s + f.valor, 0) || 1;
    let acc = 0;
    this.slices = this.fatias.map(f => {
      const pct = f.valor / total;
      const dash = `${(pct * circ).toFixed(2)} ${circ.toFixed(2)}`;
      const offset = -acc * circ;
      acc += pct;
      return { cor: f.cor, label: f.label, dash, offset };
    });
  }
}
