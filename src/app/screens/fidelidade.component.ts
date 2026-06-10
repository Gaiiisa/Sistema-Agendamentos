import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon.component';
import { AvatarComponent } from '../shared/avatar.component';
import { ModalComponent } from '../shared/modal.component';
import { DataService } from '../data.service';

const STATUS_CAMP: { [k: string]: { label: string; cls: string } } = {
  ativa:    { label: 'Ativa',     cls: 'pill-confirmado' },
  agendada: { label: 'Agendada',  cls: 'pill-atendimento' },
  rascunho: { label: 'Rascunho',  cls: 'pill-concluido' },
};

@Component({
  selector: 'app-fidelidade',
  standalone: true,
  imports: [CommonModule, IconComponent, AvatarComponent, ModalComponent],
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
    <div class="grid-2" style="align-items:start">

      <!-- Configuração da regra -->
      <div class="card">
        <div class="card-head">
          <app-icon name="gift" [size]="17" style="color:var(--text-2)"></app-icon>
          <div class="card-title">Regra do programa</div>
        </div>
        <div style="padding:18px;display:flex;flex-direction:column;gap:18px">

          <!-- Tipo de recompensa -->
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

          <!-- Pontos: meta de cortes + recompensa -->
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

          <!-- Resumo inteligente -->
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

        <!-- Stat grid: FStat inline (4 uses) -->
        <div class="stat-grid" style="grid-template-columns:1fr 1fr">

          <!-- FStat: Clientes no programa -->
          <div class="stat">
            <div class="stat-top">
              <div class="stat-label">Clientes no programa</div>
              <div class="stat-ico" style="background:var(--accent-soft)">
                <app-icon name="users" [size]="16" style="color:var(--accent)"></app-icon>
              </div>
            </div>
            <div class="stat-val tnum">{{ data.fidelidade.ativos }}</div>
          </div>

          <!-- FStat: Recompensas resgatadas -->
          <div class="stat">
            <div class="stat-top">
              <div class="stat-label">Recompensas resgatadas</div>
              <div class="stat-ico" style="background:var(--st-atendimento-bg)">
                <app-icon name="gift" [size]="16" style="color:var(--st-atendimento)"></app-icon>
              </div>
            </div>
            <div class="stat-val tnum">{{ data.fidelidade.resgatados }}</div>
          </div>

          <!-- FStat: Pontos emitidos -->
          <div class="stat">
            <div class="stat-top">
              <div class="stat-label">Pontos emitidos (mês)</div>
              <div class="stat-ico" style="background:var(--st-pendente-bg)">
                <app-icon name="star" [size]="16" style="color:var(--st-pendente)" [fill]="true"></app-icon>
              </div>
            </div>
            <div class="stat-val tnum">{{ data.fidelidade.pontosEmitidos.toLocaleString('pt-BR') }}</div>
          </div>

          <!-- FStat: Próx. do prêmio -->
          <div class="stat">
            <div class="stat-top">
              <div class="stat-label">Próx. do prêmio</div>
              <div class="stat-ico" style="background:var(--accent-soft)">
                <app-icon name="target" [size]="16" style="color:var(--accent)"></app-icon>
              </div>
            </div>
            <div class="stat-val tnum">7</div>
          </div>

        </div>

        <!-- Quase lá -->
        <div class="card card-pad">
          <div style="font-weight:700;font-size:14px;margin-bottom:12px">Quase lá — clientes perto de uma recompensa</div>
          @for (item of quaseLa; track item[0]) {
            <div class="row" style="gap:11px;padding:8px 0">
              <app-avatar [nome]="data.cli(item[0]).nome" cor="#0e9f6e" [size]="30"></app-avatar>
              <span style="font-weight:600;font-size:13.5px;flex:1">{{ data.cli(item[0]).nome }}</span>
              <div class="progress" style="width:90px">
                <span [style.width]="(+item[1] * 10) + '%'"></span>
              </div>
              <span class="mono" style="font-size:12.5px;font-weight:600;width:38px;text-align:right">{{ item[1] }}/10</span>
            </div>
          }
        </div>

      </div>
    </div>
  }

  <!-- ===== TAB: CAMPANHAS ===== -->
  @if (tab === 'campanhas') {
    <div class="col" style="gap:16px">

      <div class="row">
        <div class="col" style="line-height:1.3">
          <div style="font-weight:700;font-size:15px">Campanhas via WhatsApp</div>
          <div class="muted" style="font-size:13px">Dispare mensagens segmentadas por tag, retorno ou aniversário.</div>
        </div>
        <button class="btn btn-primary" style="margin-left:auto" (click)="notify.emit('Nova campanha criada')">
          <app-icon name="plus" [size]="16"></app-icon>
          Nova campanha
        </button>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:14px">
        @for (c of data.campanhas; track c.id) {
          <div class="card" style="padding:16px;display:flex;flex-direction:column;gap:13px">

            <div class="row" style="gap:11px;align-items:flex-start">
              <div style="width:38px;height:38px;border-radius:10px;background:var(--surface-2);display:grid;place-items:center;flex-shrink:0">
                <app-icon
                  [name]="c.tipo === 'retorno' ? 'history' : c.tipo === 'aniversario' ? 'cake' : 'sparkle'"
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

            <!-- MiniMetric inline (3 uses) -->
            <div class="row" style="gap:0;border:1px solid var(--border);border-radius:var(--r-md);overflow:hidden">

              <!-- MiniMetric: Enviadas -->
              <div class="col" style="flex:1;padding:9px 12px;border-left:none;align-items:center">
                <span class="tnum" style="font-weight:700;font-size:16px;color:var(--text)">{{ c.enviadas }}</span>
                <span class="muted" style="font-size:11px">Enviadas</span>
              </div>

              <!-- MiniMetric: Retornos -->
              <div class="col" style="flex:1;padding:9px 12px;border-left:1px solid var(--border);align-items:center">
                <span class="tnum" style="font-weight:700;font-size:16px;color:var(--text)">{{ c.retorno }}</span>
                <span class="muted" style="font-size:11px">Retornos</span>
              </div>

              <!-- MiniMetric: Conversão -->
              <div class="col" style="flex:1;padding:9px 12px;border-left:1px solid var(--border);align-items:center">
                <span class="tnum" [style.font-weight]="700" [style.font-size.px]="16" [style.color]="c.taxa > 0 ? 'var(--accent-text)' : 'var(--text)'">{{ c.taxa }}%</span>
                <span class="muted" style="font-size:11px">Conversão</span>
              </div>

            </div>

            <div class="row" style="gap:8px">
              @if (c.status === 'rascunho') {
                <button class="btn btn-primary btn-sm" style="flex:1" (click)="notify.emit('Campanha &quot;' + c.nome + '&quot; disparada')">
                  <app-icon name="whatsapp" [size]="14"></app-icon>
                  Disparar
                </button>
              } @else {
                <button class="btn btn-ghost btn-sm" style="flex:1">
                  <app-icon name="chart" [size]="14"></app-icon>
                  Ver resultados
                </button>
              }
              <button class="btn btn-ghost btn-sm btn-icon-only">
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

      <div class="row">
        <span class="muted" style="font-size:13px">Use variáveis como &#123;cliente&#125;, &#123;data&#125;, &#123;hora&#125;, &#123;profissional&#125; — substituídas no envio.</span>
        <button class="btn btn-primary btn-sm" style="margin-left:auto" (click)="notify.emit('Novo modelo criado')">
          <app-icon name="plus" [size]="15"></app-icon>
          Novo modelo
        </button>
      </div>

      <div class="grid-2">
        @for (m of data.modelos; track m.id) {
          <div class="card" style="padding:16px;display:flex;flex-direction:column;gap:11px">
            <div class="row">
              <div class="col" style="line-height:1.3">
                <span style="font-weight:700;font-size:14.5px">{{ m.nome }}</span>
                <span class="muted" style="font-size:12px">Gatilho: {{ m.gatilho }}</span>
              </div>
              <button class="btn btn-subtle btn-sm" style="margin-left:auto" (click)="edit = m">
                <app-icon name="edit" [size]="14"></app-icon>
                Editar
              </button>
            </div>
            <div style="background:oklch(0.97 0.02 150);border:1px solid var(--border);border-radius:var(--r-md);border-top-left-radius:3px;padding:11px 13px;font-size:13px;color:var(--text-2);line-height:1.5">{{ m.texto }}</div>
          </div>
        }
      </div>

      <!-- EditModelo modal -->
      @if (edit) {
        <app-modal [title]="'Editar modelo · ' + edit.nome" (close)="edit = null">
          <div class="field">
            <label>Gatilho de envio</label>
            <input class="input" [value]="edit.gatilho">
          </div>
          <div class="field">
            <label>Mensagem</label>
            <textarea class="input" [value]="edit.texto" style="min-height:120px"></textarea>
          </div>
          <div class="row" style="gap:6px;flex-wrap:wrap">
            @for (v of varTags; track $index) {
              <span class="tag" style="font-family:'Geist Mono',monospace">{{ v }}</span>
            }
          </div>
          <div modalFoot>
            <button class="btn btn-ghost" (click)="edit = null">Cancelar</button>
            <button class="btn btn-primary" (click)="edit = null; notify.emit('Modelo salvo')">
              <app-icon name="check" [size]="15"></app-icon>
              Salvar
            </button>
          </div>
        </app-modal>
      }

    </div>
  }

</div>
`,
})
export class FidelidadeComponent {
  @Output() notify = new EventEmitter<string>();

  tab = 'programa';

  tipo: string;
  meta: number;

  edit: any = null;

  readonly tabs: [string, string][] = [
    ['programa',  'Programa de fidelidade'],
    ['campanhas', 'Campanhas'],
    ['modelos',   'Modelos de mensagem'],
  ];

  readonly tipoOpcoes: [string, string, string][] = [
    ['pontos',   'Pontos / Selos', 'star'],
    ['cashback', 'Cashback',       'coins'],
  ];

  readonly quaseLa: [string, number][] = [
    ['c4', 9],
    ['c8', 8],
    ['c1', 8],
  ];

  readonly varTags: string[] = [
    '{cliente}', '{data}', '{hora}', '{profissional}', '{estabelecimento}',
  ];

  readonly statusCamp = (status: string) =>
    STATUS_CAMP[status] ?? { label: status, cls: '' };

  constructor(public data: DataService) {
    this.tipo = data.fidelidade.tipo;
    this.meta = data.fidelidade.meta;
  }
}
