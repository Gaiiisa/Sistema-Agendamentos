import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../icon.component';
import { AvatarComponent } from '../shared/avatar.component';
import { DataService } from '../data.service';

type Tab = 'conta' | 'estabelecimento' | 'horarios' | 'agenda' | 'pagamentos' | 'notificacoes' | 'plano' | 'integracoes';

interface TabDef { id: Tab; label: string; icon: string; }

interface DiaFuncionamento {
  dia: string; abrev: string; aberto: boolean; inicio: string; fim: string;
}

@Component({
  selector: 'app-config',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, AvatarComponent],
  template: `
    <div class="page cfg-page">

      <!-- Cabeçalho mobile (abas em scroll) -->
      <div class="cfg-tabs-mobile">
        @for (t of TABS; track t.id) {
          <button class="cfg-tab-m" [class.on]="tab === t.id" (click)="tab = t.id">
            <app-icon [name]="t.icon" [size]="14"></app-icon>
            {{ t.label }}
          </button>
        }
      </div>

      <div class="cfg-layout">

        <!-- ── Sidebar de abas (desktop) ── -->
        <nav class="cfg-nav">
          @for (t of TABS; track t.id) {
            <button class="cfg-nav-item" [class.on]="tab === t.id" (click)="tab = t.id">
              <span class="cfg-nav-ico">
                <app-icon [name]="t.icon" [size]="15"></app-icon>
              </span>
              {{ t.label }}
            </button>
          }

          <div class="cfg-nav-divider"></div>

          <button class="cfg-nav-item cfg-nav-danger">
            <span class="cfg-nav-ico">
              <app-icon name="x" [size]="15"></app-icon>
            </span>
            Encerrar sessão
          </button>
        </nav>

        <!-- ── Conteúdo ── -->
        <div class="cfg-body">

          <!-- ════════════ CONTA ════════════ -->
          @if (tab === 'conta') {
            <section class="cfg-section">
              <h2 class="cfg-h2">Minha conta</h2>
              <p class="cfg-sub">Suas informações de acesso e perfil pessoal.</p>

              <div class="cfg-card" style="margin-top:24px">
                <div class="cfg-card-head">Foto de perfil</div>
                <div class="cfg-card-body" style="display:flex;align-items:center;gap:20px">
                  <app-avatar [nome]="data.usuario.nome" [cor]="data.usuario.cor" [size]="64"></app-avatar>
                  <div>
                    <button class="btn btn-ghost btn-sm">Alterar foto</button>
                    <div class="cfg-hint">JPG, PNG ou GIF · máx. 2 MB</div>
                  </div>
                </div>
              </div>

              <div class="cfg-card">
                <div class="cfg-card-head">Dados pessoais</div>
                <div class="cfg-card-body cfg-form">
                  <div class="grid-2">
                    <div class="field">
                      <label>Nome completo</label>
                      <input class="input" [(ngModel)]="conta.nome">
                    </div>
                    <div class="field">
                      <label>Papel</label>
                      <select class="select" [(ngModel)]="conta.papel">
                        <option>Dono / Admin</option>
                        <option>Gerente</option>
                        <option>Atendente</option>
                      </select>
                    </div>
                  </div>
                  <div class="grid-2">
                    <div class="field">
                      <label>E-mail</label>
                      <input class="input" type="email" [(ngModel)]="conta.email">
                    </div>
                    <div class="field">
                      <label>WhatsApp</label>
                      <input class="input" type="tel" [(ngModel)]="conta.wpp">
                    </div>
                  </div>
                </div>
              </div>

              <div class="cfg-card">
                <div class="cfg-card-head">Segurança</div>
                <div class="cfg-card-body cfg-form">
                  <div class="field">
                    <label>Senha atual</label>
                    <input class="input" type="password" placeholder="••••••••">
                  </div>
                  <div class="grid-2">
                    <div class="field">
                      <label>Nova senha</label>
                      <input class="input" type="password" placeholder="••••••••">
                    </div>
                    <div class="field">
                      <label>Confirmar nova senha</label>
                      <input class="input" type="password" placeholder="••••••••">
                    </div>
                  </div>
                  <div>
                    <button class="btn btn-primary btn-sm" (click)="save('conta')">Salvar senha</button>
                  </div>
                </div>
              </div>

              <div class="cfg-save-bar">
                <button class="btn btn-primary" (click)="save('conta')">Salvar alterações</button>
              </div>
            </section>
          }

          <!-- ════════════ ESTABELECIMENTO ════════════ -->
          @if (tab === 'estabelecimento') {
            <section class="cfg-section">
              <h2 class="cfg-h2">Estabelecimento</h2>
              <p class="cfg-sub">Dados do seu negócio exibidos no sistema e nos recibos.</p>

              <div class="cfg-card" style="margin-top:24px">
                <div class="cfg-card-head">Identidade visual</div>
                <div class="cfg-card-body" style="display:flex;align-items:center;gap:20px">
                  <div class="cfg-logo-preview">
                    <app-icon name="scissors" [size]="22" style="color:var(--accent)"></app-icon>
                  </div>
                  <div>
                    <button class="btn btn-ghost btn-sm">Enviar logo</button>
                    <div class="cfg-hint">PNG ou SVG · fundo transparente · mín. 256×256 px</div>
                  </div>
                </div>
              </div>

              <div class="cfg-card">
                <div class="cfg-card-head">Informações gerais</div>
                <div class="cfg-card-body cfg-form">
                  <div class="grid-2">
                    <div class="field">
                      <label>Nome do estabelecimento</label>
                      <input class="input" [(ngModel)]="estab.nome">
                    </div>
                    <div class="field">
                      <label>Tipo de negócio</label>
                      <select class="select" [(ngModel)]="estab.tipo">
                        <option>Barbearia</option>
                        <option>Salão de beleza</option>
                        <option>Studio de estética</option>
                        <option>Clínica</option>
                        <option>Outro</option>
                      </select>
                    </div>
                  </div>
                  <div class="grid-2">
                    <div class="field">
                      <label>CNPJ / CPF</label>
                      <input class="input" [(ngModel)]="estab.doc" placeholder="00.000.000/0001-00">
                    </div>
                    <div class="field">
                      <label>Telefone / WhatsApp</label>
                      <input class="input" type="tel" [(ngModel)]="estab.tel">
                    </div>
                  </div>
                  <div class="field">
                    <label>Endereço</label>
                    <input class="input" [(ngModel)]="estab.end" placeholder="Rua, número, bairro">
                  </div>
                  <div class="grid-2">
                    <div class="field">
                      <label>Cidade</label>
                      <input class="input" [(ngModel)]="estab.cidade">
                    </div>
                    <div class="field">
                      <label>CEP</label>
                      <input class="input" [(ngModel)]="estab.cep" placeholder="00000-000">
                    </div>
                  </div>
                  <div class="field">
                    <label>Descrição (aparece no link de agendamento)</label>
                    <textarea class="input" [(ngModel)]="estab.desc" rows="3"
                      placeholder="Fale um pouco sobre o seu espaço…"></textarea>
                  </div>
                </div>
              </div>

              <div class="cfg-card">
                <div class="cfg-card-head">Redes sociais</div>
                <div class="cfg-card-body cfg-form">
                  <div class="field">
                    <label>Instagram</label>
                    <div class="cfg-prefix-wrap">
                      <span class="cfg-prefix">instagram.com/</span>
                      <input class="input cfg-prefix-input" [(ngModel)]="estab.instagram" placeholder="navalhaecia">
                    </div>
                  </div>
                  <div class="grid-2">
                    <div class="field">
                      <label>Google Meu Negócio</label>
                      <input class="input" [(ngModel)]="estab.google" placeholder="Link do perfil">
                    </div>
                    <div class="field">
                      <label>Site / Link de bio</label>
                      <input class="input" [(ngModel)]="estab.site" placeholder="https://...">
                    </div>
                  </div>
                </div>
              </div>

              <div class="cfg-save-bar">
                <button class="btn btn-primary" (click)="save('estab')">Salvar alterações</button>
              </div>
            </section>
          }

          <!-- ════════════ HORÁRIOS ════════════ -->
          @if (tab === 'horarios') {
            <section class="cfg-section">
              <h2 class="cfg-h2">Horários de funcionamento</h2>
              <p class="cfg-sub">Define os dias e horários em que o estabelecimento aceita agendamentos.</p>

              <div class="cfg-card" style="margin-top:24px">
                <div class="cfg-card-head">Dias da semana</div>
                <div class="cfg-card-body" style="padding:0">
                  @for (d of diasFuncionamento; track d.dia) {
                    <div class="cfg-dia-row" [class.fechado]="!d.aberto">
                      <div class="cfg-dia-toggle">
                        <button class="cfg-toggle" [class.on]="d.aberto" (click)="d.aberto = !d.aberto">
                          <span class="cfg-toggle-knob"></span>
                        </button>
                        <span class="cfg-dia-label">{{ d.dia }}</span>
                      </div>
                      @if (d.aberto) {
                        <div class="cfg-dia-horas">
                          <input class="input cfg-time-input" type="time" [(ngModel)]="d.inicio">
                          <span class="cfg-dia-sep">até</span>
                          <input class="input cfg-time-input" type="time" [(ngModel)]="d.fim">
                        </div>
                      } @else {
                        <span class="cfg-fechado-label">Fechado</span>
                      }
                    </div>
                  }
                </div>
              </div>

              <div class="cfg-card">
                <div class="cfg-card-head">Intervalo de almoço / pausa</div>
                <div class="cfg-card-body cfg-form">
                  <div class="cfg-toggle-row">
                    <div>
                      <div style="font-weight:600;font-size:13.5px">Bloquear horário de pausa</div>
                      <div class="cfg-hint">Não aceita agendamentos no intervalo selecionado</div>
                    </div>
                    <button class="cfg-toggle" [class.on]="pausaAtiva" (click)="pausaAtiva = !pausaAtiva">
                      <span class="cfg-toggle-knob"></span>
                    </button>
                  </div>
                  @if (pausaAtiva) {
                    <div class="row" style="gap:10px;align-items:center;flex-wrap:wrap">
                      <input class="input cfg-time-input" type="time" [(ngModel)]="pausaInicio">
                      <span class="muted">até</span>
                      <input class="input cfg-time-input" type="time" [(ngModel)]="pausaFim">
                    </div>
                  }
                </div>
              </div>

              <div class="cfg-save-bar">
                <button class="btn btn-primary" (click)="save('horarios')">Salvar alterações</button>
              </div>
            </section>
          }

          <!-- ════════════ AGENDA ════════════ -->
          @if (tab === 'agenda') {
            <section class="cfg-section">
              <h2 class="cfg-h2">Configurações da agenda</h2>
              <p class="cfg-sub">Regras de agendamento, cancelamento e confirmação.</p>

              <div class="cfg-card" style="margin-top:24px">
                <div class="cfg-card-head">Agendamento online</div>
                <div class="cfg-card-body cfg-form">
                  <div class="cfg-toggle-row">
                    <div>
                      <div style="font-weight:600;font-size:13.5px">Permitir agendamento online</div>
                      <div class="cfg-hint">Clientes podem agendar pelo link público</div>
                    </div>
                    <button class="cfg-toggle on">
                      <span class="cfg-toggle-knob"></span>
                    </button>
                  </div>
                  <div class="grid-2">
                    <div class="field">
                      <label>Intervalo mínimo entre horários</label>
                      <select class="select" [(ngModel)]="agenda.intervalo">
                        <option value="15">15 minutos</option>
                        <option value="30">30 minutos</option>
                        <option value="45">45 minutos</option>
                        <option value="60">1 hora</option>
                      </select>
                    </div>
                    <div class="field">
                      <label>Antecedência mínima para agendar</label>
                      <select class="select" [(ngModel)]="agenda.antecedencia">
                        <option value="1">1 hora</option>
                        <option value="2">2 horas</option>
                        <option value="4">4 horas</option>
                        <option value="24">1 dia</option>
                        <option value="48">2 dias</option>
                      </select>
                    </div>
                  </div>
                  <div class="grid-2">
                    <div class="field">
                      <label>Máximo de dias para agendar</label>
                      <select class="select" [(ngModel)]="agenda.maxDias">
                        <option value="7">7 dias</option>
                        <option value="15">15 dias</option>
                        <option value="30">30 dias</option>
                        <option value="60">60 dias</option>
                        <option value="90">90 dias</option>
                      </select>
                    </div>
                    <div class="field">
                      <label>Limite de agendamentos por dia</label>
                      <input class="input" type="number" [(ngModel)]="agenda.maxDia" min="1" max="99">
                    </div>
                  </div>
                </div>
              </div>

              <div class="cfg-card">
                <div class="cfg-card-head">Confirmação e lembretes</div>
                <div class="cfg-card-body cfg-form">
                  <div class="cfg-toggle-row">
                    <div>
                      <div style="font-weight:600;font-size:13.5px">Confirmação automática pelo WhatsApp</div>
                      <div class="cfg-hint">Envia mensagem ao confirmar novo horário</div>
                    </div>
                    <button class="cfg-toggle" [class.on]="agenda.confirmacaoAuto" (click)="agenda.confirmacaoAuto = !agenda.confirmacaoAuto">
                      <span class="cfg-toggle-knob"></span>
                    </button>
                  </div>
                  <div class="cfg-toggle-row">
                    <div>
                      <div style="font-weight:600;font-size:13.5px">Lembrete na véspera</div>
                      <div class="cfg-hint">Envia lembrete 24 h antes do horário</div>
                    </div>
                    <button class="cfg-toggle" [class.on]="agenda.lembrete" (click)="agenda.lembrete = !agenda.lembrete">
                      <span class="cfg-toggle-knob"></span>
                    </button>
                  </div>
                  <div class="cfg-toggle-row">
                    <div>
                      <div style="font-weight:600;font-size:13.5px">Lembrete 2 horas antes</div>
                      <div class="cfg-hint">Envia segundo lembrete próximo ao horário</div>
                    </div>
                    <button class="cfg-toggle" [class.on]="agenda.lembrete2h" (click)="agenda.lembrete2h = !agenda.lembrete2h">
                      <span class="cfg-toggle-knob"></span>
                    </button>
                  </div>
                </div>
              </div>

              <div class="cfg-card">
                <div class="cfg-card-head">Cancelamento e sinal</div>
                <div class="cfg-card-body cfg-form">
                  <div class="grid-2">
                    <div class="field">
                      <label>Prazo para cancelamento sem multa</label>
                      <select class="select" [(ngModel)]="agenda.cancelamentoPrazo">
                        <option value="0">Sem restrição</option>
                        <option value="2">2 horas antes</option>
                        <option value="4">4 horas antes</option>
                        <option value="12">12 horas antes</option>
                        <option value="24">24 horas antes</option>
                      </select>
                    </div>
                    <div class="field">
                      <label>% de sinal exigido (serviços marcados)</label>
                      <div class="cfg-input-addon">
                        <input class="input" type="number" [(ngModel)]="agenda.sinalPct" min="0" max="100">
                        <span class="cfg-addon">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="cfg-save-bar">
                <button class="btn btn-primary" (click)="save('agenda')">Salvar alterações</button>
              </div>
            </section>
          }

          <!-- ════════════ PAGAMENTOS ════════════ -->
          @if (tab === 'pagamentos') {
            <section class="cfg-section">
              <h2 class="cfg-h2">Formas de pagamento</h2>
              <p class="cfg-sub">Métodos aceitos e dados para recebimento.</p>

              <div class="cfg-card" style="margin-top:24px">
                <div class="cfg-card-head">Métodos aceitos</div>
                <div class="cfg-card-body cfg-form">
                  @for (p of pagamentos; track p.id) {
                    <div class="cfg-toggle-row">
                      <div style="display:flex;align-items:center;gap:12px">
                        <div class="cfg-pay-ico" [style.background]="p.bg">
                          <app-icon [name]="p.icon" [size]="15" [style.color]="p.col"></app-icon>
                        </div>
                        <div>
                          <div style="font-weight:600;font-size:13.5px">{{ p.label }}</div>
                          <div class="cfg-hint">{{ p.desc }}</div>
                        </div>
                      </div>
                      <button class="cfg-toggle" [class.on]="p.ativo" (click)="p.ativo = !p.ativo">
                        <span class="cfg-toggle-knob"></span>
                      </button>
                    </div>
                  }
                </div>
              </div>

              <div class="cfg-card">
                <div class="cfg-card-head">Chave Pix</div>
                <div class="cfg-card-body cfg-form">
                  <div class="grid-2">
                    <div class="field">
                      <label>Tipo de chave</label>
                      <select class="select" [(ngModel)]="pagPix.tipo">
                        <option>CPF/CNPJ</option>
                        <option>Telefone</option>
                        <option>E-mail</option>
                        <option>Chave aleatória</option>
                      </select>
                    </div>
                    <div class="field">
                      <label>Chave Pix</label>
                      <input class="input" [(ngModel)]="pagPix.chave" placeholder="Informe a chave">
                    </div>
                  </div>
                  <div class="field">
                    <label>Nome exibido no Pix</label>
                    <input class="input" [(ngModel)]="pagPix.nome">
                  </div>
                </div>
              </div>

              <div class="cfg-card">
                <div class="cfg-card-head">Maquininha / Point</div>
                <div class="cfg-card-body cfg-form">
                  <div class="cfg-toggle-row">
                    <div>
                      <div style="font-weight:600;font-size:13.5px">Taxa de cartão no valor do serviço</div>
                      <div class="cfg-hint">Repassa taxa da maquininha ao cliente quando selecionado</div>
                    </div>
                    <button class="cfg-toggle" [class.on]="pagCard.repassaTaxa" (click)="pagCard.repassaTaxa = !pagCard.repassaTaxa">
                      <span class="cfg-toggle-knob"></span>
                    </button>
                  </div>
                  @if (pagCard.repassaTaxa) {
                    <div class="field">
                      <label>Taxa média do cartão (%)</label>
                      <div class="cfg-input-addon">
                        <input class="input" type="number" [(ngModel)]="pagCard.taxa" step="0.1" min="0" max="10">
                        <span class="cfg-addon">%</span>
                      </div>
                    </div>
                  }
                </div>
              </div>

              <div class="cfg-save-bar">
                <button class="btn btn-primary" (click)="save('pagamentos')">Salvar alterações</button>
              </div>
            </section>
          }

          <!-- ════════════ NOTIFICAÇÕES ════════════ -->
          @if (tab === 'notificacoes') {
            <section class="cfg-section">
              <h2 class="cfg-h2">Notificações</h2>
              <p class="cfg-sub">Escolha quais alertas você quer receber e por qual canal.</p>

              <div class="cfg-card" style="margin-top:24px">
                <div class="cfg-card-head">
                  <span style="flex:1">Evento</span>
                  <span class="cfg-notif-col">App</span>
                  <span class="cfg-notif-col">WhatsApp</span>
                  <span class="cfg-notif-col">E-mail</span>
                </div>
                @for (n of notifItems; track n.id) {
                  <div class="cfg-notif-row">
                    <div class="cfg-notif-info">
                      <div style="font-weight:600;font-size:13.5px">{{ n.label }}</div>
                      <div class="cfg-hint">{{ n.desc }}</div>
                    </div>
                    <div class="cfg-notif-col">
                      <button class="cfg-toggle sm" [class.on]="n.app" (click)="n.app = !n.app">
                        <span class="cfg-toggle-knob"></span>
                      </button>
                    </div>
                    <div class="cfg-notif-col">
                      <button class="cfg-toggle sm" [class.on]="n.wpp" (click)="n.wpp = !n.wpp">
                        <span class="cfg-toggle-knob"></span>
                      </button>
                    </div>
                    <div class="cfg-notif-col">
                      <button class="cfg-toggle sm" [class.on]="n.email" (click)="n.email = !n.email">
                        <span class="cfg-toggle-knob"></span>
                      </button>
                    </div>
                  </div>
                }
              </div>

              <div class="cfg-card">
                <div class="cfg-card-head">Resumo diário</div>
                <div class="cfg-card-body cfg-form">
                  <div class="cfg-toggle-row">
                    <div>
                      <div style="font-weight:600;font-size:13.5px">Enviar resumo do dia</div>
                      <div class="cfg-hint">Receba um resumo de faturamento e atendimentos ao final do dia</div>
                    </div>
                    <button class="cfg-toggle on">
                      <span class="cfg-toggle-knob"></span>
                    </button>
                  </div>
                  <div class="field">
                    <label>Horário do resumo</label>
                    <input class="input cfg-time-input" type="time" value="19:00">
                  </div>
                </div>
              </div>

              <div class="cfg-save-bar">
                <button class="btn btn-primary" (click)="save('notif')">Salvar alterações</button>
              </div>
            </section>
          }

          <!-- ════════════ PLANO ════════════ -->
          @if (tab === 'plano') {
            <section class="cfg-section">
              <h2 class="cfg-h2">Plano e cobrança</h2>
              <p class="cfg-sub">Detalhes do seu plano atual, uso e opções de upgrade.</p>

              <!-- Plano atual -->
              <div class="cfg-plan-hero" style="margin-top:24px">
                <div>
                  <div class="cfg-plan-badge">
                    <app-icon name="gift" [size]="13"></app-icon>
                    Plano atual
                  </div>
                  <div class="cfg-plan-name">{{ data.estabelecimento.plano }}</div>
                  <div class="cfg-hint" style="margin-top:4px">Próxima cobrança em <strong>15 de julho de 2026</strong> · R$ 149,90/mês</div>
                </div>
                <button class="btn btn-primary">Fazer upgrade</button>
              </div>

              <!-- Uso -->
              <div class="cfg-card">
                <div class="cfg-card-head">Uso do plano</div>
                <div class="cfg-card-body cfg-form" style="gap:16px">
                  @for (u of usos; track u.label) {
                    <div>
                      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                        <span style="font-size:13px;font-weight:600">{{ u.label }}</span>
                        <span class="cfg-hint">{{ u.usado }} / {{ u.limite }}</span>
                      </div>
                      <div class="progress" style="height:6px">
                        <span [style.width.%]="round(u.usado / u.limite * 100)"
                          [style.background]="u.usado / u.limite > 0.85 ? 'var(--st-faltou)' : 'var(--accent)'"></span>
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Comparativo de planos -->
              <div class="cfg-card">
                <div class="cfg-card-head">Comparativo de planos</div>
                <div class="cfg-card-body" style="padding:0">
                  <table class="tbl cfg-plan-tbl">
                    <thead>
                      <tr>
                        <th>Recurso</th>
                        <th style="text-align:center">Básico<br><small>R$ 79/mês</small></th>
                        <th style="text-align:center;color:var(--accent)">Profissional ★<br><small>R$ 149/mês</small></th>
                        <th style="text-align:center">Premium<br><small>R$ 249/mês</small></th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (r of recursos; track r.nome) {
                        <tr>
                          <td>{{ r.nome }}</td>
                          <td style="text-align:center">{{ r.basico }}</td>
                          <td style="text-align:center;font-weight:700;color:var(--accent)">{{ r.prof }}</td>
                          <td style="text-align:center">{{ r.premium }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Histórico de faturas -->
              <div class="cfg-card">
                <div class="cfg-card-head">Histórico de faturas</div>
                <div class="cfg-card-body" style="padding:0">
                  <table class="tbl">
                    <thead><tr>
                      <th>Período</th><th>Valor</th><th>Status</th><th></th>
                    </tr></thead>
                    <tbody>
                      @for (f of faturas; track f.periodo) {
                        <tr>
                          <td>{{ f.periodo }}</td>
                          <td class="tnum">R$ {{ f.valor }}</td>
                          <td>
                            <span class="pill" [class.pill-confirmado]="f.pago" [class.pill-pendente]="!f.pago">
                              {{ f.pago ? 'Pago' : 'Pendente' }}
                            </span>
                          </td>
                          <td><button class="btn btn-ghost btn-sm">PDF</button></td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          }

          <!-- ════════════ INTEGRAÇÕES ════════════ -->
          @if (tab === 'integracoes') {
            <section class="cfg-section">
              <h2 class="cfg-h2">Integrações</h2>
              <p class="cfg-sub">Conecte ferramentas externas para ampliar sua operação.</p>

              <div class="cfg-integs" style="margin-top:24px">
                @for (i of integracoes; track i.id) {
                  <div class="cfg-integ-card" [class.connected]="i.conectado">
                    <div class="cfg-integ-top">
                      <div class="cfg-integ-ico" [style.background]="i.bg">
                        <app-icon [name]="i.icon" [size]="20" [style.color]="i.col"></app-icon>
                      </div>
                      @if (i.conectado) {
                        <span class="cfg-integ-status">
                          <app-icon name="check" [size]="11"></app-icon>
                          Conectado
                        </span>
                      }
                    </div>
                    <div class="cfg-integ-name">{{ i.nome }}</div>
                    <div class="cfg-hint" style="margin-top:4px;flex:1">{{ i.desc }}</div>
                    <button class="btn btn-sm" style="margin-top:14px;width:100%"
                      [class.btn-ghost]="i.conectado"
                      [class.btn-primary]="!i.conectado">
                      {{ i.conectado ? 'Gerenciar' : 'Conectar' }}
                    </button>
                  </div>
                }
              </div>

              <div class="cfg-card" style="margin-top:24px">
                <div class="cfg-card-head">Webhook / API</div>
                <div class="cfg-card-body cfg-form">
                  <div class="field">
                    <label>URL do webhook (POST)</label>
                    <input class="input" [(ngModel)]="webhook.url" placeholder="https://seu-sistema.com/webhook">
                  </div>
                  <div class="field">
                    <label>API Key (somente leitura)</label>
                    <div class="cfg-key-row">
                      <input class="input" value="sk-live-••••••••••••••••••••••••••••••" readonly>
                      <button class="btn btn-ghost btn-sm">Copiar</button>
                      <button class="btn btn-ghost btn-sm">Revogar</button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          }

        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ── Layout ── */
    .cfg-page { padding-bottom: 48px; }

    .cfg-layout {
      display: grid;
      grid-template-columns: 220px 1fr;
      gap: 24px;
      align-items: start;
    }

    /* ── Sidebar nav ── */
    .cfg-nav {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r-lg);
      padding: 6px;
      box-shadow: var(--sh-sm);
      display: flex;
      flex-direction: column;
      gap: 1px;
      position: sticky;
      top: 16px;
    }

    .cfg-nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 11px;
      border-radius: var(--r-sm);
      font-size: 13.5px;
      font-weight: 500;
      color: var(--text-2);
      text-align: left;
      transition: background .10s, color .10s;
    }
    .cfg-nav-item:hover { background: var(--surface-2); color: var(--text); }
    .cfg-nav-item.on { background: var(--accent-soft); color: var(--accent-text); font-weight: 600; }

    .cfg-nav-ico {
      width: 28px; height: 28px;
      border-radius: 7px;
      display: grid; place-items: center;
      background: var(--surface-2);
      flex-shrink: 0;
    }
    .cfg-nav-item.on .cfg-nav-ico { background: var(--accent-soft-2); }

    .cfg-nav-divider { height: 1px; background: var(--border); margin: 6px 4px; }

    .cfg-nav-danger { color: var(--st-faltou); }
    .cfg-nav-danger:hover { background: var(--st-faltou-bg); }

    /* ── Conteúdo ── */
    .cfg-body { min-width: 0; }
    .cfg-section { display: flex; flex-direction: column; gap: 16px; }

    .cfg-h2 {
      font-size: 20px; font-weight: 800;
      letter-spacing: -0.02em; color: var(--text);
    }
    .cfg-sub { font-size: 13.5px; color: var(--text-2); margin-top: -10px; }

    /* ── Cards internos ── */
    .cfg-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r-lg);
      box-shadow: var(--sh-sm);
      overflow: hidden;
    }
    .cfg-card-head {
      padding: 13px 18px;
      border-bottom: 1px solid var(--border);
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .cfg-card-body { padding: 18px; }
    .cfg-form { display: flex; flex-direction: column; gap: 14px; }

    .cfg-hint { font-size: 12px; color: var(--text-3); margin-top: 3px; }

    /* ── Toggle switch ── */
    .cfg-toggle {
      width: 40px; height: 22px;
      border-radius: 99px;
      background: var(--surface-3);
      border: 1px solid var(--border-strong);
      position: relative;
      transition: background .15s, border-color .15s;
      flex-shrink: 0;
    }
    .cfg-toggle.on { background: var(--accent); border-color: var(--accent); }
    .cfg-toggle.sm { width: 34px; height: 18px; }

    .cfg-toggle-knob {
      position: absolute;
      top: 2px; left: 2px;
      width: 16px; height: 16px;
      border-radius: 99px;
      background: #fff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.20);
      transition: left .15s cubic-bezier(.34,1.56,.64,1);
      display: block;
    }
    .cfg-toggle.on .cfg-toggle-knob { left: calc(100% - 18px); }
    .cfg-toggle.sm .cfg-toggle-knob { width: 12px; height: 12px; }
    .cfg-toggle.sm.on .cfg-toggle-knob { left: calc(100% - 14px); }

    .cfg-toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 4px 0;
    }

    /* ── Dias funcionamento ── */
    .cfg-dia-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 13px 18px;
      border-bottom: 1px solid var(--border);
    }
    .cfg-dia-row:last-child { border-bottom: none; }
    .cfg-dia-row.fechado { opacity: .55; }

    .cfg-dia-toggle { display: flex; align-items: center; gap: 12px; min-width: 140px; }
    .cfg-dia-label { font-size: 13.5px; font-weight: 600; }
    .cfg-dia-horas { display: flex; align-items: center; gap: 8px; }
    .cfg-dia-sep { font-size: 12px; color: var(--text-3); }
    .cfg-fechado-label { font-size: 12.5px; color: var(--text-3); font-style: italic; }

    .cfg-time-input { width: 110px; flex-shrink: 0; }

    /* ── Logo preview ── */
    .cfg-logo-preview {
      width: 64px; height: 64px;
      border-radius: var(--r-md);
      background: var(--accent-soft);
      border: 1px solid var(--accent-soft-2);
      display: grid; place-items: center;
      flex-shrink: 0;
    }

    /* ── Prefix input ── */
    .cfg-prefix-wrap { display: flex; }
    .cfg-prefix {
      display: flex; align-items: center;
      padding: 0 10px;
      background: var(--surface-2);
      border: 1px solid var(--border-strong);
      border-right: none;
      border-radius: var(--r-md) 0 0 var(--r-md);
      font-size: 13px; color: var(--text-3); white-space: nowrap;
    }
    .cfg-prefix-input { border-radius: 0 var(--r-md) var(--r-md) 0 !important; }

    /* ── Input addon (%) ── */
    .cfg-input-addon { display: flex; }
    .cfg-addon {
      display: flex; align-items: center;
      padding: 0 12px;
      background: var(--surface-2);
      border: 1px solid var(--border-strong);
      border-left: none;
      border-radius: 0 var(--r-md) var(--r-md) 0;
      font-size: 13px; color: var(--text-3);
    }
    .cfg-input-addon .input { border-radius: var(--r-md) 0 0 var(--r-md) !important; }

    /* ── Pagamentos ── */
    .cfg-pay-ico {
      width: 36px; height: 36px;
      border-radius: 9px;
      display: grid; place-items: center;
      flex-shrink: 0;
    }

    /* ── Notificações ── */
    .cfg-notif-col {
      width: 76px; text-align: center;
      font-size: 11px; font-weight: 700;
      letter-spacing: 0.04em; text-transform: uppercase;
      color: var(--text-3); flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .cfg-notif-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 13px 18px;
      border-bottom: 1px solid var(--border);
    }
    .cfg-notif-row:last-child { border-bottom: none; }
    .cfg-notif-info { flex: 1; min-width: 0; }

    /* ── Plano ── */
    .cfg-plan-hero {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r-lg);
      box-shadow: var(--sh-sm);
      padding: 20px 22px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .cfg-plan-badge {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 11px; font-weight: 700;
      letter-spacing: 0.06em; text-transform: uppercase;
      color: var(--accent-text);
      background: var(--accent-soft);
      padding: 3px 9px; border-radius: 99px;
      margin-bottom: 8px;
    }
    .cfg-plan-name { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
    .cfg-plan-tbl th small { display: block; font-size: 11px; font-weight: 400; margin-top: 2px; color: var(--text-3); }

    /* ── Integrações ── */
    .cfg-integs {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
      gap: 14px;
    }
    .cfg-integ-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r-lg);
      padding: 18px;
      display: flex;
      flex-direction: column;
      box-shadow: var(--sh-sm);
      transition: border-color .15s;
    }
    .cfg-integ-card.connected { border-color: var(--st-confirmado); }
    .cfg-integ-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
    .cfg-integ-ico { width: 44px; height: 44px; border-radius: 11px; display: grid; place-items: center; }
    .cfg-integ-name { font-size: 14px; font-weight: 700; }
    .cfg-integ-status {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 10.5px; font-weight: 700;
      color: var(--st-confirmado);
      background: var(--st-confirmado-bg);
      padding: 2px 7px; border-radius: 99px;
    }

    /* ── API key row ── */
    .cfg-key-row { display: flex; gap: 8px; align-items: center; }
    .cfg-key-row .input { flex: 1; font-family: 'Geist Mono', monospace; font-size: 12px; }

    /* ── Salvar ── */
    .cfg-save-bar {
      display: flex;
      justify-content: flex-end;
      padding-top: 4px;
    }

    /* ── Tabs mobile ── */
    .cfg-tabs-mobile { display: none; }

    /* ── Responsive ── */
    @media (max-width: 900px) {
      .cfg-layout { grid-template-columns: 1fr; }
      .cfg-nav { display: none; }
      .cfg-tabs-mobile {
        display: flex;
        gap: 6px;
        overflow-x: auto;
        scrollbar-width: none;
        padding-bottom: 16px;
        margin-top: -8px;
      }
      .cfg-tabs-mobile::-webkit-scrollbar { display: none; }
      .cfg-tab-m {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 7px 13px; border-radius: 99px;
        font-size: 12.5px; font-weight: 600;
        white-space: nowrap;
        background: var(--surface);
        border: 1px solid var(--border);
        color: var(--text-2);
        transition: .12s;
        flex-shrink: 0;
      }
      .cfg-tab-m.on {
        background: var(--accent-soft);
        border-color: var(--accent-soft-2);
        color: var(--accent-text);
      }
    }

    @media (max-width: 600px) {
      .cfg-notif-col { width: 52px; }
      .cfg-integs { grid-template-columns: 1fr 1fr; }
    }
  `],
})
export class ConfigComponent {
  @Output() notify = new EventEmitter<string>();

