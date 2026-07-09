import { Component, ElementRef, EventEmitter, HostListener, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon.component';
import { AvatarComponent } from '../shared/avatar.component';
import { StatusPillComponent } from '../shared/status-pill.component';
import { SparklineComponent } from '../shared/sparkline.component';
import { MiniRingComponent } from '../shared/mini-ring.component';
import { AreaChartComponent } from '../shared/area-chart.component';
import { DonutComponent } from '../shared/donut.component';
import { HeatmapComponent } from '../shared/heatmap.component';
import { DataService, Appt, Cliente } from '../data.service';
import { AuthService } from '../auth.service';
import { ExportService, Formato, Periodo } from '../export.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, IconComponent, AvatarComponent, StatusPillComponent, SparklineComponent, MiniRingComponent, AreaChartComponent, DonutComponent, HeatmapComponent],
  template: `
    <div class="page">

      <!-- saudação -->
      <div class="dash-saudacao" style="margin-bottom:18px">
        <div style="font-size:22px;font-weight:800;letter-spacing:-0.02em">{{ saudacao }}, {{ nomeUsuario }} 👋</div>
        <div class="muted" style="font-size:14px">{{ dataLabel }} · Aqui está o resumo do seu dia.</div>
      </div>

      <!-- KPIs -->
      <div class="stat-grid" style="margin-bottom:16px">

        <!-- Faturamento hoje -->
        <div class="stat">
          <div class="stat-top">
            <div class="stat-label">Faturamento hoje</div>
            <div class="stat-ico" style="background:var(--accent-soft)">
              <app-icon name="money" [size]="17" style="color:var(--accent)"></app-icon>
            </div>
          </div>
          <div class="stat-val tnum">{{ data.money(k.faturaRealizado) }}</div>
          <div class="col" style="gap:6px">
            <div class="row" style="justify-content:space-between">
              <div class="stat-meta">de {{ data.money(k.faturaPrevisto) }} previstos</div>
              <app-sparkline [pontos]="sparkline" cor="var(--accent)" [w]="64" [h]="22"></app-sparkline>
            </div>
            <div class="progress"><span [style.width.%]="round(k.faturaRealizado / k.faturaPrevisto * 100)"></span></div>
          </div>
        </div>

        <!-- Agendamentos hoje -->
        <div class="stat">
          <div class="stat-top">
            <div class="stat-label">Agendamentos hoje</div>
            <div class="stat-ico" style="background:var(--accent-soft)">
              <app-icon name="calendar" [size]="17" style="color:var(--accent)"></app-icon>
            </div>
          </div>
          <div class="stat-val tnum">{{ k.agendamentos }}</div>
          <div class="col" style="gap:6px">
            <div class="row" style="gap:4px;height:4px">
              <div [style.flex]="breakdown.feitos" style="background:var(--st-confirmado);border-radius:99px;height:4px;min-width:2px"></div>
              <div [style.flex]="breakdown.aFazer" style="background:var(--accent);border-radius:99px;height:4px;min-width:2px"></div>
              <div [style.flex]="breakdown.pendentes" style="background:var(--st-pendente);border-radius:99px;height:4px;min-width:2px"></div>
            </div>
            <div class="stat-meta">
              <span style="color:var(--st-confirmado);font-weight:600">{{ breakdown.feitos }} feitos</span>
              &nbsp;·&nbsp;
              <span style="color:var(--accent);font-weight:600">{{ breakdown.aFazer }} a fazer</span>
              &nbsp;·&nbsp;
              <span style="color:var(--st-pendente);font-weight:600">{{ breakdown.pendentes }} pend.</span>
            </div>
          </div>
        </div>

        <!-- Ocupação -->
        <div class="stat">
          <div class="stat-top">
            <div class="stat-label">Taxa de ocupação</div>
            <div class="stat-ico" style="background:var(--st-atendimento-bg)">
              <app-icon name="target" [size]="17" style="color:var(--st-atendimento)"></app-icon>
            </div>
          </div>
          <div class="row" style="gap:14px;align-items:center">
            <div class="stat-val tnum">{{ k.ocupacao }}%</div>
            <app-mini-ring [pct]="k.ocupacao" cor="var(--st-atendimento)" [size]="48" [label]="''"></app-mini-ring>
          </div>
          <div class="stat-meta">da agenda preenchida hoje</div>
        </div>

        <!-- Ticket médio hoje -->
        <div class="stat">
          <div class="stat-top">
            <div class="stat-label">Ticket médio hoje</div>
            <div class="stat-ico" style="background:var(--accent-soft)">
              <app-icon name="coins" [size]="17" style="color:var(--accent)"></app-icon>
            </div>
          </div>
          <div class="stat-val tnum">{{ data.money(ticketHoje) }}</div>
          <div class="stat-meta">
            @if (ticketDelta !== 0) {
              <span [class.trend-up]="ticketDelta > 0" [class.trend-down]="ticketDelta < 0">
                <app-icon [name]="ticketDelta > 0 ? 'trend' : 'trendD'" [size]="13"
                          style="display:inline;vertical-align:-2px;margin-right:3px"></app-icon>
                {{ (ticketDelta > 0 ? '+' : '') + ticketDelta }}%
              </span>
              vs. ticket do mês
            } @else {
              ticket médio do mês: {{ data.money(data.financeiro.mes.ticketMedio) }}
            }
          </div>
        </div>

      </div>

      <!-- atalhos rápidos -->
      <div class="row" style="gap:10px;margin-bottom:18px;flex-wrap:wrap">
        <button class="btn btn-primary" (click)="onNew.emit()">
          <app-icon name="plus" [size]="17"></app-icon> Novo agendamento
        </button>
        <button class="btn btn-ghost" (click)="onNav.emit('clientes')">
          <app-icon name="user" [size]="16"></app-icon> Novo cliente
        </button>
        <button class="btn btn-ghost" (click)="onNav.emit('soon')">
          <app-icon name="money" [size]="16"></app-icon> Abrir caixa
        </button>
        <button class="btn btn-ghost" (click)="onNav.emit('agenda')">
          <app-icon name="calendar" [size]="16"></app-icon> Ver agenda
        </button>
      </div>

      <!-- Meta do mês -->
      <div class="card card-pad" style="margin-bottom:16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <div class="col" style="gap:2px;min-width:min(160px, 100%)">
          <div style="font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text-3)">Meta do mês</div>
          <div style="font-size:17px;font-weight:800">{{ data.money(meta.vendido) }} <span class="muted" style="font-size:13px;font-weight:500">/ {{ data.money(meta.meta) }}</span></div>
        </div>
        <div class="col" style="flex:1 1 200px;gap:6px;min-width:min(160px, 100%)">
          <div class="progress" style="height:6px">
            <span [style.width.%]="meta.pct" [style.background]="meta.bateu ? 'var(--st-confirmado)' : 'var(--accent)'"></span>
          </div>
          <div class="stat-meta">{{ meta.pct }}% atingido · projeção {{ data.money(meta.projecao) }}</div>
        </div>
        <span [class]="meta.bateu ? 'pill pill-confirmado' : 'pill pill-pendente'">
          <span class="pdot"></span>
          {{ meta.bateu ? 'Meta em dia' : 'Abaixo da meta' }}
        </span>
      </div>

      <!-- Faturamento · últimos 7 dias -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-head">
          <app-icon name="chart" [size]="16" style="color:var(--text-2)"></app-icon>
          <div class="card-title">Faturamento · últimos 7 dias</div>
          <span class="muted" style="margin-left:auto;font-size:12.5px">média {{ data.money(mediaFluxo) }}/dia</span>
        </div>
        <div style="padding:14px 18px 8px">
          <app-area-chart
            [labels]="fluxoLabels"
            [series]="fluxoSeries"
            [altura]="140"
            [formatY]="kfmt">
          </app-area-chart>
        </div>
      </div>

      <!-- grid ocupação / desempenho -->
      <div class="grid-2" style="margin-bottom:16px;align-items:stretch">

        <!-- Ocupação por horário -->
        <div class="card">
          <div class="card-head">
            <app-icon name="clock" [size]="16" style="color:var(--text-2)"></app-icon>
            <div class="card-title">Ocupação por horário</div>
            @if (horaLivre) {
              <span class="pill pill-pendente" style="margin-left:auto;font-size:11px">{{ horaLivre }} disponível</span>
            }
          </div>
          <div style="padding:14px 18px;display:flex;flex-direction:column;gap:7px">
            @for (h of ocupacaoPorHora; track h.hora) {
              <div class="row" style="gap:10px">
                <span class="mono muted" style="font-size:11.5px;width:38px">{{ h.hora }}</span>
                <div class="progress" style="flex:1;height:10px;border-radius:4px">
                  <span [style.width.%]="h.pct"
                        [style.background]="h.pct === 0 ? 'var(--surface-3)' : h.pct < 50 ? 'var(--st-pendente)' : 'var(--accent)'"
                        style="border-radius:4px"></span>
                </div>
                <span class="tnum muted" style="font-size:11px;width:30px;text-align:right">{{ h.pct }}%</span>
              </div>
            }
          </div>
        </div>

        <!-- Desempenho por profissional hoje -->
        <div class="card">
          <div class="card-head">
            <app-icon name="team" [size]="16" style="color:var(--text-2)"></app-icon>
            <div class="card-title">Desempenho hoje</div>
            <span class="muted" style="margin-left:auto;font-size:12.5px">concluídos</span>
          </div>
          @for (d of desempenho; track d.prof.id) {
            <div class="row" style="gap:12px;padding:12px 18px;border-bottom:1px solid var(--border)">
              <app-avatar [nome]="d.prof.nome" [cor]="d.prof.cor" [size]="34"></app-avatar>
              <div class="col" style="flex:1;gap:5px;min-width:0">
                <span style="font-weight:600;font-size:13.5px">{{ d.prof.apelido }}</span>
                <div class="progress">
                  <span [style.width.%]="desempenhoMax ? d.receita / desempenhoMax * 100 : 0"
                        [style.background]="d.prof.cor"></span>
                </div>
              </div>
              <div class="col" style="align-items:flex-end;gap:2px">
                <span class="tnum" style="font-weight:700;font-size:13.5px">{{ data.money(d.receita) }}</span>
                <span class="muted tnum" style="font-size:12px">{{ d.atend }} atend.</span>
              </div>
            </div>
          }
        </div>

      </div>

      <!-- grid principal -->
      <div class="grid-dash" style="margin-bottom:32px">

        <!-- próximos atendimentos -->
        <div class="card">
          <div class="card-head">
            <app-icon name="clock" [size]="18" style="color:var(--text-2)"></app-icon>
            <div class="card-title">Próximos atendimentos</div>
            <button class="link" (click)="onNav.emit('agenda')">Ver agenda →</button>
          </div>
          <div>
            @for (a of proximos; track a.id; let i = $index) {
              <div class="row prox-row"
                [style.padding]="'13px 18px'" [style.gap.px]="13"
                [style.borderBottom]="i < proximos.length - 1 ? '1px solid var(--border)' : 'none'"
                style="cursor:pointer" (click)="onOpen.emit(a)">
                <div class="mono prox-hora" style="font-size:14px;font-weight:600;width:46px;color:var(--text-2)">{{ a.ini }}</div>
                <div [style.width.px]="3" style="align-self:stretch;border-radius:99px" [style.background]="data.srv(a.srv).cor"></div>
                <app-avatar [nome]="data.cli(a.cli).nome" [cor]="data.prof(a.prof).cor" [size]="36"></app-avatar>
                <div class="col" style="line-height:1.3;min-width:0;flex:1">
                  <div style="font-weight:600;font-size:14.5px">{{ data.cli(a.cli).nome }}</div>
                  <div class="muted" style="font-size:13px">{{ data.srv(a.srv).nome }} · {{ data.prof(a.prof).apelido }}</div>
                </div>
                @if (a.sinal) {
                  <span class="tag tag-novo tn-hide-mobile" title="Sinal pago">
                    <app-icon name="check" [size]="11"></app-icon> Sinal
                  </span>
                }
                <app-status-pill [status]="a.status"></app-status-pill>
              </div>
            }
          </div>
        </div>

        <!-- coluna lateral -->
        <div class="col" style="gap:16px">

          <!-- alertas -->
          <div class="card card-pad">
            <div class="row" style="margin-bottom:6px">
              <app-icon name="alert" [size]="17" style="color:var(--st-pendente)"></app-icon>
              <div class="card-title" style="font-size:15px">Alertas</div>
            </div>
            <div class="alert-item">
              <div class="alert-ico" style="background:var(--st-pendente-bg)">
                <app-icon name="clock" [size]="15" style="color:var(--st-pendente)"></app-icon>
              </div>
              <div class="col" style="line-height:1.3;flex:1">
                <div style="font-weight:600;font-size:13.5px">{{ naoConfirmados.length }} clientes não confirmaram</div>
                <div class="muted" style="font-size:12.5px">Enviar lembrete via WhatsApp</div>
              </div>
              <button class="link" style="font-size:13px">Lembrar</button>
            </div>
            <div class="alert-item">
              <div class="alert-ico" style="background:var(--st-faltou-bg)">
                <app-icon name="pkg" [size]="15" style="color:var(--st-faltou)"></app-icon>
              </div>
              <div class="col" style="line-height:1.3;flex:1">
                <div style="font-weight:600;font-size:13.5px">{{ data.produtosAlerta.length }} produto{{ data.produtosAlerta.length === 1 ? '' : 's' }} em estoque baixo</div>
                <div class="muted" style="font-size:12.5px">{{ alertaNomes }}</div>
              </div>
              <button class="link" style="font-size:13px">Repor</button>
            </div>
            @if (titulosVencidos > 0) {
              <div class="alert-item">
                <div class="alert-ico" style="background:var(--st-faltou-bg)">
                  <app-icon name="money" [size]="15" style="color:var(--st-faltou)"></app-icon>
                </div>
                <div class="col" style="line-height:1.3;flex:1">
                  <div style="font-weight:600;font-size:13.5px">{{ titulosVencidos }} título{{ titulosVencidos === 1 ? '' : 's' }} vencido{{ titulosVencidos === 1 ? '' : 's' }}</div>
                  <div class="muted" style="font-size:12.5px">{{ data.money(valorVencido) }} a receber</div>
                </div>
                <button class="link" style="font-size:13px">Cobrar</button>
              </div>
            }
            <div class="alert-item">
              <div class="alert-ico" style="background:var(--accent-soft)">
                <app-icon name="coins" [size]="15" style="color:var(--accent)"></app-icon>
              </div>
              <div class="col" style="line-height:1.3;flex:1">
                <div style="font-weight:600;font-size:13.5px">Comissões a pagar</div>
                <div class="muted" style="font-size:12.5px">{{ data.money(data.comissoesAPagar) }} · fechamento sexta</div>
              </div>
              <button class="link" style="font-size:13px">Ver</button>
            </div>
          </div>

          <!-- aniversariantes -->
          <div class="card card-pad">
            <div class="row" style="margin-bottom:10px">
              <app-icon name="cake" [size]="17" style="color:var(--st-atendimento)"></app-icon>
              <div class="card-title" style="font-size:15px">Aniversariantes do mês</div>
            </div>
            <div class="col" style="gap:11px">
              @for (c of aniversariantes; track c.id) {
                <div class="row" style="gap:11px">
                  <app-avatar [nome]="c.nome" cor="#9333ea" [size]="32"></app-avatar>
                  <div class="col" style="line-height:1.25;flex:1">
                    <div style="font-weight:600;font-size:13.5px">{{ c.nome }}</div>
                    <div class="muted" style="font-size:12.5px">Dia {{ c.nasc.split('-')[2] }}</div>
                  </div>
                  <button class="btn btn-subtle btn-sm">
                    <app-icon name="gift" [size]="14"></app-icon> Felicitar
                  </button>
                </div>
              }
            </div>
          </div>

        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════ -->
      <!-- Seção: Análises & Relatórios                              -->
      <!-- ══════════════════════════════════════════════════════════ -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
        <div style="flex:1;height:1px;background:var(--border)"></div>
        <div style="display:flex;align-items:center;gap:8px;padding:6px 14px;border-radius:99px;background:var(--surface-2);border:1px solid var(--border)">
          <app-icon name="chart" [size]="14" style="color:var(--text-2)"></app-icon>
          <span style="font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text-2)">Análises & Relatórios</span>
        </div>
        <div style="flex:1;height:1px;background:var(--border)"></div>
      </div>

      <!-- Header relatórios -->
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
        <div style="position:relative" data-export-root>
          <button class="btn btn-ghost btn-sm"
            [disabled]="exportando !== null"
            [style.opacity]="exportando !== null ? 0.6 : 1"
            (click)="exportOpen = !exportOpen">
            @if (exportando) {
              <span class="spinner-mini"></span>
            } @else {
              <app-icon name="download" [size]="15"></app-icon>
            }
            Exportar
            <app-icon [name]="exportOpen ? 'chevD' : 'chevR'" [size]="12" style="margin-left:2px;color:var(--text-3)"></app-icon>
          </button>
          @if (exportOpen) {
            <div style="position:absolute;top:calc(100% + 4px);right:0;z-index:30;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-md);box-shadow:var(--sh-pop);padding:5px;min-width:180px">
              <div class="muted" style="padding:6px 10px 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px">
                Relatório gerencial · {{ periodoLabel }}
              </div>
              @for (f of ['pdf','xlsx','csv']; track f) {
                <button (click)="exportarGerencial(f)"
                  style="display:flex;align-items:center;gap:10px;width:100%;padding:8px 10px;border-radius:7px;text-align:left;font-size:13.5px;font-weight:500;background:transparent;border:none;cursor:pointer;color:var(--text)"
                  (mouseenter)="hoverBg($event, 'var(--surface-2)')" (mouseleave)="hoverBg($event, 'transparent')">
                  <app-icon [name]="f === 'pdf' ? 'download' : f === 'xlsx' ? 'list' : 'list'" [size]="14" style="color:var(--text-3)"></app-icon>
                  Exportar em {{ f.toUpperCase() }}
                </button>
              }
            </div>
          }
        </div>
      </div>

      <!-- KPIs relatórios (5) -->
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
            <span [class.trend-up]="rDelta>=0" [class.trend-down]="rDelta<0">
              <app-icon [name]="rDelta>=0 ? 'trend' : 'trendD'" [size]="13"
                        style="display:inline;vertical-align:-2px;margin-right:3px"></app-icon>
              {{ (rDelta>=0 ? '+' : '') + rDelta + '%' }}</span>
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

        <div class="card card-pad">
          <div class="row" style="margin-bottom:14px">
            <app-icon name="users" [size]="16" style="color:var(--text-2)"></app-icon>
            <div class="card-title">Mix de clientes</div>
          </div>
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
              <button class="btn btn-whatsapp btn-sm"
                      (click)="onNotify.emit('Mensagem de reativação enviada para ' + c.nome)">
                <app-icon name="whatsapp" [size]="14"></app-icon> Reativar
              </button>
            </div>
          }
        </div>

      </div>

    </div>`,
  styles: [`
    .spinner-mini {
      display: inline-block; width: 13px; height: 13px; border-radius: 50%;
      border: 2px solid rgba(0,0,0,0.15); border-top-color: var(--accent);
      animation: spin .7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class DashboardComponent {
  @Output() onNew = new EventEmitter<void>();
  @Output() onNav = new EventEmitter<string>();
  @Output() onOpen = new EventEmitter<Appt>();
  @Output() onNotify = new EventEmitter<string>();

  readonly FORMA_COR: any = {
    'Pix':      'var(--st-atendimento)',
    'Cartão':   '#7c3aed',
    'Dinheiro': 'var(--accent)',
  };

  periodo = 'mes';

  // ---- exportação do "Relatório gerencial" ----
  exportOpen = false;
  exportando: string | null = null;

  constructor(
    public data: DataService,
    private auth: AuthService,
    private exportSvc: ExportService,
    private host: ElementRef,
  ) {}

  /** Rótulo do período visível no popover de exportação. */
  get periodoLabel(): string {
    return this.exportSvc.periodRange(this.periodo as Periodo).label;
  }

  /** Fecha o popover ao clicar fora dele. */
  @HostListener('document:mousedown', ['$event'])
  onDocMouseDown(e: MouseEvent) {
    if (!this.exportOpen) return;
    const el = (this.host.nativeElement as HTMLElement).querySelector('[data-export-root]');
    if (el && !el.contains(e.target as Node)) this.exportOpen = false;
  }

  async exportarGerencial(f: string) {
    if (this.exportando) return;
    // O relatório gerencial é sensível — exige perfil dono/admin/gerente.
    const cod = this.auth.usuario?.papelCod || '';
    if (!['dono', 'admin', 'gerente'].includes(cod)) {
      this.exportOpen = false;
      this.onNotify.emit('Você não tem permissão para exportar o relatório gerencial.');
      return;
    }
    this.exportOpen = false;
    this.exportando = f;
    try {
      const nome = this.auth.usuario?.nome || this.data.usuario.nome;
      const { arquivo, linhas } = await this.exportSvc.export(
        'r20', f as Formato, this.periodo as Periodo, nome,
      );
      this.onNotify.emit(`Relatório gerencial exportado (${linhas} linha${linhas === 1 ? '' : 's'}) — ${arquivo}`);
    } catch (e: any) {
      this.onNotify.emit(`Não foi possível exportar: ${e?.message || 'erro desconhecido'}`);
    } finally {
      this.exportando = null;
    }
  }

  hoverBg(e: Event, color: string) {
    (e.currentTarget as HTMLElement).style.background = color;
  }

  // ── Dashboard ──
  get k() { return this.data.kpis; }
  round = Math.round;

  get sparkline() { return this.data.faturamentoSparkline(); }
  get breakdown() { return this.data.agendamentosHojeBreakdown(); }
  get ticketHoje() { return this.data.ticketMedioHoje(); }
  get ticketDelta(): number {
    const mes = this.data.financeiro.mes.ticketMedio;
    if (!mes || !this.ticketHoje) return 0;
    return Math.round((this.ticketHoje - mes) / mes * 100);
  }
  get meta() { return this.data.metaMes(); }

  get fluxoLabels() { return this.data.financeiro.fluxo.map(f => f.dia); }
  get fluxoSeries() {
    return [{ dados: this.data.financeiro.fluxo.map(f => f.rec), cor: 'var(--accent)' }];
  }
  get mediaFluxo(): number {
    const vals = this.data.financeiro.fluxo.map(f => f.rec).filter(v => v > 0);
    return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0;
  }
  kfmt = (v: number) => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : String(v);

  get ocupacaoPorHora() { return this.data.ocupacaoPorHora(); }
  get horaLivre(): string {
    const livre = this.data.ocupacaoPorHora().find(h => h.pct === 0);
    return livre ? livre.hora : '';
  }

  get desempenho() { return this.data.desempenhoHoje(); }
  get desempenhoMax(): number {
    const vals = this.desempenho.map(d => d.receita);
    return Math.max(1, ...vals);
  }

  get saudacao(): string {
    const h = new Date().getHours();
    return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  }
  get nomeUsuario(): string { return this.data.usuario.nome.split(' ')[0]; }
  get dataLabel(): string {
    const hoje = new Date();
    const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const months = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    return `${days[hoje.getDay()]}, ${hoje.getDate()} de ${months[hoje.getMonth()]}`;
  }
  get alertaNomes(): string {
    return this.data.produtosAlerta.slice(0, 2).map(p => p.nome).join(', ');
  }
  get titulosVencidos(): number { return this.data.aReceber.filter(r => r.dias < 0).length; }
  get valorVencido(): number { return this.data.aReceber.filter(r => r.dias < 0).reduce((s, r) => s + r.valor, 0); }

  get proximos(): Appt[] {
    return this.data.hoje
      .filter(a => ['confirmado', 'pendente', 'atendimento'].includes(a.status))
      .sort((a, b) => this.data.toMin(a.ini) - this.data.toMin(b.ini))
      .slice(0, 6);
  }
  get aniversariantes(): Cliente[] {
    return this.data.clientes.filter(c => c.nasc.split('-')[1] === '06').slice(0, 3);
  }
  get naoConfirmados(): Appt[] {
    return this.data.hoje.filter(a => a.status === 'pendente');
  }

  // ── Relatórios ──
  // Chave que representa o "estado" dos dados usados pelo relatório. Enquanto
  // ela não mudar, o `r` retorna o objeto cacheado — evitando recomputar N
  // vezes por ciclo de change detection (a lista de agendamentos costuma ser
  // grande).
  private _rCache: any = null;
  private _rKey = '';

  get r(): any {
    const key = `${this.periodo}|${this.data.agendamentos.length}|${this.data.lancamentos.length}`;
    if (this._rCache && this._rKey === key) return this._rCache;
    this._rCache = this.buildRelatorio(this.periodo);
    this._rKey = key;
    return this._rCache;
  }

  get rDelta(): number {
    const ant = this.r.faturamentoAnt;
    if (!ant) return this.r.faturamento > 0 ? 100 : 0;
    return Math.round((this.r.faturamento - ant) / ant * 100);
  }
  get totalClientes() { return this.r.novos + this.r.recorrentes; }
  get taxaRetorno(): number {
    const total = this.totalClientes;
    return total ? Math.round(this.r.recorrentes / total * 100) : 0;
  }
  get metas() { return this.data.metasEquipe(); }
  get risco() { return this.data.clientesEmRisco(); }

  // ---- construção do relatório a partir do período selecionado ----
  private static readonly MESES_LBL = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
  ];
  private static readonly MES_ABR = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  private static readonly DIAS_TXT = ['dom','seg','ter','qua','qui','sex','sab'];
  private static readonly FORMA_LBL: Record<string,string> = { pix: 'Pix', cartao: 'Cartão', dinheiro: 'Dinheiro' };

  private fmtISO(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private periodRange(periodo: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (periodo === 'semana') {
      const dow = today.getDay();
      const back = dow === 0 ? 6 : dow - 1;                             // segunda como início
      const ini = new Date(today); ini.setDate(today.getDate() - back);
      const fim = new Date(ini);   fim.setDate(ini.getDate() + 6);
      const iniAnt = new Date(ini); iniAnt.setDate(ini.getDate() - 7);
      const fimAnt = new Date(fim); fimAnt.setDate(fim.getDate() - 7);
      const M = DashboardComponent.MES_ABR;
      const label = `Semana · ${ini.getDate()} ${M[ini.getMonth()]} – ${fim.getDate()} ${M[fim.getMonth()]}`;
      return { ini, fim, iniAnt, fimAnt, label };
    }
    if (periodo === 'ano') {
      const y = today.getFullYear();
      return {
        ini: new Date(y, 0, 1), fim: new Date(y, 11, 31),
        iniAnt: new Date(y - 1, 0, 1), fimAnt: new Date(y - 1, 11, 31),
        label: `Ano · ${y}`,
      };
    }
    // mes (default)
    const y = today.getFullYear(), m = today.getMonth();
    return {
      ini: new Date(y, m, 1), fim: new Date(y, m + 1, 0),
      iniAnt: new Date(y, m - 1, 1), fimAnt: new Date(y, m, 0),
      label: `${DashboardComponent.MESES_LBL[m]} · ${y}`,
    };
  }

  private buildRelatorio(periodo: string): any {
    const base = this.data.relatorio;
    const { ini, fim, iniAnt, fimAnt, label } = this.periodRange(periodo);
    const iniISO = this.fmtISO(ini), fimISO = this.fmtISO(fim);
    const iniAntISO = this.fmtISO(iniAnt), fimAntISO = this.fmtISO(fimAnt);
    const todayISO = this.fmtISO(new Date());

    const inRange = (d: string, a: string, b: string) => d >= a && d <= b;

    const ags    = this.data.agendamentos.filter(a => inRange(a.data, iniISO, fimISO));
    const agsAnt = this.data.agendamentos.filter(a => inRange(a.data, iniAntISO, fimAntISO));
    const concluidos    = ags.filter(a => a.status === 'concluido');
    const concluidosAnt = agsAnt.filter(a => a.status === 'concluido');
    const faltas = ags.filter(a => a.status === 'faltou');

    const faturamento    = concluidos.reduce((s, a) => s + a.valor, 0);
    const faturamentoAnt = concluidosAnt.reduce((s, a) => s + a.valor, 0);
    const atendimentos   = concluidos.length;
    const ticketMedio    = atendimentos ? Math.round(faturamento / atendimentos) : 0;

    const finalizaveis = ags.filter(a => a.status === 'concluido' || a.status === 'faltou');
    const noShowQtd   = faltas.length;
    const noShowTaxa  = finalizaveis.length ? Math.round((noShowQtd / finalizaveis.length) * 1000) / 10 : 0;
    const noShowCusto = faltas.reduce((s, a) => s + a.valor, 0);

    // novos × recorrentes — primeira visita concluída (histórico global)
    const primeira: Record<string, string> = {};
    for (const a of this.data.agendamentos) {
      if (a.status !== 'concluido') continue;
      if (!primeira[a.cli] || a.data < primeira[a.cli]) primeira[a.cli] = a.data;
    }
    let novos = 0, recorrentes = 0;
    for (const cli of new Set(concluidos.map(a => a.cli))) {
      if (primeira[cli] && inRange(primeira[cli], iniISO, fimISO)) novos++;
      else recorrentes++;
    }

    // forma de pagamento — lançamentos de receita no período
    const lancs = this.data.lancamentos.filter(l =>
      l.tipo === 'receita' && inRange(l.data, iniISO, fimISO),
    );
    const formaMap: Record<string, number> = {};
    for (const l of lancs) formaMap[l.forma] = (formaMap[l.forma] || 0) + l.valor;
    const totalForma = Object.values(formaMap).reduce((s, v) => s + v, 0);
    const porForma = Object.entries(formaMap)
      .map(([forma, valor]) => ({
        forma: DashboardComponent.FORMA_LBL[forma] || forma, valor,
        pct: totalForma ? Math.round(valor / totalForma * 100) : 0,
      }))
      .sort((a, b) => b.valor - a.valor);

    // ranking de serviços — concluídos no período
    const rankMap: Record<string, { srv: string; qtd: number; receita: number }> = {};
    for (const a of concluidos) {
      (rankMap[a.srv] ||= { srv: a.srv, qtd: 0, receita: 0 });
      rankMap[a.srv].qtd++;
      rankMap[a.srv].receita += a.valor;
    }
    const rankingServicos = Object.values(rankMap).sort((a, b) => b.receita - a.receita).slice(0, 5);

    // ocupação — minutos vendidos / capacidade dos profissionais até hoje
    const ativos = new Set(['concluido', 'atendimento', 'confirmado', 'pendente']);
    const fimCap = fimISO < todayISO ? fimISO : todayISO;      // capacidade só até hoje
    const ativosPeriodo = ags.filter(a => a.data <= fimCap && ativos.has(a.status));
    let vendidosMin = 0;
    for (const a of ativosPeriodo) {
      const s = this.data.srv(a.srv);
      vendidosMin += (s ? s.dur : 30);
    }
    let capMin = 0;
    const iniT = ini.getTime();
    const fimT = Math.min(fim.getTime(), new Date(fimCap + 'T00:00:00').getTime());
    for (let t = iniT; t <= fimT; t += 86_400_000) {
      const d = new Date(t);
      const diaTxt = DashboardComponent.DIAS_TXT[d.getDay()];
      for (const p of this.data.staff) {
        if (p.folga.includes(diaTxt)) continue;
        capMin += this.data.toMin(p.fim) - this.data.toMin(p.inicio);
      }
    }
    const ocupacao = capMin ? Math.min(100, Math.round(vendidosMin / capMin * 100)) : 0;

    // heatmap dia-semana × faixa horária
    const heatDias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const faixas = [9, 11, 13, 15, 17, 19];
    const heatmap = faixas.map(() => heatDias.map(() => 0));
    const heatRele = new Set(['concluido', 'atendimento', 'confirmado']);
    for (const a of ags) {
      if (!heatRele.has(a.status)) continue;
      const dow = new Date(a.data + 'T00:00:00').getDay();
      if (dow < 1 || dow > 6) continue;
      const h = Number(a.hora.slice(0, 2));
      let fi = -1;
      for (let i = faixas.length - 1; i >= 0; i--) if (h >= faixas[i]) { fi = i; break; }
      if (fi >= 0) heatmap[fi][dow - 1]++;
    }
    const heatMax = Math.max(0, ...heatmap.flat());
    const heatmapScaled = heatmap.map(row => row.map(v => (heatMax ? Math.round(v / heatMax * 5) : 0)));

    return {
      periodo: label,
      faturamento, faturamentoAnt,
      atendimentos, ticketMedio, ocupacao,
      noShowTaxa, noShowQtd, noShowCusto,
      novos, recorrentes,
      porForma, rankingServicos,
      heatmapDias: heatDias,
      heatmapFaixas: faixas.map(h => `${h}h`),
      heatmap: heatmapScaled,
      // "Evolução do faturamento" (últimas 8 semanas) mantém a série do backend —
      // é uma visão histórica independente do filtro.
      faturamentoSemanal: base.faturamentoSemanal || [0],
      faturamentoSemanalLabels: base.faturamentoSemanalLabels || [''],
      metaSemanal: base.metaSemanal || 5000,
    };
  }

  get rankServicosMax(): number {
    return Math.max(1, ...this.r.rankingServicos.map((x: any) => x.receita));
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
    return this.r.porForma.map((f: any) => ({
      valor: f.valor, label: f.forma, cor: this.FORMA_COR[f.forma] || 'var(--text-3)',
    }));
  }

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
