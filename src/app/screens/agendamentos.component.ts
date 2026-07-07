/* Tela: Agendamentos — gestão em lista, filtros, ações em massa */
import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon.component';
import { AvatarComponent } from '../shared/avatar.component';
import { StatusPillComponent } from '../shared/status-pill.component';
import { MenuComponent } from '../shared/menu.component';
import { SelectComponent, SelectOption } from '../shared/select.component';
import { DataService } from '../data.service';

const TABS = [
  { id: 'todos', label: 'Todos' },
  { id: 'proximos', label: 'Próximos' },
  { id: 'faltas', label: 'Faltas & Cancelamentos' },
];

@Component({
  selector: 'app-agendamentos',
  standalone: true,
  imports: [CommonModule, IconComponent, AvatarComponent, StatusPillComponent, MenuComponent, SelectComponent],
  template: `
<div class="page">

  <!-- segmented tabs -->
  <div class="seg" style="margin-bottom:16px">
    @for (t of tabs; track t.id) {
      <button [class]="tab === t.id ? 'on' : ''" (click)="tab = t.id; sel = []">{{ t.label }}</button>
    }
  </div>

  <!-- faltas summary (only on faltas tab) -->
  @if (tab === 'faltas') {
    <div class="stat-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">

      <!-- MiniStat: Faltas -->
      <div class="stat" style="flex-direction:row;align-items:center;gap:14px">
        <div class="stat-ico" style="background:var(--st-faltou-bg);width:42px;height:42px">
          <app-icon name="alert" [size]="20" style="color:var(--st-faltou)"></app-icon>
        </div>
        <div class="col">
          <div class="stat-val tnum" style="font-size:24px">{{ totalFaltas }}</div>
          <div class="stat-label">Faltas (no-show)</div>
        </div>
      </div>

      <!-- MiniStat: Cancelamentos -->
      <div class="stat" style="flex-direction:row;align-items:center;gap:14px">
        <div class="stat-ico" style="background:var(--st-cancelado-bg);width:42px;height:42px">
          <app-icon name="x" [size]="20" style="color:var(--st-cancelado)"></app-icon>
        </div>
        <div class="col">
          <div class="stat-val tnum" style="font-size:24px">{{ totalCancel }}</div>
          <div class="stat-label">Cancelamentos</div>
        </div>
      </div>

      <!-- MiniStat: Receita perdida -->
      <div class="stat" style="flex-direction:row;align-items:center;gap:14px">
        <div class="stat-ico" style="background:var(--st-pendente-bg);width:42px;height:42px">
          <app-icon name="money" [size]="20" style="color:var(--st-pendente)"></app-icon>
        </div>
        <div class="col">
          <div class="stat-val tnum" style="font-size:24px">{{ data.money(custoFaltas) }}</div>
          <div class="stat-label">Receita perdida c/ faltas</div>
        </div>
      </div>

    </div>
  }

  <!-- main card -->
  <div class="card">

    <!-- toolbar -->
    <div class="filter-bar" style="padding:14px;border-bottom:1px solid var(--border)">
      <div class="search-inp">
        <app-icon name="search" [size]="16"></app-icon>
        <input placeholder="Buscar cliente…" [value]="q" (input)="q = $any($event.target).value" />
      </div>
      <div style="width:auto;min-width:160px">
        <app-select [value]="profF" (valueChange)="profF = $event" [options]="profFOptions"></app-select>
      </div>
      <div style="width:auto;min-width:150px">
        <app-select [value]="statusF" (valueChange)="statusF = $event" [options]="statusFOptions"></app-select>
      </div>
      <button class="btn btn-ghost btn-sm" style="margin-left:auto">
        <app-icon name="download" [size]="15"></app-icon> Exportar
      </button>
    </div>

    <!-- bulk action bar -->
    @if (sel.length > 0) {
      <div class="row" style="padding:10px 16px;background:var(--accent-soft);border-bottom:1px solid var(--accent-soft-2);gap:10px">
        <div style="font-weight:600;font-size:13.5px;color:var(--accent-text)">{{ sel.length }} selecionado(s)</div>
        <button class="btn btn-sm" style="background:var(--surface);color:var(--accent-text);margin-left:auto">
          <app-icon name="check" [size]="14"></app-icon> Confirmar
        </button>
        <button class="btn btn-whatsapp btn-sm">
          <app-icon name="whatsapp" [size]="14"></app-icon> Lembrar
        </button>
        <button class="btn btn-sm" style="background:var(--surface);color:var(--st-faltou)">
          <app-icon name="x" [size]="14"></app-icon> Cancelar
        </button>
        <button class="icon-btn" style="width:30px;height:30px" (click)="sel = []">
          <app-icon name="x" [size]="16"></app-icon>
        </button>
      </div>
    }

    <!-- table -->
    <div style="overflow-x:auto">
      <table class="tbl tbl-card">
        <thead>
          <tr>
            <th style="width:36px">
              <div [class]="'checkbox' + (allSel ? ' on' : '')" (click)="toggleAll()">
                @if (allSel) {
                  <app-icon name="check" [size]="13" [stroke]="3"></app-icon>
                }
              </div>
            </th>
            <th>Cliente</th>
            <th>Serviço</th>
            <th>Profissional</th>
            <th>Data / Hora</th>
            <th>Valor</th>
            <th>Status</th>
            <th style="width:44px"></th>
          </tr>
        </thead>
        <tbody>
          @for (r of rows; track r.id) {
            <tr [style.background]="sel.includes(r.id) ? 'var(--accent-soft)' : null">
              <td class="card-check">
                <div [class]="'checkbox' + (sel.includes(r.id) ? ' on' : '')" (click)="toggle(r.id)">
                  @if (sel.includes(r.id)) {
                    <app-icon name="check" [size]="13" [stroke]="3"></app-icon>
                  }
                </div>
              </td>
              <td class="card-header">
                <div class="row" style="gap:10px;cursor:pointer" (click)="onOpenCliente.emit(data.cli(r.cli).id)">
                  <app-avatar [nome]="data.cli(r.cli).nome" [cor]="data.prof(r.prof).cor" [size]="32"></app-avatar>
                  <span style="font-weight:600">{{ data.cli(r.cli).nome }}</span>
                </div>
              </td>
              <td data-label="Serviço">
                <span class="row" style="gap:7px">
                  <span style="width:8px;height:8px;border-radius:3px" [style.background]="data.srv(r.srv).cor"></span>
                  {{ data.srv(r.srv).nome }}
                </span>
              </td>
              <td class="muted" data-label="Profissional">{{ data.prof(r.prof).apelido }}</td>
              <td class="tnum" data-label="Data / Hora">{{ data.fmtData(r.data) }} · {{ r.hora }}</td>
              <td class="tnum" data-label="Valor" style="font-weight:600">{{ data.money(r.valor) }}</td>
              <td data-label="Status"><app-status-pill [status]="r.status"></app-status-pill></td>
              <td class="card-actions">
                <app-menu [items]="[
                  {label:'Confirmar', icon:'check'},
                  {label:'Reagendar', icon:'calendar'},
                  {label:'Enviar lembrete', icon:'whatsapp'},
                  {divider:true},
                  {label:'Cancelar', icon:'x', danger:true}
                ]"></app-menu>
              </td>
            </tr>
          }
        </tbody>
      </table>
      @if (rows.length === 0) {
        <div class="empty">Nenhum agendamento encontrado com esses filtros.</div>
      }
    </div>

    <!-- footer -->
    <div class="row" style="padding:12px 16px;border-top:1px solid var(--border);font-size:13px;color:var(--text-3)">
      {{ rows.length }} agendamento(s)
      <div class="row" style="margin-left:auto;gap:4px">
        <button class="btn btn-subtle btn-sm">Anterior</button>
        <button class="btn btn-subtle btn-sm">Próxima</button>
      </div>
    </div>

  </div>
</div>
`,
})
export class AgendamentosComponent {
  @Output() onOpenCliente = new EventEmitter<string>();

