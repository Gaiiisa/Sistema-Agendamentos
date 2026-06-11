import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon.component';
import { AvatarComponent } from '../shared/avatar.component';
import { DataService } from '../data.service';

@Component({
  selector: 'app-relatorios',
  standalone: true,
  imports: [CommonModule, IconComponent, AvatarComponent],
  template: `
<div class="page">

  <!-- Header: title + period seg + export -->
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

  <!-- KPIs principais (RStat inlined × 4) -->
  <div class="stat-grid" style="margin-bottom:16px">

    <!-- Faturamento -->
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
          <app-icon [name]="delta>=0 ? 'trend' : 'trendD'" [size]="13" style="display:inline;vertical-align:-2px;margin-right:3px"></app-icon>{{ (delta>=0 ? '+' : '') + delta + '%' }}</span>
        vs. período anterior
      </div>
    </div>

    <!-- Ticket médio -->
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

    <!-- Taxa de ocupação -->
    <div class="stat">
      <div class="stat-top">
        <div class="stat-label">Taxa de ocupação</div>
        <div class="stat-ico" style="background:var(--accent-soft)">
          <app-icon name="target" [size]="17" style="color:var(--accent)"></app-icon>
        </div>
      </div>
      <div class="stat-val tnum">{{ r.ocupacao }}%</div>
      <div class="stat-meta">horas vendidas / disponíveis</div>
    </div>

    <!-- Taxa de no-show -->
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

  </div>

  <!-- Rankings: serviços + profissionais -->
  <div class="grid-2" style="align-items:stretch;margin-bottom:16px">

    <!-- Ranking de serviços -->
    <div class="card" style="display:flex;flex-direction:column">
      <div class="card-head">
        <app-icon name="scissors" [size]="16" style="color:var(--text-2)"></app-icon>
        <div class="card-title">Ranking de serviços</div>
        <span class="muted" style="margin-left:auto;font-size:12.5px">por receita</span>
      </div>
      <div style="padding:18px;display:flex;flex-direction:column;gap:15px;flex:1;justify-content:space-evenly">
        @for (x of r.rankingServicos; track x.srv) {
          <div class="col" style="gap:7px">
            <div class="row" style="gap:9px">
              <span [style.width.px]="8" [style.height.px]="8" [style.borderRadius.px]="3" [style.background]="data.srv(x.srv).cor" style="flex-shrink:0"></span>
              <span style="font-weight:600;font-size:13.5px;flex:1">{{ data.srv(x.srv).nome }}</span>
              <span class="muted tnum" style="font-size:12.5px">{{ x.qtd }}x</span>
              <span class="tnum" style="font-weight:700;font-size:13.5px">{{ data.money(x.receita) }}</span>
            </div>
            <div class="progress">
              <span [style.width]="(x.receita / rankServicosMax * 100) + '%'" [style.background]="data.srv(x.srv).cor"></span>
            </div>
          </div>
        }
      </div>
    </div>

    <!-- Ranking de profissionais -->
    <div class="card" style="display:flex;flex-direction:column">
      <div class="card-head">
        <app-icon name="team" [size]="16" style="color:var(--text-2)"></app-icon>
        <div class="card-title">Ranking de profissionais</div>
        <span class="muted" style="margin-left:auto;font-size:12.5px">faturamento</span>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:space-evenly">
        @for (p of staffRanked; track p.id; let i = $index) {
          <div class="row" style="gap:12px;padding:11px 18px">
            <span class="tnum" [style.color]="i===0 ? 'var(--accent)' : 'var(--text-3)'" style="font-weight:800;width:20px">#{{ i + 1 }}</span>
            <app-avatar [nome]="p.nome" [cor]="p.cor" [size]="34"></app-avatar>
            <div class="col" style="flex:1;line-height:1.25;gap:4px">
              <span style="font-weight:600;font-size:13.5px">{{ p.nome }}</span>
              <div class="progress">
                <span [style.width]="(p.vendido / staffRankedMax * 100) + '%'" [style.background]="p.cor"></span>
              </div>
            </div>
            <span class="tnum" style="font-weight:700">{{ data.money(p.vendido) }}</span>
          </div>
        }
      </div>
    </div>

  </div>

  <!-- Bottom section: ocupação por dia + forma de pagamento + novos×recorrentes -->
  <div class="grid-dash" style="align-items:stretch">

    <!-- Ocupação por dia da semana -->
    <div class="card" style="display:flex;flex-direction:column">
      <div class="card-head">
        <app-icon name="calendar" [size]="16" style="color:var(--text-2)"></app-icon>
        <div class="card-title">Ocupação da agenda por dia</div>
      </div>
      <div style="padding:28px 18px 16px;display:flex;gap:12px;align-items:flex-end;flex:1">
        @for (d of r.ocupacaoSemana; track d.dia) {
          <div class="col" style="flex:1;align-items:center;gap:8px;height:100%;justify-content:flex-end">
            <span class="tnum" [style.color]="d.pct >= 90 ? 'var(--accent-text)' : 'var(--text-3)'" style="font-size:12px;font-weight:700">{{ d.pct }}%</span>
            <div
              [style.width]="'60%'"
              style="max-width:38px;border-radius:6px 6px 0 0;transition:height .3s"
              [style.height]="(d.pct || 1) + '%'"
              [style.background]="d.pct >= 90 ? 'var(--accent)' : d.pct >= 70 ? 'color-mix(in oklch, var(--accent) 65%, white)' : 'var(--surface-3)'">
            </div>
            <span class="muted" style="font-size:12px;font-weight:600">{{ d.dia }}</span>
          </div>
        }
      </div>
    </div>

    <!-- Right column: forma de pagamento + novos×recorrentes -->
    <div class="col" style="gap:16px">

      <!-- Faturamento por forma de pagamento -->
      <div class="card card-pad">
        <div style="font-weight:700;font-size:14.5px;margin-bottom:14px">Faturamento por forma</div>
        <div class="col" style="gap:12px">
          @for (f of r.porForma; track f.forma) {
            <div class="col" style="gap:6px">
              <div class="row" style="gap:8px">
                <span [style.width.px]="9" [style.height.px]="9" [style.borderRadius.px]="3" [style.background]="FORMA_COR[f.forma]"></span>
                <span style="font-weight:600;font-size:13.5px;flex:1">{{ f.forma }}</span>
                <span class="tnum" style="font-weight:700;font-size:13.5px">{{ data.money(f.valor) }}</span>
              </div>
              <div class="progress">
                <span [style.width]="f.pct + '%'" [style.background]="FORMA_COR[f.forma]"></span>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Novos × recorrentes -->
      <div class="card card-pad">
        <div style="font-weight:700;font-size:14.5px;margin-bottom:14px">Novos × recorrentes</div>
        <div class="row" style="height:14px;border-radius:99px;overflow:hidden;margin-bottom:14px">
          <div [style.width]="(r.novos / totalClientes * 100) + '%'" style="background:var(--st-atendimento)"></div>
          <div [style.width]="(r.recorrentes / totalClientes * 100) + '%'" style="background:var(--accent)"></div>
        </div>
        <div class="row" style="gap:16px">
          <div class="row" style="gap:8px;flex:1">
            <span [style.width.px]="10" [style.height.px]="10" [style.borderRadius.px]="3" style="background:var(--st-atendimento)"></span>
            <div class="col" style="line-height:1.2">
              <span class="tnum" style="font-weight:800;font-size:18px">{{ r.novos }}</span>
              <span class="muted" style="font-size:12px">novos</span>
            </div>
          </div>
          <div class="row" style="gap:8px;flex:1">
            <span [style.width.px]="10" [style.height.px]="10" [style.borderRadius.px]="3" style="background:var(--accent)"></span>
            <div class="col" style="line-height:1.2">
              <span class="tnum" style="font-weight:800;font-size:18px">{{ r.recorrentes }}</span>
              <span class="muted" style="font-size:12px">recorrentes</span>
            </div>
          </div>
        </div>
      </div>

    </div>

  </div>

</div>
`,
})
export class RelatoriosComponent {
  @Output() notify = new EventEmitter<string>();

  readonly FORMA_COR: any = {
    'Pix': 'var(--st-atendimento)',
    'Cartão': 'oklch(0.5 0.12 300)',
    'Dinheiro': 'var(--accent)',
  };

  periodo = 'mes';

  constructor(public data: DataService) {}

  get r() { return this.data.relatorio; }
  get delta() { return Math.round((this.r.faturamento - this.r.faturamentoAnt) / this.r.faturamentoAnt * 100); }
  get totalClientes() { return this.r.novos + this.r.recorrentes; }

  get rankServicosMax(): number {
    return Math.max(...this.r.rankingServicos.map(x => x.receita));
  }

  get staffRanked() {
    return [...this.data.staff].sort((a, b) => b.vendido - a.vendido);
  }

  get staffRankedMax(): number {
    return this.staffRanked[0].vendido;
  }
}
