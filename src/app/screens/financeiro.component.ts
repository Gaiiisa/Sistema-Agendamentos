import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon.component';
import { AvatarComponent } from '../shared/avatar.component';
import { MenuComponent } from '../shared/menu.component';
import { DataService } from '../data.service';

@Component({
  selector: 'app-financeiro',
  standalone: true,
  imports: [CommonModule, IconComponent, AvatarComponent, MenuComponent],
  template: `
<div class="page">

  <!-- top bar: sub-tabs + actions -->
  <div class="row" style="margin-bottom:16px;flex-wrap:wrap;gap:10px">
    <div class="seg">
      <button [class.on]="tab==='caixa'"       (click)="tab='caixa'">Caixa do dia</button>
      <button [class.on]="tab==='lancamentos'" (click)="tab='lancamentos'">Lançamentos</button>
      <button [class.on]="tab==='receber'"     (click)="tab='receber'">A receber</button>
      <button [class.on]="tab==='fluxo'"       (click)="tab='fluxo'">Fluxo de caixa</button>
    </div>
    <div class="row" style="margin-left:auto;gap:8px">
      <button class="btn btn-ghost btn-sm" (click)="notify.emit('Lançamento adicionado')">
        <app-icon name="plus" [size]="15"></app-icon> Lançamento
      </button>
      <button class="btn btn-primary btn-sm" (click)="notify.emit('Caixa fechado — conferência registrada')">
        <app-icon name="lock" [size]="14"></app-icon> Fechar caixa
      </button>
    </div>
  </div>

  <!-- ==================== TAB: CAIXA DO DIA ==================== -->
  @if (tab==='caixa') {
    <div class="col" style="gap:16px">

      <!-- status do caixa -->
      <div class="card card-pad" style="display:flex;align-items:center;gap:14px;border-left:3px solid var(--accent)">
        <div style="width:42px;height:42px;border-radius:11px;background:var(--accent-soft);display:grid;place-items:center">
          <app-icon name="money" [size]="20" style="color:var(--accent)"></app-icon>
        </div>
        <div class="col" style="line-height:1.35">
          <span style="font-weight:700;font-size:15px">Caixa aberto desde {{ data.caixa.abertura }}</span>
          <span class="muted" style="font-size:13px">Operador: {{ data.caixa.operador }} · abertura {{ data.money(data.caixa.valorAbertura) }}</span>
        </div>
        <span class="pill pill-confirmado" style="margin-left:auto">
          <span class="pdot"></span> Aberto
        </span>
      </div>

      <!-- KPIs -->
      <div class="stat-grid">
        <!-- Saldo em caixa -->
        <div class="stat">
          <div class="stat-top">
            <div class="stat-label">Saldo em caixa</div>
            <div class="stat-ico" style="background:var(--accent-soft)">
              <app-icon name="money" [size]="17" style="color:var(--accent)"></app-icon>
            </div>
          </div>
          <div class="stat-val tnum">{{ data.money(saldo) }}</div>
        </div>
        <!-- Receitas do dia -->
        <div class="stat">
          <div class="stat-top">
            <div class="stat-label">Receitas do dia</div>
            <div class="stat-ico" style="background:var(--accent-soft)">
              <app-icon name="trend" [size]="17" style="color:var(--accent)"></app-icon>
            </div>
          </div>
          <div class="stat-val tnum">{{ data.money(totRec) }}</div>
        </div>
        <!-- Despesas do dia -->
        <div class="stat">
          <div class="stat-top">
            <div class="stat-label">Despesas do dia</div>
            <div class="stat-ico" style="background:var(--st-faltou-bg)">
              <app-icon name="trendD" [size]="17" style="color:var(--st-faltou)"></app-icon>
            </div>
          </div>
          <div class="stat-val tnum">{{ data.money(totDesp) }}</div>
        </div>
        <!-- Resultado líquido -->
        <div class="stat">
          <div class="stat-top">
            <div class="stat-label">Resultado líquido</div>
            <div class="stat-ico" style="background:var(--st-atendimento-bg)">
              <app-icon name="chart" [size]="17" style="color:var(--st-atendimento)"></app-icon>
            </div>
          </div>
          <div class="stat-val tnum">{{ data.money(totRec - totDesp) }}</div>
        </div>
      </div>

      <div class="grid-2" style="align-items:start">

        <!-- conferência por forma de pagamento -->
        <div class="card">
          <div class="card-head">
            <app-icon name="coins" [size]="17" style="color:var(--text-2)"></app-icon>
            <div class="card-title">Conferência por forma de pagamento</div>
          </div>
          <div style="padding:18px;display:flex;flex-direction:column;gap:14px">
            @for (f of formaKeys; track f) {
              <div class="col" style="gap:7px">
                <div class="row" style="gap:9px">
                  <div [style.width.px]="28" [style.height.px]="28" style="border-radius:8px;display:grid;place-items:center"
                       [style.background]="FORMA[f].bg">
                    <app-icon [name]="FORMA[f].icon" [size]="15" [style.color]="FORMA[f].cor"></app-icon>
                  </div>
                  <span style="font-weight:600;font-size:14px">{{ FORMA[f].label }}</span>
                  <span class="tnum" style="margin-left:auto;font-weight:700">{{ data.money(porForma[f] || 0) }}</span>
                  <span class="muted tnum" style="font-size:12.5px;width:38px;text-align:right">{{ pct(f) }}%</span>
                </div>
                <div class="progress">
                  <span [style.width]="pct(f)+'%'" [style.background]="FORMA[f].cor"></span>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- resumo lançamentos -->
        <div class="card">
          <div class="card-head">
            <app-icon name="list" [size]="17" style="color:var(--text-2)"></app-icon>
            <div class="card-title">Movimentações de hoje</div>
            <span class="muted" style="margin-left:auto;font-size:13px">{{ receitas.length + despesas.length }} lançamentos</span>
          </div>
          <div style="max-height:320px;overflow-y:auto">
            @for (l of todosOrdenados; track l.id; let i = $index; let last = $last) {
              <div class="row" style="gap:11px;padding:12px 18px"
                   [style.border-bottom]="last ? 'none' : '1px solid var(--border)'">
                <div [style.width.px]="30" [style.height.px]="30" style="border-radius:8px;display:grid;place-items:center"
                     [style.background]="l.tipo==='receita' ? 'var(--accent-soft)' : 'var(--st-faltou-bg)'">
                  <app-icon [name]="l.tipo==='receita' ? 'trend' : 'trendD'" [size]="15"
                             [style.color]="l.tipo==='receita' ? 'var(--accent)' : 'var(--st-faltou)'"></app-icon>
                </div>
                <div class="col" style="flex:1;line-height:1.3;min-width:0">
                  <span style="font-weight:600;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ l.desc }}</span>
                  <span class="muted" style="font-size:12px">{{ l.cat }} · {{ FORMA[l.forma].label }} · {{ l.hora }}</span>
                </div>
                <span class="tnum" style="font-weight:700;font-size:14px"
                      [style.color]="l.tipo==='receita' ? 'var(--accent-text)' : 'var(--st-faltou)'">
                  {{ (l.tipo==='receita' ? '+' : '−') + data.money(l.valor) }}
                </span>
              </div>
            }
          </div>
        </div>

      </div>
    </div>
  }

  <!-- ==================== TAB: LANÇAMENTOS ==================== -->
  @if (tab==='lancamentos') {
    <div class="card">
      <div class="filter-bar" style="padding:14px;border-bottom:1px solid var(--border)">
        <div class="seg">
          <button [class.on]="filtro==='todos'"   (click)="filtro='todos'">Todos</button>
          <button [class.on]="filtro==='receita'" (click)="filtro='receita'">Receitas</button>
          <button [class.on]="filtro==='despesa'" (click)="filtro='despesa'">Despesas</button>
        </div>
        <button class="btn btn-ghost btn-sm" style="margin-left:auto">
          <app-icon name="download" [size]="15"></app-icon> Exportar
        </button>
      </div>
      <table class="tbl">
        <thead>
          <tr>
            <th>Hora</th>
            <th>Descrição</th>
            <th>Categoria</th>
            <th>Forma</th>
            <th>Tipo</th>
            <th>Valor</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (l of lancamentosRows; track l.id) {
            <tr>
              <td class="mono muted" style="font-size:13px">{{ l.hora }}</td>
              <td style="font-weight:600">{{ l.desc }}</td>
              <td class="muted">{{ l.cat }}</td>
              <td>
                <span class="tag" style="border-color:transparent"
                      [style.background]="FORMA[l.forma].bg"
                      [style.color]="FORMA[l.forma].cor">{{ FORMA[l.forma].label }}</span>
              </td>
              <td>
                <span [class]="l.tipo==='receita' ? 'pill pill-confirmado' : 'pill pill-faltou'">
                  <span class="pdot"></span>
                  {{ l.tipo==='receita' ? 'Receita' : 'Despesa' }}
                </span>
              </td>
              <td class="tnum" style="font-weight:700"
                  [style.color]="l.tipo==='receita' ? 'var(--accent-text)' : 'var(--st-faltou)'">
                {{ (l.tipo==='receita' ? '+' : '−') + data.money(l.valor) }}
              </td>
              <td>
                <app-menu [items]="[{label:'Editar',icon:'edit'},{label:'Excluir',icon:'trash',danger:true}]"></app-menu>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  }

  <!-- ==================== TAB: A RECEBER ==================== -->
  @if (tab==='receber') {
    <div class="col" style="gap:16px">

      <!-- KPIs a receber -->
      <div class="stat-grid" style="grid-template-columns:repeat(3,1fr)">
        <!-- Total a receber -->
        <div class="stat">
          <div class="stat-top">
            <div class="stat-label">Total a receber</div>
            <div class="stat-ico" style="background:var(--st-pendente-bg)">
              <app-icon name="money" [size]="17" style="color:var(--st-pendente)"></app-icon>
            </div>
          </div>
          <div class="stat-val tnum">{{ data.money(totalAReceber) }}</div>
        </div>
        <!-- Pendências -->
        <div class="stat">
          <div class="stat-top">
            <div class="stat-label">Pendências</div>
            <div class="stat-ico" style="background:var(--st-atendimento-bg)">
              <app-icon name="clock" [size]="17" style="color:var(--st-atendimento)"></app-icon>
            </div>
          </div>
          <div class="stat-val tnum">{{ data.aReceber.length }}</div>
        </div>
        <!-- Vencidas -->
        <div class="stat">
          <div class="stat-top">
            <div class="stat-label">Vencidas</div>
            <div class="stat-ico" style="background:var(--st-faltou-bg)">
              <app-icon name="alert" [size]="17" style="color:var(--st-faltou)"></app-icon>
            </div>
          </div>
          <div class="stat-val tnum">{{ vencidas.length }}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <div class="card-title">Contas a receber</div>
        </div>
        <table class="tbl">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Descrição</th>
              <th>Vencimento</th>
              <th>Valor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (r of data.aReceber; track r.id) {
              <tr>
                <td>
                  <div class="row" style="gap:10px">
                    <app-avatar [nome]="data.cli(r.cli).nome" cor="#2563eb" [size]="30"></app-avatar>
                    <span style="font-weight:600">{{ data.cli(r.cli).nome }}</span>
                  </div>
                </td>
                <td class="muted">{{ r.desc }}</td>
                <td>
                  <span [style.color]="r.dias < 0 ? 'var(--st-faltou)' : 'var(--text)'"
                        [style.font-weight]="r.dias < 0 ? 600 : 400">
                    {{ r.dias < 0 ? 'Vencida há ' + abs(r.dias) + 'd' : 'em ' + r.dias + 'd' }}
                  </span>
                </td>
                <td class="tnum" style="font-weight:700">{{ data.money(r.valor) }}</td>
                <td>
                  <div class="row" style="gap:6px">
                    <button class="btn btn-subtle btn-sm" (click)="notify.emit('Lembrete de pagamento enviado')">
                      <app-icon name="whatsapp" [size]="14"></app-icon> Cobrar
                    </button>
                    <button class="btn btn-primary btn-sm" (click)="notify.emit('Pagamento registrado')">
                      Receber
                    </button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

    </div>
  }

  <!-- ==================== TAB: FLUXO DE CAIXA ==================== -->
  @if (tab==='fluxo') {
    <div class="col" style="gap:16px">

      <!-- KPIs fluxo -->
      <div class="stat-grid" style="grid-template-columns:repeat(3,1fr)">
        <!-- Receita 7 dias -->
        <div class="stat">
          <div class="stat-top">
            <div class="stat-label">Receita (7 dias)</div>
            <div class="stat-ico" style="background:var(--accent-soft)">
              <app-icon name="trend" [size]="17" style="color:var(--accent)"></app-icon>
            </div>
          </div>
          <div class="stat-val tnum">{{ data.money(fluxoTotRec) }}</div>
        </div>
        <!-- Despesa 7 dias -->
        <div class="stat">
          <div class="stat-top">
            <div class="stat-label">Despesa (7 dias)</div>
            <div class="stat-ico" style="background:var(--st-faltou-bg)">
              <app-icon name="trendD" [size]="17" style="color:var(--st-faltou)"></app-icon>
            </div>
          </div>
          <div class="stat-val tnum">{{ data.money(fluxoTotDesp) }}</div>
        </div>
        <!-- Resultado -->
        <div class="stat">
          <div class="stat-top">
            <div class="stat-label">Resultado</div>
            <div class="stat-ico" style="background:var(--st-atendimento-bg)">
              <app-icon name="chart" [size]="17" style="color:var(--st-atendimento)"></app-icon>
            </div>
          </div>
          <div class="stat-val tnum">{{ data.money(fluxoTotRec - fluxoTotDesp) }}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <div class="card-title">Fluxo dos últimos 7 dias</div>
          <div class="row" style="margin-left:auto;gap:14px;font-size:12.5px">
            <span class="row" style="gap:6px">
              <span style="width:10px;height:10px;border-radius:3px;background:var(--accent)"></span>
              Receita
            </span>
            <span class="row" style="gap:6px">
              <span style="width:10px;height:10px;border-radius:3px;background:var(--st-faltou)"></span>
              Despesa
            </span>
          </div>
        </div>
        <div style="padding:28px 18px 18px;display:flex;gap:14px;align-items:flex-end;height:280px">
          @for (f of data.fluxo; track f.dia) {
            <div class="col" style="flex:1;align-items:center;gap:8px;height:100%;justify-content:flex-end">
              <div class="row" style="gap:4px;align-items:flex-end;height:100%;width:100%;justify-content:center">
                <div [title]="data.money(f.rec)"
                     style="width:38%;max-width:26px;background:var(--accent);border-radius:5px 5px 0 0;transition:height .3s"
                     [style.height]="barHeight(f.rec)"></div>
                <div [title]="data.money(f.desp)"
                     style="width:38%;max-width:26px;background:var(--st-faltou);border-radius:5px 5px 0 0;opacity:0.85;transition:height .3s"
                     [style.height]="barHeight(f.desp)"></div>
              </div>
              <span class="muted" style="font-size:12px;font-weight:600">{{ f.dia }}</span>
            </div>
          }
        </div>
      </div>

    </div>
  }

</div>
  `,
})
export class FinanceiroComponent {
  @Output() notify = new EventEmitter<string>();