  tab: Tab = 'conta';

  readonly TABS: TabDef[] = [
    { id: 'conta',          label: 'Minha conta',     icon: 'users' },
    { id: 'estabelecimento',label: 'Estabelecimento',  icon: 'scissors' },
    { id: 'horarios',       label: 'Horários',         icon: 'clock' },
    { id: 'agenda',         label: 'Agenda',           icon: 'calendar' },
    { id: 'pagamentos',     label: 'Pagamentos',       icon: 'money' },
    { id: 'notificacoes',   label: 'Notificações',     icon: 'bell' },
    { id: 'plano',          label: 'Plano',            icon: 'gift' },
    { id: 'integracoes',    label: 'Integrações',      icon: 'link' },
  ];

  // ── Conta ──
  conta = {
    nome: this.data.usuario.nome,
    papel: this.data.usuario.papel,
    email: 'carlos.menezes@navalhaecia.com.br',
    wpp: '(11) 98800-5544',
  };

  // ── Estabelecimento ──
  estab = {
    nome: this.data.estabelecimento.nome,
    tipo: 'Barbearia',
    doc: '12.345.678/0001-90',
    tel: '(11) 3456-7890',
    end: 'Rua das Flores, 210 — Centro',
    cidade: 'São Paulo — SP',
    cep: '01310-000',
    desc: 'Barbearia premium no coração de SP. Cortes masculinos, barba e estética com os melhores profissionais.',
    instagram: 'navalhaecia',
    google: '',
    site: '',
  };

