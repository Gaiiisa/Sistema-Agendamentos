import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AreaSerie { dados: number[]; cor: string; tracejado?: boolean; }

interface GridRow  { pctY: number; label: string; }
interface XLabel   { label: string; }
interface DotPt    { pctX: number; pctY: number; }
interface Built    { cor: string; area: string; line: string; dash: string; dots: DotPt[]; }

@Component({
  selector: 'app-area-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- wrapper — altura fixa, position:relative para os elementos absolutos -->
    <div style="position:relative;width:100%" [style.height.px]="altura">

      <!-- zona do gráfico: exclui gutters de labels -->
      <div style="position:absolute;top:4px;bottom:18px;left:42px;right:2px">

        <!-- SVG para geometria apenas — viewBox 0-100, sem distorção de stroke -->
        <svg width="100%" height="100%" viewBox="0 0 100 100"
             preserveAspectRatio="none" style="display:block;overflow:visible">
          @for (g of grids; track g.pctY) {
            <line x1="0" x2="100" [attr.y1]="g.pctY" [attr.y2]="g.pctY"
                  stroke="var(--border)" stroke-width="0.5"
                  vector-effect="non-scaling-stroke"/>
          }
          @for (s of built; track s.cor) {
            <polygon [attr.points]="s.area" [attr.fill]="s.cor" opacity="0.10"/>
            <polyline [attr.points]="s.line" fill="none" [attr.stroke]="s.cor"
                      stroke-width="2" vector-effect="non-scaling-stroke"
                      stroke-linecap="round" stroke-linejoin="round"
                      [attr.stroke-dasharray]="s.dash"/>
          }
        </svg>

        <!-- dots como divs HTML (círculos perfeitos, sem distorção) -->
        @for (s of built; track s.cor) {
          @for (d of s.dots; track d.pctX) {
            <div [style.left.%]="d.pctX" [style.top.%]="d.pctY"
                 [style.background]="s.cor"
                 style="position:absolute;width:7px;height:7px;border-radius:50%;
                        border:2px solid var(--surface);transform:translate(-50%,-50%);
                        pointer-events:none">
            </div>
          }
        }
      </div>

      <!-- labels Y (esquerda) — posicionados em px absolutos -->
      @for (g of grids; track g.pctY) {
        <div [style.top.px]="yLabelPx(g.pctY)"
             style="position:absolute;left:0;width:38px;
                    font-size:10px;color:var(--text-3);
                    text-align:right;white-space:nowrap;
                    transform:translateY(-50%);line-height:1">
          {{ g.label }}
        </div>
      }

      <!-- labels X (baixo) — flex space-between, alinha automaticamente com os pontos -->
      <div style="position:absolute;bottom:0;left:42px;right:2px;height:18px;
                  display:flex;justify-content:space-between;align-items:center">
        @for (l of xLabels; track $index) {
          <span style="font-size:10px;color:var(--text-3);white-space:nowrap">{{ l.label }}</span>
        }
      </div>

    </div>`,
})
export class AreaChartComponent implements OnChanges {
  @Input() labels: string[] = [];
  @Input() series: AreaSerie[] = [];
  @Input() altura = 140;
  @Input() formatY: (v: number) => string = v => String(v);

  private readonly TOP    = 4;   /* px do topo do container até o topo do gráfico */
  private readonly BOTTOM = 18;  /* px do fundo do container até o fundo do gráfico */

  grids:   GridRow[] = [];
  built:   Built[]   = [];
  xLabels: XLabel[]  = [];

  ngOnChanges() {
    const all    = this.series.flatMap(s => s.dados);
    const rawMax = Math.max(1, ...all);
    const nice   = this.niceNumber(rawMax);
    const step   = nice / 4;

    /* linhas de grade: 0 (fundo) até niceMax (topo) */
    this.grids = [0, 1, 2, 3, 4].map(i => ({
      pctY: (1 - (step * i) / nice) * 100,
      label: this.formatY(Math.round(step * i)),
    }));

    const n = this.labels.length;
    this.xLabels = this.labels.map(label => ({ label }));

    /* séries: coordenadas em % do viewBox 0-100 */
    this.built = this.series.map(s => {
      const pts: DotPt[] = s.dados.map((v, i) => ({
        pctX: n <= 1 ? 50 : (i / (n - 1)) * 100,
        pctY: (1 - v / nice) * 100,
      }));
      const line = pts.map(p => `${p.pctX.toFixed(2)},${p.pctY.toFixed(2)}`).join(' ');
      const x0 = pts[0]?.pctX ?? 0;
      const xN = pts[pts.length - 1]?.pctX ?? 100;
      const area = [`${x0.toFixed(2)},100`, ...pts.map(p => `${p.pctX.toFixed(2)},${p.pctY.toFixed(2)}`), `${xN.toFixed(2)},100`].join(' ');
      return { cor: s.cor, area, line, dash: s.tracejado ? '5,4' : '', dots: pts };
    });
  }

  /** Converte pctY (0=topo,100=fundo do gráfico) para px a partir do topo do container */
  yLabelPx(pctY: number): number {
    const chartH = this.altura - this.TOP - this.BOTTOM;
    return this.TOP + (pctY / 100) * chartH;
  }

  /** Arredonda para cima para o número "limpo" mais próximo (1 / 2 / 5 × 10^n) */
  private niceNumber(v: number): number {
    const exp  = Math.floor(Math.log10(v));
    const f    = v / Math.pow(10, exp);
    const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
    return nice * Math.pow(10, exp);
  }
}