  tab = 'caixa';
  filtro = 'todos';

  readonly FORMA: any = {
    dinheiro: { label: 'Dinheiro', cor: 'var(--accent)',            bg: 'var(--accent-soft)',          icon: 'money'   },
    pix:      { label: 'Pix',      cor: 'var(--st-atendimento)',    bg: 'var(--st-atendimento-bg)',    icon: 'sparkle' },
    cartao:   { label: 'Cartão',   cor: 'oklch(0.5 0.12 300)',      bg: 'oklch(0.96 0.04 300)',        icon: 'coins'   },
  };

  get formaKeys(): string[] { return Object.keys(this.FORMA); }

  constructor(public data: DataService) {}

  // ---- caixa computations ----
  get receitas() { return this.data.lancamentos.filter(l => l.tipo === 'receita'); }
  get despesas()  { return this.data.lancamentos.filter(l => l.tipo === 'despesa'); }
  get totRec()    { return this.receitas.reduce((s, l) => s + l.valor, 0); }
  get totDesp()   { return this.despesas.reduce((s, l) => s + l.valor, 0); }
  get saldo()     { return this.data.caixa.valorAbertura + this.totRec - this.totDesp; }

  get porForma(): { [key: string]: number } {
    const m: { [key: string]: number } = {};
    this.receitas.forEach(l => m[l.forma] = (m[l.forma] || 0) + l.valor);
    return m;
  }

