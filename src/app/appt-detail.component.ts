/* Detalhe do agendamento (modal) */
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from './icon.component';
import { AvatarComponent } from './shared/avatar.component';
import { StatusPillComponent } from './shared/status-pill.component';
import { ModalComponent } from './shared/modal.component';
import { DataService, Appt } from './data.service';

@Component({
  selector: 'app-appt-detail',
  standalone: true,
  imports: [CommonModule, IconComponent, AvatarComponent, StatusPillComponent, ModalComponent],
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
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
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

      <div modalFoot>
        <button class="btn btn-ghost" (click)="act('Lembrete enviado via WhatsApp')">
          <app-icon name="whatsapp" [size]="15"></app-icon> Lembrar
        </button>
        @if (a.status === 'pendente') {
          <button class="btn btn-primary" (click)="act('Agendamento confirmado')">
            <app-icon name="check" [size]="15"></app-icon> Confirmar
          </button>
        } @else {
          <button class="btn btn-primary" (click)="act('Atendimento iniciado')">
            <app-icon name="play" [size]="14" [fill]="true"></app-icon> Iniciar atendimento
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

  constructor(public data: DataService) {}

  get c() { return this.data.cli(this.a.cli); }
  get s() { return this.data.srv(this.a.srv); }
  get p() { return this.data.prof(this.a.prof); }
  get dur() { return this.a._dur || this.s.dur; }

  act(label: string) { this.close.emit(); this.notify.emit(label); }
}
