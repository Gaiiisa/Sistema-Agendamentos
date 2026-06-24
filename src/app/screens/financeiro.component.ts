import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon.component';
import { AvatarComponent } from '../shared/avatar.component';
import { MenuComponent } from '../shared/menu.component';
import { AreaChartComponent } from '../shared/area-chart.component';
import { DonutComponent } from '../shared/donut.component';
import { GaugeComponent } from '../shared/gauge.component';
import { DataService, Lancamento } from '../data.service';

@Component({
  selector: 'app-financeiro',
  standalone: true,
  imports: [CommonModule, IconComponent, AvatarComponent, MenuComponent, AreaChartComponent, DonutComponent, GaugeComponent],
  template: `
<div class="page">

  <!-- top bar: sub-tabs + actions -->
  <div class="row" style="margin-bottom:16px;flex-wrap:wrap;gap:10px">
    <div class="seg">
      <button [class.on]="tab==='visao'"       (click)="tab='visao'">Visão geral</button>
      <button [class.on]="tab==='caixa'"       (click)="tab='caixa'">Caixa do dia</button>
      <button [class.on]="tab==='lancamentos'" (click)="tab='lancamentos'">Lançamentos</button>
      <button [class.on]="tab==='receber'"     (click)="tab='receber'">A receber</button>
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

  <!-- ==================== TAB: VISÃO GERAL ==================== -->
  @if (tab==='visao') {
    <div class="col" style="gap:16px">

      <!-- KPIs do mês -->
      <div class="stat-grid">
        <!-- Faturamento do mês -->
        <div class="stat">
          <div class="stat-top">
            <div class="stat-label">Faturamento (mês)</div>
            <div class="stat-ico" style="background:var(--accent-soft)">
              <app-icon name="money" [size]="17" style="color:var(--accent)"></app-icon>
            </div>
          </div>
          <div class="stat-val tnum">{{ data.money(fin.mes.receita) }}</div>
          <div class="stat-meta">
            @if (recDelta !== null) {
              <span [class.trend-up]="recDelta>=0" [class.trend-down]="recDelta<0">
                <app-icon [name]="recDelta>=0 ? 'trend' : 'trendD'" [size]="13" style="display:inline;vertical-align:-2px;margin-right:3px"></app-icon>{{ (recDelta>=0 ? '+' : '') + recDelta + '%' }}</span>
              vs. mês anterior
            } @else {
              <span class="muted">primeiro mês com dados</span>
            }
          </div>
        </div>
        <!-- Despesas do mês -->
        <div class="stat">
          <div class="stat-top">
            <div class="stat-label">Despesas (mês)</div>
            <div class="stat-ico" style="background:var(--st-faltou-bg)">
              <app-icon name="trendD" [size]="17" style="color:var(--st-faltou)"></app-icon>
            </div>
          </div>
          <div class="stat-val tnum">{{ data.money(fin.mes.despesa) }}</div>
          <div class="stat-meta">{{ pctDespesa }}% da receita do mês</div>
        </div>
        <!-- Resultado líquido -->
        <div class="stat">
          <div class="stat-top">
            <div class="stat-label">Resultado líquido</div>
            <div class="stat-ico" style="background:var(--accent-soft)">
              <app-icon name="chart" [size]="17" style="color:var(--accent)"></app-icon>
            </div>
          </div>
          <div class="stat-val tnum">{{ data.money(fin.mes.resultado) }}</div>
          <div class="stat-meta">margem de {{ margem }}%</div>
        </div>
        <!-- Projeção do mês -->
        <div class="stat">
          <div class="stat-top">
            <div class="stat-label">Projeção do mês</div>
            <div class="stat-ico" style="background:var(--st-atendimento-bg)">
              <app-icon name="trend" [size]="17" style="color:var(--st-atendimento)"></app-icon>
            </div>
          </div>
          <div class="stat-val tnum">{{ data.money(projecao) }}</div>
          <div class="stat-meta">no ritmo atual · {{ fin.mes.atendimentos }} atend.</div>
        </div>
      </div>

      <!-- Receita × Despesa · 7 dias (area-chart 2 séries) -->
      <div class="card">
        <div class="card-head">
          <app-icon name="chart" [size]="16" style="color:var(--text-2)"></app-icon>
          <div class="card-title">Receita × Despesa · últimos 7 dias</div>
          <div class="row" style="margin-left:auto;gap:14px;font-size:12.5px">
            <span class="row" style="gap:5px">
              <span style="width:10px;height:3px;border-radius:2px;background:var(--accent);display:inline-block"></span> Receita
            </span>
            <span class="row" style="gap:5px">
              <span style="width:10px;height:3px;border-radius:2px;border-top:2px dashed var(--st-faltou);display:inline-block"></span> Despesa
            </span>
          </div>
        </div>
        <div style="padding:14px 18px 8px">
          <app-area-chart
            [labels]="fluxoLabels"
            [series]="fluxoSeries2"
            [altura]="150"
            [formatY]="kfmtFn">
          </app-area-chart>
        </div>
      </div>

      <!-- Donut forma + Gauge margem -->
      <div class="grid-2" style="align-items:stretch">

        <!-- Receita por forma de pagamento -->
        <div class="card" style="display:flex;flex-direction:column">
          <div class="card-head">
            <app-icon name="coins" [size]="16" style="color:var(--text-2)"></app-icon>
            <div class="card-title">Receita por forma de pagamento</div>
          </div>
          <div style="padding:18px;display:flex;gap:20px;align-items:center;flex:1;flex-wrap:wrap">
            <app-donut [fatias]="donutFatias" [size]="110" [tampaCentro]="'mês'"></app-donut>
            <div class="col" style="flex:1;gap:11px;min-width:120px">
              @for (f of fin.receitaForma; track f.forma) {
                <div class="row" style="gap:9px">
                  <span [style.width.px]="9" [style.height.px]="9" [style.borderRadius.px]="3"
                        [style.background]="FORMA_COR[f.forma] || 'var(--text-3)'"
                        style="flex-shrink:0"></span>
                  <span style="font-weight:600;font-size:13px;flex:1">{{ f.label }}</span>
                  <span class="tnum muted" style="font-size:12px">{{ formaPct(f.valor) }}%</span>
                  <span class="tnum" style="font-weight:700;font-size:13px">{{ data.money(f.valor) }}</span>
                </div>
              }
              <div class="divider"></div>
              <div class="row">
                <span class="muted" style="font-size:12.5px;flex:1">Total</span>
                <span class="tnum" style="font-weight:800;font-size:14px">{{ data.money(receitaFormaTotal) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Margem de lucro (gauge) -->
        <div class="card" style="display:flex;flex-direction:column">
          <div class="card-head">
            <app-icon name="chart" [size]="16" style="color:var(--text-2)"></app-icon>
            <div class="card-title">Margem de lucro</div>
          </div>
          <div style="padding:18px;display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:14px">
            <app-gauge [pct]="margem" [cor]="margemCor" [texto]="margem + '%'"></app-gauge>
            <div class="col" style="align-items:center;gap:4px">
              <span style="font-size:15px;font-weight:700" [style.color]="margemCor">{{ margemTexto }}</span>
              <span class="muted" style="font-size:12.5px;text-align:center">
                {{ data.money(fin.mes.resultado) }} de resultado líquido sobre {{ data.money(fin.mes.receita) }} de receita
              </span>
            </div>
          </div>
        </div>

      </div>

      <!-- Receita por categoria + Despesas por categoria -->
      <div class="grid-2" style="align-items:stretch">

        <!-- Receita por categoria -->
        <div class="card" style="display:flex;flex-direction:column">
          <div class="card-head">
            <app-icon name="trend" [size]="16" style="color:var(--text-2)"></app-icon>
            <div class="card-title">De onde vem a receita</div>
            <span class="muted" style="margin-left:auto;font-size:12.5px">mês</span>
          </div>
          <div style="padding:18px;display:flex;flex-direction:column;gap:15px;flex:1;justify-content:space-evenly">
            @for (c of fin.receitaCategoria; track c.cat) {
              <div class="col" style="gap:7px">
                <div class="row" style="gap:9px">
                  <span [style.width.px]="8" [style.height.px]="8" [style.borderRadius.px]="3" [style.background]="catCor(c.cat)"></span>
                  <span style="font-weight:600;font-size:13.5px;flex:1">{{ c.cat }}</span>
                  <span class="muted tnum" style="font-size:12.5px">{{ c.qtd }}x</span>
                  <span class="tnum" style="font-weight:700;font-size:13.5px">{{ data.money(c.valor) }}</span>
                </div>
                <div class="progress">
                  <span [style.width]="(c.valor / receitaCatMax * 100)+'%'" [style.background]="catCor(c.cat)"></span>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Despesas por categoria -->
        <div class="card" style="display:flex;flex-direction:column">
          <div class="card-head">
            <app-icon name="trendD" [size]="16" style="color:var(--text-2)"></app-icon>
            <div class="card-title">Para onde vai a despesa</div>
            <span class="muted" style="margin-left:auto;font-size:12.5px">{{ data.money(despesaTotal) }}</span>
          </div>
          <div style="padding:18px;display:flex;flex-direction:column;gap:15px;flex:1;justify-content:space-evenly">
            @for (c of fin.despesaCategoria; track c.cat) {
              <div class="col" style="gap:7px">
                <div class="row" style="gap:9px">
                  <span [style.width.px]="8" [style.height.px]="8" [style.borderRadius.px]="3" [style.background]="catCor(c.cat)"></span>
                  <span style="font-weight:600;font-size:13.5px;flex:1">{{ c.cat }}</span>
                  <span class="muted tnum" style="font-size:12.5px">{{ pctDe(c.valor, despesaTotal) }}%</span>
                  <span class="tnum" style="font-weight:700;font-size:13.5px">{{ data.money(c.valor) }}</span>
                </div>
                <div class="progress">
                  <span [style.width]="(c.valor / despesaCatMax * 100)+'%'" [style.background]="catCor(c.cat)"></span>
                </div>
              </div>
            }
          </div>
        </div>

      </div>

      <!-- Receita por profissional -->
      <div class="card">
        <div class="card-head">
          <app-icon name="team" [size]="16" style="color:var(--text-2)"></app-icon>
          <div class="card-title">Receita por profissional · mês</div>
          <span class="muted" style="margin-left:auto;font-size:12.5px">atendimentos</span>
        </div>
        @for (p of fin.porProfissional; track p.prof; let i = $index) {
          <div class="row" style="gap:12px;padding:12px 18px"
               [style.border-bottom]="i < fin.porProfissional.length - 1 ? '1px solid var(--border)' : 'none'">
            <span class="tnum" [style.color]="i===0 ? 'var(--accent)' : (i===1 ? 'var(--st-atendimento)' : (i===2 ? 'var(--st-pendente)' : 'var(--text-3)'))" style="font-weight:800;width:20px">{{ i===0 ? '🥇' : (i===1 ? '🥈' : (i===2 ? '🥉' : '#'+(i+1))) }}</span>
            <app-avatar [nome]="data.prof(p.prof).nome" [cor]="data.prof(p.prof).cor" [size]="34"></app-avatar>
            <div class="col" style="flex:1;line-height:1.25;gap:5px;min-width:0">
              <span style="font-weight:600;font-size:13.5px">{{ data.prof(p.prof).nome }}</span>
              <div class="progress">
                <span [style.width]="(p.valor / profMax * 100)+'%'" [style.background]="data.prof(p.prof).cor"></span>
              </div>
            </div>
            <span class="muted tnum" style="font-size:12.5px;width:60px;text-align:right">{{ p.qtd }} atend.</span>
            <span class="tnum" style="font-weight:700;width:96px;text-align:right">{{ data.money(p.valor) }}</span>
          </div>
        }
      </div>

    </div>
  }

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

      <!-- KPIs do dia -->
      <div class="stat-grid">
        <div class="stat">
          <div class="stat-top">
            <div class="stat-label">Saldo em caixa</div>
            <div class="stat-ico" style="background:var(--accent-soft)">
              <app-icon name="money" [size]="17" style="color:var(--accent)"></app-icon>
            </div>
          </div>
          <div class="stat-val tnum">{{ data.money(saldoHoje) }}</div>
          <div class="stat-meta">abertura {{ data.money(data.caixa.valorAbertura) }} + movimento</div>
        </div>
        <div class="stat">
          <div class="stat-top">
            <div class="stat-label">Entradas do dia</div>
            <div class="stat-ico" style="background:var(--accent-soft)">
              <app-icon name="trend" [size]="17" style="color:var(--accent)"></app-icon>
            </div>
          </div>
          <div class="stat-val tnum">{{ data.money(totRecHoje) }}</div>
          <div class="stat-meta">{{ receitasHoje.length }} recebimentos</div>
        </div>
        <div class="stat">
          <div class="stat-top">
            <div class="stat-label">Saídas do dia</div>
            <div class="stat-ico" style="background:var(--st-faltou-bg)">
              <app-icon name="trendD" [size]="17" style="color:var(--st-faltou)"></app-icon>
            </div>
          </div>
          <div class="stat-val tnum">{{ data.money(totDespHoje) }}</div>
          <div class="stat-meta">{{ despesasHoje.length }} despesas</div>
        </div>
        <div class="stat">
          <div class="stat-top">
            <div class="stat-label">Resultado do dia</div>
            <div class="stat-ico" style="background:var(--st-atendimento-bg)">
              <app-icon name="chart" [size]="17" style="color:var(--st-atendimento)"></app-icon>
            </div>
          </div>
          <div class="stat-val tnum">{{ data.money(totRecHoje - totDespHoje) }}</div>
          <div class="stat-meta">entradas − saídas</div>
        </div>
      </div>

      <div class="grid-2" style="align-items:stretch">

        <!-- conferência por forma de pagamento -->
        <div class="card" style="display:flex;flex-direction:column">
          <div class="card-head">
            <app-icon name="coins" [size]="17" style="color:var(--text-2)"></app-icon>
            <div class="card-title">Conferência por forma de pagamento</div>
          </div>
          <div style="padding:18px;display:flex;flex-direction:column;justify-content:space-evenly;flex:1">
            @for (f of formaKeys; track f) {
              <div class="col" style="gap:7px">
                <div class="row" style="gap:9px">
                  <div [style.width.px]="28" [style.height.px]="28" style="border-radius:8px;display:grid;place-items:center"
                       [style.background]="FORMA[f].bg">
                    <app-icon [name]="FORMA[f].icon" [size]="15" [style.color]="FORMA[f].cor"></app-icon>
                  </div>
                  <span style="font-weight:600;font-size:14px">{{ FORMA[f].label }}</span>
                  <span class="tnum" style="margin-left:auto;font-weight:700">{{ data.money(porFormaHoje[f] || 0) }}</span>
                  <span class="muted tnum" style="font-size:12.5px;width:38px;text-align:right">{{ pctHoje(f) }}%</span>
                </div>
                <div class="progress">
                  <span [style.width]="pctHoje(f)+'%'" [style.background]="FORMA[f].cor"></span>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- movimentações de hoje -->
        <div class="card">
          <div class="card-head">
            <app-icon name="list" [size]="17" style="color:var(--text-2)"></app-icon>
            <div class="card-title">Movimentações de hoje</div>
            <span class="muted" style="margin-left:auto;font-size:13px">{{ lancHoje.length }} lançamentos</span>
          </div>
          <div style="max-height:320px;overflow-y:auto">
            @for (l of todosHojeOrdenados; track l.id; let last = $last) {
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
            } @empty {
              <div class="empty">Nenhum lançamento hoje ainda.</div>
            }
          </div>
        </div>

      </div>
    </div>
  }

  <!-- ==================== TAB: LANÇAMENTOS ==================== -->
  @if (tab==='lancamentos') {
    <div class="col" style="gap:16px">

      <!-- resumo do período filtrado -->
      <div class="stat-grid" style="grid-template-columns:repeat(3,1fr)">
        <div class="stat">
          <div class="stat-top"><div class="stat-label">Entradas no período</div></div>
          <div class="stat-val tnum" style="color:var(--accent-text)">{{ data.money(totalFiltrado.rec) }}</div>
        </div>
        <div class="stat">
          <div class="stat-top"><div class="stat-label">Saídas no período</div></div>
          <div class="stat-val tnum" style="color:var(--st-faltou)">{{ data.money(totalFiltrado.desp) }}</div>
        </div>
        <div class="stat">
          <div class="stat-top"><div class="stat-label">Resultado</div></div>
          <div class="stat-val tnum">{{ data.money(totalFiltrado.rec - totalFiltrado.desp) }}</div>
        </div>
      </div>

      <div class="card">
        <div class="filter-bar" style="padding:14px;border-bottom:1px solid var(--border)">
          <div class="seg">
            <button [class.on]="periodo==='hoje'"  (click)="periodo='hoje'">Hoje</button>
            <button [class.on]="periodo==='7d'"    (click)="periodo='7d'">7 dias</button>
            <button [class.on]="periodo==='mes'"   (click)="periodo='mes'">Mês</button>
            <button [class.on]="periodo==='todos'" (click)="periodo='todos'">Todos</button>
          </div>
          <div class="seg">
            <button [class.on]="filtro==='todos'"   (click)="filtro='todos'">Todos</button>
            <button [class.on]="filtro==='receita'" (click)="filtro='receita'">Receitas</button>
            <button [class.on]="filtro==='despesa'" (click)="filtro='despesa'">Despesas</button>
          </div>
          <button class="btn btn-ghost btn-sm" style="margin-left:auto" (click)="notify.emit('Lançamentos exportados em CSV')">
            <app-icon name="download" [size]="15"></app-icon> Exportar
          </button>
        </div>
        <table class="tbl">
          <thead>
            <tr>
              <th>Data</th>
              <th>Hora</th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Forma</th>
              <th>Tipo</th>
              <th style="text-align:right">Valor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (l of lancamentosRows; track l.id) {
              <tr>
                <td class="mono muted" style="font-size:13px">{{ data.fmtData(l.data) }}</td>
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
                <td class="tnum" style="font-weight:700;text-align:right"
                    [style.color]="l.tipo==='receita' ? 'var(--accent-text)' : 'var(--st-faltou)'">
                  {{ (l.tipo==='receita' ? '+' : '−') + data.money(l.valor) }}
                </td>
                <td>
                  <app-menu [items]="[{label:'Editar',icon:'edit'},{label:'Excluir',icon:'trash',danger:true}]"></app-menu>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="8"><div class="empty">Nenhum lançamento no período selecionado.</div></td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  }

  <!-- ==================== TAB: A RECEBER ==================== -->
  @if (tab==='receber') {
    <div class="col" style="gap:16px">

      <!-- KPIs a receber -->
      <div class="stat-grid">
        <div class="stat">
          <div class="stat-top">
            <div class="stat-label">Total a receber</div>
            <div class="stat-ico" style="background:var(--st-pendente-bg)">
              <app-icon name="money" [size]="17" style="color:var(--st-pendente)"></app-icon>
            </div>
          </div>
          <div class="stat-val tnum">{{ data.money(totalAReceber) }}</div>
          <div class="stat-meta">{{ data.aReceber.length }} títulos em aberto</div>
        </div>
        <div class="stat">
          <div class="stat-top">
            <div class="stat-label">A vencer</div>
            <div class="stat-ico" style="background:var(--accent-soft)">
              <app-icon name="clock" [size]="17" style="color:var(--accent)"></app-icon>
            </div>
          </div>
          <div class="stat-val tnum">{{ data.money(totalAVencer) }}</div>
          <div class="stat-meta">{{ aVencer.length }} títulos no prazo</div>
        </div>
        <div class="stat">
          <div class="stat-top">
            <div class="stat-label">Vencido</div>
            <div class="stat-ico" style="background:var(--st-faltou-bg)">
              <app-icon name="alert" [size]="17" style="color:var(--st-faltou)"></app-icon>
            </div>
          </div>
          <div class="stat-val tnum" [style.color]="vencidas.length ? 'var(--st-faltou)' : 'var(--text)'">{{ data.money(totalVencido) }}</div>
          <div class="stat-meta">{{ vencidas.length }} títulos vencidos</div>
        </div>
        <div class="stat">
          <div class="stat-top">
            <div class="stat-label">Prazo médio</div>
            <div class="stat-ico" style="background:var(--st-atendimento-bg)">
              <app-icon name="calendar" [size]="17" style="color:var(--st-atendimento)"></app-icon>
            </div>
          </div>
          <div class="stat-val tnum">{{ prazoMedio }}<small> dias</small></div>
          <div class="stat-meta">média de vencimento</div>
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <div class="card-title">Contas a receber</div>
          <span class="muted" style="margin-left:auto;font-size:12.5px">ordenado por vencimento</span>
        </div>
        <table class="tbl">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Descrição</th>
              <th>Vencimento</th>
              <th>Situação</th>
              <th style="text-align:right">Valor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (r of aReceberOrdenado; track r.id) {
              <tr>
                <td>
                  <div class="row" style="gap:10px">
                    <app-avatar [nome]="data.cli(r.cli).nome" cor="#2563eb" [size]="30"></app-avatar>
                    <span style="font-weight:600">{{ data.cli(r.cli).nome }}</span>
                  </div>
                </td>
                <td class="muted">{{ r.desc }}</td>
                <td class="mono muted" style="font-size:13px">{{ data.fmtData(r.venc) }}</td>
                <td>
                  <span [class]="r.dias < 0 ? 'pill pill-faltou' : (r.dias <= 3 ? 'pill pill-pendente' : 'pill pill-confirmado')">
                    <span class="pdot"></span>
                    {{ r.dias < 0 ? 'Vencida há ' + abs(r.dias) + 'd' : (r.dias === 0 ? 'Vence hoje' : 'Vence em ' + r.dias + 'd') }}
                  </span>
                </td>
                <td class="tnum" style="font-weight:700;text-align:right">{{ data.money(r.valor) }}</td>
                <td>
                  <div class="row" style="gap:6px;justify-content:flex-end">
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

</div>
  `,
})
export class FinanceiroComponent {
  @Output() notify = new EventEmitter<string>();

