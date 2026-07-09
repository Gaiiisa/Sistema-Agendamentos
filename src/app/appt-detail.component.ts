/* Detalhe do agendamento (modal) */
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from './icon.component';
import { AvatarComponent } from './shared/avatar.component';
import { StatusPillComponent } from './shared/status-pill.component';
import { ModalComponent } from './shared/modal.component';
import { DataService, Appt } from './data.service';

interface Sugestao { data: string; hora: string; label: string; }

const DOW_ABR = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const DOW_LABEL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

@Component({
  selector: 'app-appt-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, AvatarComponent, StatusPillComponent, ModalComponent],
  template: `
    <app-modal title="Agendamento" (close)="close.emit()">
      <div class="row" style="gap:13px">
        <app-avatar [nome]="c.nome" [cor]="p.cor" [size]="48"></app-avatar>
        <div class="col" style="flex:1;line-height:1.3">
          <div style="font-weight:700;font-size:18px">{{ c.nome }}</div>
          <div class="mono muted" style="font-size:13px">{{ c.wpp }}</div>
        </div>
        <app-status-pill [status]="a.status"></app-status-pill>
      </div>
      <div class="divider"></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(150px, 1fr));gap:14px">
        <ng-container *ngTemplateOutlet="detailRow; context: { icon: 'scissors', label: 'Serviço', value: s.nome }"></ng-container>
        <ng-container *ngTemplateOutlet="detailRow; context: { icon: 'user', label: 'Profissional', value: p.nome }"></ng-container>
        <ng-container *ngTemplateOutlet="detailRow; context: { icon: 'clock', label: 'Horário', value: a.ini + '–' + data.fromMin(data.toMin(a.ini) + dur) + ' (' + dur + 'min)' }"></ng-container>
        <ng-container *ngTemplateOutlet="detailRow; context: { icon: 'money', label: 'Valor', value: data.money(s.preco) + (a.sinal ? ' · sinal pago' : '') }"></ng-container>
      </div>
      @if (c.obs) {
        <div style="background:var(--surface-2);border-radius:var(--r-md);padding:12px;font-size:13.5px;color:var(--text-2)">
          <strong>Obs.: </strong>{{ c.obs }}
        </div>
      }

      @if (remarcando) {
        <div style="margin-top:14px;padding:12px 14px;background:var(--surface-2);border-radius:var(--r-md);display:flex;flex-direction:column;gap:12px">

          @if (sugestoes.length > 0) {
            <div>
              <div class="muted" style="font-size:12px;font-weight:600;margin-bottom:6px">Sugestões desta semana</div>
              <div style="display:flex;flex-wrap:wrap;gap:8px">
                @for (s of sugestoes; track s.data + s.hora) {
                  <button type="button" (click)="escolherSugestao(s)"
                    style="display:flex;flex-direction:column;padding:8px 12px;border-radius:var(--r-md);border:1px solid var(--border-strong);background:var(--surface);text-align:left;line-height:1.25;transition:background .15s,border-color .15s"
                    [style.borderColor]="novaData === s.data && novaHora === s.hora ? 'var(--accent)' : 'var(--border-strong)'"
                    [style.background]="novaData === s.data && novaHora === s.hora ? 'var(--accent-soft)' : 'var(--surface)'">
                    <span style="font-weight:700;font-size:13px">{{ s.label }}</span>
                    <span class="mono" style="font-size:12px;color:var(--text-3)">{{ s.hora }}</span>
                  </button>
                }
              </div>
            </div>
          } @else {
            <div class="muted" style="font-size:12.5px">Sem horários disponíveis nos próximos 6 dias — ajuste manualmente abaixo.</div>
          }

          <div class="row" style="gap:10px;align-items:end;flex-wrap:wrap">
            <div class="field" style="flex:1;min-width:130px;margin:0">
              <label>Data</label>
              <input class="input" type="date" [(ngModel)]="novaData" [min]="hoje" />
            </div>
            <div class="field" style="flex:1;min-width:110px;margin:0">
              <label>Horário</label>
              <input class="input" type="time" [(ngModel)]="novaHora" />
            </div>
            <button class="btn btn-ghost" (click)="remarcando = false; erroRemarcar = ''">Voltar</button>
            <button class="btn btn-primary" [disabled]="!podeSalvarRemarcacao" (click)="confirmarRemarcacao()">
              <app-icon name="check" [size]="14"></app-icon> Salvar
            </button>
          </div>

          @if (erroRemarcar) {
            <span style="color:var(--st-faltou);font-size:12.5px">{{ erroRemarcar }}</span>
          }
        </div>
      }

      <div modalFoot>
        <button class="btn btn-ghost" (click)="act('Lembrete enviado via WhatsApp')">
          <app-icon name="whatsapp" [size]="15"></app-icon> Lembrar
        </button>

        @if (podeCancelar) {
          <button class="btn btn-ghost" style="color:var(--st-faltou)" (click)="cancelar()">
            <app-icon name="x" [size]="15"></app-icon> Cancelar
          </button>
        }
        @if (podeRemarcar) {
          <button class="btn btn-ghost" (click)="abrirRemarcar()">
            <app-icon name="clock" [size]="15"></app-icon> Remarcar
          </button>
        }

        @if (a.status === 'pendente') {
          <button class="btn btn-primary" (click)="act('Agendamento confirmado', 'confirmado')">
            <app-icon name="check" [size]="15"></app-icon> Confirmar
          </button>
        } @else if (a.status === 'confirmado') {
          <button class="btn btn-primary" (click)="act('Agendamento concluído', 'concluido')">
            <app-icon name="check" [size]="15"></app-icon> Concluir
          </button>
        } @else if (a.status === 'atendimento') {
          <button class="btn btn-primary" (click)="act('Atendimento concluído', 'concluido')">
            <app-icon name="check" [size]="15"></app-icon> Concluir
          </button>
        }
      </div>
    </app-modal>

    <ng-template #detailRow let-icon="icon" let-label="label" let-value="value">
      <div class="row" style="gap:10px">
        <div style="width:32px;height:32px;border-radius:8px;background:var(--surface-2);display:grid;place-items:center;flex-shrink:0">
          <app-icon [name]="icon" [size]="15" style="color:var(--text-2)"></app-icon>
        </div>
        <div class="col" style="line-height:1.3;min-width:0">
          <span class="muted" style="font-size:12px">{{ label }}</span>
          <span style="font-weight:600;font-size:14px">{{ value }}</span>
        </div>
      </div>
    </ng-template>`,
})
export class ApptDetailComponent {
  @Input() a!: Appt;
  @Output() close = new EventEmitter<void>();
  @Output() notify = new EventEmitter<string>();

