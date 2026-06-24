import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon.component';
import { AvatarComponent } from '../shared/avatar.component';
import { AreaChartComponent } from '../shared/area-chart.component';
import { DonutComponent } from '../shared/donut.component';
import { HeatmapComponent } from '../shared/heatmap.component';
import { DataService } from '../data.service';

@Component({
  selector: 'app-relatorios',
  standalone: true,
  imports: [CommonModule, IconComponent, AvatarComponent, AreaChartComponent, DonutComponent, HeatmapComponent],
  template: `
<div class="page">

  <!-- Header -->
  <div class="row" style="margin-bottom:16px;gap:10px;flex-wrap:wrap">
    <div class="col" style="line-height:1.3">
      <div style="font-weight:700;font-size:16px">Visão geral · {{ r.periodo }}</div>
      <div class="muted" style="font-size:13px">Indicadores-chave de eficiência do negócio.</div>
    </div>
    <div class="seg" style="margin-left:auto">
      <button [class.on]="periodo==='semana'" (click)="periodo='semana'">Semana</button>
      <button [class.on]="periodo==='mes'"    (click)="periodo='mes'">Mês</button>
      <button [class.on]="periodo==='ano'"    (click)="periodo='ano'">Ano</button>
    </div>
    <button class="btn btn-ghost btn-sm" (click)="notify.emit('Relatório exportado em PDF')">
      <app-icon name="download" [size]="15"></app-icon> Exportar
    </button>
  </div>

  <!-- KPIs (5) -->
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:16px">

    <div class="stat">
      <div class="stat-top">
        <div class="stat-label">Faturamento</div>
        <div class="stat-ico" style="background:var(--accent-soft)">
          <app-icon name="money" [size]="17" style="color:var(--accent)"></app-icon>
        </div>
      </div>
      <div class="stat-val tnum">{{ data.money(r.faturamento) }}</div>
      <div class="stat-meta">
        <span [class.trend-up]="delta>=0" [class.trend-down]="delta<0">
          <app-icon [name]="delta>=0 ? 'trend' : 'trendD'" [size]="13"
                    style="display:inline;vertical-align:-2px;margin-right:3px"></app-icon>
          {{ (delta>=0 ? '+' : '') + delta + '%' }}</span>
        vs. período anterior
      </div>
    </div>

    <div class="stat">
      <div class="stat-top">
        <div class="stat-label">Ticket médio</div>
        <div class="stat-ico" style="background:var(--st-atendimento-bg)">
          <app-icon name="coins" [size]="17" style="color:var(--st-atendimento)"></app-icon>
        </div>
      </div>
      <div class="stat-val tnum">{{ data.money(r.ticketMedio) }}</div>
      <div class="stat-meta">{{ r.atendimentos }} atendimentos</div>
    </div>

    <div class="stat">
      <div class="stat-top">
        <div class="stat-label">Taxa de ocupação</div>
        <div class="stat-ico" style="background:var(--accent-soft)">
          <app-icon name="target" [size]="17" style="color:var(--accent)"></app-icon>
        </div>
      </div>
      <div class="stat-val tnum">{{ r.ocupacao }}%</div>
      <div class="col" style="gap:6px">
        <div class="progress"><span [style.width.%]="r.ocupacao"></span></div>
        <div class="stat-meta">horas vendidas / disponíveis</div>
      </div>
    </div>

    <div class="stat">
      <div class="stat-top">
        <div class="stat-label">Taxa de no-show</div>
        <div class="stat-ico" style="background:var(--st-faltou-bg)">
          <app-icon name="alert" [size]="17" style="color:var(--st-faltou)"></app-icon>
        </div>
      </div>
      <div class="stat-val tnum">{{ r.noShowTaxa }}%</div>
      <div class="stat-meta">{{ r.noShowQtd }} faltas · {{ data.money(r.noShowCusto) }} perdidos</div>
    </div>

    <div class="stat">
      <div class="stat-top">
        <div class="stat-label">Taxa de retorno</div>
        <div class="stat-ico" style="background:var(--st-confirmado-bg)">
          <app-icon name="history" [size]="17" style="color:var(--st-confirmado)"></app-icon>
        </div>
      </div>
      <div class="stat-val tnum">{{ taxaRetorno }}%</div>
      <div class="col" style="gap:6px">
        <div class="progress">
          <span [style.width.%]="taxaRetorno" style="background:var(--st-confirmado)"></span>
        </div>
        <div class="stat-meta">{{ r.recorrentes }} recorrentes de {{ totalClientes }}</div>
      </div>
    </div>

  </div>

  <!-- Evolução do faturamento semanal -->
  <div class="card" style="margin-bottom:16px">
    <div class="card-head">
      <app-icon name="chart" [size]="16" style="color:var(--text-2)"></app-icon>
      <div class="card-title">Evolução do faturamento · últimas 8 semanas</div>
      <div class="row" style="margin-left:auto;gap:14px;font-size:12.5px">
        <span class="row" style="gap:5px">
          <span style="width:10px;height:3px;border-radius:2px;background:var(--accent);display:inline-block"></span> Realizado
        </span>
        <span class="row" style="gap:5px">
          <span style="width:10px;height:2px;border-top:2px dashed var(--text-3);display:inline-block"></span> Meta
        </span>
      </div>
    </div>
    <div style="padding:14px 18px 8px">
      <app-area-chart
        [labels]="r.faturamentoSemanalLabels"
        [series]="evolucaoSeries"
        [altura]="150"
        [formatY]="kfmt">
      </app-area-chart>
    </div>
  </div>

  <!-- Mapa de calor + Forma de pagamento -->
  <div class="grid-2" style="align-items:stretch;margin-bottom:16px">

    <!-- Mapa de calor: horários de pico -->
    <div class="card">
      <div class="card-head">
        <app-icon name="calendar" [size]="16" style="color:var(--text-2)"></app-icon>
        <div class="card-title">Mapa de calor · horários de pico</div>
        <span class="muted" style="margin-left:auto;font-size:12px">atendimentos médios</span>
      </div>
      <div style="padding:16px 18px">
        <app-heatmap
          [colLabels]="r.heatmapDias"
          [rowLabels]="r.heatmapFaixas"
          [matrix]="r.heatmap">
        </app-heatmap>
        <div class="row" style="margin-top:12px;gap:8px;justify-content:flex-end">
          <span class="muted" style="font-size:11px">Menos</span>
          @for (lv of [0,1,2,3,4,5]; track lv) {
            <div style="width:14px;height:14px;border-radius:3px"
                 [style.background]="legendBg(lv)"></div>
          }
          <span class="muted" style="font-size:11px">Mais</span>
        </div>
      </div>
    </div>

    <!-- Forma de pagamento (donut) -->
    <div class="card" style="display:flex;flex-direction:column">
      <div class="card-head">
        <app-icon name="coins" [size]="16" style="color:var(--text-2)"></app-icon>
        <div class="card-title">Forma de pagamento</div>
        <span class="muted" style="margin-left:auto;font-size:12.5px">no período</span>
      </div>
      <div style="padding:18px;display:flex;gap:20px;align-items:center;flex:1;flex-wrap:wrap">
        <app-donut [fatias]="donutForma" [size]="110"></app-donut>
        <div class="col" style="flex:1;gap:12px;min-width:120px">
          @for (f of r.porForma; track f.forma) {
            <div class="col" style="gap:6px">
              <div class="row" style="gap:9px">
                <span [style.width.px]="9" [style.height.px]="9" [style.borderRadius.px]="3"
                      [style.background]="FORMA_COR[f.forma]" style="flex-shrink:0"></span>
                <span style="font-weight:600;font-size:13px;flex:1">{{ f.forma }}</span>
                <span class="tnum muted" style="font-size:12px">{{ f.pct }}%</span>
                <span class="tnum" style="font-weight:700;font-size:13px">{{ data.money(f.valor) }}</span>
              </div>
              <div class="progress">
                <span [style.width.%]="f.pct" [style.background]="FORMA_COR[f.forma]"></span>
              </div>
            </div>
          }
        </div>
      </div>
    </div>

  </div>

  <!-- Ranking de serviços + Metas da equipe -->
  <div class="grid-2" style="align-items:stretch;margin-bottom:16px">

    <!-- Ranking de serviços -->
    <div class="card" style="display:flex;flex-direction:column">
      <div class="card-head">
        <app-icon name="scissors" [size]="16" style="color:var(--text-2)"></app-icon>
        <div class="card-title">Ranking de serviços</div>
        <span class="muted" style="margin-left:auto;font-size:12.5px">por receita</span>
      </div>
      <div style="padding:18px;display:flex;flex-direction:column;gap:14px;flex:1;justify-content:space-evenly">
        @for (x of r.rankingServicos; track x.srv; let i = $index) {
          <div class="col" style="gap:6px">
            <div class="row" style="gap:9px">
              <span class="tnum muted" style="font-size:11px;font-weight:700;width:16px">#{{ i+1 }}</span>
              <span [style.width.px]="8" [style.height.px]="8" [style.borderRadius.px]="3"
                    [style.background]="data.srv(x.srv).cor" style="flex-shrink:0"></span>
              <span style="font-weight:600;font-size:13.5px;flex:1">{{ data.srv(x.srv).nome }}</span>
              <span class="muted tnum" style="font-size:12.5px">{{ x.qtd }}×</span>
              <span class="tnum" style="font-weight:700;font-size:13.5px">{{ data.money(x.receita) }}</span>
            </div>
            <div class="progress">
              <span [style.width]="(x.receita / rankServicosMax * 100) + '%'"
                    [style.background]="data.srv(x.srv).cor"></span>
            </div>
          </div>
        }
      </div>
    </div>

    <!-- Metas da equipe -->
    <div class="card" style="display:flex;flex-direction:column">
      <div class="card-head">
        <app-icon name="target" [size]="16" style="color:var(--text-2)"></app-icon>
        <div class="card-title">Metas da equipe</div>
        <span class="muted" style="margin-left:auto;font-size:12.5px">vendido / meta</span>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:space-evenly">
        @for (m of metas; track m.prof.id) {
          <div class="row" style="gap:12px;padding:12px 18px;border-bottom:1px solid var(--border)">
            <app-avatar [nome]="m.prof.nome" [cor]="m.prof.cor" [size]="34"></app-avatar>
            <div class="col" style="flex:1;gap:5px;min-width:0">
              <div class="row" style="gap:6px">
                <span style="font-weight:600;font-size:13.5px;flex:1">{{ m.prof.apelido }}</span>
                <span class="tnum" style="font-size:12.5px;font-weight:700"
                      [style.color]="m.pct >= 80 ? 'var(--st-confirmado)' : m.pct >= 60 ? 'var(--accent-text)' : 'var(--st-faltou)'">
                  {{ m.pct }}%
                </span>
              </div>
              <div class="progress">
                <span [style.width.%]="m.pct > 100 ? 100 : m.pct"
                      [style.background]="m.pct >= 80 ? 'var(--st-confirmado)' : m.pct >= 60 ? 'var(--accent)' : 'var(--st-faltou)'">
                </span>
              </div>
              <div class="stat-meta">
                {{ data.money(m.prof.vendido) }} de {{ data.money(m.prof.meta) }}
              </div>
            </div>
          </div>
        }
      </div>
    </div>

  </div>

  <!-- Mix de clientes + Clientes em risco -->
  <div class="grid-2" style="align-items:stretch">

    <!-- Mix de clientes -->
    <div class="card card-pad">
      <div class="row" style="margin-bottom:14px">
        <app-icon name="users" [size]="16" style="color:var(--text-2)"></app-icon>
        <div class="card-title">Mix de clientes</div>
      </div>
      <!-- barra novos × recorrentes -->
      <div class="row" style="height:12px;border-radius:99px;overflow:hidden;margin-bottom:14px;gap:0">
        <div [style.flex]="r.novos" style="background:var(--st-atendimento)"></div>
        <div [style.flex]="r.recorrentes" style="background:var(--accent)"></div>
      </div>
      <div class="row" style="gap:16px;margin-bottom:18px">
        <div class="row" style="gap:8px;flex:1">
          <span [style.width.px]="10" [style.height.px]="10" [style.borderRadius.px]="3"
                style="background:var(--st-atendimento);flex-shrink:0"></span>
          <div class="col" style="line-height:1.2">
            <span class="tnum" style="font-weight:800;font-size:20px">{{ r.novos }}</span>
            <span class="muted" style="font-size:12px">novos</span>
          </div>
        </div>
        <div class="row" style="gap:8px;flex:1">
          <span [style.width.px]="10" [style.height.px]="10" [style.borderRadius.px]="3"
                style="background:var(--accent);flex-shrink:0"></span>
          <div class="col" style="line-height:1.2">
            <span class="tnum" style="font-weight:800;font-size:20px">{{ r.recorrentes }}</span>
            <span class="muted" style="font-size:12px">recorrentes</span>
          </div>
        </div>
      </div>
      <div class="divider" style="margin-bottom:14px"></div>
      <div class="row" style="gap:8px">
        <app-icon name="history" [size]="15" style="color:var(--text-3)"></app-icon>
        <span class="muted" style="font-size:13px;flex:1">Frequência média de retorno</span>
        <span class="tnum" style="font-weight:700;font-size:14px">{{ freqMedia }} dias</span>
      </div>
      <div class="row" style="gap:8px;margin-top:10px">
        <app-icon name="coins" [size]="15" style="color:var(--text-3)"></app-icon>
        <span class="muted" style="font-size:13px;flex:1">Ticket médio do período</span>
        <span class="tnum" style="font-weight:700;font-size:14px">{{ data.money(r.ticketMedio) }}</span>
      </div>
    </div>

    <!-- Clientes em risco -->
    <div class="card" style="display:flex;flex-direction:column">
      <div class="card-head">
        <app-icon name="alert" [size]="16" style="color:var(--st-faltou)"></app-icon>
        <div class="card-title">Clientes em risco</div>
        <span class="muted" style="margin-left:auto;font-size:12.5px">+60 dias sem visitar</span>
      </div>
      @if (risco.length === 0) {
        <div class="empty">Nenhum cliente em risco. 🎉</div>
      }
      @for (c of risco; track c.id; let last = $last) {
        <div class="row" style="gap:12px;padding:14px 18px"
             [style.border-bottom]="last ? 'none' : '1px solid var(--border)'">
          <app-avatar [nome]="c.nome" [cor]="'var(--st-faltou)'" [size]="38"></app-avatar>
          <div class="col" style="flex:1;line-height:1.3;min-width:0">
            <span style="font-weight:600;font-size:13.5px">{{ c.nome }}</span>
            <span class="muted" style="font-size:12.5px">
              Há {{ data.diasDesde(c.ultima) }} dias sem visitar ·
              {{ c.visitas }} visita{{ c.visitas === 1 ? '' : 's' }}
            </span>
            <span class="muted" style="font-size:12px">Gasto total: {{ data.money(c.total) }}</span>
          </div>
          <button class="btn btn-subtle btn-sm"
                  (click)="notify.emit('Mensagem de reativação enviada para ' + c.nome)">
            <app-icon name="whatsapp" [size]="14"></app-icon> Reativar
          </button>
        </div>
      }
    </div>

  </div>

</div>
  `,
})
export class RelatoriosComponent {
  @Output() notify = new EventEmitter<string>();

