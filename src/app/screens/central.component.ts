import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon.component';
import { AvatarComponent } from '../shared/avatar.component';
import { DataService } from '../data.service';
import { AuthService } from '../auth.service';
import { ExportService, Formato, Periodo } from '../export.service';

interface RelCard {
  id: string;
  nome: string;
  obj: string;
  cat: string;
  formatos: string[];
  sensivel?: boolean;
  icon: string;
}

interface NotifConfig {
  id: string;
  nome: string;
  cat: string;
  prior: 'alta' | 'media' | 'baixa';
  obrig: boolean;
  ativo: boolean;
  canais: { sistema: boolean; email: boolean; whatsapp: boolean; push: boolean };
  envio: 'imediato' | 'digest';
  exemplo: string;
}

interface ExportItem {
  quando: string;
  relatorio: string;
  formato: string;
  periodo: string;
  por: string;
}

@Component({
  selector: 'app-central',
  standalone: true,
  imports: [CommonModule, IconComponent, AvatarComponent],
  template: `
<div class="page">

  <!-- ── Cabeçalho com abas ───────────────────────────────── -->
  <div class="row" style="margin-bottom:20px;gap:12px;flex-wrap:wrap;align-items:center">
    <div class="seg">
      <button [class.on]="tab==='relatorios'" (click)="tab='relatorios'">
        Relatórios
      </button>
      <button [class.on]="tab==='notificacoes'" (click)="tab='notificacoes'">
        Notificações
      </button>
    </div>
    @if (tab === 'relatorios') {
      <div class="seg" style="margin-left:auto">
        <button [class.on]="periodo==='semana'" (click)="periodo='semana'">Semana</button>
        <button [class.on]="periodo==='mes'"    (click)="periodo='mes'">Mês</button>
        <button [class.on]="periodo==='ano'"    (click)="periodo='ano'">Ano</button>
      </div>
    }
  </div>

  <!-- ═══════════════════════════════════════════════════════ -->
  <!-- ABA RELATÓRIOS                                         -->
  <!-- ═══════════════════════════════════════════════════════ -->
  @if (tab === 'relatorios') {

    <!-- Filtro de categoria -->
    <div class="row" style="gap:6px;margin-bottom:16px;flex-wrap:wrap">
      @for (c of CATS; track c) {
        <button
          [style.background]="catFiltro===c ? 'var(--accent)' : 'var(--surface-2)'"
          [style.color]="catFiltro===c ? '#fff' : 'var(--text-2)'"
          [style.border]="catFiltro===c ? '1px solid var(--accent)' : '1px solid var(--border)'"
          style="border-radius:99px;padding:4px 13px;font-size:12.5px;font-weight:500;cursor:pointer;transition:all .15s;font-family:inherit"
          (click)="catFiltro = c">
          {{ c }}
        </button>
      }
    </div>

    <!-- Grid de cards de relatório -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;margin-bottom:24px">
      @for (r of relsFiltrados; track r.id) {
        <div class="card" style="display:flex;flex-direction:column">
          <div class="card-head">
            <div class="stat-ico"
              [style.background]="r.sensivel ? 'var(--st-faltou-bg)' : 'var(--accent-soft)'">
              <app-icon [name]="r.icon" [size]="15"
                [style.color]="r.sensivel ? 'var(--st-faltou)' : 'var(--accent)'"></app-icon>
            </div>
            <div style="flex:1;min-width:0">
              <div class="row" style="gap:5px;font-weight:600;font-size:13.5px;flex-wrap:wrap">
                {{ r.nome }}
                @if (r.sensivel) {
                  <app-icon name="lock" [size]="12" style="color:var(--st-faltou);flex-shrink:0"></app-icon>
                }
              </div>
              <div class="muted" style="font-size:12px;margin-top:2px;line-height:1.4">{{ r.obj }}</div>
            </div>
          </div>
          <div class="row" style="gap:6px;padding:4px 14px 14px;flex-wrap:wrap;align-items:center">
            @for (fmt of r.formatos; track fmt) {
              <button class="btn btn-ghost btn-sm" style="gap:4px"
                [disabled]="exportando === r.id + ':' + fmt"
                [style.opacity]="exportando === r.id + ':' + fmt ? 0.6 : 1"
                (click)="exportar(r, fmt)">
                @if (exportando === r.id + ':' + fmt) {
                  <span class="spinner-mini"></span>
                } @else {
                  <app-icon name="download" [size]="13"></app-icon>
                }
                {{ fmt.toUpperCase() }}
              </button>
            }
            @if (r.sensivel && !podeVerSensivel) {
              <span style="font-size:11px;color:var(--st-faltou);margin-left:auto"
                title="Somente Dono/Admin/Gerente podem exportar este relatório">
                <app-icon name="lock" [size]="11"></app-icon> restrito
              </span>
            } @else {
              <span class="muted" style="font-size:11px;margin-left:auto">{{ r.cat }}</span>
            }
          </div>
        </div>
      }
    </div>

    <!-- Histórico de exportações -->
    <div class="card">
      <div class="card-head">
        <app-icon name="history" [size]="16" style="color:var(--text-2)"></app-icon>
        <div class="card-title">Histórico de exportações</div>
        <span class="muted" style="font-size:12px;margin-left:auto">{{ exportHistory.length }} registros</span>
      </div>
      @if (exportHistory.length === 0) {
        <div class="empty">Nenhuma exportação realizada ainda.</div>
      } @else {
        <div style="overflow-x:auto">
          <table class="tbl">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Relatório</th>
                <th>Formato</th>
                <th>Período</th>
                <th>Por quem</th>
              </tr>
            </thead>
            <tbody>
              @for (h of exportHistory; track $index) {
                <tr>
                  <td class="muted tnum" style="font-size:12.5px;white-space:nowrap">{{ h.quando }}</td>
                  <td style="font-weight:500;font-size:13px">{{ h.relatorio }}</td>
                  <td><span class="tag" style="font-size:11px">{{ h.formato }}</span></td>
                  <td class="muted" style="font-size:12.5px">{{ h.periodo }}</td>
                  <td>
                    <div class="row" style="gap:6px;align-items:center">
                      <app-avatar [nome]="h.por" cor="#0e9f6e" [size]="22"></app-avatar>
                      <span style="font-size:13px">{{ h.por }}</span>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

  }

  <!-- ═══════════════════════════════════════════════════════ -->
  <!-- ABA NOTIFICAÇÕES                                       -->
  <!-- ═══════════════════════════════════════════════════════ -->
  @if (tab === 'notificacoes') {

    <!-- Filtros -->
    <div class="row" style="gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
      <div style="position:relative;min-width:190px">
        <select class="select" style="width:100%;padding-left:34px"
          (change)="modFiltro = $any($event.target).value">
          <option value="Todos">Todos os módulos</option>
          @for (cat of NOTIF_CATS; track cat) {
            <option [value]="cat">{{ cat }}</option>
          }
        </select>
        <app-icon name="filter" [size]="14"
          style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-3);pointer-events:none"></app-icon>
      </div>
      <button class="btn btn-ghost btn-sm" style="gap:6px"
        [style.background]="soAtivas ? 'var(--accent-soft)' : ''"
        [style.color]="soAtivas ? 'var(--accent)' : ''"
        (click)="soAtivas = !soAtivas">
        <app-icon name="check" [size]="13"></app-icon> Só ativas
      </button>
      <span class="muted" style="font-size:12.5px;margin-left:auto">
        {{ notifsAtivas }}/{{ notifs.length }} ativas
      </span>
    </div>

    <!-- Grupos por categoria (accordion) -->
    @for (cat of notifCatsFiltradas; track cat) {
      <div class="card" style="margin-bottom:12px">

        <div class="card-head" style="cursor:pointer;user-select:none" (click)="toggleCat(cat)">
          <app-icon [name]="catIcon(cat)" [size]="16" style="color:var(--text-2)"></app-icon>
          <div class="card-title">{{ cat }}</div>
          <span class="muted" style="font-size:12px;margin-left:auto;margin-right:8px">
            {{ notifsPorCat(cat).length }} evento{{ notifsPorCat(cat).length !== 1 ? 's' : '' }}
          </span>
          <app-icon [name]="catAberta(cat) ? 'chevD' : 'chevR'" [size]="14" style="color:var(--text-3)"></app-icon>
        </div>

        @if (catAberta(cat)) {
          @for (n of notifsPorCat(cat); track n.id; let last = $last) {
            <div [style.border-bottom]="last ? 'none' : '1px solid var(--border)'">
              <div class="row" style="padding:14px 18px;gap:14px;align-items:flex-start">

                <!-- Toggle + rótulo de prioridade -->
                <div class="col" style="gap:5px;align-items:center;flex-shrink:0;min-width:44px">
                  <button class="ntoggle"
                    [class.on]="n.ativo"
                    [class.locked]="n.obrig"
                    [title]="n.obrig ? 'Obrigatória — não pode ser desativada' : (n.ativo ? 'Clique para desativar' : 'Clique para ativar')"
                    (click)="!n.obrig && toggleAtivo(n)">
                    <span></span>
                  </button>
                  <span style="font-size:9.5px;font-weight:700;letter-spacing:.3px;text-align:center"
                    [style.color]="priorCor(n.prior)">{{ priorLabel(n.prior) }}</span>
                </div>

                <!-- Detalhes e controles -->
                <div class="col" style="flex:1;gap:10px;min-width:0">

                  <div class="row" style="gap:8px;flex-wrap:wrap;align-items:center">
                    <span style="font-weight:600;font-size:13.5px">{{ n.nome }}</span>
                    @if (n.obrig) {
                      <span class="tag"
                        style="font-size:10.5px;background:var(--st-faltou-bg);color:var(--st-faltou)">Obrigatória</span>
                    }
                  </div>

                  <!-- Canais -->
                  <div class="row" style="gap:5px;flex-wrap:wrap;align-items:center">
                    <span class="muted" style="font-size:12px;margin-right:2px">Canais:</span>
                    <button class="cbtn" [class.on]="n.canais.sistema"
                      (click)="toggleCanal(n, 'sistema')">
                      <app-icon name="bell" [size]="11"></app-icon> Sistema
                    </button>
                    <button class="cbtn" [class.on]="n.canais.email"
                      (click)="toggleCanal(n, 'email')">
                      <app-icon name="mail" [size]="11"></app-icon> E-mail
                    </button>
                    <button class="cbtn wpp" [class.on]="n.canais.whatsapp"
                      (click)="toggleCanal(n, 'whatsapp')">
                      <app-icon name="whatsapp" [size]="11"></app-icon> WhatsApp
                    </button>
                    <button class="cbtn" [class.on]="n.canais.push"
                      (click)="toggleCanal(n, 'push')">
                      <app-icon name="phone" [size]="11"></app-icon> Push
                    </button>
                  </div>

                  <!-- Modo de envio -->
                  <div class="row" style="gap:5px;align-items:center">
                    <span class="muted" style="font-size:12px;margin-right:2px">Envio:</span>
                    <button class="cbtn" [class.on]="n.envio==='imediato'"
                      (click)="setEnvio(n, 'imediato')">Imediato</button>
                    <button class="cbtn" [class.on]="n.envio==='digest'"
                      (click)="setEnvio(n, 'digest')">Digest diário</button>
                  </div>

                  <!-- Pré-visualização da mensagem -->
                  @if (n.ativo) {
                    <div style="background:var(--surface-2);border-radius:var(--r-md);padding:8px 12px;font-size:12.5px;color:var(--text-2);border-left:3px solid var(--accent);line-height:1.5">
                      {{ n.exemplo }}
                    </div>
                  }

                </div>
              </div>
            </div>
          }
        }

      </div>
    }

    <div class="row" style="justify-content:flex-end;margin-top:8px;margin-bottom:8px">
      <button class="btn btn-primary" (click)="salvarNotifs()">
        <app-icon name="check" [size]="15"></app-icon>
        Salvar configurações
      </button>
    </div>

  }

</div>
  `,
  styles: [`
    /* Toggle on/off */
    .ntoggle {
      width: 36px; height: 20px; border-radius: 10px; border: none; cursor: pointer;
      background: var(--surface-3); position: relative; transition: background .2s; flex-shrink: 0;
    }
    .ntoggle span {
      position: absolute; top: 3px; left: 3px; width: 14px; height: 14px;
      border-radius: 50%; background: var(--text-3); transition: transform .2s, background .2s;
    }
    .ntoggle.on { background: var(--accent); }
    .ntoggle.on span { transform: translateX(16px); background: #fff; }
    .ntoggle.locked { opacity: .5; cursor: not-allowed; }

    /* Botão de canal / envio */
    .cbtn {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 9px; border-radius: var(--r-md); border: 1px solid var(--border);
      background: var(--surface-2); color: var(--text-3); font-size: 12px;
      cursor: pointer; transition: all .15s; font-family: inherit;
    }
    .cbtn.on { background: var(--accent-soft); color: var(--accent); border-color: transparent; }
    .cbtn.wpp.on { background: rgba(37,211,102,.12); color: #25d366; border-color: transparent; }

    /* Spinner de carregamento no botão de exportação */
    .spinner-mini {
      display: inline-block; width: 13px; height: 13px; border-radius: 50%;
      border: 2px solid rgba(0,0,0,0.15); border-top-color: var(--accent);
      animation: spin .7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class CentralComponent {
  @Output() notify = new EventEmitter<string>();

  tab: 'relatorios' | 'notificacoes' = 'relatorios';
  periodo = 'mes';
  catFiltro = 'Todas';
  modFiltro = 'Todos';
  soAtivas = false;
  catsAbertas = new Set<string>();

  readonly CATS = [
    'Todas', 'Agendamentos', 'Clientes', 'Financeiro',
    'Vendas & Estoque', 'Equipe', 'Marketing', 'Gerencial',
  ];

  readonly NOTIF_CATS = [
    'Agendamentos', 'Clientes', 'Financeiro',
    'Vendas & Estoque', 'Marketing & Fidelidade', 'Administrativo',
  ];

  readonly RELS: RelCard[] = [
    { id: 'r1',  nome: 'Agendamentos',                obj: 'Todos os horários por status no período',         cat: 'Agendamentos',     formatos: ['xlsx','csv'],  icon: 'calendar' },
    { id: 'r2',  nome: 'Cancelamentos & Faltas',       obj: 'Perdas por cancelamento e no-show',              cat: 'Agendamentos',     formatos: ['pdf','xlsx'],  icon: 'alert' },
    { id: 'r3',  nome: 'Ocupação da Agenda',           obj: 'Aproveitamento de horas disponíveis',            cat: 'Agendamentos',     formatos: ['pdf'],         icon: 'target' },
    { id: 'r4',  nome: 'Clientes (base completa)',     obj: 'Cadastro analítico da carteira',                 cat: 'Clientes',         formatos: ['xlsx','csv'],  icon: 'users' },
    { id: 'r5',  nome: 'Clientes Inativos',            obj: 'Lista de clientes sem retorno (+60 dias)',       cat: 'Clientes',         formatos: ['xlsx','csv'],  icon: 'history' },
    { id: 'r6',  nome: 'Aniversariantes',              obj: 'Oportunidades de relacionamento por mês',       cat: 'Clientes',         formatos: ['csv','xlsx'],  icon: 'cake' },
    { id: 'r7',  nome: 'Financeiro Consolidado',       obj: 'DRE simplificado: receita, despesa e resultado', cat: 'Financeiro',       formatos: ['pdf','xlsx'],  icon: 'money',    sensivel: true },
    { id: 'r8',  nome: 'Pagamentos / Lançamentos',    obj: 'Extrato detalhado do caixa',                     cat: 'Financeiro',       formatos: ['xlsx','csv'],  icon: 'list',     sensivel: true },
    { id: 'r9',  nome: 'Contas a Receber',            obj: 'Fiados, saldos e sinais pendentes',              cat: 'Financeiro',       formatos: ['pdf','xlsx'],  icon: 'coins',    sensivel: true },
    { id: 'r10', nome: 'Formas de Pagamento',         obj: 'Distribuição do recebido por meio',              cat: 'Financeiro',       formatos: ['pdf'],         icon: 'chart',    sensivel: true },
    { id: 'r11', nome: 'Vendas de Produtos',          obj: 'Receita e margem de revenda no balcão',          cat: 'Vendas & Estoque', formatos: ['xlsx'],        icon: 'pkg' },
    { id: 'r12', nome: 'Serviços (ranking & margem)', obj: 'Quais serviços geram volume e lucro',            cat: 'Vendas & Estoque', formatos: ['pdf','xlsx'],  icon: 'scissors' },
    { id: 'r13', nome: 'Estoque (posição atual)',     obj: 'Inventário e itens em ruptura',                  cat: 'Vendas & Estoque', formatos: ['xlsx','pdf'],  icon: 'box' },
    { id: 'r14', nome: 'Movimentações de Estoque',   obj: 'Rastrear consumo e compras',                      cat: 'Vendas & Estoque', formatos: ['xlsx','csv'],  icon: 'box' },
    { id: 'r15', nome: 'Desempenho por Profissional', obj: 'Ranking de produtividade e atingimento de meta', cat: 'Equipe',           formatos: ['pdf','xlsx'],  icon: 'team',     sensivel: true },
    { id: 'r16', nome: 'Comissões',                   obj: 'Fechamento de comissão por período',             cat: 'Equipe',           formatos: ['pdf','xlsx'],  icon: 'coins',    sensivel: true },
    { id: 'r17', nome: 'Equipe (cadastro & jornada)', obj: 'Dados contratuais e disponibilidade',            cat: 'Equipe',           formatos: ['xlsx','pdf'],  icon: 'team',     sensivel: true },
    { id: 'r18', nome: 'Campanhas',                   obj: 'ROI de marketing de relacionamento',             cat: 'Marketing',        formatos: ['pdf','xlsx'],  icon: 'sparkle' },
    { id: 'r19', nome: 'Fidelidade',                  obj: 'Saúde do programa de pontos e cashback',         cat: 'Marketing',        formatos: ['xlsx'],        icon: 'gift' },
    { id: 'r20', nome: 'Relatório Gerencial',         obj: 'KPIs consolidados — o raio-X do negócio',       cat: 'Gerencial',        formatos: ['pdf'],         icon: 'chart',    sensivel: true },
  ];

  exportHistory: ExportItem[] = [
    { quando: '29/06 14:32', relatorio: 'Financeiro Consolidado', formato: 'PDF',  periodo: 'Jun 1–9',  por: 'Carlos Menezes' },
    { quando: '28/06 09:10', relatorio: 'Comissões',              formato: 'XLSX', periodo: 'Jun 1–15', por: 'Carlos Menezes' },
    { quando: '27/06 18:00', relatorio: 'Agendamentos',           formato: 'CSV',  periodo: 'Jun 1–27', por: 'Carlos Menezes' },
    { quando: '25/06 11:25', relatorio: 'Clientes Inativos',      formato: 'XLSX', periodo: 'Mai 1–31', por: 'Carlos Menezes' },
  ];

  notifs: NotifConfig[] = [
    // ─ Agendamentos ─────────────────────────────────────────
    { id: 'n1',  nome: 'Novo agendamento',               cat: 'Agendamentos',           prior: 'media', obrig: false, ativo: true,  canais: { sistema: true,  email: true,  whatsapp: false, push: true  }, envio: 'imediato', exemplo: 'Novo agendamento: André Lima — Corte+Barba com Rafa, 29/06 às 14h.' },
    { id: 'n2',  nome: 'Agendamento confirmado',         cat: 'Agendamentos',           prior: 'baixa', obrig: false, ativo: true,  canais: { sistema: true,  email: false, whatsapp: false, push: false }, envio: 'imediato', exemplo: 'André confirmou o horário das 14h.' },
    { id: 'n3',  nome: 'Agendamento reagendado',         cat: 'Agendamentos',           prior: 'media', obrig: false, ativo: true,  canais: { sistema: true,  email: false, whatsapp: false, push: true  }, envio: 'imediato', exemplo: 'Horário de André movido para 15h30 / com Diego.' },
    { id: 'n4',  nome: 'Agendamento cancelado',          cat: 'Agendamentos',           prior: 'alta',  obrig: false, ativo: true,  canais: { sistema: true,  email: true,  whatsapp: false, push: true  }, envio: 'imediato', exemplo: 'Cancelado: Caio Fernandes — Corte 17h. Horário liberado.' },
    { id: 'n5',  nome: 'Lembrete de horário próximo',   cat: 'Agendamentos',           prior: 'media', obrig: false, ativo: false, canais: { sistema: true,  email: false, whatsapp: false, push: true  }, envio: 'imediato', exemplo: 'Seu próximo cliente (Thiago) chega em 15 min.' },
    { id: 'n6',  nome: 'Cliente faltou (no-show)',       cat: 'Agendamentos',           prior: 'alta',  obrig: true,  ativo: true,  canais: { sistema: true,  email: true,  whatsapp: false, push: false }, envio: 'imediato', exemplo: 'Falta registrada: Rodrigo — Corte 09h (perda R$ 45).' },
    // ─ Clientes ─────────────────────────────────────────────
    { id: 'n7',  nome: 'Cliente inativo / sem retorno', cat: 'Clientes',               prior: 'media', obrig: false, ativo: true,  canais: { sistema: true,  email: true,  whatsapp: false, push: false }, envio: 'digest',   exemplo: '5 clientes passaram de 60 dias sem voltar. Ver lista de reativação.' },
    { id: 'n8',  nome: 'Novo cliente cadastrado',        cat: 'Clientes',               prior: 'baixa', obrig: false, ativo: true,  canais: { sistema: true,  email: false, whatsapp: false, push: false }, envio: 'imediato', exemplo: 'Novo cliente: Pedro Henrique (veio pelo Instagram).' },
    { id: 'n9',  nome: 'Aniversário de cliente',         cat: 'Clientes',               prior: 'baixa', obrig: false, ativo: true,  canais: { sistema: true,  email: false, whatsapp: true,  push: false }, envio: 'imediato', exemplo: 'Hoje é aniversário de André Lima — vale uma oferta especial.' },
    // ─ Financeiro ───────────────────────────────────────────
    { id: 'n10', nome: 'Pagamento recebido',             cat: 'Financeiro',             prior: 'baixa', obrig: false, ativo: false, canais: { sistema: true,  email: false, whatsapp: false, push: false }, envio: 'imediato', exemplo: 'Recebido R$ 70 (Pix) — Corte+Barba do Eduardo.' },
    { id: 'n11', nome: 'Conta a receber a vencer',      cat: 'Financeiro',             prior: 'media', obrig: false, ativo: true,  canais: { sistema: true,  email: true,  whatsapp: false, push: false }, envio: 'imediato', exemplo: 'Sinal do Platinado (Vinícius) vence amanhã — R$ 75.' },
    { id: 'n12', nome: 'Conta a receber atrasada',      cat: 'Financeiro',             prior: 'alta',  obrig: true,  ativo: true,  canais: { sistema: true,  email: true,  whatsapp: false, push: true  }, envio: 'imediato', exemplo: 'Vencido: saldo de barba do Leonardo (R$ 20) — 1 dia em atraso.' },
    { id: 'n13', nome: 'Despesa relevante lançada',     cat: 'Financeiro',             prior: 'media', obrig: false, ativo: false, canais: { sistema: true,  email: false, whatsapp: false, push: false }, envio: 'imediato', exemplo: 'Despesa de R$ 150 (Insumos) registrada por Carlos.' },
    { id: 'n14', nome: 'Resumo de caixa do dia',        cat: 'Financeiro',             prior: 'media', obrig: false, ativo: true,  canais: { sistema: true,  email: true,  whatsapp: false, push: false }, envio: 'digest',   exemplo: 'Caixa do dia: R$ 410 recebidos · R$ 278 despesas · resultado +R$ 132.' },
    { id: 'n15', nome: 'Marco de meta do mês',          cat: 'Financeiro',             prior: 'media', obrig: false, ativo: true,  canais: { sistema: true,  email: false, whatsapp: false, push: true  }, envio: 'imediato', exemplo: 'Equipe bateu 80% da meta do mês.' },
    // ─ Vendas & Estoque ─────────────────────────────────────
    { id: 'n16', nome: 'Venda de produto realizada',    cat: 'Vendas & Estoque',       prior: 'baixa', obrig: false, ativo: false, canais: { sistema: true,  email: false, whatsapp: false, push: false }, envio: 'imediato', exemplo: 'Venda balcão: Óleo para Barba — R$ 45.' },
    { id: 'n17', nome: 'Produto com estoque baixo',     cat: 'Vendas & Estoque',       prior: 'media', obrig: false, ativo: true,  canais: { sistema: true,  email: true,  whatsapp: false, push: false }, envio: 'imediato', exemplo: 'Estoque baixo: Pomada Modeladora (3 de 8 mín.).' },
    { id: 'n18', nome: 'Produto sem estoque',           cat: 'Vendas & Estoque',       prior: 'alta',  obrig: true,  ativo: true,  canais: { sistema: true,  email: true,  whatsapp: false, push: true  }, envio: 'imediato', exemplo: 'ZERADO: Cera Capilar. Atendimentos que a usam podem parar.' },
    { id: 'n19', nome: 'Entrada de compra registrada',  cat: 'Vendas & Estoque',       prior: 'baixa', obrig: false, ativo: false, canais: { sistema: true,  email: false, whatsapp: false, push: false }, envio: 'imediato', exemplo: 'Entrada: +12 Óleo para Barba (Barba Brava Dist.).' },
    // ─ Marketing & Fidelidade ───────────────────────────────
    { id: 'n20', nome: 'Nova campanha criada',           cat: 'Marketing & Fidelidade', prior: 'baixa', obrig: false, ativo: false, canais: { sistema: true,  email: false, whatsapp: false, push: false }, envio: 'imediato', exemplo: "Campanha 'Terça do Degradê' criada (rascunho)." },
    { id: 'n21', nome: 'Campanha ativada ou finalizada', cat: 'Marketing & Fidelidade', prior: 'baixa', obrig: false, ativo: true,  canais: { sistema: true,  email: true,  whatsapp: false, push: false }, envio: 'imediato', exemplo: "Campanha 'Combo -20%' encerrada: 34% de conversão." },
    { id: 'n22', nome: 'Cliente atingiu recompensa',     cat: 'Marketing & Fidelidade', prior: 'media', obrig: false, ativo: true,  canais: { sistema: true,  email: false, whatsapp: true,  push: false }, envio: 'imediato', exemplo: 'Thiago atingiu 10 pontos — liberar 1 corte grátis.' },
    // ─ Administrativo ───────────────────────────────────────
    { id: 'n23', nome: 'Alteração sensível por usuário', cat: 'Administrativo',         prior: 'alta',  obrig: true,  ativo: true,  canais: { sistema: true,  email: true,  whatsapp: false, push: false }, envio: 'imediato', exemplo: 'Carlos alterou a comissão de Diego de 45% para 50%.' },
    { id: 'n24', nome: 'Novo usuário / mudança de cargo',cat: 'Administrativo',         prior: 'alta',  obrig: true,  ativo: true,  canais: { sistema: true,  email: true,  whatsapp: false, push: false }, envio: 'imediato', exemplo: "Novo acesso de 'Atendente' criado para Marina." },
    { id: 'n25', nome: 'Alerta operacional do dia',      cat: 'Administrativo',         prior: 'media', obrig: false, ativo: true,  canais: { sistema: true,  email: false, whatsapp: false, push: false }, envio: 'digest',   exemplo: 'Hoje a agenda do Bruno está com 1 horário só.' },
  ];

  /** Identificador da exportação em andamento no formato `${reportId}:${formato}`.
   * Enquanto não é null, o botão correspondente fica travado com spinner. */
  exportando: string | null = null;

  constructor(public data: DataService, private auth: AuthService, private exportSvc: ExportService) {
    this.NOTIF_CATS.forEach(c => this.catsAbertas.add(c));
  }

  /** Perfis com permissão para acessar relatórios sensíveis (financeiro,
   * comissões, equipe, gerencial). */
  get podeVerSensivel(): boolean {
    const cod = this.auth.usuario?.papelCod || '';
    return ['dono', 'admin', 'gerente'].includes(cod);
  }

  get relsFiltrados(): RelCard[] {
    if (this.catFiltro === 'Todas') return this.RELS;
    return this.RELS.filter(r => r.cat === this.catFiltro);
  }

  get notifCatsFiltradas(): string[] {
    return this.NOTIF_CATS.filter(cat => {
      if (this.modFiltro !== 'Todos' && this.modFiltro !== cat) return false;
      return this.notifs.some(n => n.cat === cat && (!this.soAtivas || n.ativo));
    });
  }

  notifsPorCat(cat: string): NotifConfig[] {
    return this.notifs.filter(n => n.cat === cat && (!this.soAtivas || n.ativo));
  }

  get notifsAtivas(): number {
    return this.notifs.filter(n => n.ativo).length;
  }

  catAberta(cat: string): boolean { return this.catsAbertas.has(cat); }

  toggleCat(cat: string) {
    if (this.catsAbertas.has(cat)) this.catsAbertas.delete(cat);
    else this.catsAbertas.add(cat);
  }

  catIcon(cat: string): string {
    const m: Record<string, string> = {
      'Agendamentos': 'calendar', 'Clientes': 'users', 'Financeiro': 'money',
      'Vendas & Estoque': 'box', 'Marketing & Fidelidade': 'gift', 'Administrativo': 'settings',
    };
    return m[cat] ?? 'bell';
  }

  priorCor(prior: string): string {
    return prior === 'alta' ? 'var(--st-faltou)' : prior === 'media' ? 'var(--accent)' : 'var(--text-3)';
  }

  priorLabel(prior: string): string {
    return prior === 'alta' ? '▲ ALTA' : prior === 'media' ? '● MÉD' : '▽ BAIXA';
  }

  toggleAtivo(n: NotifConfig) { n.ativo = !n.ativo; }

  toggleCanal(n: NotifConfig, canal: keyof NotifConfig['canais']) {
    if (!n.ativo) return;
    n.canais[canal] = !n.canais[canal];
    if (!Object.values(n.canais).some(Boolean)) n.canais.sistema = true;
  }

  setEnvio(n: NotifConfig, v: 'imediato' | 'digest') { n.envio = v; }

  async exportar(r: RelCard, fmt: string) {
    if (this.exportando) return;

    // ----- gate de permissão -----
    if (r.sensivel && !this.podeVerSensivel) {
      this.notify.emit('Você não tem permissão para exportar este relatório.');
      return;
    }

    const chave = `${r.id}:${fmt}`;
    this.exportando = chave;
    try {
      const nomeUsuario = this.auth.usuario?.nome || this.data.usuario.nome;
      const { arquivo, linhas } = await this.exportSvc.export(
        r.id, fmt as Formato, this.periodo as Periodo, nomeUsuario,
      );

      // Registra no histórico local
      const now = new Date();
      const d = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`;
      const t = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      this.exportHistory.unshift({
        quando: `${d} ${t}`,
        relatorio: r.nome,
        formato: fmt.toUpperCase(),
        periodo: this.exportSvc.periodRange(this.periodo as Periodo).label,
        por: nomeUsuario,
      });
      this.notify.emit(`${r.nome} exportado (${linhas} linha${linhas === 1 ? '' : 's'}) — ${arquivo}`);
    } catch (e: any) {
      const msg = e?.message || 'Falha ao gerar o arquivo.';
      this.notify.emit(`Não foi possível exportar: ${msg}`);
    } finally {
      this.exportando = null;
    }
  }

  salvarNotifs() {
    this.notify.emit('Configurações de notificações salvas');
  }
}
