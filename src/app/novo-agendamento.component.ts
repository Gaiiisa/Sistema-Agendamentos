/* Novo agendamento (modal de formulário) */
import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from './icon.component';
import { AvatarComponent } from './shared/avatar.component';
import { ModalComponent } from './shared/modal.component';
import { SelectComponent, SelectOption } from './shared/select.component';
import { DataService, Servico, Staff, Cliente, Appt } from './data.service';

@Component({
  selector: 'app-novo-agendamento',
  standalone: true,
  imports: [CommonModule, IconComponent, AvatarComponent, ModalComponent, SelectComponent],
  template: `
    <app-modal title="Novo agendamento" (close)="close.emit()">
      <!-- cliente -->
      <div class="field">
        <label>Cliente</label>
        @if (cli) {
          <div class="row" style="gap:10px;padding:8px 12px;border:1px solid var(--border-strong);border-radius:var(--r-md);background:var(--surface-2)">
            <app-avatar [nome]="data.cli(cli).nome" cor="#0e9f6e" [size]="30"></app-avatar>
            <span style="font-weight:600;flex:1">{{ data.cli(cli).nome }}</span>
            <button class="icon-btn" style="width:28px;height:28px" (click)="cli=''; cliQ=''">
              <app-icon name="x" [size]="15"></app-icon>
            </button>
          </div>
        } @else {
          <div style="position:relative">
            <div class="search-inp" style="min-width:0">
              <app-icon name="search" [size]="16"></app-icon>
              <input placeholder="Buscar cliente ou cadastrar…" [value]="cliQ" (input)="cliQ=$any($event.target).value" />
              <button class="btn btn-subtle btn-sm"><app-icon name="plus" [size]="14"></app-icon> Novo</button>
            </div>
            @if (cliMatch.length > 0) {
              <div style="position:absolute;top:108%;left:0;right:0;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-md);box-shadow:var(--sh-pop);z-index:10;padding:5px">
                @for (c of cliMatch; track c.id) {
                  <button (click)="cli=c.id; cliQ=''"
                    style="display:flex;align-items:center;gap:10px;width:100%;padding:7px 9px;border-radius:7px;text-align:left"
                    (mouseenter)="bg($event, 'var(--surface-2)')" (mouseleave)="bg($event, 'transparent')">
                    <app-avatar [nome]="c.nome" cor="#2563eb" [size]="28"></app-avatar>
                    <span style="font-weight:600;font-size:14px">{{ c.nome }}</span>
                    <span class="mono muted" style="font-size:12px;margin-left:auto">{{ c.wpp }}</span>
                  </button>
                }
              </div>
            }
          </div>
        }
      </div>

      <!-- serviço -->
      <div class="field">
        <label>Serviço</label>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(150px, 1fr));gap:8px">
          @for (s of servicosAtivos.slice(0, 6); track s.id) {
            <button (click)="pick(s.id)"
              style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:var(--r-md);text-align:left;min-height:52px"
              [style.border]="'1px solid ' + (srv === s.id ? 'var(--accent)' : 'var(--border-strong)')"
              [style.background]="srv === s.id ? 'var(--accent-soft)' : 'var(--surface)'">
              <span style="width:9px;height:9px;border-radius:3px;flex-shrink:0" [style.background]="s.cor"></span>
              <div class="col" style="line-height:1.2;min-width:0">
                <span style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ s.nome }}</span>
                <span class="mono" style="font-size:11px;color:var(--text-3)">{{ s.dur }}min · {{ data.money(s.preco) }}</span>
              </div>
            </button>
          }
        </div>
      </div>

      <!-- profissional + hora -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:14px">
        <div class="field">
          <label>Profissional</label>
          <app-select [value]="prof" (valueChange)="prof=$event" [options]="profOptions" placeholder="Selecione…"></app-select>
        </div>
        <div class="field">
          <label>Data e hora{{ sObj ? ' · termina ' + data.fromMin(data.toMin(hora) + sObj.dur) : '' }}</label>
          <div class="row" style="gap:8px">
            <input class="input" [value]="'Hoje, ' + hojeLabel" readonly style="flex:1;min-width:0" />
            <input class="input" type="time" [value]="hora" (input)="hora=$any($event.target).value" style="width:110px;flex-shrink:0" />
          </div>
        </div>
      </div>

      <!-- sinal -->
      <button (click)="sinal = !sinal"
        style="display:flex;align-items:center;gap:11px;padding:11px 13px;border-radius:var(--r-md);border:1px solid var(--border);text-align:left"
        [style.background]="sinal ? 'var(--accent-soft)' : 'var(--surface-2)'">
        <div class="checkbox" [class.on]="sinal">
          @if (sinal) { <app-icon name="check" [size]="13" [stroke]="3"></app-icon> }
        </div>
        <div class="col" style="line-height:1.3">
          <span style="font-weight:600;font-size:13.5px">Exigir sinal</span>
          <span class="muted" style="font-size:12px">Cobra antecipadamente para reduzir no-show</span>
        </div>
        @if (sObj && sObj.sinal) {
          <span class="tag tag-novo" style="margin-left:auto">Recomendado</span>
        }
      </button>

      <!-- observações -->
      <div class="field">
        <label>Observações</label>
        <textarea class="input" placeholder="Preferências, alergias, detalhes…" [value]="obs" (input)="obs=$any($event.target).value"></textarea>
      </div>

      @if (erroConflito) {
        <div style="background:var(--st-faltou-bg);color:var(--st-faltou);border-radius:var(--r-md);padding:10px 12px;font-size:13px;display:flex;align-items:center;gap:8px">
          <app-icon name="alert" [size]="15"></app-icon>
          <span>{{ erroConflito }}</span>
        </div>
      }

      <div modalFoot>
        <button class="btn btn-ghost" (click)="close.emit()">Cancelar</button>
        <button class="btn btn-primary" [disabled]="!valid" [style]="!valid ? 'opacity:0.5;cursor:not-allowed' : null"
          (click)="onSave()">
          <app-icon name="check" [size]="16"></app-icon> Criar agendamento
        </button>
      </div>
    </app-modal>`,
})
export class NovoAgendamentoComponent {
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<Partial<Appt>>();