  // ── Horários ──
  diasFuncionamento: DiaFuncionamento[] = [
    { dia: 'Segunda-feira',  abrev: 'Seg', aberto: true,  inicio: '09:00', fim: '20:00' },
    { dia: 'Terça-feira',    abrev: 'Ter', aberto: true,  inicio: '09:00', fim: '20:00' },
    { dia: 'Quarta-feira',   abrev: 'Qua', aberto: true,  inicio: '09:00', fim: '20:00' },
    { dia: 'Quinta-feira',   abrev: 'Qui', aberto: true,  inicio: '09:00', fim: '20:00' },
    { dia: 'Sexta-feira',    abrev: 'Sex', aberto: true,  inicio: '09:00', fim: '20:00' },
    { dia: 'Sábado',         abrev: 'Sáb', aberto: true,  inicio: '09:00', fim: '18:00' },
    { dia: 'Domingo',        abrev: 'Dom', aberto: false, inicio: '10:00', fim: '16:00' },
  ];
  pausaAtiva = true;
  pausaInicio = '12:00';
  pausaFim = '13:30';

  // ── Agenda ──
  agenda = {
    intervalo: '30', antecedencia: '2', maxDias: '30',
    maxDia: 20, cancelamentoPrazo: '4', sinalPct: 30,
    confirmacaoAuto: true, lembrete: true, lembrete2h: false,
  };

