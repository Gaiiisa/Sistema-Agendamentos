import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../icon.component';
import { AvatarComponent } from '../shared/avatar.component';
import { SelectComponent, SelectOption } from '../shared/select.component';
import { DataService, UsuarioAdmin, PermCatalogoItem } from '../data.service';
import { ToastService } from '../toast.service';
import { AuthService, NIVEL_LABEL, Nivel } from '../auth.service';
import { CampoErroComponent } from '../shared/campo-erro.component';
import { MascaraDirective } from '../shared/mascara.directive';
import { PIPES } from '../shared/pipes';
import { V, validar, temErros, Erros } from '../shared/validacao';

type Tab = 'conta' | 'estabelecimento' | 'horarios' | 'agenda' | 'pagamentos' | 'notificacoes' | 'plano' | 'integracoes' | 'usuarios';

interface TabDef { id: Tab; label: string; icon: string; }

interface DiaFuncionamento {
  diaSemana: number; dia: string; abrev: string; aberto: boolean; inicio: string; fim: string;
}

@Component({
  selector: 'app-config',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, AvatarComponent, SelectComponent, CampoErroComponent, MascaraDirective, ...PIPES],
  template: `
    <div class="page cfg-page">

      <!-- Cabeçalho mobile (abas em scroll) -->
      <div class="cfg-tabs-mobile">
        @for (t of tabsVisiveis; track t.id) {
          <button class="cfg-tab-m" [class.on]="tab === t.id" (click)="irTab(t.id)">
            <app-icon [name]="t.icon" [size]="14"></app-icon>
            {{ t.label }}
          </button>
        }
      </div>

      <div class="cfg-layout">

        <!-- ── Sidebar de abas (desktop) ── -->
        <nav class="cfg-nav">
          @for (t of tabsVisiveis; track t.id) {
            <button class="cfg-nav-item" [class.on]="tab === t.id" (click)="irTab(t.id)">
              <span class="cfg-nav-ico">
                <app-icon [name]="t.icon" [size]="15"></app-icon>
              </span>
              {{ t.label }}
            </button>
          }

          <div class="cfg-nav-divider"></div>

          <button class="cfg-nav-item cfg-nav-danger" (click)="logout.emit()">
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
                      <label>Nome completo<span class="req">*</span></label>
                      <input class="input" [class.invalid]="errosConta['nome']" [(ngModel)]="conta.nome" maxlength="100">
                      <app-campo-erro [msg]="errosConta['nome']"></app-campo-erro>
                    </div>
                    <div class="field">
                      <label>Papel</label>
                      <input class="input" [value]="auth.isGestor ? nivelLabel(auth.usuario!.nivel) + ' (acesso total)' : conta.papel" readonly title="Definido pelo administrador">

                    </div>
                  </div>
                  <div class="grid-2">
                    <div class="field">
                      <label>E-mail ou usuário (login)<span class="req">*</span></label>
                      <input class="input" [class.invalid]="errosConta['email']" type="email" [(ngModel)]="conta.email" maxlength="255">
                      <app-campo-erro [msg]="errosConta['email']"></app-campo-erro>
                    </div>
                    <div class="field">
                      <label>WhatsApp</label>
                      <input class="input" type="tel" [ngModel]="conta.wpp" readonly (click)="whatsappEmBreve()" style="cursor:pointer" title="Em desenvolvimento">
                    </div>
                  </div>
                </div>
              </div>

              <div class="cfg-card">
                <div class="cfg-card-head">Segurança</div>
                <div class="cfg-card-body cfg-form">
                  <div class="field">
                    <label>Senha atual</label>
                    <input class="input" [class.invalid]="errosSenha['atual']" type="password" placeholder="••••••••" [(ngModel)]="senhaAtual" autocomplete="current-password">
                    <app-campo-erro [msg]="errosSenha['atual']"></app-campo-erro>
                  </div>
                  <div class="grid-2">
                    <div class="field">
                      <label>Nova senha</label>
                      <input class="input" [class.invalid]="errosSenha['nova']" type="password" placeholder="••••••••" [(ngModel)]="senhaNova" autocomplete="new-password" maxlength="72">
                      <app-campo-erro [msg]="errosSenha['nova']"></app-campo-erro>
                    </div>
                    <div class="field">
                      <label>Confirmar nova senha</label>
                      <input class="input" [class.invalid]="errosSenha['confirma']" type="password" placeholder="••••••••" [(ngModel)]="senhaConfirma" autocomplete="new-password" maxlength="72">
                      <app-campo-erro [msg]="errosSenha['confirma']"></app-campo-erro>
                    </div>
                  </div>
                  <div class="cfg-hint">Mínimo de 6 caracteres, com letras e números.</div>
                  <div>
                    <button class="btn btn-primary btn-sm" (click)="salvarSenha()">Salvar senha</button>
                  </div>
                </div>
              </div>

              <div class="cfg-save-bar">
                <button class="btn btn-primary" (click)="salvarConta()">Salvar alterações</button>
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
                      <label>Nome do estabelecimento<span class="req">*</span></label>
                      <input class="input" [class.invalid]="errosEstab['nome']" [(ngModel)]="estab.nome" maxlength="100">
                      <app-campo-erro [msg]="errosEstab['nome']"></app-campo-erro>
                    </div>
                    <div class="field">
                      <label>Tipo de negócio<span class="req">*</span></label>
                      <app-select [class.invalid]="errosEstab['tipo']" [(ngModel)]="estab.tipo" [options]="TIPO_ESTAB_OPTS"></app-select>
                      <app-campo-erro [msg]="errosEstab['tipo']"></app-campo-erro>
                    </div>
                  </div>
                  <div class="grid-2">
                    <div class="field">
                      <label>CNPJ / CPF</label>
                      <input class="input" [class.invalid]="errosEstab['doc']" [(ngModel)]="estab.doc" mascara="documento" placeholder="00.000.000/0001-00">
                      <app-campo-erro [msg]="errosEstab['doc']"></app-campo-erro>
                    </div>
                    <div class="field">
                      <label>Telefone / WhatsApp<span class="req">*</span></label>
                      <input class="input" [class.invalid]="errosEstab['tel']" type="tel" [(ngModel)]="estab.tel" mascara="telefone" placeholder="(11) 3456-7890">
                      <app-campo-erro [msg]="errosEstab['tel']"></app-campo-erro>
                    </div>
                  </div>
                  <div class="field">
                    <label>Endereço</label>
                    <input class="input" [class.invalid]="errosEstab['end']" [(ngModel)]="estab.end" placeholder="Rua, número, bairro" maxlength="255">
                    <app-campo-erro [msg]="errosEstab['end']"></app-campo-erro>
                  </div>
                  <div class="grid-2">
                    <div class="field">
                      <label>Cidade</label>
                      <input class="input" [class.invalid]="errosEstab['cidade']" [(ngModel)]="estab.cidade" maxlength="80">
                      <app-campo-erro [msg]="errosEstab['cidade']"></app-campo-erro>
                    </div>
                    <div class="field">
                      <label>CEP</label>
                      <input class="input" [class.invalid]="errosEstab['cep']" [(ngModel)]="estab.cep" mascara="cep" placeholder="00000-000">
                      <app-campo-erro [msg]="errosEstab['cep']"></app-campo-erro>
                    </div>
                  </div>
                  <div class="field">
                    <label>Descrição (aparece no link de agendamento)</label>
                    <textarea class="input" [class.invalid]="errosEstab['desc']" [(ngModel)]="estab.desc" rows="3" maxlength="500"
                      placeholder="Fale um pouco sobre o seu espaço…"></textarea>
                    <app-campo-erro [msg]="errosEstab['desc']"></app-campo-erro>
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
                      <input class="input cfg-prefix-input" [class.invalid]="errosEstab['instagram']" [(ngModel)]="estab.instagram" placeholder="navalhaecia" maxlength="30">
                    </div>
                    <app-campo-erro [msg]="errosEstab['instagram']"></app-campo-erro>
                  </div>
                  <div class="grid-2">
                    <div class="field">
                      <label>Google Meu Negócio</label>
                      <input class="input" [class.invalid]="errosEstab['google']" [(ngModel)]="estab.google" placeholder="https://g.page/..." maxlength="255">
                      <app-campo-erro [msg]="errosEstab['google']"></app-campo-erro>
                    </div>
                    <div class="field">
                      <label>Site / Link de bio</label>
                      <input class="input" [class.invalid]="errosEstab['site']" [(ngModel)]="estab.site" placeholder="https://..." maxlength="255">
                      <app-campo-erro [msg]="errosEstab['site']"></app-campo-erro>
                    </div>
                  </div>
                </div>
              </div>

              <div class="cfg-save-bar">
                <button class="btn btn-primary" [disabled]="!podeEditarConfig" [title]="podeEditarConfig ? '' : 'Sem permissão para editar as configurações'" (click)="save('estab')">Salvar alterações</button>
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
                        <div class="cfg-dia-horas" style="flex-wrap:wrap">
                          <input class="input cfg-time-input" [class.invalid]="errosHorarios['dia' + d.diaSemana]" type="time" [(ngModel)]="d.inicio">
                          <span class="cfg-dia-sep">até</span>
                          <input class="input cfg-time-input" [class.invalid]="errosHorarios['dia' + d.diaSemana]" type="time" [(ngModel)]="d.fim">
                          <app-campo-erro style="flex-basis:100%;text-align:right" [msg]="errosHorarios['dia' + d.diaSemana]"></app-campo-erro>
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
                      <input class="input cfg-time-input" [class.invalid]="errosHorarios['pausa']" type="time" [(ngModel)]="pausaInicio">
                      <span class="muted">até</span>
                      <input class="input cfg-time-input" [class.invalid]="errosHorarios['pausa']" type="time" [(ngModel)]="pausaFim">
                    </div>
                    <app-campo-erro [msg]="errosHorarios['pausa']"></app-campo-erro>
                  }
                  <app-campo-erro [msg]="errosHorarios['geral']"></app-campo-erro>
                </div>
              </div>

              <div class="cfg-save-bar">
                <button class="btn btn-primary" [disabled]="!podeEditarConfig" [title]="podeEditarConfig ? '' : 'Sem permissão para editar as configurações'" (click)="save('horarios')">Salvar alterações</button>
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
                      <app-select [(ngModel)]="agenda.intervalo" [options]="INTERVALO_OPTS"></app-select>
                    </div>
                    <div class="field">
                      <label>Antecedência mínima para agendar</label>
                      <app-select [(ngModel)]="agenda.antecedencia" [options]="ANTECEDENCIA_OPTS"></app-select>
                    </div>
                  </div>
                  <div class="grid-2">
                    <div class="field">
                      <label>Máximo de dias para agendar</label>
                      <app-select [(ngModel)]="agenda.maxDias" [options]="MAXDIAS_OPTS"></app-select>
                    </div>
                    <div class="field">
                      <label>Limite de agendamentos por dia</label>
                      <input class="input" [class.invalid]="errosAgenda['maxDia']" type="number" [(ngModel)]="agenda.maxDia" min="1" max="99" step="1">
                      <app-campo-erro [msg]="errosAgenda['maxDia']"></app-campo-erro>
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
                    <button class="cfg-toggle" [class.on]="agenda.confirmacaoAuto" (click)="whatsappEmBreve()">
                      <span class="cfg-toggle-knob"></span>
                    </button>
                  </div>
                  <div class="cfg-toggle-row">
                    <div>
                      <div style="font-weight:600;font-size:13.5px">Lembrete na véspera</div>
                      <div class="cfg-hint">Envia lembrete 24 h antes do horário</div>
                    </div>
                    <button class="cfg-toggle" [class.on]="agenda.lembrete" (click)="whatsappEmBreve()">
                      <span class="cfg-toggle-knob"></span>
                    </button>
                  </div>
                  <div class="cfg-toggle-row">
                    <div>
                      <div style="font-weight:600;font-size:13.5px">Lembrete 2 horas antes</div>
                      <div class="cfg-hint">Envia segundo lembrete próximo ao horário</div>
                    </div>
                    <button class="cfg-toggle" [class.on]="agenda.lembrete2h" (click)="whatsappEmBreve()">
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
                      <app-select [(ngModel)]="agenda.cancelamentoPrazo" [options]="CANCEL_PRAZO_OPTS"></app-select>
                    </div>
                    <div class="field">
                      <label>% de sinal exigido (serviços marcados)</label>
                      <div class="cfg-input-addon">
                        <input class="input" [class.invalid]="errosAgenda['sinalPct']" type="number" [(ngModel)]="agenda.sinalPct" min="0" max="100" step="1">
                        <span class="cfg-addon">%</span>
                      </div>
                      <app-campo-erro [msg]="errosAgenda['sinalPct']"></app-campo-erro>
                    </div>
                  </div>
                </div>
              </div>

              <div class="cfg-save-bar">
                <button class="btn btn-primary" [disabled]="!podeEditarConfig" [title]="podeEditarConfig ? '' : 'Sem permissão para editar as configurações'" (click)="save('agenda')">Salvar alterações</button>
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
                  <app-campo-erro [msg]="errosPag['metodos']"></app-campo-erro>
                </div>
              </div>

              <div class="cfg-card">
                <div class="cfg-card-head">Chave Pix</div>
                <div class="cfg-card-body cfg-form">
                  <div class="grid-2">
                    <div class="field">
                      <label>Tipo de chave</label>
                      <app-select [(ngModel)]="pagPix.tipo" [options]="PIX_TIPO_OPTS"></app-select>
                    </div>
                    <div class="field">
                      <label>Chave Pix@if (pixAtivo) {<span class="req">*</span>}</label>
                      <input class="input" [class.invalid]="errosPag['chave']" [(ngModel)]="pagPix.chave" placeholder="Informe a chave" maxlength="77">
                      <app-campo-erro [msg]="errosPag['chave']"></app-campo-erro>
                    </div>
                  </div>
                  <div class="field">
                    <label>Nome exibido no Pix@if (pixAtivo) {<span class="req">*</span>}</label>
                    <input class="input" [class.invalid]="errosPag['nome']" [(ngModel)]="pagPix.nome" maxlength="25">
                    <app-campo-erro [msg]="errosPag['nome']"></app-campo-erro>
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
                        <input class="input" [class.invalid]="errosPag['taxa']" type="number" [(ngModel)]="pagCard.taxa" step="0.1" min="0" max="10">
                        <span class="cfg-addon">%</span>
                      </div>
                      <app-campo-erro [msg]="errosPag['taxa']"></app-campo-erro>
                    </div>
                  }
                </div>
              </div>

              <div class="cfg-save-bar">
                <button class="btn btn-primary" [disabled]="!podeEditarConfig" [title]="podeEditarConfig ? '' : 'Sem permissão para editar as configurações'" (click)="save('pagamentos')">Salvar alterações</button>
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
                    <div class="cfg-notif-col" data-ch="App">
                      <button class="cfg-toggle sm" [class.on]="n.app" (click)="n.app = !n.app">
                        <span class="cfg-toggle-knob"></span>
                      </button>
                    </div>
                    <div class="cfg-notif-col" data-ch="WhatsApp">
                      <button class="cfg-toggle sm" [class.on]="n.wpp" (click)="n.wpp = !n.wpp">
                        <span class="cfg-toggle-knob"></span>
                      </button>
                    </div>
                    <div class="cfg-notif-col" data-ch="E-mail">
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
                <button class="btn btn-primary" [disabled]="!podeEditarConfig" [title]="podeEditarConfig ? '' : 'Sem permissão para editar as configurações'" (click)="save('notif')">Salvar alterações</button>
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
                <div class="cfg-card-body tbl-scroll" style="padding:0">
                  <table class="tbl cfg-plan-tbl" style="min-width:520px">
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

          <!-- ════════════ USUÁRIOS E PERMISSÕES (master e CEO) ════════════ -->
          @if (tab === 'usuarios' && auth.isGestor) {
            <section class="cfg-section">
              <h2 class="cfg-h2">Usuários e Permissões</h2>
              <p class="cfg-sub">
                @if (auth.isMaster) { Como master, você cria, edita e exclui qualquer conta, inclusive as de CEO. }
                @else { Como CEO, você vê e gerencia apenas as contas que você criou. }
                Contas de nível Usuário só acessam o que for marcado nas permissões.
              </p>

              <div class="cfg-card" style="margin-top:24px">
                <div class="cfg-card-body">
                  <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
                    <input class="input" style="flex:1;min-width:180px" [(ngModel)]="buscaUsuario" placeholder="Buscar por nome, e-mail ou perfil…">
                    <button class="btn btn-primary" (click)="novaConta()">
                      <app-icon name="plus" [size]="15" [stroke]="2.4"></app-icon> Nova conta
                    </button>
                  </div>
                  @if (carregandoUsuarios) {
                    <div class="cfg-hint">Carregando contas…</div>
                  } @else {
                    <div style="overflow-x:auto">
                      <table class="cfg-utable">
                        <thead><tr>
                          <th>Nome</th><th>Nível</th><th>E-mail</th><th>Perfil</th><th>Status</th>
                          @if (auth.isMaster) { <th>Criado por</th> }
                          <th>Cadastro</th><th>Último acesso</th>
                        </tr></thead>
                        <tbody>
                          @for (u of usuariosFiltrados; track u.id) {
                            <tr [class.sel]="usuarioSel?.id === u.id" [style.opacity]="u.gerenciavel ? 1 : 0.6" (click)="selecionarUsuario(u)">
                              <td>
                                <span style="font-weight:600">{{ u.nome }}</span>
                                @if (u.id === auth.usuario?.id) { <span class="cfg-hint" style="margin-left:6px">(você)</span> }
                              </td>
                              <td>
                                @if (u.nivel !== 'usuario') { <span class="cfg-badge-adm" style="margin-left:0">{{ nivelLabel(u.nivel) }}</span> }
                                @else { {{ nivelLabel(u.nivel) }} }
                              </td>
                              <td>{{ u.email }}</td>
                              <td>{{ u.papel }}</td>
                              <td><span [style.color]="u.ativo ? 'var(--accent-text)' : 'var(--st-faltou)'">{{ u.ativo ? 'Ativo' : 'Inativo' }}</span></td>
                              @if (auth.isMaster) { <td>{{ u.criadoPor || '—' }}</td> }
                              <td class="tnum">{{ u.criadoEm | dataBR:'datahora' }}</td>
                              <td class="tnum">{{ u.ultimoAcesso | dataBR:'datahora' }}</td>
                            </tr>
                          }
                          @if (!usuariosFiltrados.length) {
                            <tr><td [attr.colspan]="auth.isMaster ? 8 : 7" class="cfg-hint" style="text-align:center;padding:16px">Nenhuma conta encontrada.</td></tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  }
                </div>
              </div>

              @if (usuarioSel || criandoConta) {
                <div class="cfg-card" style="margin-top:20px">
                  <div class="cfg-card-head" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                    @if (criandoConta) { <span>Nova conta</span> }
                    @else { <span>Conta de <strong>{{ usuarioSel!.nome }}</strong></span> }
                    @if (!criandoConta && permsAlteradas) { <span class="cfg-badge-dirty">alterações não salvas</span> }
                  </div>
                  <div class="cfg-card-body">
                    @if (carregandoPerms) {
                      <div class="cfg-hint">Carregando permissões…</div>
                    } @else {
                      <div class="cfg-form" style="margin-bottom:18px">
                        <div class="grid-2">
                          <div class="field">
                            <label>Nome<span class="req">*</span></label>
                            <input class="input" [class.invalid]="errosUsuario['nome']" [(ngModel)]="formConta.nome" placeholder="Ex.: Ana Recepção" maxlength="100">
                            <app-campo-erro [msg]="errosUsuario['nome']"></app-campo-erro>
                          </div>
                          <div class="field">
                            <label>E-mail ou usuário (login)<span class="req">*</span></label>
                            <input class="input" [class.invalid]="errosUsuario['email']" [(ngModel)]="formConta.email" placeholder="ana@navalhaecia.com" autocomplete="off" maxlength="255">
                            <app-campo-erro [msg]="errosUsuario['email']"></app-campo-erro>
                          </div>
                        </div>
                        <div class="grid-2">
                          <!-- CEO só cria contas de nível Usuário: sem escolha, o campo não aparece -->
                          @if (nivelOpts.length > 1) {
                            <div class="field">
                              <label>Nível de acesso</label>
                              <app-select [(ngModel)]="formConta.nivel" [options]="nivelOpts"></app-select>
                            </div>
                          }
                          <div class="field">
                            <label>Perfil (cargo)</label>
                            <app-select [(ngModel)]="formConta.papel" [options]="papelOpts"></app-select>
                          </div>
                        </div>
                        @if (criandoConta) {
                          <div class="field">
                            <label>Senha inicial<span class="req">*</span></label>
                            <input class="input" [class.invalid]="errosUsuario['senha']" type="password" [(ngModel)]="formConta.senha" placeholder="mín. 6 caracteres, letras e números" autocomplete="new-password" maxlength="72">
                            <app-campo-erro [msg]="errosUsuario['senha']"></app-campo-erro>
                          </div>
                        }
                      </div>

                      <div class="cfg-toggle-row" style="margin-bottom:6px">
                        <div>
                          <div style="font-weight:600;font-size:13.5px">Conta ativa</div>
                          <div class="cfg-hint">Contas inativas não conseguem fazer login (a sessão aberta cai na hora)</div>
                        </div>
                        <button class="cfg-toggle" [class.on]="ativoSel" (click)="ativoSel = !ativoSel">
                          <span class="cfg-toggle-knob"></span>
                        </button>
                      </div>

                      @if (formConta.nivel !== 'usuario') {
                        <p class="cfg-hint" style="margin:16px 0 4px">
                          Nível CEO tem acesso total a todos os módulos e gerencia as contas da empresa. Não há permissões para marcar.
                        </p>
                      } @else {
                      <div style="display:flex;align-items:center;gap:8px;margin:16px 0 8px;flex-wrap:wrap">
                        <div style="font-weight:600;font-size:13.5px;flex:1">Permissões</div>
                        <button class="btn btn-ghost btn-sm" (click)="marcarTodas()">Marcar tudo</button>
                        <button class="btn btn-ghost btn-sm" (click)="limparPerms()">Limpar</button>
                      </div>
                      <div style="overflow-x:auto">
                        <table class="cfg-ptable">
                          <thead><tr>
                            <th style="text-align:left">Módulo</th>
                            @for (a of acoesOrdem; track a) {
                              @if (algumModuloTem(a)) { <th>{{ acoesLabels[a] || a }}</th> }
                            }
                          </tr></thead>
                          <tbody>
                            @for (m of catalogo; track m.modulo) {
                              <tr>
                                <td style="text-align:left;font-weight:600">{{ m.label }}</td>
                                @for (a of acoesOrdem; track a) {
                                  @if (algumModuloTem(a)) {
                                    <td>
                                      @if (m.acoes.includes(a)) {
                                        <input type="checkbox" [checked]="temPerm(m.modulo, a)" (change)="togglePerm(m.modulo, a)">
                                      } @else { <span class="cfg-hint">—</span> }
                                    </td>
                                  }
                                }
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                      }

                      <div class="cfg-save-bar" style="gap:10px">
                        @if (criandoConta) {
                          <button class="btn btn-ghost" [disabled]="salvandoPerms" (click)="fecharConta()">Cancelar</button>
                          <button class="btn btn-primary" [disabled]="salvandoPerms" (click)="criarConta()">
                            {{ salvandoPerms ? 'Criando…' : 'Criar conta' }}
                          </button>
                        } @else {
                          <button class="btn btn-ghost" [disabled]="!permsAlteradas || salvandoPerms" (click)="cancelarPerms()">Cancelar</button>
                          <button class="btn btn-primary" [disabled]="!permsAlteradas || salvandoPerms" (click)="salvarPerms()">
                            {{ salvandoPerms ? 'Salvando…' : 'Salvar alterações' }}
                          </button>
                        }
                      </div>
                    }
                  </div>
                </div>

                @if (usuarioSel && !criandoConta && !carregandoPerms) {
                  <div class="cfg-card">
                    <div class="cfg-card-head">Redefinir senha</div>
                    <div class="cfg-card-body">
                      <div style="display:flex;gap:10px;flex-wrap:wrap">
                        <input class="input" style="flex:1;min-width:180px" type="password" [(ngModel)]="novaSenhaSel" placeholder="Nova senha (mín. 6 caracteres, letras e números)" autocomplete="new-password" maxlength="72">
                        <button class="btn btn-ghost" [disabled]="salvandoSenha" (click)="redefinirSenha()">{{ salvandoSenha ? 'Salvando…' : 'Redefinir senha' }}</button>
                      </div>
                      <div class="cfg-hint">Passe a nova senha para a pessoa; ela pode trocá-la depois em Minha conta.</div>
                    </div>
                  </div>
                  <div class="cfg-card">
                    <div class="cfg-card-head">Excluir conta</div>
                    <div class="cfg-card-body" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
                      <div class="cfg-hint" style="flex:1;min-width:220px;margin:0">
                        Remove a conta de {{ usuarioSel.nome }} de vez. Se ela já operou o caixa, o sistema pede para desativar em vez de excluir.
                      </div>
                      <button class="btn btn-ghost" style="color:var(--st-faltou)" [disabled]="excluindo" (click)="excluirConta()">{{ excluindo ? 'Excluindo…' : 'Excluir conta' }}</button>
                    </div>
                  </div>
                }
              } @else {
                <p class="cfg-hint" style="margin-top:16px">Selecione uma conta acima para editar, ou clique em "Nova conta".</p>
              }
            </section>
          }

        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ── Tabelas de Usuários e Permissões ── */
    .cfg-utable, .cfg-ptable { width: 100%; border-collapse: collapse; font-size: 13px; }
    .cfg-utable th, .cfg-ptable th { text-align: center; font-weight: 600; color: var(--text-2); font-size: 12px; padding: 8px 10px; border-bottom: 1px solid var(--border); white-space: nowrap; }
    .cfg-utable th:first-child, .cfg-utable td:first-child { text-align: left; }
    .cfg-utable td { padding: 10px; border-bottom: 1px solid var(--border); white-space: nowrap; }
    .cfg-utable tbody tr { cursor: pointer; }
    .cfg-utable tbody tr:hover { background: var(--bg-2); }
    .cfg-utable tbody tr.sel { background: var(--accent-soft); }
    .cfg-ptable td { text-align: center; padding: 9px 10px; border-bottom: 1px solid var(--border); }
    .cfg-ptable input[type=checkbox] { width: 17px; height: 17px; cursor: pointer; accent-color: var(--accent); }
    .cfg-badge-adm { margin-left: 8px; font-size: 10.5px; font-weight: 700; padding: 2px 7px; border-radius: 99px; background: var(--accent-soft); color: var(--accent-text); }
    .cfg-badge-dirty { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 99px; background: var(--st-pendente-bg); color: var(--st-pendente); }
  `, `
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

    @media (max-width: 640px) {
      /* Dias de funcionamento: horários descem para a linha de baixo */
      .cfg-dia-row { flex-wrap: wrap; row-gap: 10px; }
      .cfg-dia-toggle { min-width: 0; }
      .cfg-dia-horas { flex: 1 1 100%; padding-left: 52px; }
      .cfg-dia-horas .cfg-time-input { flex: 1; width: auto; min-width: 0; max-width: 130px; }

      /* Notificações: cabeçalho de colunas some; rótulo aparece sob cada toggle */
      .cfg-card-head .cfg-notif-col { display: none; }
      .cfg-notif-row { flex-wrap: wrap; row-gap: 10px; }
      .cfg-notif-info { flex: 1 1 100%; }
      .cfg-notif-row .cfg-notif-col {
        width: auto; flex: 1;
        flex-direction: column; gap: 5px;
      }
      .cfg-notif-row .cfg-notif-col::after {
        content: attr(data-ch);
        font-size: 9.5px; font-weight: 700;
        letter-spacing: 0.05em; text-transform: uppercase;
        color: var(--text-3);
      }

      /* Plano: hero empilha; botão de upgrade em largura total */
      .cfg-plan-hero { flex-wrap: wrap; }
      .cfg-plan-hero .btn { width: 100%; justify-content: center; }

      /* API key: input em linha própria, botões abaixo */
      .cfg-key-row { flex-wrap: wrap; }
      .cfg-key-row .input { flex: 1 1 100%; }

      .cfg-integs { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 420px) {
      .cfg-integs { grid-template-columns: 1fr; }
    }
  `],
})
export class ConfigComponent implements OnInit {
  @Output() notify = new EventEmitter<string>();
  @Output() logout = new EventEmitter<void>();

