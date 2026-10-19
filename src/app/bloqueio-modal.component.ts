/* Bloqueio de horário — modal de criação/edição/visualização */
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from './icon.component';
import { ModalComponent } from './shared/modal.component';
import { SelectComponent, SelectOption } from './shared/select.component';
import { DataService, Bloqueio } from './data.service';
import { CampoErroComponent } from './shared/campo-erro.component';
import { V, validar, temErros, Erros } from './shared/validacao';

@Component({
  selector: 'app-bloqueio-modal',
  standalone: true,
  imports: [CommonModule, IconComponent, ModalComponent, SelectComponent, CampoErroComponent],
  template: `
    <app-modal [title]="tituloModal" (close)="close.emit()">
      <!-- data -->
      <div class="field">
        <label>Data<span class="req">*</span></label>
        <input class="input" [class.invalid]="erros['data']" type="date" [min]="bloqueio ? null : hojeISO" [value]="dataV" (input)="dataV = $any($event.target).value" />
        <app-campo-erro [msg]="erros['data']"></app-campo-erro>
      </div>

      <!-- horário -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div class="field">
          <label>Início<span class="req">*</span></label>
          <input class="input" [class.invalid]="erros['ini']" type="time" [value]="iniV" (input)="iniV = $any($event.target).value" />
          <app-campo-erro [msg]="erros['ini']"></app-campo-erro>
        </div>
        <div class="field">
          <label>Término<span class="req">*</span></label>
          <input class="input" [class.invalid]="erros['fim']" type="time" [value]="fimV" (input)="fimV = $any($event.target).value" />
          <app-campo-erro [msg]="erros['fim']"></app-campo-erro>
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
        <label>Motivo{{ tipoV === 'outro' ? '' : ' (opcional)' }}@if (tipoV === 'outro') {<span class="req">*</span>}</label>
        <textarea class="input" [class.invalid]="erros['motivo']" rows="2" maxlength="255" placeholder="Ex.: Almoço, treinamento, manutenção…"
          [value]="motivoV" (input)="motivoV = $any($event.target).value"></textarea>
        <app-campo-erro [msg]="erros['motivo']"></app-campo-erro>
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
        <button class="btn btn-primary" [disabled]="salvando" (click)="onSave()">
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

  readonly hojeISO = new Date().toISOString().slice(0, 10);

  /** Erros por campo: aparecem após a 1ª tentativa de salvar. */
  enviado = false;

  get erros(): Erros {
    if (!this.enviado) return {};
    return validar({
      data: [V.obrigatorio(this.dataV, 'Informe a data.'), V.data(this.dataV),
        this.bloqueio ? null : V.dataNaoPassada(this.dataV, 'Não é possível bloquear uma data que já passou.')],
      ini: [V.obrigatorio(this.iniV, 'Informe o início.'), V.hora(this.iniV)],
      fim: [V.obrigatorio(this.fimV, 'Informe o término.'), V.hora(this.fimV),
        V.horaDepois(this.fimV, this.iniV, 'O término deve ser depois do início.')],
      motivo: [this.tipoV === 'outro' ? V.obrigatorio(this.motivoV, 'Descreva o motivo do bloqueio.') : null,
        V.tamanho(this.motivoV, 0, 255)],
    });
  }

  async onSave() {
    this.erro = '';
    this.enviado = true;
    if (temErros(this.erros)) return;
    const err = this.data.conflitoBloqueio(this.profV || null, this.dataV, this.iniV, this.fimV, this.bloqueio?.id);
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
