import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../icon.component';
import { AvatarComponent } from '../shared/avatar.component';
import { ModalComponent } from '../shared/modal.component';
import { SelectComponent, SelectOption } from '../shared/select.component';
import { DataService, Campanha, Modelo } from '../data.service';

interface GatilhoConfig {
  key: string; label: string; desc: string; modulo: string; disparo: string;
  variaveis: { key: string; label: string; exemplo: string }[];
  canais: string[];
}

const STATUS_CAMP: { [k: string]: { label: string; cls: string } } = {
  ativa:    { label: 'Ativa',     cls: 'pill-confirmado'  },
  agendada: { label: 'Agendada',  cls: 'pill-atendimento' },
  rascunho: { label: 'Rascunho',  cls: 'pill-concluido'   },
};

@Component({
  selector: 'app-fidelidade',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, AvatarComponent, ModalComponent, SelectComponent],
  template: `
<div class="page">

  <!-- Tab bar -->
  <div class="row" style="margin-bottom:16px;gap:10px;flex-wrap:wrap">
    <div class="seg">
      @for (t of tabs; track t[0]) {
        <button [class.on]="tab === t[0]" (click)="tab = t[0]">{{ t[1] }}</button>
      }
    </div>
  </div>

  <!-- ===== TAB: PROGRAMA ===== -->
  @if (tab === 'programa') {
    <div class="grid-2" style="align-items:stretch">

      <!-- Configuração da regra -->
      <div class="card" style="display:flex;flex-direction:column">
        <div class="card-head">
          <app-icon name="gift" [size]="17" style="color:var(--text-2)"></app-icon>
          <div class="card-title">Regra do programa</div>
        </div>
        <div style="padding:18px;display:flex;flex-direction:column;gap:18px;flex:1">

          <div class="field">
            <label>Tipo de recompensa</label>
            <div class="row" style="gap:10px">
              @for (o of tipoOpcoes; track o[0]) {
                <button
                  (click)="tipo = o[0]"
                  [style.flex]="1"
                  [style.display]="'flex'"
                  [style.align-items]="'center'"
                  [style.gap.px]="9"
                  [style.padding]="'12px 14px'"
                  [style.border-radius]="'var(--r-md)'"
                  [style.border]="'1px solid ' + (tipo === o[0] ? 'var(--accent)' : 'var(--border-strong)')"
                  [style.background]="tipo === o[0] ? 'var(--accent-soft)' : 'var(--surface)'">
                  <div
                    [style.width.px]="30"
                    [style.height.px]="30"
                    [style.border-radius.px]="8"
                    [style.background]="tipo === o[0] ? 'var(--accent)' : 'var(--surface-2)'"
                    style="display:grid;place-items:center">
                    <app-icon
                      [name]="o[2]"
                      [size]="15"
                      [style.color]="tipo === o[0] ? '#fff' : 'var(--text-2)'"
                      [fill]="o[0] === 'pontos' && tipo === o[0]">
                    </app-icon>
                  </div>
                  <span [style.font-weight]="600" [style.font-size.px]="14" [style.color]="tipo === o[0] ? 'var(--accent-text)' : 'var(--text)'">{{ o[1] }}</span>
                </button>
              }
            </div>
          </div>

          @if (tipo === 'pontos') {
            <div class="row" style="gap:14px;align-items:flex-end">
              <div class="field" style="flex:1">
                <label>A cada quantos cortes</label>
                <div class="row" style="gap:8px">
                  <button class="btn btn-ghost btn-icon-only" (click)="meta = meta > 1 ? meta - 1 : 1">
                    <app-icon name="x" [size]="14"></app-icon>
                  </button>
                  <div class="tnum" style="flex:1;text-align:center;font-weight:800;font-size:24px">{{ meta }}</div>
                  <button class="btn btn-ghost btn-icon-only" (click)="meta = meta + 1">
                    <app-icon name="plus" [size]="14"></app-icon>
                  </button>
                </div>
              </div>
              <div style="font-size:22px;color:var(--text-3);padding-bottom:8px">→</div>
              <div class="field" style="flex:1.4">
                <label>Recompensa</label>
                <input class="input" [value]="data.fidelidade.recompensa">
              </div>
            </div>
          } @else {
            <div class="field">
              <label>Percentual de cashback</label>
              <div class="row" style="gap:8px">
                <input class="input" type="number" [value]="data.fidelidade.cashbackPct" style="width:90px">
                <span class="muted" style="font-size:14px">% do valor vira saldo para o próximo atendimento</span>
              </div>
            </div>
          }

          <div style="background:var(--accent-soft);border-radius:var(--r-md);padding:14px;display:flex;gap:11px;align-items:center">
            <app-icon name="sparkle" [size]="18" style="color:var(--accent)"></app-icon>
            @if (tipo === 'pontos') {
              <span style="font-size:13.5px;color:var(--accent-text);font-weight:500">A cada {{ meta }} cortes pagos, o cliente ganha: {{ data.fidelidade.recompensa }}.</span>
            } @else {
              <span style="font-size:13.5px;color:var(--accent-text);font-weight:500">O cliente acumula {{ data.fidelidade.cashbackPct }}% de cada atendimento como saldo.</span>
            }
          </div>

          <button class="btn btn-primary" (click)="notify.emit('Regra do programa salva')">
            <app-icon name="check" [size]="16"></app-icon>
            Salvar regra
          </button>

        </div>
      </div>

      <!-- Métricas do programa -->
      <div class="col" style="gap:14px">

        <div class="stat-grid" style="grid-template-columns:1fr 1fr">
          <div class="stat">
            <div class="stat-top">
              <div class="stat-label">Clientes no programa</div>
              <div class="stat-ico" style="background:var(--accent-soft)">
                <app-icon name="users" [size]="16" style="color:var(--accent)"></app-icon>
              </div>
            </div>
            <div class="stat-val tnum">{{ clientesAtivos }}</div>
          </div>
          <div class="stat">
            <div class="stat-top">
              <div class="stat-label">Taxa de retenção</div>
              <div class="stat-ico" style="background:var(--st-atendimento-bg)">
                <app-icon name="chart" [size]="16" style="color:var(--st-atendimento)"></app-icon>
              </div>
            </div>
            <div class="stat-val tnum">{{ data.taxaRetorno() }}%</div>
          </div>
          <div class="stat">
            <div class="stat-top">
              <div class="stat-label">Em risco de sumir</div>
              <div class="stat-ico" style="background:var(--st-faltou-bg)">
                <app-icon name="history" [size]="16" style="color:var(--st-faltou)"></app-icon>
              </div>
            </div>
            <div class="stat-val tnum">{{ emRisco.length }}</div>
          </div>
          <div class="stat">
            <div class="stat-top">
              <div class="stat-label">Próx. do prêmio</div>
              <div class="stat-ico" style="background:var(--accent-soft)">
                <app-icon name="target" [size]="16" style="color:var(--accent)"></app-icon>
              </div>
            </div>
            <div class="stat-val tnum">{{ quaseLa.length }}</div>
          </div>
        </div>

        <div class="card card-pad">
          <div style="font-weight:700;font-size:14px;margin-bottom:12px">Quase lá — clientes perto de uma recompensa</div>
          @for (item of quaseLa; track item[0]) {
            <div class="row" style="gap:11px;padding:8px 0">
              <app-avatar [nome]="data.cli(item[0]).nome" cor="#0e9f6e" [size]="30"></app-avatar>
              <span style="font-weight:600;font-size:13.5px;flex:1">{{ data.cli(item[0]).nome }}</span>
              <div class="progress" style="width:90px">
                <span [style.width]="(item[1] / meta * 100) + '%'"></span>
              </div>
              <span class="mono" style="font-size:12.5px;font-weight:600;width:38px;text-align:right">{{ item[1] }}/{{ meta }}</span>
              <button class="btn btn-whatsapp btn-sm">
                <app-icon name="whatsapp" [size]="14"></app-icon>
                Avisar
              </button>
            </div>
          }
        </div>

      </div>
    </div>

    <!-- Clientes em risco + Top LTV -->
    <div class="grid-2" style="align-items:stretch;margin-top:14px">

      <div class="card card-pad">
        <div class="row" style="gap:8px;margin-bottom:12px;align-items:center">
          <app-icon name="history" [size]="16" style="color:var(--st-faltou)"></app-icon>
          <div style="font-weight:700;font-size:14px">Clientes em risco de sumir</div>
        </div>
        @if (emRisco.length === 0) {
          <div class="muted" style="font-size:13.5px;padding:6px 0">Nenhum cliente em risco no momento.</div>
        }
        @for (c of emRisco; track c.id; let last = $last) {
          <div class="row" style="gap:10px;padding:9px 0" [style.border-bottom]="!last ? '1px solid var(--border)' : 'none'">
            <app-avatar [nome]="c.nome" cor="var(--st-faltou)" [size]="32"></app-avatar>
            <div class="col" style="flex:1;line-height:1.3">
              <span style="font-weight:600;font-size:13.5px">{{ c.nome }}</span>
              <span class="muted" style="font-size:12px">{{ data.diasDesde(c.ultima) }} dias sem visitar · {{ data.money(c.total) }} no total</span>
            </div>
            <button class="btn btn-whatsapp btn-sm" (click)="notify.emit('WhatsApp para ' + c.nome)">
              <app-icon name="whatsapp" [size]="14"></app-icon>
              Contatar
            </button>
          </div>
        }
      </div>

      <div class="card card-pad">
        <div style="font-weight:700;font-size:14px;margin-bottom:12px">Top clientes por faturamento</div>
        @for (c of topLtv; track c.id; let i = $index; let last = $last) {
          <div class="row" style="gap:10px;padding:9px 0" [style.border-bottom]="!last ? '1px solid var(--border)' : 'none'">
            <span class="tnum" style="width:22px;text-align:center;font-size:12.5px;color:var(--text-3);font-weight:700">#{{ i + 1 }}</span>
            <app-avatar [nome]="c.nome" cor="#0e9f6e" [size]="30"></app-avatar>
            <span style="font-weight:600;font-size:13.5px;flex:1">{{ c.nome }}</span>
            <div class="col" style="align-items:flex-end;line-height:1.3">
              <span class="tnum" style="font-weight:700;font-size:13.5px">{{ data.money(c.total) }}</span>
              <span class="muted" style="font-size:11.5px">{{ c.visitas }} visitas</span>
            </div>
          </div>
        }
      </div>

    </div>
  }

  <!-- ===== TAB: CAMPANHAS ===== -->
  @if (tab === 'campanhas') {
    <div class="col" style="gap:16px">

      <!-- Cabeçalho -->
      <div class="row" style="gap:12px;flex-wrap:wrap;align-items:flex-start">
        <div class="col" style="line-height:1.3">
          <div style="font-weight:700;font-size:15px">Campanhas via WhatsApp</div>
          <div class="muted" style="font-size:13px">Dispare mensagens segmentadas por tag, retorno ou aniversário.</div>
        </div>
        <button class="btn btn-primary btn-sm" style="margin-left:auto" (click)="openNovaCampanha()">
          <app-icon name="plus" [size]="15"></app-icon>
          Nova campanha
        </button>
      </div>

      <!-- Banner de recomendação -->
      @if (emRisco.length > 0) {
        <div style="background:var(--st-faltou-bg);border:1px solid var(--st-faltou);border-radius:var(--r-md);padding:13px 16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <app-icon name="history" [size]="18" style="color:var(--st-faltou);flex-shrink:0"></app-icon>
          <span style="font-size:13.5px;color:var(--text);flex:1;min-width:160px">
            <strong>{{ emRisco.length }} cliente{{ emRisco.length > 1 ? 's' : '' }}</strong> em risco de sumir. Uma campanha de reativação pode trazê-los de volta.
          </span>
          <button class="btn btn-sm" style="flex-shrink:0;border-color:var(--st-faltou);color:var(--st-faltou)" (click)="openCampanhaRecomendada()">
            Criar campanha de reativação
          </button>
        </div>
      }

      <!-- Cards -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%, 330px),1fr));gap:14px">
        @for (c of data.campanhas; track c.id) {
          <div class="card" style="padding:16px;display:flex;flex-direction:column;gap:13px">

            <div class="row" style="gap:11px;align-items:flex-start">
              <div style="width:38px;height:38px;border-radius:10px;background:var(--surface-2);display:grid;place-items:center;flex-shrink:0">
                <app-icon
                  [name]="TIPOS_CAMP_MAP[c.tipo]?.icon ?? 'sparkle'"
                  [size]="18"
                  [style.color]="c.cor">
                </app-icon>
              </div>
              <div class="col" style="flex:1;line-height:1.3">
                <span style="font-weight:700;font-size:14.5px">{{ c.nome }}</span>
                <span class="muted" style="font-size:12.5px">{{ c.alvo }} · {{ c.publico }} clientes</span>
              </div>
              <span [class]="'pill ' + statusCamp(c.status).cls">
                <span class="pdot"></span>
                {{ statusCamp(c.status).label }}
              </span>
            </div>

            <div class="row" style="gap:0;border:1px solid var(--border);border-radius:var(--r-md);overflow:hidden">
              <div class="col" style="flex:1;padding:9px 12px;align-items:center">
                <span class="tnum" style="font-weight:700;font-size:16px">{{ c.enviadas }}</span>
                <span class="muted" style="font-size:11px">Enviadas</span>
              </div>
              <div class="col" style="flex:1;padding:9px 12px;border-left:1px solid var(--border);align-items:center">
                <span class="tnum" style="font-weight:700;font-size:16px">{{ c.retorno }}</span>
                <span class="muted" style="font-size:11px">Retornos</span>
              </div>
              <div class="col" style="flex:1;padding:9px 12px;border-left:1px solid var(--border);align-items:center">
                <span class="tnum" [style.font-weight]="700" [style.font-size.px]="16" [style.color]="calcConversao(c) > 0 ? 'var(--accent-text)' : 'var(--text)'">{{ calcConversao(c) }}%</span>
                <span class="muted" style="font-size:11px">Conversão</span>
              </div>
            </div>

            <div class="row" style="gap:8px;margin-top:auto">
              @if (c.status === 'rascunho') {
                <button class="btn btn-whatsapp btn-sm" style="flex:1" (click)="dispararCampanha(c)">
                  <app-icon name="whatsapp" [size]="14"></app-icon>
                  Disparar
                </button>
              } @else {
                <button class="btn btn-ghost btn-sm" style="flex:1" (click)="resultModal = c">
                  <app-icon name="chart" [size]="14"></app-icon>
                  Ver resultados
                </button>
              }
              <button class="btn btn-ghost btn-sm btn-icon-only" (click)="openEditarCampanha(c)">
                <app-icon name="edit" [size]="15"></app-icon>
              </button>
            </div>

          </div>
        }
      </div>

    </div>
  }

  <!-- ===== TAB: MODELOS ===== -->
  @if (tab === 'modelos') {
    <div class="col" style="gap:14px">

      <!-- Header -->
      <div class="row" style="gap:12px;flex-wrap:wrap;align-items:flex-start">
        <div class="col" style="line-height:1.3">
          <div style="font-weight:700;font-size:15px">Modelos de mensagem</div>
          <div class="muted" style="font-size:13px">Modelos reutilizáveis conectados a gatilhos do sistema.</div>
        </div>
        <button class="btn btn-primary btn-sm" style="margin-left:auto" (click)="openNovoModelo()">
          <app-icon name="plus" [size]="15"></app-icon>
          Novo modelo
        </button>
      </div>

      <!-- Filtros -->
      <div class="row" style="gap:8px;flex-wrap:wrap">
        <div style="flex:1;min-width:160px">
          <app-select [(ngModel)]="filtroGatilho" [options]="filtroGatilhoOptions"></app-select>
        </div>
        <div style="flex:1;min-width:130px">
          <app-select [(ngModel)]="filtroCanal" [options]="filtroCanalOptions"></app-select>
        </div>
        <div style="flex:1;min-width:130px">
          <app-select [(ngModel)]="filtroStatus" [options]="FILTRO_STATUS_OPTS"></app-select>
        </div>
        @if (filtroGatilho || filtroCanal || filtroStatus) {
          <button class="btn btn-ghost btn-sm" (click)="limparFiltros()">
            <app-icon name="x" [size]="14"></app-icon>
            Limpar
          </button>
        }
      </div>

      <!-- Cards -->
      <div class="grid-2">
        @for (m of modelosFiltrados; track m.id) {
          <div class="card" style="padding:16px;display:flex;flex-direction:column;gap:10px" [style.opacity]="m.status === 'inativo' ? '0.55' : '1'">

            <div class="row" style="gap:10px;align-items:flex-start">
              <div class="col" style="flex:1;line-height:1.3">
                <span style="font-weight:700;font-size:14.5px">{{ m.nome }}</span>
                <span class="muted" style="font-size:12px">{{ m.desc }}</span>
              </div>
              <span [class]="'pill ' + statusModeloCls(m.status)" style="flex-shrink:0">
                <span class="pdot"></span>{{ statusModeloLabel(m.status) }}
              </span>
            </div>

            <div class="row" style="gap:5px;flex-wrap:wrap">
              <span class="tag" style="font-size:11.5px;display:flex;align-items:center;gap:5px">
                <app-icon [name]="canalIcon(m.canal)" [size]="12"></app-icon>
                {{ canalLabel(m.canal) }}
              </span>
              <span class="tag" style="font-size:11.5px">{{ gatilhoLabel(m.gatilho) }}</span>
              @if (m.cat) { <span class="tag" style="font-size:11.5px">{{ m.cat }}</span> }
            </div>

            <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);border-top-left-radius:3px;padding:10px 12px;font-size:12.5px;color:var(--text-2);line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">{{ m.texto }}</div>

            <div class="row" style="gap:6px;margin-top:auto">
              <button class="btn btn-subtle btn-sm" (click)="openEditarModelo(m)">
                <app-icon name="edit" [size]="13"></app-icon>
                Editar
              </button>
              <button class="btn btn-ghost btn-sm" (click)="duplicarModelo(m)">Duplicar</button>
              <button class="btn btn-ghost btn-sm" style="margin-left:auto" (click)="toggleModeloStatus(m)">
                {{ m.status === 'ativo' ? 'Inativar' : 'Ativar' }}
              </button>
              <button class="btn btn-ghost btn-sm btn-icon-only" style="color:var(--st-faltou)" (click)="excluirModelo(m)">
                <app-icon name="trash" [size]="14"></app-icon>
              </button>
            </div>

          </div>
        }
      </div>

      @if (modelosFiltrados.length === 0) {
        <div style="padding:32px;text-align:center;color:var(--text-3);font-size:13.5px">Nenhum modelo encontrado com os filtros selecionados.</div>
      }

    </div>
  }

</div>

<!-- ===== MODAL MODELO ===== -->
@if (modeloModal) {
  <app-modal [title]="modeloModal === 'novo' ? 'Novo modelo' : 'Editar modelo'" [wide]="true" (close)="fecharModeloModal()">

    <div style="display:flex;flex-direction:column;gap:15px">

      <!-- Nome + Categoria -->
      <div class="row" style="gap:12px;flex-wrap:wrap">
        <div class="field" style="flex:2;min-width:180px">
          <label>Nome do modelo *</label>
          <input class="input" [(ngModel)]="draftModelo.nome" placeholder="Ex: Lembrete de agendamento">
          @if (modeloErros['nome']) { <span style="font-size:12px;color:var(--st-faltou)">{{ modeloErros['nome'] }}</span> }
        </div>
        <div class="field" style="flex:1;min-width:120px">
          <label>Categoria</label>
          <app-select [(ngModel)]="draftModelo.cat" [options]="catModeloOptions" [allowCreate]="true" placeholder="Ex: Agendamento"></app-select>
        </div>
      </div>

      <!-- Descrição -->
      <div class="field">
        <label>Descrição curta</label>
        <input class="input" [(ngModel)]="draftModelo.desc" placeholder="Para que serve este modelo?">
      </div>

      <!-- Gatilho -->
      <div class="field">
        <label>Gatilho *</label>
        <app-select [(ngModel)]="draftModelo.gatilho" (ngModelChange)="onGatilhoChange()"
          [options]="draftGatilhoOptions" placeholder="Selecione o gatilho..."></app-select>
        @if (gatilhoAtual) {
          <span style="font-size:12px;color:var(--text-3);margin-top:3px">{{ gatilhoAtual.desc }} · Disparo: {{ gatilhoAtual.disparo }}</span>
        }
        @if (modeloErros['gatilho']) { <span style="font-size:12px;color:var(--st-faltou)">{{ modeloErros['gatilho'] }}</span> }
      </div>

      <!-- Status -->
      <div class="field">
        <label>Status</label>
        <div class="row" style="gap:8px;margin-top:4px">
          @for (s of STATUS_MODELO_OPCOES; track s[0]) {
            <button type="button" (click)="draftModelo.status = s[0]"
              style="flex:1;padding:8px 0;border-radius:8px;font-size:13px;font-weight:600;border:1px solid;transition:.15s"
              [style.background]="draftModelo.status === s[0] ? s[2] : 'var(--surface)'"
              [style.color]="draftModelo.status === s[0] ? s[3] : 'var(--text-2)'"
              [style.borderColor]="draftModelo.status === s[0] ? s[3] : 'var(--border)'">{{ s[1] }}</button>
          }
        </div>
      </div>

      <!-- Conteúdo -->
      <div class="field">
        <label>Conteúdo da mensagem *</label>
        <textarea class="input" [(ngModel)]="draftModelo.texto" style="min-height:110px;resize:vertical" placeholder="Digite a mensagem..."></textarea>
        @if (modeloErros['texto']) { <span style="font-size:12px;color:var(--st-faltou)">{{ modeloErros['texto'] }}</span> }
      </div>

      <!-- Variáveis clicáveis -->
      @if (variaveisDoGatilho.length > 0) {
        <div class="field">
          <label style="margin-bottom:6px">Variáveis disponíveis — clique para inserir</label>
          <div class="row" style="gap:6px;flex-wrap:wrap">
            @for (v of variaveisDoGatilho; track v.key) {
              <button type="button" class="tag" style="cursor:pointer;font-family:'Geist Mono',monospace;font-size:12px" [title]="v.label + ' (ex: ' + v.exemplo + ')'" (click)="inserirVariavel(v.key)">
                {{ v.key }}
              </button>
            }
          </div>
        </div>
      }

      <!-- Pré-visualização -->
      @if (draftModelo.texto) {
        <div class="field">
          <label>Pré-visualização</label>
          @if (draftModelo.canal === 'email' && draftModelo.assunto) {
            <div style="font-size:12px;color:var(--text-3);margin-bottom:5px">Assunto: <strong>{{ previewTexto(draftModelo.assunto) }}</strong></div>
          }
          <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);border-top-left-radius:3px;padding:13px 15px;font-size:13px;color:var(--text-2);line-height:1.6;white-space:pre-wrap">{{ previewTexto(draftModelo.texto) }}</div>
          <span class="muted" style="font-size:11.5px;margin-top:4px">Dados fictícios para pré-visualização.</span>
        </div>
      }

      <!-- Canal -->
      <div class="field">
        <label>Canal *</label>
        <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:4px">
          @if (!draftModelo.gatilho) {
            <span class="muted" style="font-size:13px">Selecione um gatilho para ver os canais disponíveis.</span>
          }
          @for (c of canaisDoGatilho; track c.key) {
            <button type="button" (click)="draftModelo.canal = c.key"
              style="display:flex;align-items:center;gap:7px;padding:9px 14px;border-radius:var(--r-md);border:1px solid;transition:.15s"
              [style.borderColor]="draftModelo.canal === c.key ? 'var(--accent)' : 'var(--border-strong)'"
              [style.background]="draftModelo.canal === c.key ? 'var(--accent-soft)' : 'var(--surface)'">
              <app-icon [name]="c.icon" [size]="14" [style.color]="draftModelo.canal === c.key ? 'var(--accent-text)' : 'var(--text-2)'"></app-icon>
              <span style="font-size:13px;font-weight:600" [style.color]="draftModelo.canal === c.key ? 'var(--accent-text)' : 'var(--text)'">{{ c.label }}</span>
            </button>
          }
        </div>
        @if (modeloErros['canal']) { <span style="font-size:12px;color:var(--st-faltou)">{{ modeloErros['canal'] }}</span> }
      </div>

      <!-- Assunto (e-mail) -->
      @if (draftModelo.canal === 'email') {
        <div class="field">
          <label>Assunto do e-mail *</label>
          <input class="input" [(ngModel)]="draftModelo.assunto" placeholder="Ex: Seu horário está confirmado!">
          @if (modeloErros['assunto']) { <span style="font-size:12px;color:var(--st-faltou)">{{ modeloErros['assunto'] }}</span> }
        </div>
      }

    </div>

    <div modalFoot>
      <button class="btn btn-ghost" (click)="fecharModeloModal()">Cancelar</button>
      <button class="btn btn-ghost" (click)="salvarModelo('rascunho')">Salvar rascunho</button>
      <button class="btn btn-primary" (click)="salvarModelo('ativo')">
        <app-icon name="check" [size]="15"></app-icon>
        Salvar e ativar
      </button>
    </div>

  </app-modal>
}

<!-- ===== MODAL RESULTADOS ===== -->
@if (resultModal) {
  <app-modal [title]="'Resultados · ' + resultModal.nome" (close)="resultModal = null">

    <!-- Cabeçalho da campanha -->
    <div style="display:flex;align-items:center;gap:12px;padding-bottom:16px;border-bottom:1px solid var(--border);margin-bottom:16px">
      <div style="width:42px;height:42px;border-radius:10px;background:var(--surface-2);display:grid;place-items:center;flex-shrink:0">
        <app-icon [name]="TIPOS_CAMP_MAP[resultModal.tipo]?.icon ?? 'sparkle'" [size]="20" [style.color]="resultModal.cor"></app-icon>
      </div>
      <div style="flex:1;line-height:1.3">
        <div style="font-weight:700;font-size:15px">{{ resultModal.nome }}</div>
        <div class="muted" style="font-size:12.5px">{{ resultModal.alvo }} · {{ resultModal.publico }} clientes</div>
      </div>
      <span [class]="'pill ' + statusCamp(resultModal.status).cls">
        <span class="pdot"></span>{{ statusCamp(resultModal.status).label }}
      </span>
    </div>

    <!-- 3 métricas -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:var(--border);border-radius:var(--r-md);overflow:hidden;margin-bottom:16px">
      <div style="background:var(--surface);padding:14px 10px;display:flex;flex-direction:column;align-items:center;gap:3px">
        <span class="tnum" style="font-weight:800;font-size:26px">{{ resultModal.enviadas }}</span>
        <span class="muted" style="font-size:12px">Enviadas</span>
      </div>
      <div style="background:var(--surface);padding:14px 10px;display:flex;flex-direction:column;align-items:center;gap:3px">
        <span class="tnum" style="font-weight:800;font-size:26px">{{ resultModal.retorno }}</span>
        <span class="muted" style="font-size:12px">Retornos</span>
      </div>
      <div style="background:var(--surface);padding:14px 10px;display:flex;flex-direction:column;align-items:center;gap:3px">
        <span class="tnum" style="font-weight:800;font-size:26px"
              [style.color]="calcConversao(resultModal) >= 30 ? 'var(--accent-text)' : calcConversao(resultModal) > 0 ? 'var(--st-atendimento)' : 'var(--text)'">
          {{ calcConversao(resultModal) }}%
        </span>
        <span class="muted" style="font-size:12px">Conversão</span>
      </div>
    </div>

    <!-- Barra de conversão -->
    <div style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px">
        <span style="font-size:13px;font-weight:600">Taxa de retorno</span>
        <span style="font-size:13px;color:var(--text-2)">{{ resultModal.retorno }} de {{ resultModal.enviadas }}</span>
      </div>
      <div style="height:10px;border-radius:99px;background:var(--surface-2);overflow:hidden">
        <div style="height:100%;border-radius:99px"
             [style.width]="(resultModal.enviadas > 0 ? resultModal.retorno / resultModal.enviadas * 100 : 0) + '%'"
             [style.background]="calcConversao(resultModal) >= 30 ? 'var(--accent)' : 'var(--st-atendimento)'">
        </div>
      </div>
      <div style="font-size:12px;color:var(--text-3);margin-top:5px">{{ perfLabel(resultModal) }}</div>
    </div>

    <!-- Breakdown -->
    <div style="display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:11px 14px;background:var(--accent-soft);border-radius:var(--r-md)">
        <div style="display:flex;align-items:center;gap:8px">
          <app-icon name="check" [size]="15" style="color:var(--accent-text)"></app-icon>
          <span style="font-size:13.5px;font-weight:600;color:var(--accent-text)">Voltaram</span>
        </div>
        <span class="tnum" style="font-weight:700;font-size:15px;color:var(--accent-text)">{{ resultModal.retorno }}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:11px 14px;background:var(--surface-2);border-radius:var(--r-md)">
        <div style="display:flex;align-items:center;gap:8px">
          <app-icon name="x" [size]="15" style="color:var(--text-3)"></app-icon>
          <span style="font-size:13.5px;font-weight:600;color:var(--text-2)">Não responderam</span>
        </div>
        <span class="tnum" style="font-weight:700;font-size:15px;color:var(--text-2)">{{ resultModal.enviadas - resultModal.retorno }}</span>
      </div>
    </div>

    <div modalFoot>
      <button class="btn btn-ghost" (click)="resultModal = null">Fechar</button>
      <button class="btn btn-ghost" (click)="openEditarCampanha(resultModal!); resultModal = null">
        <app-icon name="edit" [size]="14"></app-icon>
        Editar campanha
      </button>
    </div>

  </app-modal>
}

<!-- ===== MODAL CAMPANHA ===== -->
@if (campModal) {
  <app-modal [title]="campModal === 'novo' ? 'Nova campanha' : 'Editar campanha'" [wide]="true" (close)="fecharCampModal()">

    <div style="display:flex;flex-direction:column;gap:16px">

      <!-- Nome -->
      <div class="field">
        <label>Nome da campanha</label>
        <input class="input" [(ngModel)]="draftCamp.nome" placeholder="Ex: Cliente sumido — volta aí">
      </div>

      <!-- Tipo -->
      <div class="field">
        <label>Tipo</label>
        <div class="row" style="gap:10px;margin-top:4px">
          @for (t of TIPOS_CAMP; track t[0]) {
            <button type="button" (click)="setTipoCamp(t[0])"
              style="flex:1;display:flex;align-items:center;gap:9px;padding:11px 14px;border-radius:var(--r-md);border:1px solid;transition:background .15s,border-color .15s"
              [style.borderColor]="draftCamp.tipo === t[0] ? 'var(--accent)' : 'var(--border-strong)'"
              [style.background]="draftCamp.tipo === t[0] ? 'var(--accent-soft)' : 'var(--surface)'">
              <div style="width:30px;height:30px;border-radius:8px;display:grid;place-items:center;flex-shrink:0"
                   [style.background]="draftCamp.tipo === t[0] ? 'var(--accent)' : 'var(--surface-2)'">
                <app-icon [name]="t[2]" [size]="15"
                  [style.color]="draftCamp.tipo === t[0] ? '#fff' : 'var(--text-2)'"></app-icon>
              </div>
              <span style="font-weight:600;font-size:13.5px"
                    [style.color]="draftCamp.tipo === t[0] ? 'var(--accent-text)' : 'var(--text)'">{{ t[1] }}</span>
            </button>
          }
        </div>
      </div>

      <!-- Segmento -->
      <div class="field">
        <label>Segmento</label>
        <div class="col" style="gap:6px;margin-top:4px">
          @for (s of SEGMENTOS; track s.key) {
            <button type="button" (click)="selecionarSegmento(s.key)"
              style="display:flex;align-items:center;gap:11px;padding:10px 14px;border-radius:var(--r-md);border:1px solid;text-align:left;transition:background .15s,border-color .15s;width:100%"
              [style.borderColor]="segSel === s.key ? 'var(--accent)' : 'var(--border)'"
              [style.background]="segSel === s.key ? 'var(--accent-soft)' : 'var(--surface)'">
              <div class="col" style="flex:1;line-height:1.3">
                <span style="font-weight:600;font-size:13.5px" [style.color]="segSel === s.key ? 'var(--accent-text)' : 'var(--text)'">{{ s.label }}</span>
                <span style="font-size:12px;color:var(--text-3)">{{ s.desc }}</span>
              </div>
              <span class="tnum" style="font-size:13px;font-weight:700;padding:3px 9px;border-radius:6px;flex-shrink:0"
                    [style.background]="segSel === s.key ? 'var(--accent)' : 'var(--surface-2)'"
                    [style.color]="segSel === s.key ? '#fff' : 'var(--text-2)'">
                {{ publicoDoSegmento(s.key) }}
              </span>
            </button>
          }
        </div>
      </div>

      <!-- Status -->
      <div class="field">
        <label>Status</label>
        <div class="row" style="gap:8px;margin-top:4px">
          @for (s of STATUS_OPCOES; track s[0]) {
            <button type="button" (click)="draftCamp.status = s[0]"
              style="flex:1;padding:9px 0;border-radius:8px;font-size:13px;font-weight:600;border:1px solid;transition:background .15s,border-color .15s"
              [style.background]="draftCamp.status === s[0] ? s[2] : 'var(--surface)'"
              [style.color]="draftCamp.status === s[0] ? s[3] : 'var(--text-2)'"
              [style.borderColor]="draftCamp.status === s[0] ? s[3] : 'var(--border)'">
              {{ s[1] }}
            </button>
          }
        </div>
      </div>

    </div>

    <div modalFoot>
      <button class="btn" (click)="fecharCampModal()">Cancelar</button>
      <button class="btn btn-primary" (click)="salvarCampanha()">
        {{ campModal === 'novo' ? 'Criar campanha' : 'Salvar alterações' }}
      </button>
    </div>

  </app-modal>
}
`,
})
export class FidelidadeComponent {
  @Output() notify = new EventEmitter<string>();

