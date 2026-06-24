import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

interface HmCell { id: string; val: number; }
interface HmRow  { id: number; cells: HmCell[]; }

@Component({
  selector: 'app-heatmap',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    .hm-wrap { display: grid; gap: 3px; }
    .hm-col-label {
      font-size: 10.5px; font-weight: 700; color: var(--text-3);
      text-align: center; padding-bottom: 3px; letter-spacing: .02em;
    }
    .hm-row-label {
      font-size: 10.5px; color: var(--text-3); font-weight: 600;
      display: flex; align-items: center; padding-right: 4px;
      white-space: nowrap;
    }
    .hm-cell {
      height: 30px; border-radius: 4px;
      cursor: default; transition: filter .1s;
    }
    .hm-cell:hover { filter: brightness(0.88); }
    .lv-0 { background: var(--surface-3); }
    .lv-1 { background: var(--accent-soft); }
    .lv-2 { background: var(--accent-soft-2); }
    .lv-3 { background: color-mix(in srgb, var(--accent) 28%, transparent); }
    .lv-4 { background: color-mix(in srgb, var(--accent) 52%, transparent); }
    .lv-5 { background: color-mix(in srgb, var(--accent) 78%, transparent); }
  `],
  template: `
    <div class="hm-wrap"
         [style.grid-template-columns]="'44px repeat(' + colLabels.length + ', 1fr)'">
      <!-- linha de cabeçalho -->
      <div></div>
      @for (d of colLabels; track d) {
        <div class="hm-col-label">{{ d }}</div>
      }
      <!-- linhas de dados -->
      @for (row of rows; track row.id) {
        <div class="hm-row-label">{{ rowLabels[row.id] }}</div>
        @for (cell of row.cells; track cell.id) {
          <div [class]="cellClass(cell.val)" [title]="cell.val + ' atend.'"></div>
        }
      }
    </div>`,
})
export class HeatmapComponent implements OnChanges {
  @Input() colLabels: string[] = [];
  @Input() rowLabels: string[] = [];
  @Input() matrix: number[][] = [];

  maxVal = 1;
  rows: HmRow[] = [];

  ngOnChanges() {
    this.maxVal = Math.max(1, ...this.matrix.flat());
    this.rows = this.matrix.map((r, ri) => ({
      id: ri,
      cells: r.map((val, ci) => ({ id: `${ri}-${ci}`, val })),
    }));
  }

  cellClass(val: number): string {
    const bucket = Math.round((val / this.maxVal) * 5);
    return `hm-cell lv-${bucket}`;
  }
}