  cli = '';
  cliQ = '';
  srv = '';
  prof = '';
  hora = '14:00';
  sinal = false;
  obs = '';
  erroConflito = '';

  constructor(public data: DataService) {}

  get hojeLabel(): string {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  get sObj(): Servico | null { return this.srv ? this.data.srv(this.srv) : null; }
  get servicosAtivos(): Servico[] { return this.data.servicos.filter(s => s.ativo !== false); }
  get profsValidos(): Staff[] {
    return this.sObj ? this.data.staff.filter(p => this.sObj!.exec.includes(p.id)) : this.data.staff;
  }
  get profOptions(): SelectOption[] {
    return this.profsValidos.map(p => ({ value: p.id, label: p.nome }));
  }
  get cliMatch(): Cliente[] {
    return this.cliQ
      ? this.data.clientes.filter(c => c.nome.toLowerCase().includes(this.cliQ.toLowerCase())).slice(0, 4)
      : [];
  }
  get valid() { return !!(this.cli && this.srv && this.prof && this.hora); }

  pick(s: string) {
    this.srv = s;
    const o = this.data.srv(s);
    if (o.sinal) this.sinal = true;
    if (this.prof && !o.exec.includes(this.prof)) this.prof = '';
  }

  onSave() {
    if (!this.valid) return;
    this.erroConflito = '';
    const dur = this.sObj?.dur ?? 30;
    const hoje = new Date().toISOString().slice(0, 10);
    const conflito = this.data.bloqueadoParaAgendamento(this.prof, hoje, this.hora, dur);
    if (conflito) {
      this.erroConflito = `Existe um bloqueio (${conflito.tipo}) das ${conflito.ini} às ${conflito.fim} nesse profissional.`;
      return;
    }
    this.save.emit({ cli: this.cli, srv: this.srv, prof: this.prof, ini: this.hora, status: 'confirmado', sinal: this.sinal });
  }

  bg(e: Event, color: string) { (e.currentTarget as HTMLElement).style.background = color; }
}