  pct(f: string): number {
    const val = this.porForma[f] || 0;
    return this.totRec ? Math.round(val / this.totRec * 100) : 0;
  }

  get todosOrdenados() {
    return [...this.receitas, ...this.despesas].sort((a, b) => b.hora.localeCompare(a.hora));
  }

  // ---- lançamentos tab ----
  get lancamentosRows() {
    let rows = [...this.data.lancamentos].sort((a, b) => b.hora.localeCompare(a.hora));
    if (this.filtro !== 'todos') rows = rows.filter(r => r.tipo === this.filtro);
    return rows;
  }

  // ---- a receber tab ----
  get totalAReceber() { return this.data.aReceber.reduce((s, r) => s + r.valor, 0); }
  get vencidas()      { return this.data.aReceber.filter(r => r.dias < 0); }
  abs(n: number)      { return Math.abs(n); }

  // ---- fluxo tab ----
  get fluxoTotRec()  { return this.data.fluxo.reduce((s, f) => s + f.rec, 0); }
  get fluxoTotDesp() { return this.data.fluxo.reduce((s, f) => s + f.desp, 0); }
  get fluxoMax()     { return Math.max(...this.data.fluxo.map(f => Math.max(f.rec, f.desp))); }

  barHeight(val: number): string {
    return (val / this.fluxoMax * 100 || 0.5) + '%';
  }
}