  remarcando = false;
  novaHora = '';
  novaData = '';
  erroRemarcar = '';
  sugestoes: Sugestao[] = [];

  readonly hoje = new Date().toISOString().slice(0, 10);

  constructor(public data: DataService) {}

  get c() { return this.data.cli(this.a.cli); }
  get s() { return this.data.srv(this.a.srv); }
  get p() { return this.data.prof(this.a.prof); }
  get dur() { return this.a._dur || this.s.dur; }

  /** Data atual do agendamento — busca na lista global; fallback = hoje. */
  get dataAtual(): string {
    return this.data.agendamentos.find(x => x.id === this.a.id)?.data || this.hoje;
  }

  get podeCancelar(): boolean {
    return this.a.status === 'pendente' || this.a.status === 'confirmado';
  }
  get podeRemarcar(): boolean {
    return this.a.status === 'pendente' || this.a.status === 'confirmado';
  }
  get podeSalvarRemarcacao(): boolean {
    return !!(this.novaData && this.novaHora)
      && (this.novaData !== this.dataAtual || this.novaHora !== this.a.ini);
  }

  act(label: string, status?: string) {
    if (status) this.data.setApptStatus(this.a.id, status);
    this.close.emit();
    this.notify.emit(label);
  }

  cancelar() {
    if (!confirm(`Cancelar o agendamento de ${this.c.nome}?`)) return;
    this.act('Agendamento cancelado', 'cancelado');
  }