  tab = 'visao';
  filtro = 'todos';
  periodo = 'mes';

  readonly FORMA: any = {
    dinheiro: { label: 'Dinheiro', cor: 'var(--accent)',            bg: 'var(--accent-soft)',          icon: 'money'   },
    pix:      { label: 'Pix',      cor: 'var(--st-atendimento)',    bg: 'var(--st-atendimento-bg)',    icon: 'sparkle' },
    cartao:   { label: 'Cartão',   cor: '#7c3aed',                  bg: '#ede9fe',                     icon: 'coins'   },
  };
  readonly FORMA_COR: any = {
    pix: 'var(--st-atendimento)', cartao: '#7c3aed', dinheiro: 'var(--accent)',
  };
  readonly CAT_COR: any = {
    Atendimento: 'var(--accent)', Produto: 'var(--st-atendimento)',
    Insumos: 'var(--st-faltou)', Marketing: '#7c3aed', Operacional: 'var(--st-pendente)',
  };

  get formaKeys(): string[] { return Object.keys(this.FORMA); }

  constructor(public data: DataService) {}

  get fin() { return this.data.financeiro; }
  get hoje() { return this.fin.hoje; }

  // ---- visão geral ----
  get recDelta(): number | null {
    const a = this.fin.mesAnterior.receita;
    return a > 0 ? Math.round((this.fin.mes.receita - a) / a * 100) : null;
  }
  get margem() { return this.fin.mes.receita ? Math.round(this.fin.mes.resultado / this.fin.mes.receita * 100) : 0; }
  get margemCor(): string {
    if (this.margem >= 60) return 'var(--st-confirmado)';
    if (this.margem >= 40) return 'var(--accent)';
    return 'var(--st-faltou)';
  }
  get margemTexto(): string {
    if (this.margem >= 70) return 'Margem excelente';
    if (this.margem >= 50) return 'Margem saudável';
    if (this.margem >= 30) return 'Margem moderada';
    return 'Margem apertada — revise custos';
  }
  get pctDespesa() { return this.fin.mes.receita ? Math.round(this.fin.mes.despesa / this.fin.mes.receita * 100) : 0; }
  get projecao(): number { return this.data.projecaoMes(); }

