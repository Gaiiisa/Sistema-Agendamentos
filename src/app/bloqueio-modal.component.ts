/* Bloqueio de horário — modal de criação/edição/visualização */
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from './icon.component';
import { ModalComponent } from './shared/modal.component';
import { SelectComponent, SelectOption } from './shared/select.component';
import { DataService, Bloqueio } from './data.service';

@Component({
  selector: 'app-bloqueio-modal',
  standalone: true,
  imports: [CommonModule, IconComponent, ModalComponent, SelectComponent],
  template: `
    <app-modal [title]="tituloModal" (close)="close.emit()">
      <!-- data -->
      <div class="field">
        <label>Data</label>
        <input class="input" type="date" [value]="dataV" (input)="dataV = $any($event.target).value" />
      </div>

      <!-- horário -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div class="field">
          <label>Início</label>
          <input class="input" type="time" [value]="iniV" (input)="iniV = $any($event.target).value" />
        </div>
        <div class="field">
          <label>Término</label>
          <input class="input" type="time" [value]="fimV" (input)="fimV = $any($event.target).value" />
        </div>
      </div>

      <!-- profissional -->
      <div class="field">
        <label>Profissional</label>
        <app-select [value]="profV" (valueChange)="profV = $event" [options]="profOptions"></app-select>
      </div>

      <!-- tipo -->
      <div class="field">
        <label>Tipo</label>
        <div style="display:grid;grid-template-columns:repeat(5, 1fr);gap:6px">
          @for (t of tipos; track t.id) {
            <button (click)="tipoV = t.id"
              style="padding:9px 8px;border-radius:var(--r-md);text-align:center;font-size:12.5px;font-weight:600"
              [style.border]="'1px solid ' + (tipoV === t.id ? 'var(--accent)' : 'var(--border-strong)')"
              [style.background]="tipoV === t.id ? 'var(--accent-soft)' : 'var(--surface)'"
              [style.color]="tipoV === t.id ? 'var(--accent-text)' : 'var(--text-2)'">
              {{ t.label }}
            </button>
          }
        </div>
      </div>

      <!-- motivo -->
      <div class="field">
        <label>Motivo (opcional)</label>
        <textarea class="input" rows="2" placeholder="Ex.: Almoço, treinamento, manutenção…"
          [value]="motivoV" (input)="motivoV = $any($event.target).value"></textarea>
      </div>

      <!-- erro -->
      @if (erro) {
        <div style="background:var(--st-faltou-bg);color:var(--st-faltou);border-radius:var(--r-md);padding:10px 12px;font-size:13px;display:flex;align-items:center;gap:8px">
          <app-icon name="alert" [size]="15"></app-icon>
          <span>{{ erro }}</span>
        </div>
      }

      <div modalFoot>
        @if (bloqueio) {
          <button class="btn btn-ghost" style="color:var(--st-faltou);margin-right:auto"
            (click)="onDelete()" [disabled]="salvando">
            <app-icon name="x" [size]="15"></app-icon> Excluir
          </button>
        }
        <button class="btn btn-ghost" (click)="close.emit()">Cancelar</button>
        <button class="btn btn-primary" [disabled]="!valido || salvando"
          [style]="(!valido || salvando) ? 'opacity:0.5;cursor:not-allowed' : null"
          (click)="onSave()">
          <app-icon name="check" [size]="16"></app-icon>
          {{ bloqueio ? 'Salvar alterações' : 'Criar bloqueio' }}
        </button>
      </div>
    </app-modal>`,
})
export class BloqueioModalComponent implements OnInit {
  /** Se preenchido, o modal opera em modo edição. */
  @Input() bloqueio: Bloqueio | null = null;
  /** Data pré-selecionada quando cria um novo bloqueio. */
  @Input() dataInicial = '';

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Bloqueio>();
  @Output() removed = new EventEmitter<string>();

  readonly tipos: { id: Bloqueio['tipo']; label: string }[] = [
    { id: 'almoco',     label: 'Almoço' },
    { id: 'folga',      label: 'Folga' },
    { id: 'manutencao', label: 'Manut.' },
    { id: 'evento',     label: 'Evento' },
    { id: 'outro',      label: 'Outro' },
  ];

  get profOptions(): SelectOption[] {
    return [
      { value: '', label: 'Todo o estabelecimento' },
      ...this.data.staff.map(p => ({ value: p.id, label: p.nome })),
    ];
  }

  dataV = '';
  iniV = '12:00';
  fimV = '13:00';
  profV = '';
  tipoV: Bloqueio['tipo'] = 'outro';
  motivoV = '';

  erro = '';
  salvando = false;

  constructor(public data: DataService) {}

  ngOnInit() {
    if (this.bloqueio) {
      this.dataV = this.bloqueio.data;
      this.iniV = this.bloqueio.ini;
      this.fimV = this.bloqueio.fim;
      this.profV = this.bloqueio.prof || '';
      this.tipoV = this.bloqueio.tipo || 'outro';
      this.motivoV = this.bloqueio.motivo || '';
    } else {
      this.dataV = this.dataInicial || new Date().toISOString().slice(0, 10);
    }
  }

  get tituloModal(): string {
    return this.bloqueio ? 'Editar bloqueio' : 'Bloquear horário';
  }

  get valido(): boolean {
    return !!(this.dataV && this.iniV && this.fimV);
  }

  private validar(): string | null {
    if (!this.dataV) return 'Informe a data.';
    if (!this.iniV || !this.fimV) return 'Informe início e término.';
    if (this.data.toMin(this.fimV) <= this.data.toMin(this.iniV))
      return 'Hora final deve ser posterior à inicial.';
    return this.data.conflitoBloqueio(
      this.profV || null, this.dataV, this.iniV, this.fimV, this.bloqueio?.id,
    );
  }

  async onSave() {
    this.erro = '';
    const err = this.validar();
    if (err) { this.erro = err; return; }

    this.salvando = true;
    try {
      if (this.bloqueio) {
        const changes: Partial<Bloqueio> = {
          data: this.dataV, ini: this.iniV, fim: this.fimV,
          prof: this.profV || null, tipo: this.tipoV, motivo: this.motivoV,
        };
        await this.data.updateBloqueio(this.bloqueio.id, changes);
        this.saved.emit({ ...this.bloqueio, ...changes } as Bloqueio);
      } else {
        const criado = await this.data.addBloqueio({
          prof: this.profV || null,
          data: this.dataV,
          ini: this.iniV,
          fim: this.fimV,
          tipo: this.tipoV,
          motivo: this.motivoV,
        });
        this.saved.emit(criado);
      }
    } finally {
      this.salvando = false;
    }
  }

  async onDelete() {
    if (!this.bloqueio) return;
    if (!confirm('Excluir este bloqueio?')) return;
    this.salvando = true;
    try {
      await this.data.removeBloqueio(this.bloqueio.id);
      this.removed.emit(this.bloqueio.id);
    } finally {
      this.salvando = false;
    }
  }
}
