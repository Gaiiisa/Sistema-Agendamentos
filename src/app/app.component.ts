/* App shell — navegação + modal de novo agendamento */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DataService, Appt } from './data.service';
import { IconComponent } from './icon.component';
import { SidebarComponent } from './shared/sidebar.component';
import { TopbarComponent } from './shared/topbar.component';
import { ComingSoonComponent } from './shared/coming-soon.component';

import { DashboardComponent } from './screens/dashboard.component';
import { AgendaComponent } from './screens/agenda.component';
import { AgendamentosComponent } from './screens/agendamentos.component';
import { ClientesComponent } from './screens/clientes.component';
import { ServicosComponent } from './screens/servicos.component';
import { EquipeComponent } from './screens/equipe.component';
import { FinanceiroComponent } from './screens/financeiro.component';
import { ComissoesComponent } from './screens/comissoes.component';
import { EstoqueComponent } from './screens/estoque.component';
import { FidelidadeComponent } from './screens/fidelidade.component';
import { RelatoriosComponent } from './screens/relatorios.component';

import { NovoAgendamentoComponent } from './novo-agendamento.component';
import { ApptDetailComponent } from './appt-detail.component';

const TITLES: { [k: string]: [string, string] } = {
  dashboard: ['Dashboard', 'Visão geral do dia'],
  agenda: ['Agenda', 'Arraste para remarcar · clique para detalhes'],
  agendamentos: ['Agendamentos', 'Gestão em lista de todos os horários'],
  clientes: ['Clientes', 'CRM — onde está o dinheiro recorrente'],
  servicos: ['Serviços', 'Catálogo, preços e margens'],
  equipe: ['Equipe', 'Profissionais, jornada e comissões'],
  financeiro: ['Financeiro', 'Visão geral, caixa, lançamentos e a receber'],
  comissoes: ['Comissões', 'Cálculo automático por profissional'],
  estoque: ['Estoque', 'Produtos, baixa automática e reposição'],
  fidelidade: ['Fidelidade & Marketing', 'Programa de pontos, campanhas e mensagens'],
  relatorios: ['Relatórios / BI', 'Indicadores-chave do negócio'],
  config: ['Configurações', 'Estabelecimento, políticas e usuários'],
  soon: ['Em breve', 'Módulo da Fase 3'],
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, IconComponent, SidebarComponent, TopbarComponent, ComingSoonComponent,
    DashboardComponent, AgendaComponent, AgendamentosComponent, ClientesComponent,
    ServicosComponent, EquipeComponent, FinanceiroComponent, ComissoesComponent,
    EstoqueComponent, FidelidadeComponent, RelatoriosComponent,
    NovoAgendamentoComponent, ApptDetailComponent,
  ],
  template: `
    <div class="app">
      <app-sidebar [active]="route" (nav)="route = $event"></app-sidebar>
      <div class="main">
        <app-topbar [title]="title" [sub]="sub" (onNew)="showNew = true"></app-topbar>
        <div class="content">
          @switch (route) {
            @case ('dashboard') {
              <app-dashboard (onNew)="showNew = true" (onNav)="route = $event" (onOpen)="openAppt = $event"></app-dashboard>
            }
            @case ('agenda') {
              <app-agenda [appts]="appts" (onOpen)="openAppt = $event" (onNew)="showNew = true"></app-agenda>
            }
            @case ('agendamentos') {
              <app-agendamentos (onOpenCliente)="goCliente($event)"></app-agendamentos>
            }
            @case ('clientes') {
              <app-clientes [openId]="clienteId" (onOpen)="clienteId = $event" (onClose)="clienteId = null"></app-clientes>
            }
            @case ('servicos') { <app-servicos></app-servicos> }
            @case ('equipe') { <app-equipe></app-equipe> }
            @case ('financeiro') { <app-financeiro (notify)="notify($event)"></app-financeiro> }
            @case ('comissoes') { <app-comissoes (notify)="notify($event)"></app-comissoes> }
            @case ('estoque') { <app-estoque (notify)="notify($event)"></app-estoque> }
            @case ('fidelidade') { <app-fidelidade (notify)="notify($event)"></app-fidelidade> }
            @case ('relatorios') { <app-relatorios (notify)="notify($event)"></app-relatorios> }
            @default {
              <app-coming-soon [title]="TITLES[route] ? TITLES[route][0] : 'Em breve'"></app-coming-soon>
            }
          }
        </div>
      </div>

      @if (showNew) {
        <app-novo-agendamento (close)="showNew = false" (save)="addAppt($event)"></app-novo-agendamento>
      }
      @if (openAppt) {
        <app-appt-detail [a]="openAppt" (close)="openAppt = null" (notify)="notify($event)"></app-appt-detail>
      }
      @if (toast) {
        <div [ngStyle]="toastStyle">
          <div style="width:20px;height:20px;border-radius:99px;background:var(--accent);display:grid;place-items:center">
            <app-icon name="check" [size]="13" [stroke]="3" style="color:#fff"></app-icon>
          </div>
          {{ toast }}
        </div>
      }
    </div>`,
})
export class AppComponent {
  readonly TITLES = TITLES;

  route = 'dashboard';
  appts: Appt[] = this.data.hoje.map(a => ({ ...a }));
  showNew = false;
  openAppt: Appt | null = null;
  clienteId: string | null = null;
  toast: string | null = null;

  private toastTimer: any = null;

  readonly toastStyle = {
    position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
    background: 'oklch(0.25 0.012 165)', color: '#fff', padding: '12px 18px',
    borderRadius: 'var(--r-md)', boxShadow: 'var(--sh-pop)', zIndex: '200',
    display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600', fontSize: '14px',
    animation: 'pop .2s ease',
  };

  constructor(public data: DataService) {}

  get title() { return (TITLES[this.route] || ['', ''])[0]; }
  get sub() { return (TITLES[this.route] || ['', ''])[1]; }

  notify(msg: string) {
    this.toast = msg;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (this.toast = null), 2600);
  }

  addAppt(d: Partial<Appt>) {
    const id = 'a' + (this.appts.length + 100);
    this.appts = [...this.appts, { id, ...d } as Appt];
    this.data.persistAppt({ id, ...d });
    this.showNew = false;
    this.notify('Agendamento criado para ' + this.data.cli(d.cli!).nome);
    if (this.route !== 'agenda') this.route = 'agenda';
  }

  goCliente(id: string) {
    this.clienteId = id;
    this.route = 'clientes';
  }
}
