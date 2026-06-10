/* Tela: Dashboard inicial — visão do dia */
import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon.component';
import { AvatarComponent } from '../shared/avatar.component';
import { StatusPillComponent } from '../shared/status-pill.component';
import { DataService, Appt, Cliente } from '../data.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, IconComponent, AvatarComponent, StatusPillComponent],
  template: `
    <div class="page">
      <!-- saudação -->
      <div style="margin-bottom:18px">
        <div style="font-size:22px;font-weight:800;letter-spacing:-0.02em">Bom dia, Carlos 👋</div>
        <div class="muted" style="font-size:14px">Terça-feira, 9 de junho · Aqui está o resumo do seu dia.</div>
      </div>

      <!-- KPIs -->
      <div class="stat-grid" style="margin-bottom:16px">
        <!-- Agendamentos hoje -->
        <div class="stat">
          <div class="stat-top">
            <div class="stat-label">Agendamentos hoje</div>
            <div class="stat-ico" style="background:var(--accent-soft)">
              <app-icon name="calendar" [size]="17" style="color:var(--accent)"></app-icon>
            </div>
          </div>
          <div class="stat-val tnum">{{ k.agendamentos }}</div>
          <div class="stat-meta">
            <span class="trend-up">
              <app-icon name="trend" [size]="13" style="display:inline;vertical-align:-2px;margin-right:3px"></app-icon>+3
            </span>
            vs. ontem
          </div>
        </div>
        <!-- Faturamento previsto -->
        <div class="stat">
          <div class="stat-top">
            <div class="stat-label">Faturamento previsto</div>
            <div class="stat-ico" style="background:oklch(0.95 0.04 162)">
              <app-icon name="money" [size]="17" style="color:var(--accent)"></app-icon>
            </div>
          </div>
          <div class="stat-val tnum">{{ data.money(k.faturaPrevisto) }}</div>
          <div class="col" style="gap:6px">
            <div class="progress"><span [style.width.%]="round(k.faturaRealizado / k.faturaPrevisto * 100)"></span></div>
            <div class="stat-meta">{{ data.money(k.faturaRealizado) }} já realizado</div>
          </div>
        </div>
        <!-- Taxa de ocupação -->
        <div class="stat">
          <div class="stat-top">
            <div class="stat-label">Taxa de ocupação</div>
            <div class="stat-ico" style="background:oklch(0.95 0.04 248)">
              <app-icon name="target" [size]="17" style="color:var(--st-atendimento)"></app-icon>
            </div>
          </div>
          <div class="stat-val tnum">{{ k.ocupacao }}%</div>
          <div class="col" style="gap:6px">
            <div class="progress"><span [style.width.%]="k.ocupacao"></span></div>
            <div class="stat-meta">da agenda preenchida</div>
          </div>
        </div>
        <!-- Faltas / Cancelam. -->
        <div class="stat">
          <div class="stat-top">
            <div class="stat-label">Faltas / Cancelam.</div>
            <div class="stat-ico" style="background:var(--st-faltou-bg)">
              <app-icon name="alert" [size]="17" style="color:var(--st-faltou)"></app-icon>
            </div>
          </div>
          <div class="stat-val tnum">{{ k.faltas }} / {{ k.cancelamentos }}</div>
          <div class="stat-meta">
            <span class="trend-down">
              <app-icon name="trendD" [size]="13" style="display:inline;vertical-align:-2px;margin-right:3px"></app-icon>−2
            </span>
            melhor que a média
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
                [style.borderBottom]="i < proximos.length - 1 ? '1px solid var(--border)' : 'none'">
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

        <!-- coluna lateral: alertas -->
        <div class="col" style="gap:16px">
          <!-- alertas -->
          <div class="card card-pad">
            <div class="row" style="margin-bottom:6px">
              <app-icon name="alert" [size]="17" style="color:var(--st-pendente)"></app-icon>
              <div class="card-title" style="font-size:15px">Alertas</div>
            </div>
            <!-- AlertRow 1 -->
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
            <!-- AlertRow 2 -->
            <div class="alert-item">
              <div class="alert-ico" style="background:var(--st-faltou-bg)">
                <app-icon name="pkg" [size]="15" style="color:var(--st-faltou)"></app-icon>
              </div>
              <div class="col" style="line-height:1.3;flex:1">
                <div style="font-weight:600;font-size:13.5px">2 produtos em estoque baixo</div>
                <div class="muted" style="font-size:12.5px">Pomada modeladora, lâmina</div>
              </div>
              <button class="link" style="font-size:13px">Repor</button>
            </div>
            <!-- AlertRow 3 -->
            <div class="alert-item">
              <div class="alert-ico" style="background:var(--accent-soft)">
                <app-icon name="coins" [size]="15" style="color:var(--accent)"></app-icon>
              </div>
              <div class="col" style="line-height:1.3;flex:1">
                <div style="font-weight:600;font-size:13.5px">Comissões a pagar</div>
                <div class="muted" style="font-size:12.5px">{{ data.money(2840) }} · fechamento sexta</div>
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

  constructor(public data: DataService) {}

  get k() { return this.data.kpis; }
  round = Math.round;

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
