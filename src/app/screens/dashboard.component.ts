import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon.component';
import { AvatarComponent } from '../shared/avatar.component';
import { StatusPillComponent } from '../shared/status-pill.component';
import { SparklineComponent } from '../shared/sparkline.component';
import { MiniRingComponent } from '../shared/mini-ring.component';
import { AreaChartComponent } from '../shared/area-chart.component';
import { DataService, Appt, Cliente } from '../data.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, IconComponent, AvatarComponent, StatusPillComponent, SparklineComponent, MiniRingComponent, AreaChartComponent],
  template: `
    <div class="page">

      <!-- saudação -->
      <div style="margin-bottom:18px">
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
      <div class="card card-pad" style="margin-bottom:16px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <div class="col" style="gap:2px;min-width:160px">
          <div style="font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text-3)">Meta do mês</div>
          <div style="font-size:17px;font-weight:800">{{ data.money(meta.vendido) }} <span class="muted" style="font-size:13px;font-weight:500">/ {{ data.money(meta.meta) }}</span></div>
        </div>
        <div class="col" style="flex:1;gap:6px;min-width:160px">
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
      <div class="grid-dash">

        <!-- próximos atendimentos -->
        <div class="card">
          <div class="card-head">
            <app-icon name="clock" [size]="18" style="color:var(--text-2)"></app-icon>
            <div class="card-title">Próximos atendimentos</div>
            <button class="link" (click)="onNav.emit('agenda')">Ver agenda →</button>
          </div>
          <div>
            @for (a of proximos; track a.id; let i = $index) {
              <div class="row"
                [style.padding]="'13px 18px'" [style.gap.px]="13"
                [style.borderBottom]="i < proximos.length - 1 ? '1px solid var(--border)' : 'none'"
                style="cursor:pointer" (click)="onOpen.emit(a)">
                <div class="mono" style="font-size:14px;font-weight:600;width:46px;color:var(--text-2)">{{ a.ini }}</div>
                <div [style.width.px]="3" style="align-self:stretch;border-radius:99px" [style.background]="data.srv(a.srv).cor"></div>
                <app-avatar [nome]="data.cli(a.cli).nome" [cor]="data.prof(a.prof).cor" [size]="36"></app-avatar>
                <div class="col" style="line-height:1.3;min-width:0;flex:1">
                  <div style="font-weight:600;font-size:14.5px">{{ data.cli(a.cli).nome }}</div>
                  <div class="muted" style="font-size:13px">{{ data.srv(a.srv).nome }} · {{ data.prof(a.prof).apelido }}</div>
                </div>
                @if (a.sinal) {
                  <span class="tag tag-novo" title="Sinal pago">
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
    </div>`,
})
export class DashboardComponent {
  @Output() onNew = new EventEmitter<void>();
  @Output() onNav = new EventEmitter<string>();
  @Output() onOpen = new EventEmitter<Appt>();

  constructor(public data: DataService) {}

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
}