  readonly FILTRO_STATUS_OPTS: SelectOption[] = [
    { value: '',         label: 'Todos os status' },
    { value: 'ativo',    label: 'Ativo' },
    { value: 'rascunho', label: 'Rascunho' },
    { value: 'inativo',  label: 'Inativo' },
  ];

  get filtroGatilhoOptions(): SelectOption[] {
    return [
      { value: '', label: 'Todos os gatilhos' },
      ...this.GATILHOS.map(g => ({ value: g.key, label: g.label })),
    ];
  }
  get filtroCanalOptions(): SelectOption[] {
    return [
      { value: '', label: 'Todos os canais' },
      ...this.CANAIS_CONFIG.map(c => ({ value: c.key, label: c.label })),
    ];
  }
  get draftGatilhoOptions(): SelectOption[] {
    return this.GATILHOS.map(g => ({ value: g.key, label: `${g.label} — ${g.modulo}` }));
  }

  tab = 'programa';
  tipo: string;
  meta: number;
  edit: any = null;

  campModal: 'novo' | 'editar' | null = null;
  campSel: Campanha | null = null;
  draftCamp: Partial<Campanha> = {};
  segSel = '';
  resultModal: Campanha | null = null;

  modeloModal: 'novo' | 'editar' | null = null;
  modeloSel: Modelo | null = null;
  draftModelo: Partial<Modelo> = {};
  modeloErros: Record<string, string> = {};
  filtroGatilho = '';
  filtroCanal = '';
  filtroStatus = '';