  // ── Pagamentos ──
  pagamentos = [
    { id: 'pix',      label: 'Pix',              desc: 'Transferência instantânea',   icon: 'money',  bg: 'rgba(5,150,105,.12)',  col: '#059669', ativo: true  },
    { id: 'debito',   label: 'Cartão de débito', desc: 'Maquininha / Point',          icon: 'money',  bg: 'rgba(37,99,235,.12)', col: '#2563eb', ativo: true  },
    { id: 'credito',  label: 'Cartão de crédito',desc: 'À vista e parcelado',          icon: 'money',  bg: 'rgba(79,70,229,.12)', col: 'var(--accent)', ativo: true  },
    { id: 'dinheiro', label: 'Dinheiro',          desc: 'Espécie / caixa físico',      icon: 'coins',  bg: 'rgba(217,119,6,.12)', col: '#d97706', ativo: true  },
    { id: 'fiado',    label: 'Fiado / A receber', desc: 'Registra e gera conta a receber', icon: 'list', bg: 'rgba(220,38,38,.12)',col: '#dc2626', ativo: false },
  ];
  pagPix = { tipo: 'CPF/CNPJ', chave: '12.345.678/0001-90', nome: 'Navalha & Cia' };
  pagCard = { repassaTaxa: false, taxa: 3.2 };