  abrirRemarcar() {
    this.novaHora = this.a.ini;
    this.novaData = this.dataAtual;
    this.erroRemarcar = '';
    this.sugestoes = this.gerarSugestoes();
    this.remarcando = true;
  }

  escolherSugestao(s: Sugestao) {
    this.novaData = s.data;
    this.novaHora = s.hora;
    this.erroRemarcar = '';
  }

  confirmarRemarcacao() {
    this.erroRemarcar = '';
    if (!this.podeSalvarRemarcacao) return;
    const conflito = this.data.bloqueadoParaAgendamento(this.a.prof, this.novaData, this.novaHora, this.dur);
    if (conflito) {
      this.erroRemarcar = `Conflito com ${conflito.tipo} (${conflito.ini}–${conflito.fim}).`;
      return;
    }
    // Verifica também colisão com outros agendamentos no destino.
    const fim = this.data.fromMin(this.data.toMin(this.novaHora) + this.dur);
    const colisao = this.data.conflitoBloqueio(this.a.prof, this.novaData, this.novaHora, fim);
    if (colisao && !colisao.startsWith('Já existe outro bloqueio')) {
      this.erroRemarcar = colisao;
      return;
    }
    const mudouData = this.novaData !== this.dataAtual;
    this.data.updateAppt(this.a.id, {
      ini: this.novaHora,
      data: mudouData ? this.novaData : undefined,
    });
    this.remarcando = false;
    this.close.emit();
    const dataLbl = mudouData ? `${this.novaData.slice(8, 10)}/${this.novaData.slice(5, 7)} às ` : '';
    this.notify.emit(`Remarcado para ${dataLbl}${this.novaHora}`);
  }

  /** Gera até 3 sugestões nos próximos 6 dias (dias diferentes), tentando horários
   *  próximos ao original quando o slot exato estiver ocupado. */
  private gerarSugestoes(): Sugestao[] {
    const out: Sugestao[] = [];
    const dataOrig = this.dataAtual;
    const horaOrigMin = this.data.toMin(this.a.ini);
    const profId = this.a.prof;
    const staff = this.p;
    const iniExp = this.data.toMin(staff.inicio || '09:00');
    const fimExp = this.data.toMin(staff.fim || '19:00');
    // Prefere o horário original, depois desvios pequenos.
    const offsets = [0, 30, -30, 60, -60, 90, -90, 120];

    for (let d = 1; d <= 6 && out.length < 3; d++) {
      const base = new Date(dataOrig + 'T00:00:00');
      base.setDate(base.getDate() + d);
      const iso = base.toISOString().slice(0, 10);
      const dow = base.getDay();

      // Pula se hoje ou anterior (usa hoje como piso).
      if (iso < this.hoje) continue;
      // Pula folga semanal.
      if (staff.folga?.includes(DOW_ABR[dow])) continue;

      for (const off of offsets) {
        const min = horaOrigMin + off;
        if (min < iniExp || min + this.dur > fimExp) continue;
        const hora = this.data.fromMin(min);
        const fim = this.data.fromMin(min + this.dur);
        if (this.data.bloqueadoParaAgendamento(profId, iso, hora, this.dur)) continue;
        const conflito = this.data.conflitoBloqueio(profId, iso, hora, fim);
        if (conflito && !conflito.startsWith('Já existe outro bloqueio')) continue;
        out.push({ data: iso, hora, label: `${DOW_LABEL[dow]} ${base.getDate()}/${base.getMonth() + 1}` });
        break; // uma sugestão por dia
      }
    }
    return out;
  }
}