  readonly tabs: [string, string][] = [
    ['programa',  'Programa de fidelidade'],
    ['campanhas', 'Campanhas'],
    ['modelos',   'Modelos de mensagem'],
  ];

  readonly tipoOpcoes: [string, string, string][] = [
    ['pontos',   'Pontos / Selos', 'star'],
    ['cashback', 'Cashback',       'coins'],
  ];

  readonly TIPOS_CAMP: [string, string, string][] = [
    ['retorno',     'Reativação',  'history'],
    ['aniversario', 'Aniversário', 'cake'   ],
    ['promo',       'Promoção',    'sparkle'],
  ];

  readonly TIPOS_CAMP_MAP: Record<string, { icon: string }> = {
    retorno:     { icon: 'history'  },
    aniversario: { icon: 'cake'     },
    promo:       { icon: 'sparkle'  },
  };

  readonly STATUS_OPCOES: [string, string, string, string][] = [
    ['rascunho', 'Rascunho', 'var(--surface-2)',          'var(--text-2)'           ],
    ['agendada', 'Agendada', 'var(--st-atendimento-bg)',  'var(--st-atendimento)'   ],
    ['ativa',    'Ativa',    'var(--accent-soft)',         'var(--accent-text)'      ],
  ];

  readonly GATILHOS: GatilhoConfig[] = [
    { key: 'agendamento_criado',   label: 'Novo agendamento',         desc: 'Ao criar um agendamento no sistema',                  modulo: 'Agendamentos',        disparo: 'automático',          canais: ['whatsapp','email','sms'],
      variaveis: [{ key:'{nome_cliente}',label:'Nome do cliente',exemplo:'João Silva'},{key:'{data_agendamento}',label:'Data',exemplo:'15/07/2026'},{key:'{hora_agendamento}',label:'Horário',exemplo:'14:00'},{key:'{profissional}',label:'Profissional',exemplo:'Rafael Moura'},{key:'{servico_agendado}',label:'Serviço',exemplo:'Corte + Barba'},{key:'{nome_empresa}',label:'Empresa',exemplo:'Navalha & Cia'}] },
    { key: 'lembrete_agendamento', label: 'Lembrete de agendamento',  desc: 'Enviado horas/dias antes do horário marcado',         modulo: 'Agendamentos',        disparo: 'automático',          canais: ['whatsapp','sms'],
      variaveis: [{ key:'{nome_cliente}',label:'Nome do cliente',exemplo:'João Silva'},{key:'{data_agendamento}',label:'Data',exemplo:'15/07/2026'},{key:'{hora_agendamento}',label:'Horário',exemplo:'14:00'},{key:'{profissional}',label:'Profissional',exemplo:'Rafael Moura'},{key:'{servico_agendado}',label:'Serviço',exemplo:'Corte + Barba'},{key:'{nome_empresa}',label:'Empresa',exemplo:'Navalha & Cia'}] },
    { key: 'agendamento_cancelado',label: 'Agendamento cancelado',    desc: 'Ao cancelar um agendamento',                         modulo: 'Agendamentos',        disparo: 'automático',          canais: ['whatsapp','email'],
      variaveis: [{ key:'{nome_cliente}',label:'Nome do cliente',exemplo:'João Silva'},{key:'{data_agendamento}',label:'Data',exemplo:'15/07/2026'},{key:'{hora_agendamento}',label:'Horário',exemplo:'14:00'},{key:'{nome_empresa}',label:'Empresa',exemplo:'Navalha & Cia'}] },
    { key: 'pos_atendimento',      label: 'Pós-atendimento',          desc: 'Logo após a conclusão de um atendimento',             modulo: 'Agendamentos',        disparo: 'automático',          canais: ['whatsapp','email'],
      variaveis: [{ key:'{nome_cliente}',label:'Nome do cliente',exemplo:'João Silva'},{key:'{servico_agendado}',label:'Serviço realizado',exemplo:'Corte + Barba'},{key:'{profissional}',label:'Profissional',exemplo:'Rafael Moura'},{key:'{nome_empresa}',label:'Empresa',exemplo:'Navalha & Cia'}] },
    { key: 'novo_cliente',         label: 'Novo cliente cadastrado',  desc: 'Ao cadastrar um novo cliente no sistema',             modulo: 'Clientes',            disparo: 'automático',          canais: ['whatsapp','email'],
      variaveis: [{ key:'{nome_cliente}',label:'Nome do cliente',exemplo:'João Silva'},{key:'{nome_empresa}',label:'Empresa',exemplo:'Navalha & Cia'}] },
    { key: 'aniversario',          label: 'Aniversário do cliente',   desc: 'No dia do aniversário do cliente',                   modulo: 'Clientes / Fidelidade',disparo: 'automático',          canais: ['whatsapp','email','sms'],
      variaveis: [{ key:'{nome_cliente}',label:'Nome do cliente',exemplo:'João Silva'},{key:'{cupom}',label:'Cupom de desconto',exemplo:'ANIV20'},{key:'{validade_cupom}',label:'Validade do cupom',exemplo:'31/07/2026'},{key:'{nome_empresa}',label:'Empresa',exemplo:'Navalha & Cia'}] },
    { key: 'cliente_inativo',      label: 'Cliente inativo',          desc: 'Sem visita há 60+ dias ou marcado como sumido',      modulo: 'Retenção',            disparo: 'manual ou automático',canais: ['whatsapp','email','sms'],
      variaveis: [{ key:'{nome_cliente}',label:'Nome do cliente',exemplo:'João Silva'},{key:'{nome_empresa}',label:'Empresa',exemplo:'Navalha & Cia'}] },
    { key: 'beneficio_liberado',   label: 'Benefício liberado',       desc: 'Quando o cliente conquista uma recompensa',          modulo: 'Fidelidade',          disparo: 'automático',          canais: ['whatsapp','email'],
      variaveis: [{ key:'{nome_cliente}',label:'Nome do cliente',exemplo:'João Silva'},{key:'{recompensa}',label:'Recompensa',exemplo:'1 corte grátis'},{key:'{validade_cupom}',label:'Validade',exemplo:'31/07/2026'},{key:'{nome_empresa}',label:'Empresa',exemplo:'Navalha & Cia'}] },
    { key: 'pontuacao_atingida',   label: 'Pontuação acumulada',      desc: 'Cliente próximo de atingir a meta de pontos',        modulo: 'Fidelidade',          disparo: 'automático',          canais: ['whatsapp'],
      variaveis: [{ key:'{nome_cliente}',label:'Nome do cliente',exemplo:'João Silva'},{key:'{pontos_cliente}',label:'Pontos acumulados',exemplo:'8'},{key:'{meta_pontos}',label:'Meta de pontos',exemplo:'10'},{key:'{recompensa}',label:'Recompensa',exemplo:'1 corte grátis'},{key:'{nome_empresa}',label:'Empresa',exemplo:'Navalha & Cia'}] },
    { key: 'campanha_manual',      label: 'Campanha manual',          desc: 'Disparo manual para um segmento de clientes',        modulo: 'Campanhas',           disparo: 'manual',              canais: ['whatsapp','email','sms'],
      variaveis: [{ key:'{nome_cliente}',label:'Nome do cliente',exemplo:'João Silva'},{key:'{cupom}',label:'Cupom',exemplo:'PROMO15'},{key:'{nome_empresa}',label:'Empresa',exemplo:'Navalha & Cia'}] },
  ];