  // ── Notificações ──
  notifItems = [
    { id: 'n1', label: 'Novo agendamento',        desc: 'Ao confirmar um novo horário',         app: true,  wpp: true,  email: false },
    { id: 'n2', label: 'Agendamento cancelado',   desc: 'Quando um cliente cancela',            app: true,  wpp: true,  email: true  },
    { id: 'n3', label: 'Cliente faltou',          desc: 'No-show registrado na agenda',         app: true,  wpp: false, email: false },
    { id: 'n4', label: 'Pagamento recebido',      desc: 'Ao registrar recebimento',             app: true,  wpp: false, email: false },
    { id: 'n5', label: 'Estoque abaixo do mínimo',desc: 'Quando produto atingir mínimo',        app: true,  wpp: true,  email: false },
    { id: 'n6', label: 'Novo cliente cadastrado', desc: 'Primeiro acesso de um novo cliente',   app: false, wpp: false, email: false },
    { id: 'n7', label: 'Meta atingida',           desc: 'Ao atingir a meta de faturamento',     app: true,  wpp: true,  email: true  },
  ];

  // ── Plano ──
  usos = [
    { label: 'Profissionais cadastrados',  usado: 4,   limite: 10   },
    { label: 'Agendamentos este mês',      usado: 96,  limite: 300  },
    { label: 'Clientes na base',           usado: 12,  limite: 500  },
    { label: 'Campanhas ativas',           usado: 2,   limite: 5    },
    { label: 'Armazenamento de dados',     usado: 0.8, limite: 5    },
  ];
  recursos = [
    { nome: 'Profissionais',        basico: '3',          prof: '10',         premium: 'Ilimitado'  },
    { nome: 'Agendamentos/mês',     basico: '100',        prof: '300',        premium: 'Ilimitado'  },
    { nome: 'Clientes',             basico: '200',        prof: '500',        premium: 'Ilimitado'  },
    { nome: 'Campanhas de marketing',basico: '—',         prof: '5/mês',      premium: 'Ilimitado'  },
    { nome: 'Relatórios avançados', basico: '—',          prof: '✓',          premium: '✓'          },
    { nome: 'Integrações',          basico: 'WhatsApp',   prof: 'WhatsApp + Instagram', premium: 'Todas'  },
    { nome: 'Suporte',              basico: 'E-mail',     prof: 'Chat + E-mail', premium: 'Prioritário' },
  ];
  faturas = [
    { periodo: 'Junho 2026',   valor: '149,90', pago: false },
    { periodo: 'Maio 2026',    valor: '149,90', pago: true  },
    { periodo: 'Abril 2026',   valor: '149,90', pago: true  },
    { periodo: 'Março 2026',   valor: '149,90', pago: true  },
  ];

