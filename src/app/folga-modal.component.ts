/* Modal de folga longa (férias, licença, dia off) — cria bloqueios diários
 * cobrindo o expediente inteiro do profissional dentro do intervalo escolhido.
 * Cada dia vira um `Bloqueio` do tipo 'folga', então `bloqueadoParaAgendamento`
 * (em data.service.ts) já impede novos agendamentos automaticamente.
 */
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from './icon.component';
import { ModalComponent } from './shared/modal.component';
import { DataService, Staff } from './data.service';

@Component({
  selector: 'app-folga-modal',
  standalone: true,
  imports: [CommonModule, IconComponent, ModalComponent],
  template: `
    <app-modal [title]="'Definir folga · ' + prof.nome" (close)="close.emit()">

      <div class="field">
        <label>Motivo</label>
        <input class="input" [value]="motivo" (input)="motivo = $any($event.target).value"
          placeholder="Ex.: Férias, atestado médico, viagem…" />
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div class="field">
          <label>Início</label>
          <input class="input" type="date" [value]="ini" (input)="ini = $any($event.target).value" [min]="hoje" />
        </div>
        <div class="field">
          <label>Fim</label>
          <input class="input" type="date" [value]="fim" (input)="fim = $any($event.target).value" [min]="ini || hoje" />
        </div>
      </div>

      @if (diasCobertos > 0) {
        <div class="muted" style="font-size:13px">
          {{ diasCobertos }} {{ diasCobertos === 1 ? 'dia' : 'dias' }} bloqueado(s) para {{ prof.apelido || prof.nome }},
          das {{ prof.inicio }} às {{ prof.fim }}.
        </div>
      }

      @if (erro) {
        <div style="background:var(--st-faltou-bg);color:var(--st-faltou);border-radius:var(--r-md);padding:10px 12px;font-size:13px;display:flex;align-items:center;gap:8px">
          <app-icon name="alert" [size]="15"></app-icon>
          <span>{{ erro }}</span>
        </div>
      }

      <div modalFoot>
        <button class="btn btn-ghost" (click)="close.emit()">Cancelar</button>
        <button class="btn btn-primary" [disabled]="!valido || salvando"
          [style]="(!valido || salvando) ? 'opacity:0.5;cursor:not-allowed' : null"
          (click)="onSave()">
          <app-icon name="check" [size]="16"></app-icon> Definir folga
        </button>
      </div>
    </app-modal>`,
})
export class FolgaModalComponent implements OnInit {
  @Input({ required: true }) prof!: Staff;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<{ dias: number; motivo: string }>();

  motivo = '';
  ini = '';
  fim = '';
  erro = '';
  salvando = false;

  readonly hoje = new Date().toISOString().slice(0, 10);

  constructor(public data: DataService) {}

  ngOnInit() {
    this.ini = this.hoje;
    this.fim = this.hoje;
  }

  get valido(): boolean {
    return !!(this.motivo.trim() && this.ini && this.fim && this.ini <= this.fim);
  }

  get diasCobertos(): number {
    if (!this.ini || !this.fim || this.ini > this.fim) return 0;
    const a = new Date(this.ini + 'T00:00:00');
    const b = new Date(this.fim + 'T00:00:00');
    return Math.floor((+b - +a) / 86400000) + 1;
  }

  private eachDay(): string[] {
    const dias: string[] = [];
    const cur = new Date(this.ini + 'T00:00:00');
    const stop = new Date(this.fim + 'T00:00:00');
    while (cur <= stop) {
      dias.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    return dias;
  }

  async onSave() {
    this.erro = '';
    if (!this.valido) { this.erro = 'Preencha o motivo e um intervalo válido.'; return; }

    this.salvando = true;
    try {
      const dias = this.eachDay();
      const ini = this.prof.inicio || '08:00';
      const fim = this.prof.fim || '20:00';
      for (const d of dias) {
        await this.data.addBloqueio({
          prof: this.prof.id,
          data: d,
          ini, fim,
          tipo: 'folga',
          motivo: this.motivo.trim(),
        });
      }
      this.saved.emit({ dias: dias.length, motivo: this.motivo.trim() });
    } catch (e) {
      this.erro = 'Falha ao registrar folga. Tente novamente.';
    } finally {
      this.salvando = false;
    }
  }
}