  get fluxoLabels(): string[] { return this.fin.fluxo.map(f => f.dia); }
  get fluxoSeries2() {
    return [
      { dados: this.fin.fluxo.map(f => f.rec), cor: 'var(--accent)' },
      { dados: this.fin.fluxo.map(f => f.desp), cor: 'var(--st-faltou)', tracejado: true },
    ];
  }
  kfmtFn = (v: number): string => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : String(v);

  get donutFatias() {
    return this.fin.receitaForma.map(f => ({
      valor: f.valor, label: f.label, cor: this.FORMA_COR[f.forma] || 'var(--text-3)',
    }));
  }

  get fluxoMax() { return Math.max(1, ...this.fin.fluxo.map(f => Math.max(f.rec, f.desp))); }
  barH(val: number): string { return (val / this.fluxoMax * 100 || 0) + '%'; }
  get receitaFormaTotal() { return this.fin.receitaForma.reduce((s, f) => s + f.valor, 0); }
  formaPct(v: number): number { return this.receitaFormaTotal ? Math.round(v / this.receitaFormaTotal * 100) : 0; }
  get receitaCatMax() { return Math.max(1, ...this.fin.receitaCategoria.map(c => c.valor)); }
  get despesaCatMax() { return Math.max(1, ...this.fin.despesaCategoria.map(c => c.valor)); }
  get despesaTotal() { return this.fin.despesaCategoria.reduce((s, c) => s + c.valor, 0); }
  get profMax() { return Math.max(1, ...this.fin.porProfissional.map(p => p.valor)); }
  catCor(c: string) { return this.CAT_COR[c] || 'var(--text-3)'; }
  pctDe(v: number, total: number): number { return total ? Math.round(v / total * 100) : 0; }
  kfmt(v: number): string { return v >= 1000 ? (v / 1000).toFixed(1).replace('.', ',') + 'k' : String(v); }