  // ── Integrações ──
  integracoes = [
    { id: 'wpp',   nome: 'WhatsApp Business', desc: 'Confirmações, lembretes e campanhas via WhatsApp oficial.',       icon: 'bell',     bg: 'rgba(5,150,105,.12)',   col: '#059669', conectado: true  },
    { id: 'insta', nome: 'Instagram',          desc: 'Link de agendamento direto no perfil e stories.',                icon: 'star',     bg: 'rgba(219,39,119,.12)',  col: '#db2777', conectado: false },
    { id: 'gcal',  nome: 'Google Calendar',    desc: 'Sincroniza agendamentos com a agenda pessoal do profissional.',  icon: 'calendar', bg: 'rgba(37,99,235,.12)',   col: '#2563eb', conectado: false },
    { id: 'pag',   nome: 'Mercado Pago',       desc: 'Cobrança online com link de pagamento e split de comissões.',    icon: 'money',    bg: 'rgba(79,70,229,.12)',   col: 'var(--accent)', conectado: false },
    { id: 'nf',    nome: 'Nota Fiscal (NFS-e)', desc: 'Emissão automática de nota fiscal ao fechar atendimento.',      icon: 'list',     bg: 'rgba(217,119,6,.12)',   col: '#d97706', conectado: false },
    { id: 'maps',  nome: 'Google Maps',        desc: 'Botão "Como chegar" no link de agendamento.',                    icon: 'target',   bg: 'rgba(220,38,38,.12)',   col: '#dc2626', conectado: true  },
  ];

  webhook = { url: '' };

  constructor(public data: DataService) {}

  round = Math.round;

  save(section: string) {
    this.notify.emit('Alterações salvas com sucesso!');
  }
}