  readonly CANAIS_CONFIG: { key: string; label: string; icon: string }[] = [
    { key: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp' },
    { key: 'email',    label: 'E-mail',   icon: 'mail'     },
    { key: 'sms',      label: 'SMS',      icon: 'phone'    },
    { key: 'interno',  label: 'Interno',  icon: 'bell'     },
  ];

  readonly CATEGORIAS = ['Agendamento','Fidelidade','Retenção','Marketing','Boas-vindas','Pós-venda'];
  get catModeloOptions(): SelectOption[] {
    return this.CATEGORIAS.map(c => ({ value: c, label: c }));
  }

  readonly STATUS_MODELO_OPCOES: [string, string, string, string][] = [
    ['ativo',    'Ativo',    'var(--accent-soft)',  'var(--accent-text)'],
    ['rascunho', 'Rascunho', 'var(--surface-2)',    'var(--text-2)'     ],
    ['inativo',  'Inativo',  'var(--st-faltou-bg)', 'var(--st-faltou)'  ],
  ];

  readonly SEGMENTOS: { key: string; label: string; desc: string }[] = [
    { key: 'todos',       label: 'Todos os clientes',      desc: 'Base completa de clientes cadastrados'           },
    { key: 'sumido',      label: 'Em risco de sumir',      desc: 'Sem visita há 60+ dias ou marcados como sumido'  },
    { key: 'vip',         label: 'Clientes VIP',           desc: 'Marcados com tag VIP'                            },
    { key: 'novo',        label: 'Clientes novos',         desc: 'Primeira ou segunda visita (tag "novo")'         },
    { key: 'aniversario', label: 'Aniversariantes do mês', desc: 'Fazem aniversário neste mês'                     },
    { key: 'quase_la',    label: 'Perto da recompensa',    desc: 'A 70%+ da meta no programa de pontos'            },
  ];

  get quaseLa(): [string, number][] {
    const limiar = Math.ceil(this.meta * 0.7);
    return this.data.clientes
      .filter(c => !c.tags.includes('sumido'))
      .map(c => [c.id, c.visitas % this.meta] as [string, number])
      .filter(([, pts]) => pts >= limiar && pts < this.meta)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }

  get clientesAtivos(): number {
    return this.data.clientes.filter(c => c.visitas > 0).length;
  }

  get emRisco() {
    return this.data.clientesEmRisco();
  }

  get topLtv() {
    return [...this.data.clientes].sort((a, b) => b.total - a.total).slice(0, 5);
  }

  readonly varTags: string[] = [
    '{cliente}', '{data}', '{hora}', '{profissional}', '{estabelecimento}',
  ];

  readonly statusCamp = (status: string) =>
    STATUS_CAMP[status] ?? { label: status, cls: '' };

  constructor(public data: DataService) {
    this.tipo = data.fidelidade.tipo;
    this.meta = data.fidelidade.meta;
  }

  corParaTipo(tipo: string): string {
    const mapa: Record<string, string> = {
      retorno:     'var(--st-faltou)',
      aniversario: 'var(--st-atendimento)',
      promo:       'var(--accent)',
    };
    return mapa[tipo] ?? 'var(--text-3)';
  }

  setTipoCamp(tipo: string) {
    this.draftCamp.tipo = tipo;
    this.draftCamp.cor  = this.corParaTipo(tipo);
  }

  openNovaCampanha() {
    this.campSel = null;
    this.segSel = '';
    this.draftCamp = { nome: '', tipo: 'promo', alvo: '', publico: 0, status: 'rascunho', cor: this.corParaTipo('promo') };
    this.campModal = 'novo';
  }

  openEditarCampanha(c: Campanha) {
    this.campSel = c;
    this.draftCamp = { ...c };
    const match = this.SEGMENTOS.find(s => s.label === c.alvo);
    this.segSel = match?.key ?? '';
    this.campModal = 'editar';
  }

  fecharCampModal() {
    this.campModal = null;
    this.campSel = null;
  }

  salvarCampanha() {
    if (this.campModal === 'editar' && this.campSel) {
      this.data.updateCampanha(this.campSel.id, this.draftCamp);
    } else {
      this.data.addCampanha(this.draftCamp as Omit<Campanha, 'id' | 'enviadas' | 'retorno' | 'taxa'>);
    }
    this.fecharCampModal();
  }

  calcConversao(c: Campanha): number {
    return c.enviadas > 0 ? Math.round(c.retorno / c.enviadas * 100) : 0;
  }

  perfLabel(c: Campanha): string {
    const pct = this.calcConversao(c);
    if (pct === 0)  return 'Ainda sem retornos registrados.';
    if (pct < 20)   return 'Abaixo da média de mercado (~25–35% para reativação).';
    if (pct < 35)   return 'Dentro da média esperada para este tipo de campanha.';
    return 'Acima da média — campanha com boa performance.';
  }

  publicoDoSegmento(key: string): number {
    const mesAtual = +this.data.hojeData.split('-')[1];
    switch (key) {
      case 'todos':       return this.data.clientes.length;
      case 'sumido':      return this.emRisco.length;
      case 'vip':         return this.data.clientes.filter(c => c.tags.includes('vip')).length;
      case 'novo':        return this.data.clientes.filter(c => c.tags.includes('novo')).length;
      case 'aniversario': return this.data.clientes.filter(c => +c.nasc.split('-')[1] === mesAtual).length;
      case 'quase_la':    return this.quaseLa.length;
      default:            return 0;
    }
  }

  selecionarSegmento(key: string) {
    const seg = this.SEGMENTOS.find(s => s.key === key);
    this.segSel         = key;
    this.draftCamp.alvo    = seg?.label ?? '';
    this.draftCamp.publico = this.publicoDoSegmento(key);
  }

  dispararCampanha(c: Campanha) {
    this.data.updateCampanha(c.id, { status: 'ativa', enviadas: c.publico });
    this.notify.emit('Campanha "' + c.nome + '" disparada para ' + c.publico + ' clientes');
  }

  // -------- Modelos --------

  get modelosFiltrados(): Modelo[] {
    return this.data.modelos.filter(m =>
      (!this.filtroGatilho || m.gatilho === this.filtroGatilho) &&
      (!this.filtroCanal   || m.canal   === this.filtroCanal)   &&
      (!this.filtroStatus  || m.status  === this.filtroStatus)
    );
  }

  get gatilhoAtual(): GatilhoConfig | null {
    return this.GATILHOS.find(g => g.key === this.draftModelo.gatilho) ?? null;
  }

  get variaveisDoGatilho() { return this.gatilhoAtual?.variaveis ?? []; }

  get canaisDoGatilho() {
    const permitidos = this.gatilhoAtual?.canais ?? [];
    return permitidos.length > 0
      ? this.CANAIS_CONFIG.filter(c => permitidos.includes(c.key))
      : this.CANAIS_CONFIG;
  }

  gatilhoLabel(key: string): string { return this.GATILHOS.find(g => g.key === key)?.label ?? key; }
  canalLabel(key: string): string   { return this.CANAIS_CONFIG.find(c => c.key === key)?.label ?? key; }
  canalIcon(key: string): string    { return this.CANAIS_CONFIG.find(c => c.key === key)?.icon ?? 'sparkle'; }

  statusModeloCls(s: string): string {
    return ({ ativo: 'pill-confirmado', rascunho: 'pill-concluido', inativo: 'pill-faltou' } as Record<string,string>)[s] ?? '';
  }
  statusModeloLabel(s: string): string {
    return ({ ativo: 'Ativo', rascunho: 'Rascunho', inativo: 'Inativo' } as Record<string,string>)[s] ?? s;
  }

  limparFiltros() { this.filtroGatilho = ''; this.filtroCanal = ''; this.filtroStatus = ''; }

  openNovoModelo() {
    this.modeloSel = null;
    this.modeloErros = {};
    this.draftModelo = { nome: '', desc: '', cat: '', gatilho: '', canal: '', assunto: '', texto: '', status: 'ativo' };
    this.modeloModal = 'novo';
  }

  openEditarModelo(m: Modelo) {
    this.modeloSel  = m;
    this.modeloErros = {};
    this.draftModelo = { ...m };
    this.modeloModal = 'editar';
  }

  fecharModeloModal() { this.modeloModal = null; this.modeloSel = null; }

  onGatilhoChange() {
    const g = this.gatilhoAtual;
    if (g && this.draftModelo.canal && !g.canais.includes(this.draftModelo.canal)) {
      this.draftModelo.canal = g.canais[0] ?? '';
    }
  }

  validarModelo(): boolean {
    const e: Record<string, string> = {};
    if (!this.draftModelo.nome?.trim())  e['nome']    = 'Nome obrigatório.';
    if (!this.draftModelo.gatilho)       e['gatilho'] = 'Gatilho obrigatório.';
    if (!this.draftModelo.canal)         e['canal']   = 'Canal obrigatório.';
    if (!this.draftModelo.texto?.trim()) e['texto']   = 'Conteúdo obrigatório.';
    if (this.draftModelo.canal === 'email' && !this.draftModelo.assunto?.trim())
      e['assunto'] = 'Assunto obrigatório para e-mail.';
    this.modeloErros = e;
    return Object.keys(e).length === 0;
  }

  salvarModelo(status: string) {
    if (!this.validarModelo()) return;
    const m = { ...this.draftModelo, status } as Modelo;
    if (this.modeloModal === 'editar' && this.modeloSel) {
      this.data.updateModelo(this.modeloSel.id, m);
    } else {
      this.data.addModelo(m as Omit<Modelo, 'id'>);
    }
    this.fecharModeloModal();
    this.notify.emit('Modelo "' + m.nome + '" salvo');
  }

  duplicarModelo(m: Modelo) {
    this.data.addModelo({ ...m, nome: m.nome + ' (cópia)', status: 'rascunho' } as Omit<Modelo, 'id'>);
    this.notify.emit('Modelo duplicado como rascunho');
  }

  toggleModeloStatus(m: Modelo) {
    this.data.updateModelo(m.id, { status: m.status === 'ativo' ? 'inativo' : 'ativo' });
  }

  excluirModelo(m: Modelo) { this.data.removeModelo(m.id); }

  inserirVariavel(v: string) { this.draftModelo.texto = (this.draftModelo.texto ?? '') + v; }

  previewTexto(texto: string): string {
    const mock: Record<string, string> = {
      '{nome_cliente}':     'João Silva',
      '{data_agendamento}': '15/07/2026',
      '{hora_agendamento}': '14:00',
      '{profissional}':     this.data.staff[0]?.nome ?? 'Rafael Moura',
      '{servico_agendado}': 'Corte + Barba',
      '{nome_empresa}':     this.data.estabelecimento.nome,
      '{cupom}':            'ANIV20',
      '{validade_cupom}':   '31/07/2026',
      '{pontos_cliente}':   '8',
      '{meta_pontos}':      String(this.meta),
      '{recompensa}':       this.data.fidelidade.recompensa,
      '{nivel_fidelidade}': 'Prata',
    };
    return Object.entries(mock).reduce((t, [k, v]) => t.split(k).join(v), texto);
  }

  openCampanhaRecomendada() {
    this.campSel = null;
    this.segSel  = 'sumido';
    this.draftCamp = {
      nome:    'Reativação — volta aí!',
      tipo:    'retorno',
      alvo:    'Em risco de sumir',
      publico: this.emRisco.length,
      status:  'rascunho',
      cor:     this.corParaTipo('retorno'),
    };
    this.campModal = 'novo';
  }
}