  // ---- caixa do dia (hoje) ----
  get lancHoje() { return this.data.lancamentos.filter(l => l.data === this.hoje); }
  get receitasHoje() { return this.lancHoje.filter(l => l.tipo === 'receita'); }
  get despesasHoje() { return this.lancHoje.filter(l => l.tipo === 'despesa'); }
  get totRecHoje() { return this.receitasHoje.reduce((s, l) => s + l.valor, 0); }
  get totDespHoje() { return this.despesasHoje.reduce((s, l) => s + l.valor, 0); }
  get saldoHoje() { return this.data.caixa.valorAbertura + this.totRecHoje - this.totDespHoje; }
  get porFormaHoje(): { [k: string]: number } {
    const m: { [k: string]: number } = {};
    this.receitasHoje.forEach(l => m[l.forma] = (m[l.forma] || 0) + l.valor);
    return m;
  }
  pctHoje(f: string): number {
    const v = this.porFormaHoje[f] || 0;
    return this.totRecHoje ? Math.round(v / this.totRecHoje * 100) : 0;
  }
  get todosHojeOrdenados() { return [...this.lancHoje].sort((a, b) => b.hora.localeCompare(a.hora)); }

  // ---- lançamentos (histórico filtrável) ----
  get lancamentosRows(): Lancamento[] {
    let rows = [...this.data.lancamentos];
    if (this.periodo === 'hoje') rows = rows.filter(l => l.data === this.hoje);
    else if (this.periodo === '7d') {
      const min = this.shiftDays(this.hoje, -6);
      rows = rows.filter(l => l.data >= min);
    } else if (this.periodo === 'mes') {
      const ym = this.hoje.slice(0, 7);
      rows = rows.filter(l => l.data.slice(0, 7) === ym);
    }
    if (this.filtro !== 'todos') rows = rows.filter(l => l.tipo === this.filtro);
    return rows.sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora));
  }
  get totalFiltrado() {
    return this.lancamentosRows.reduce(
      (acc, l) => {
        if (l.tipo === 'receita') acc.rec += l.valor; else acc.desp += l.valor;
        return acc;
      },
      { rec: 0, desp: 0 },
    );
  }
  private shiftDays(iso: string, days: number): string {
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // ---- a receber ----
  get aReceberOrdenado() { return [...this.data.aReceber].sort((a, b) => a.dias - b.dias); }
  get totalAReceber() { return this.data.aReceber.reduce((s, r) => s + r.valor, 0); }
  get aVencer() { return this.data.aReceber.filter(r => r.dias >= 0); }
  get vencidas() { return this.data.aReceber.filter(r => r.dias < 0); }
  get totalAVencer() { return this.aVencer.reduce((s, r) => s + r.valor, 0); }
  get totalVencido() { return this.vencidas.reduce((s, r) => s + r.valor, 0); }
  get prazoMedio(): number {
    const av = this.aVencer;
    return av.length ? Math.round(av.reduce((s, r) => s + r.dias, 0) / av.length) : 0;
  }
  abs(n: number) { return Math.abs(n); }
}