  // Papéis alinhados ao enum do banco (dono, admin, gerente, profissional, recepcao)
  // via os rótulos que o backend expõe em PAPEL_LABEL. Antes havia "Atendente"
  // (inexistente no schema) e faltavam Profissional/Recepção.
  readonly PAPEL_OPTS: SelectOption[] = [
    { value: 'Dono / Admin', label: 'Dono / Admin' },
    { value: 'Admin',        label: 'Admin' },
    { value: 'Gerente',      label: 'Gerente' },
    { value: 'Profissional', label: 'Profissional' },
    { value: 'Recepção',     label: 'Recepção' },
  ];
  readonly TIPO_ESTAB_OPTS: SelectOption[] = [
    { value: 'Barbearia',          label: 'Barbearia' },
    { value: 'Salão de beleza',    label: 'Salão de beleza' },
    { value: 'Studio de estética', label: 'Studio de estética' },
    { value: 'Clínica',            label: 'Clínica' },
    { value: 'Outro',              label: 'Outro' },
  ];
  readonly INTERVALO_OPTS: SelectOption[] = [
    { value: '15', label: '15 minutos' },
    { value: '30', label: '30 minutos' },
    { value: '45', label: '45 minutos' },
    { value: '60', label: '1 hora' },
  ];
  readonly ANTECEDENCIA_OPTS: SelectOption[] = [
    { value: '1',  label: '1 hora' },
    { value: '2',  label: '2 horas' },
    { value: '4',  label: '4 horas' },
    { value: '24', label: '1 dia' },
    { value: '48', label: '2 dias' },
  ];
  readonly MAXDIAS_OPTS: SelectOption[] = [
    { value: '7',  label: '7 dias' },
    { value: '15', label: '15 dias' },
    { value: '30', label: '30 dias' },
    { value: '60', label: '60 dias' },
    { value: '90', label: '90 dias' },
  ];
  readonly CANCEL_PRAZO_OPTS: SelectOption[] = [
    { value: '0',  label: 'Sem restrição' },
    { value: '2',  label: '2 horas antes' },
    { value: '4',  label: '4 horas antes' },
    { value: '12', label: '12 horas antes' },
    { value: '24', label: '24 horas antes' },
  ];
  readonly PIX_TIPO_OPTS: SelectOption[] = [
    { value: 'CPF/CNPJ',        label: 'CPF/CNPJ' },
    { value: 'Telefone',        label: 'Telefone' },
    { value: 'E-mail',          label: 'E-mail' },
    { value: 'Chave aleatória', label: 'Chave aleatória' },
  ];

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
    { id: 'usuarios',       label: 'Usuários e Permissões', icon: 'team' },
  ];

  /** "Minha conta" é de todos; as abas do estabelecimento exigem config:ver;
   *  Usuários e Permissões é exclusiva dos níveis master e CEO. */
  get tabsVisiveis(): TabDef[] {
    return this.TABS.filter(t => {
      if (t.id === 'conta') return true;
      if (t.id === 'usuarios') return this.auth.isGestor;
      return this.auth.can('config', 'ver');
    });
  }
  get podeEditarConfig(): boolean { return this.auth.can('config', 'editar'); }

  // ---------- Validação (por seção: erros aparecem após a 1ª tentativa de salvar) ----------
  private enviadas = new Set<string>();
  private enviar(secao: string, erros: () => Erros): boolean {
    this.enviadas.add(secao);
    const e = erros();
    if (temErros(e)) { this.toast.error('Corrija os campos destacados.'); return false; }
    return true;
  }

  get errosConta(): Erros {
    if (!this.enviadas.has('conta')) return {};
    const c = this.conta;
    return validar({
      nome: [V.obrigatorio(c.nome, 'Informe seu nome.'), V.tamanho(c.nome, 3, 100)],
      email: [V.obrigatorio(c.email, 'Informe seu e-mail.'),
        String(c.email ?? '').includes('@') ? V.email(c.email) : V.login(c.email)],
    });
  }

  get errosSenha(): Erros {
    if (!this.enviadas.has('senha')) return {};
    return validar({
      atual: [V.obrigatorio(this.senhaAtual, 'Informe sua senha atual.')],
      nova: [V.obrigatorio(this.senhaNova, 'Informe a nova senha.'), V.senha(this.senhaNova),
        V.se(!!this.senhaNova && this.senhaNova === this.senhaAtual, 'A nova senha deve ser diferente da atual.')],
      confirma: [V.obrigatorio(this.senhaConfirma, 'Confirme a nova senha.'),
        V.se(!!this.senhaConfirma && this.senhaConfirma !== this.senhaNova, 'A confirmação não corresponde à nova senha.')],
    });
  }

  get errosEstab(): Erros {
    if (!this.enviadas.has('estab')) return {};
    const e = this.estab;
    const insta = String(e.instagram ?? '').trim().replace(/^@/, '');
    return validar({
      nome: [V.obrigatorio(e.nome, 'Informe o nome do estabelecimento.'), V.tamanho(e.nome, 2, 100)],
      tipo: [V.obrigatorio(e.tipo)],
      doc: [V.cpfCnpj(e.doc)],
      tel: [V.obrigatorio(e.tel, 'Informe o telefone de contato.'), V.telefone(e.tel)],
      end: [V.tamanho(e.end, 0, 255)],
      cidade: [V.tamanho(e.cidade, 0, 80)],
      cep: [V.cep(e.cep)],
      desc: [V.tamanho(e.desc, 0, 500)],
      instagram: [V.se(!!insta && !/^[A-Za-z0-9._]{1,30}$/.test(insta), 'Use só o @ do perfil (letras, números, ponto e _).')],
      google: [V.url(e.google)],
      site: [V.url(e.site)],
    });
  }

  get errosHorarios(): Erros {
    if (!this.enviadas.has('horarios')) return {};
    const campos: Record<string, (string | null)[]> = {};
    for (const d of this.diasFuncionamento) {
      if (!d.aberto) continue;
      campos['dia' + d.diaSemana] = [
        V.obrigatorio(d.inicio, 'Informe a abertura.'), V.hora(d.inicio),
        V.obrigatorio(d.fim, 'Informe o fechamento.'), V.hora(d.fim),
        V.horaDepois(d.fim, d.inicio, 'O fechamento deve ser depois da abertura.'),
      ];
    }
    const abertos = this.diasFuncionamento.filter(d => d.aberto);
    if (this.pausaAtiva) {
      const foraDoExpediente = abertos.some(d => !V.hora(d.inicio) && !V.hora(d.fim) && !V.hora(this.pausaInicio) && !V.hora(this.pausaFim)
        && (this.pausaInicio < d.inicio || this.pausaFim > d.fim));
      campos['pausa'] = [
        V.obrigatorio(this.pausaInicio, 'Informe o início da pausa.'), V.hora(this.pausaInicio),
        V.obrigatorio(this.pausaFim, 'Informe o fim da pausa.'), V.hora(this.pausaFim),
        V.horaDepois(this.pausaFim, this.pausaInicio, 'O fim da pausa deve ser depois do início.'),
        V.se(foraDoExpediente, 'A pausa precisa ficar dentro do horário de funcionamento de todos os dias abertos.'),
      ];
    }
    campos['geral'] = [V.se(!abertos.length, 'Deixe ao menos um dia aberto.')];
    return validar(campos);
  }

  get errosAgenda(): Erros {
    if (!this.enviadas.has('agenda')) return {};
    return validar({
      maxDia: [V.obrigatorio(this.agenda.maxDia), V.numero(this.agenda.maxDia, { min: 1, max: 99, inteiro: true })],
      sinalPct: [V.obrigatorio(this.agenda.sinalPct), V.numero(this.agenda.sinalPct, { min: 0, max: 100, inteiro: true })],
    });
  }

  get pixAtivo(): boolean { return !!this.pagamentos.find(p => p.id === 'pix')?.ativo; }

  get errosPag(): Erros {
    if (!this.enviadas.has('pagamentos')) return {};
    const chave = String(this.pagPix.chave ?? '').trim();
    let regraChave: string | null = null;
    switch (this.pagPix.tipo) {
      case 'CPF/CNPJ': regraChave = V.cpfCnpj(chave); break;
      case 'Telefone': regraChave = V.telefone(chave); break;
      case 'E-mail': regraChave = V.email(chave); break;
      case 'Chave aleatória':
        regraChave = !chave || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chave)
          ? null : 'Chave aleatória inválida (formato 0000aaaa-00aa-00aa-00aa-000000aaaaaa).';
        break;
    }
    return validar({
      metodos: [V.se(!this.pagamentos.some(p => p.ativo), 'Mantenha ao menos uma forma de pagamento ativa.')],
      chave: [this.pixAtivo ? V.obrigatorio(chave, 'Informe a chave Pix (o Pix está ativo).') : null, regraChave],
      nome: [this.pixAtivo ? V.obrigatorio(this.pagPix.nome, 'Informe o nome exibido no Pix.') : null,
        V.tamanho(this.pagPix.nome, 3, 25)],
      taxa: [this.pagCard.repassaTaxa ? V.obrigatorio(this.pagCard.taxa) : null,
        this.pagCard.repassaTaxa ? V.numero(this.pagCard.taxa, { min: 0, max: 10 }) : null],
    });
  }

  /** Nova conta / edição de conta (Usuários e Permissões). */
  usuarioEnviado = false;
  get errosUsuario(): Erros {
    if (!this.usuarioEnviado) return {};
    const f = this.formConta;
    const login = f.email.trim().toLowerCase();
    const loginDup = !!login && this.usuariosLista.some(u => u.id !== this.usuarioSel?.id && u.email.toLowerCase() === login);
    return validar({
      nome: [V.obrigatorio(f.nome, 'Informe o nome.'), V.tamanho(f.nome, 3, 100)],
      email: [V.obrigatorio(f.email, 'Informe o e-mail ou usuário de login.'),
        f.email.includes('@') ? V.email(f.email) : V.login(f.email),
        V.se(loginDup, 'Já existe uma conta com esse login.')],
      senha: [this.criandoConta ? V.obrigatorio(f.senha, 'Defina a senha inicial.') : null,
        this.criandoConta ? V.senha(f.senha) : null],
    });
  }

  // ── Conta ──
  conta = {
    nome: this.data.usuario.nome,
    papel: this.data.usuario.papel,
    email: this.data.usuario.email,
    wpp: '(11) 98800-5544',
  };
  // Campos de segurança (senha atual serve tanto p/ trocar o e-mail quanto a senha).
  senhaAtual = '';
  senhaNova = '';
  senhaConfirma = '';

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
    { diaSemana: 1, dia: 'Segunda-feira',  abrev: 'Seg', aberto: true,  inicio: '09:00', fim: '20:00' },
    { diaSemana: 2, dia: 'Terça-feira',    abrev: 'Ter', aberto: true,  inicio: '09:00', fim: '20:00' },
    { diaSemana: 3, dia: 'Quarta-feira',   abrev: 'Qua', aberto: true,  inicio: '09:00', fim: '20:00' },
    { diaSemana: 4, dia: 'Quinta-feira',   abrev: 'Qui', aberto: true,  inicio: '09:00', fim: '20:00' },
    { diaSemana: 5, dia: 'Sexta-feira',    abrev: 'Sex', aberto: true,  inicio: '09:00', fim: '20:00' },
    { diaSemana: 6, dia: 'Sábado',         abrev: 'Sáb', aberto: true,  inicio: '09:00', fim: '18:00' },
    { diaSemana: 0, dia: 'Domingo',        abrev: 'Dom', aberto: false, inicio: '10:00', fim: '16:00' },
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

  constructor(public data: DataService, private toast: ToastService, public auth: AuthService) {}

  // ---------- Estado da tela "Usuários e Permissões" (master e CEO) ----------
  usuariosLista: UsuarioAdmin[] = [];
  catalogo: PermCatalogoItem[] = [];
  acoesLabels: Record<string, string> = {};
  buscaUsuario = '';
  usuarioSel: UsuarioAdmin | null = null;
  permsSel = new Set<string>();          // permissões em edição
  private permsOriginal = new Set<string>();
  ativoSel = true;
  private ativoOriginal = true;
  carregandoUsuarios = false;
  carregandoPerms = false;
  salvandoPerms = false;
  criandoConta = false;                    // formulário de "Nova conta" aberto
  papelOpts: SelectOption[] = [];
  nivelOpts: SelectOption[] = [];
  formConta = { nome: '', email: '', papel: 'profissional', nivel: 'usuario', senha: '' };
  private formOriginal = { nome: '', email: '', papel: '', nivel: '' };
  novaSenhaSel = '';
  salvandoSenha = false;
  excluindo = false;

  nivelLabel(n: string): string { return NIVEL_LABEL[n as Nivel] || n; }

  get usuariosFiltrados(): UsuarioAdmin[] {
    const q = this.buscaUsuario.trim().toLowerCase();
    if (!q) return this.usuariosLista;
    return this.usuariosLista.filter(u =>
      u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.papel.toLowerCase().includes(q));
  }

  /** Troca de aba; ao entrar em "Usuários" dispara o carregamento. */
  irTab(id: Tab) {
    if (id === 'usuarios') { this.abrirUsuarios(); return; }
    this.tab = id;
  }

  /** Carrega contas + catálogo ao abrir a aba (uma vez). Só para master e CEO. */
  async abrirUsuarios(forcar = false) {
    this.tab = 'usuarios';
    if (!this.auth.isGestor) return;
    if (!forcar && this.catalogo.length && this.usuariosLista.length) return;
    this.carregandoUsuarios = true;
    try {
      const [cat, lista] = await Promise.all([this.data.catalogoPermissoes(), this.data.listarUsuarios()]);
      this.catalogo = cat.catalogo; this.acoesLabels = cat.acoes;
      this.usuariosLista = lista.usuarios;
      this.papelOpts = lista.papeis;
      this.nivelOpts = lista.niveis;
    } catch (e: any) {
      this.toast.error(e?.error?.error || 'Não foi possível carregar os usuários.');
    } finally {
      this.carregandoUsuarios = false;
    }
  }

  /** Abre o formulário de nova conta (sem permissões marcadas). */
  novaConta() {
    this.usuarioSel = null;
    this.criandoConta = true;
    this.formConta = { nome: '', email: '', papel: 'recepcao', nivel: 'usuario', senha: '' };
    this.permsSel = new Set(); this.permsOriginal = new Set();
    this.ativoSel = this.ativoOriginal = true;
    this.usuarioEnviado = false;
  }

  fecharConta() {
    this.criandoConta = false;
    this.usuarioSel = null;
    this.usuarioEnviado = false;
  }

  async criarConta() {
    if (this.salvandoPerms) return;
    const f = this.formConta;
    this.usuarioEnviado = true;
    if (temErros(this.errosUsuario)) { this.toast.error('Corrija os campos destacados.'); return; }
    this.salvandoPerms = true;
    try {
      const u = await this.data.criarUsuario({
        nome: f.nome.trim(), email: f.email.trim(), senha: f.senha, papel: f.papel, nivel: f.nivel,
        permissoes: f.nivel === 'usuario' ? [...this.permsSel] : [],
      });
      if (!this.ativoSel) await this.data.atualizarUsuario(u.id, { ativo: false });
      this.toast.show(`Conta de ${u.nome} criada.`);
      this.criandoConta = false;
      await this.abrirUsuarios(true);
      const nova = this.usuariosLista.find(x => x.id === u.id);
      if (nova) await this.selecionarUsuario(nova);
    } catch (e: any) {
      this.toast.error(e?.error?.error || 'Não foi possível criar a conta.');
    } finally {
      this.salvandoPerms = false;
    }
  }

  /** Seleciona uma conta e carrega seus dados e permissões atuais. */
  async selecionarUsuario(u: UsuarioAdmin) {
    if (u.id === this.auth.usuario?.id) { this.toast.show('Sua própria conta é editada em Minha conta.'); return; }
    if (!u.gerenciavel) { this.toast.show('Você não pode alterar esta conta.'); return; }
    this.criandoConta = false;
    this.usuarioSel = u;
    this.usuarioEnviado = false;
    this.novaSenhaSel = '';
    this.formConta = { nome: u.nome, email: u.email, papel: u.papelCod, nivel: u.nivel, senha: '' };
    this.formOriginal = { nome: u.nome, email: u.email, papel: u.papelCod, nivel: u.nivel };
    this.carregandoPerms = true;
    this.permsSel = new Set(); this.permsOriginal = new Set();
    try {
      const perms = await this.data.permissoesDoUsuario(u.id);
      this.permsSel = new Set(perms);
      this.permsOriginal = new Set(perms);
      this.ativoSel = u.ativo; this.ativoOriginal = u.ativo;
    } catch (e: any) {
      this.toast.error(e?.error?.error || 'Não foi possível carregar as permissões.');
      this.usuarioSel = null;
    } finally {
      this.carregandoPerms = false;
    }
  }

  readonly acoesOrdem = ['ver', 'criar', 'editar', 'excluir', 'exportar'];
  /** Só exibe a coluna de uma ação se algum módulo do catálogo a utiliza. */
  algumModuloTem(acao: string): boolean { return this.catalogo.some(m => m.acoes.includes(acao)); }

  temPerm(modulo: string, acao: string): boolean { return this.permsSel.has(`${modulo}:${acao}`); }

  togglePerm(modulo: string, acao: string) {
    const key = `${modulo}:${acao}`;
    if (this.permsSel.has(key)) {
      this.permsSel.delete(key);
      // desmarcar "ver" remove as demais ações do módulo (não faz sentido criar sem ver)
      if (acao === 'ver') {
        const mod = this.catalogo.find(m => m.modulo === modulo);
        mod?.acoes.forEach(a => this.permsSel.delete(`${modulo}:${a}`));
      }
    } else {
      this.permsSel.add(key);
      if (acao !== 'ver') this.permsSel.add(`${modulo}:ver`);   // qualquer ação implica poder ver
    }
  }

  marcarTodas() {
    this.permsSel = new Set(this.catalogo.flatMap(m => m.acoes.map(a => `${m.modulo}:${a}`)));
  }
  limparPerms() { this.permsSel = new Set(); }

  private get dadosAlterados(): boolean {
    const f = this.formConta, o = this.formOriginal;
    return f.nome.trim() !== o.nome || f.email.trim() !== o.email || f.papel !== o.papel || f.nivel !== o.nivel;
  }

  get permsAlteradas(): boolean {
    if (this.dadosAlterados) return true;
    if (this.ativoSel !== this.ativoOriginal) return true;
    if (this.permsSel.size !== this.permsOriginal.size) return true;
    for (const p of this.permsSel) if (!this.permsOriginal.has(p)) return true;
    return false;
  }

  /** Grava dados da conta (se mudaram) + permissões + status. */
  async salvarPerms() {
    if (!this.usuarioSel || !this.permsAlteradas || this.salvandoPerms) return;
    this.usuarioEnviado = true;
    if (temErros(this.errosUsuario)) { this.toast.error('Corrija os campos destacados.'); return; }
    this.salvandoPerms = true;
    const id = this.usuarioSel.id;
    try {
      if (this.dadosAlterados) {
        const f = this.formConta;
        const u = await this.data.atualizarUsuario(id, { nome: f.nome.trim(), email: f.email.trim(), papel: f.papel, nivel: f.nivel });
        this.formOriginal = { nome: u.nome, email: u.email, papel: u.papelCod, nivel: u.nivel };
        const alvo = this.usuariosLista.find(x => x.id === id);
        if (alvo) Object.assign(alvo, u);
      }
      // CEO tem acesso total: permissões granulares só valem para o nível 'usuario'
      if (this.formConta.nivel !== 'usuario') this.permsSel = new Set();
      await this.data.salvarPermissoesUsuario(id, [...this.permsSel], this.ativoSel);
      this.permsOriginal = new Set(this.permsSel);
      this.ativoOriginal = this.ativoSel;
      const alvo = this.usuariosLista.find(u => u.id === id);
      if (alvo) alvo.ativo = this.ativoSel;
      this.toast.show('Conta atualizada.');
    } catch (e: any) {
      this.toast.error(e?.error?.error || 'Não foi possível salvar as alterações.');
    } finally {
      this.salvandoPerms = false;
    }
  }

  cancelarPerms() {
    this.permsSel = new Set(this.permsOriginal);
    this.ativoSel = this.ativoOriginal;
    this.formConta = { ...this.formOriginal, senha: '' };
  }

  async redefinirSenha() {
    if (!this.usuarioSel || this.salvandoSenha) return;
    const erroSenha = V.obrigatorio(this.novaSenhaSel, 'Informe a nova senha.') || V.senha(this.novaSenhaSel);
    if (erroSenha) { this.toast.error(erroSenha); return; }
    this.salvandoSenha = true;
    try {
      await this.data.redefinirSenhaUsuario(this.usuarioSel.id, this.novaSenhaSel);
      this.novaSenhaSel = '';
      this.toast.show(`Senha de ${this.usuarioSel.nome} redefinida.`);
    } catch (e: any) {
      this.toast.error(e?.error?.error || 'Não foi possível redefinir a senha.');
    } finally {
      this.salvandoSenha = false;
    }
  }

  /** Exclui a conta selecionada (com confirmação). */
  async excluirConta() {
    const u = this.usuarioSel;
    if (!u || this.excluindo) return;
    if (!confirm(`Excluir a conta de ${u.nome} (${u.email})? Esta ação não pode ser desfeita.`)) return;
    this.excluindo = true;
    try {
      await this.data.excluirUsuario(u.id);
      this.usuariosLista = this.usuariosLista.filter(x => x.id !== u.id);
      this.usuarioSel = null;
      this.toast.show(`Conta de ${u.nome} excluída.`);
    } catch (e: any) {
      this.toast.error(e?.error?.error || 'Não foi possível excluir a conta.');
    } finally {
      this.excluindo = false;
    }
  }


  round = Math.round;

  ngOnInit() {
    // Hidrata os formulários a partir do banco (quando disponível); senão mantém o mock.
    const e: any = this.data.estabelecimento;
    if (e.nome) this.estab.nome = e.nome;
    if (e.tipo_negocio) this.estab.tipo = e.tipo_negocio;
    if (e.documento) this.estab.doc = e.documento;
    if (e.telefone) this.estab.tel = e.telefone;
    if (e.endereco) this.estab.end = e.endereco;
    if (e.cidade) this.estab.cidade = e.cidade;
    if (e.cep) this.estab.cep = e.cep;
    if (e.descricao) this.estab.desc = e.descricao;
    if (e.instagram) this.estab.instagram = e.instagram;
    if (e.google_perfil) this.estab.google = e.google_perfil;
    if (e.site) this.estab.site = e.site;
    this.conta.nome = this.data.usuario.nome;
    this.conta.papel = this.data.usuario.papel;
    this.conta.email = this.data.usuario.email;
    // Políticas de agenda persistidas no estabelecimento (antecedência/cancelamento/sinal).
    if (e.antecedencia_min_agendamento_horas != null) this.agenda.antecedencia = String(e.antecedencia_min_agendamento_horas);
    if (e.antecedencia_min_cancelamento_horas != null) this.agenda.cancelamentoPrazo = String(e.antecedencia_min_cancelamento_horas);
    if (e.sinal_valor != null) this.agenda.sinalPct = Number(e.sinal_valor);
    // Pagamentos (métodos aceitos, chave Pix, taxa de cartão).
    const setPag = (id: string, v: boolean) => { const p = this.pagamentos.find(x => x.id === id); if (p) p.ativo = v; };
    if (e.aceita_pix != null) setPag('pix', !!e.aceita_pix);
    if (e.aceita_debito != null) setPag('debito', !!e.aceita_debito);
    if (e.aceita_credito != null) setPag('credito', !!e.aceita_credito);
    if (e.aceita_dinheiro != null) setPag('dinheiro', !!e.aceita_dinheiro);
    if (e.aceita_fiado != null) setPag('fiado', !!e.aceita_fiado);
    if (e.pix_tipo != null) this.pagPix.tipo = e.pix_tipo;
    if (e.pix_chave != null) this.pagPix.chave = e.pix_chave;
    if (e.pix_nome != null) this.pagPix.nome = e.pix_nome;
    if (e.repassa_taxa_cartao != null) this.pagCard.repassaTaxa = !!e.repassa_taxa_cartao;
    if (e.taxa_cartao_pct != null) this.pagCard.taxa = Number(e.taxa_cartao_pct);

    if (this.data.expediente?.length) {
      const ordem = [1, 2, 3, 4, 5, 6, 0];
      this.diasFuncionamento = ordem
        .map(ds => this.data.expediente.find(h => h.diaSemana === ds))
        .filter((h): h is NonNullable<typeof h> => !!h)
        .map(h => ({ diaSemana: h.diaSemana, dia: h.dia, abrev: h.abrev, aberto: h.aberto, inicio: h.inicio, fim: h.fim }));
      const comPausa = this.data.expediente.find(h => h.pausaInicio);
      if (comPausa) { this.pausaAtiva = true; this.pausaInicio = comPausa.pausaInicio!; this.pausaFim = comPausa.pausaFim!; }
      else this.pausaAtiva = false;
    }
  }

  save(section: string) {
    const erros: Record<string, () => Erros> = {
      estab: () => this.errosEstab, horarios: () => this.errosHorarios,
      agenda: () => this.errosAgenda, pagamentos: () => this.errosPag,
    };
    if (erros[section] && !this.enviar(section, erros[section])) return;
    if (section === 'estab') {
      this.data.updateEstabelecimento({
        nome: this.estab.nome, tipo: this.estab.tipo, doc: this.estab.doc, tel: this.estab.tel,
        end: this.estab.end, cidade: this.estab.cidade, cep: this.estab.cep, desc: this.estab.desc,
        instagram: this.estab.instagram, google: this.estab.google, site: this.estab.site,
      });
    } else if (section === 'horarios') {
      const dias = this.diasFuncionamento.map(d => ({
        diaSemana: d.diaSemana, aberto: d.aberto, inicio: d.inicio, fim: d.fim,
        pausaInicio: this.pausaAtiva && d.aberto ? this.pausaInicio : null,
        pausaFim: this.pausaAtiva && d.aberto ? this.pausaFim : null,
      }));
      this.data.updateHorarios(dias);
    } else if (section === 'agenda') {
      this.data.updatePoliticasAgenda({
        antecedenciaAgendamento: Number(this.agenda.antecedencia) || 0,
        antecedenciaCancelamento: Number(this.agenda.cancelamentoPrazo) || 0,
        sinalPct: Number(this.agenda.sinalPct) || 0,
      });
    } else if (section === 'pagamentos') {
      const ativo = (id: string) => this.pagamentos.find(p => p.id === id)?.ativo ?? false;
      this.data.updatePagamentos({
        aceitaPix: ativo('pix'), aceitaDebito: ativo('debito'), aceitaCredito: ativo('credito'),
        aceitaDinheiro: ativo('dinheiro'), aceitaFiado: ativo('fiado'),
        pixTipo: this.pagPix.tipo, pixChave: this.pagPix.chave, pixNome: this.pagPix.nome,
        repassaTaxa: this.pagCard.repassaTaxa, taxaPct: Number(this.pagCard.taxa) || 0,
      });
    }
    this.notify.emit('Alterações salvas com sucesso!');
  }

  /** Salva nome e e-mail da conta. Trocar o e-mail exige a senha atual (campo Segurança). */
  async salvarConta() {
    if (!this.enviar('conta', () => this.errosConta)) return;
    const nome = this.conta.nome.trim();
    const email = this.conta.email.trim();
    const emailMudou = email.toLowerCase() !== (this.data.usuario.email || '').toLowerCase();
    if (emailMudou && !this.senhaAtual) {
      this.toast.error('Para alterar o e-mail, confirme sua senha atual (seção Segurança).');
      return;
    }
    try {
      await this.data.updateConta({ nome, email }, emailMudou ? this.senhaAtual : undefined);
      this.conta.papel = this.data.usuario.papel;
      if (emailMudou) this.senhaAtual = '';
      this.toast.show('Dados da conta salvos.');
    } catch (e: any) {
      this.toast.error(e?.error?.error || 'Não foi possível salvar a conta.');
    }
  }

  /** Troca a senha: valida confirmação e tamanho mínimo; o backend verifica a senha atual. */
  async salvarSenha() {
    if (!this.enviar('senha', () => this.errosSenha)) return;
    try {
      await this.data.alterarSenha(this.senhaAtual, this.senhaNova);
      this.senhaAtual = this.senhaNova = this.senhaConfirma = '';
      this.enviadas.delete('senha');
      this.toast.show('Senha alterada com sucesso.');
    } catch (e: any) {
      this.toast.error(e?.error?.error || 'Não foi possível alterar a senha.');
    }
  }

  /** Integração com WhatsApp ainda não implementada (recurso futuro). */
  whatsappEmBreve() {
    this.toast.show('Integração com WhatsApp em desenvolvimento.');
  }
}