  get profFOptions(): SelectOption[] {
    return [
      { value: 'todos', label: 'Profissional' },
      ...this.data.staff.map(p => ({ value: p.id, label: p.apelido })),
    ];
  }
  get statusFOptions(): SelectOption[] {
    return [
      { value: 'todos', label: 'Status' },
      ...this.data.status.map(s => ({ value: s, label: this.data.statusLabels[s] })),
    ];
  }

  tabs = TABS;
  tab = 'todos';
  q = '';
  profF = 'todos';
  statusF = 'todos';
  sel: string[] = [];

  constructor(public data: DataService) {}

  get rows() {
    let rows = [...this.data.agendamentos].sort((a, b) =>
      (b.data + b.hora).localeCompare(a.data + a.hora)
    );
    if (this.tab === 'faltas')
      rows = rows.filter(r => r.status === 'faltou' || r.status === 'cancelado');
    if (this.tab === 'proximos') {
      const hoje = new Date().toISOString().slice(0, 10);
      rows = rows.filter(
        r => r.data >= hoje && !['faltou', 'cancelado', 'concluido'].includes(r.status)
      );
    }
    if (this.profF !== 'todos') rows = rows.filter(r => r.prof === this.profF);
    if (this.statusF !== 'todos') rows = rows.filter(r => r.status === this.statusF);
    if (this.q)
      rows = rows.filter(r =>
        this.data.cli(r.cli).nome.toLowerCase().includes(this.q.toLowerCase())
      );
    return rows;
  }

  get allSel(): boolean {
    return this.rows.length > 0 && this.rows.every(r => this.sel.includes(r.id));
  }

  toggleAll() {
    this.sel = this.allSel ? [] : this.rows.map(r => r.id);
  }

  toggle(id: string) {
    this.sel = this.sel.includes(id) ? this.sel.filter(x => x !== id) : [...this.sel, id];
  }

  // faltas summary getters
  get totalFaltas(): number {
    return this.data.agendamentos.filter(r => r.status === 'faltou').length;
  }

  get totalCancel(): number {
    return this.data.agendamentos.filter(r => r.status === 'cancelado').length;
  }

  get custoFaltas(): number {
    return this.data.agendamentos
      .filter(r => r.status === 'faltou')
      .reduce((s, r) => s + r.valor, 0);
  }
}