  readonly FORMA_COR: any = {
    'Pix':      'var(--st-atendimento)',
    'Cartão':   '#7c3aed',
    'Dinheiro': 'var(--accent)',
  };

  periodo = 'mes';

  constructor(public data: DataService) {}

  get r() { return this.data.relatorio; }
  get delta() { return Math.round((this.r.faturamento - this.r.faturamentoAnt) / this.r.faturamentoAnt * 100); }
  get totalClientes() { return this.r.novos + this.r.recorrentes; }
  get taxaRetorno() { return this.data.taxaRetorno(); }
  get metas() { return this.data.metasEquipe(); }
  get risco() { return this.data.clientesEmRisco(); }

  get rankServicosMax(): number {
    return Math.max(1, ...this.r.rankingServicos.map(x => x.receita));
  }

  get freqMedia(): number {
    const ativos = this.data.clientes.filter(c => c.freq > 0);
    return ativos.length ? Math.round(ativos.reduce((s, c) => s + c.freq, 0) / ativos.length) : 0;
  }

  get evolucaoSeries() {
    const meta = this.r.metaSemanal;
    const n = this.r.faturamentoSemanal.length;
    return [
      { dados: this.r.faturamentoSemanal, cor: 'var(--accent)' },
      { dados: Array(n).fill(meta), cor: 'var(--text-3)', tracejado: true },
    ];
  }

  get donutForma() {
    return this.r.porForma.map(f => ({
      valor: f.valor, label: f.forma, cor: this.FORMA_COR[f.forma] || 'var(--text-3)',
    }));
  }

  kfmt = (v: number): string => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : String(v);

  legendBg(lv: number): string {
    return [
      'var(--surface-3)',
      'var(--accent-soft)',
      'var(--accent-soft-2)',
      'color-mix(in srgb, var(--accent) 28%, transparent)',
      'color-mix(in srgb, var(--accent) 52%, transparent)',
      'color-mix(in srgb, var(--accent) 78%, transparent)',
    ][lv] ?? 'transparent';
  }
}
