/* Tela: Agenda — calendar (dia/semana/mês) + lista de agendamentos */
import { Component, ElementRef, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon.component';
import { AvatarComponent } from '../shared/avatar.component';
import { StatusPillComponent } from '../shared/status-pill.component';
import { MenuComponent } from '../shared/menu.component';
import { SelectComponent, SelectOption } from '../shared/select.component';
import { DataService, Appt, Agendamento, Staff, Bloqueio } from '../data.service';
import { BloqueioModalComponent } from '../bloqueio-modal.component';

interface Ghost { id: string; ini: string; dur: number; prof: string; }
interface Drag {
  id: string; mode: 'move' | 'resize'; startY: number;
  origMin: number; dur?: number; origDur?: number; prof: string;
}
interface Pending {
  apptId: string;
  newIni: string; newProf: string;
  origIni: string; origProf: string;
}

const LIST_TABS = [
  { id: 'todos',   label: 'Todos' },
  { id: 'faltas',  label: 'Faltas & Cancelamentos' },
];

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule, IconComponent, AvatarComponent, StatusPillComponent, MenuComponent, BloqueioModalComponent, SelectComponent],
  template: `
    <div class="page" [style.paddingBottom.px]="24">
      <ng-container *ngTemplateOutlet="header"></ng-container>

      <!-- ===== Modo Lista ===== -->
      @if (mode === 'lista') {

        <!-- faltas summary -->
        @if (listTab === 'faltas') {
          <div class="stat-grid" style="grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));margin-bottom:16px">
            <div class="stat" style="flex-direction:row;align-items:center;gap:14px">
              <div class="stat-ico" style="background:var(--st-faltou-bg);width:42px;height:42px">
                <app-icon name="alert" [size]="20" style="color:var(--st-faltou)"></app-icon>
              </div>
              <div class="col">
                <div class="stat-val tnum" style="font-size:24px">{{ totalFaltas }}</div>
                <div class="stat-label">Faltas (no-show)</div>
              </div>
            </div>
            <div class="stat" style="flex-direction:row;align-items:center;gap:14px">
              <div class="stat-ico" style="background:var(--st-cancelado-bg);width:42px;height:42px">
                <app-icon name="x" [size]="20" style="color:var(--st-cancelado)"></app-icon>
              </div>
              <div class="col">
                <div class="stat-val tnum" style="font-size:24px">{{ totalCancel }}</div>
                <div class="stat-label">Cancelamentos</div>
              </div>
            </div>
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

        <div class="card">
          <!-- toolbar -->
          <div class="filter-bar" style="padding:14px;border-bottom:1px solid var(--border)">
            <div class="search-inp">
              <app-icon name="search" [size]="16"></app-icon>
              <input placeholder="Buscar cliente…" [value]="q" (input)="q = $any($event.target).value; onFilterChange()" />
            </div>
            <div style="width:auto;min-width:160px">
              <app-select [value]="listProfF" (valueChange)="listProfF = $event; onFilterChange()" [options]="profFilterAliasOptions"></app-select>
            </div>
            <div style="width:auto;min-width:150px">
              <app-select [value]="listStatusF" (valueChange)="listStatusF = $event; onFilterChange()" [options]="statusFilterOptions"></app-select>
            </div>
            <button class="btn btn-ghost btn-sm" style="margin-left:auto">
              <app-icon name="download" [size]="15"></app-icon> Exportar
            </button>
          </div>

          <!-- bulk action bar -->
          @if (sel.length > 0) {
            <div class="row" style="padding:10px 16px;background:var(--accent-soft);border-bottom:1px solid var(--accent-soft-2);gap:8px 10px;flex-wrap:wrap">
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
                      @if (allSel) { <app-icon name="check" [size]="13" [stroke]="3"></app-icon> }
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
                @for (r of pageRows; track r.id) {
                  <tr [style.background]="sel.includes(r.id) ? 'var(--accent-soft)' : null">
                    <td class="card-check">
                      <div [class]="'checkbox' + (sel.includes(r.id) ? ' on' : '')" (click)="toggle(r.id)">
                        @if (sel.includes(r.id)) { <app-icon name="check" [size]="13" [stroke]="3"></app-icon> }
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

          <!-- footer + paginação -->
          <div class="row" style="padding:12px 16px;border-top:1px solid var(--border);font-size:13px;color:var(--text-3);flex-wrap:wrap;gap:8px 10px">
            @if (rows.length > 0) {
              {{ pageStart }}–{{ pageEnd }} de {{ rows.length }} agendamento(s)
            } @else {
              0 agendamento(s)
            }
            <div class="row" style="margin-left:auto;gap:6px;align-items:center">
              <span class="tnum" style="font-size:12px">Página {{ page + 1 }} / {{ totalPages }}</span>
              <button class="btn btn-subtle btn-sm" [disabled]="page === 0"
                [style]="page === 0 ? 'opacity:0.5;cursor:not-allowed' : null"
                (click)="prevPage()">Anterior</button>
              <button class="btn btn-subtle btn-sm" [disabled]="page >= totalPages - 1"
                [style]="page >= totalPages - 1 ? 'opacity:0.5;cursor:not-allowed' : null"
                (click)="nextPage()">Próxima</button>
            </div>
          </div>
        </div>

      } @else {

        <!-- ===== Modo Agenda: Semana / Mês ===== -->
        @if (view !== 'dia') {
          @if (view === 'semana') {
            <div class="card agenda-semana-wrap" style="padding:16px;overflow-x:auto">
              <div class="agenda-semana-grid" style="display:grid;grid-template-columns:56px repeat(6, minmax(120px,1fr));gap:1px;min-width:min-content">
                <div></div>
                @for (d of dias; track d; let i = $index) {
                  <div [style.textAlign]="'center'" style="font-weight:700;font-size:13px;padding:6px 0;border-radius:8px"
                    [style.color]="isTodayDia(i) ? 'var(--accent-text)' : 'var(--text)'"
                    [style.background]="isTodayDia(i) ? 'var(--accent-soft)' : 'transparent'">{{ d }}</div>
                }
                @for (h of semanaHrs; track h) {
                  <div class="mono" style="font-size:11px;color:var(--text-3);padding:14px 6px 0;text-align:right">{{ h }}</div>
                  @for (d of dias; track d; let di = $index) {
                    <div style="min-height:52px;border:1px solid var(--border);border-radius:8px;margin:1px;padding:8px;background:var(--surface);display:flex;align-items:center;justify-content:center"
                      [style.cursor]="semanaSlotAppts(di, h).length ? 'pointer' : 'default'"
                      [style.borderColor]="semanaSlotAppts(di, h).length ? 'var(--accent-soft-2)' : 'var(--border)'"
                      (click)="openSemanaSlot(di, h)">
                      @if (semanaSlotAppts(di, h).length > 0) {
                        <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
                          <div style="width:28px;height:28px;border-radius:99px;background:var(--accent-soft);display:grid;place-items:center;font-size:13px;font-weight:800;color:var(--accent-text)">
                            {{ semanaSlotAppts(di, h).length }}
                          </div>
                          <span style="font-size:10px;color:var(--text-3);font-weight:600">agend.</span>
                        </div>
                      }
                    </div>
                  }
                }
              </div>
            </div>
          } @else {
            <div class="card mes-card" style="padding:16px">
              <div class="mes-grid" style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px">
                @for (d of mesDows; track d) {
                  <div style="text-align:center;font-size:12px;font-weight:700;color:var(--text-3);padding:4px 0">{{ d }}</div>
                }
                @for (day of mesCells; track day) {
                  <div class="mes-cell" [style.minHeight.px]="92" style="border-radius:10px;padding:8px"
                    [style.border]="'1px solid ' + (isTodayCell(day) ? 'var(--accent)' : 'var(--border)')"
                    [style.background]="isTodayCell(day) ? 'var(--accent-soft)' : isPastDay(day) ? 'var(--surface-2)' : 'var(--surface)'">
                    <div style="font-weight:700;font-size:13px" [style.color]="isTodayCell(day) ? 'var(--accent-text)' : isPastDay(day) ? 'var(--text-3)' : 'var(--text)'">{{ day }}</div>
                    @if (mesCnt(day) > 0) {
                      <div style="margin-top:6px;font-size:11.5px;font-weight:600;color:var(--text-2)">
                        <span style="display:inline-block;width:7px;height:7px;border-radius:99px;background:var(--accent);margin-right:5px"></span>{{ mesCnt(day) }}<span class="m-hide"> agend.</span>
                      </div>
                    }
                    @if (isPastDay(day) && mesFaturamento(day) > 0) {
                      <div style="margin-top:5px;font-size:11px;font-weight:700;color:var(--accent)">
                        {{ data.money(mesFaturamento(day)) }}
                      </div>
                    }
                  </div>
                }
                @for (_ of mesTrailing; track $index) {
                  <div [style.minHeight.px]="92" style="border-radius:10px;border:1px dashed var(--border);background:var(--surface-2);opacity:0.45"></div>
                }
              </div>
            </div>
          }
        } @else {
          <!-- ===== Dia ===== -->
          @if (isMobile) {
            <div class="card" style="padding:0;overflow:hidden">
              <div class="row" style="padding:10px 14px;border-bottom:1px solid var(--border);align-items:center;gap:8px">
                @if (!isToday) {
                  <button class="icon-btn" style="width:32px;height:32px" (click)="prevDay()">
                    <app-icon name="chevL" [size]="16"></app-icon>
                  </button>
                } @else {
                  <div style="width:40px"></div>
                }
                <div style="flex:1;text-align:center;font-size:14px;font-weight:700">
                  {{ currentDateLabel }}
                  @if (isToday) {
                    <span style="margin-left:6px;font-size:10px;font-weight:700;background:var(--accent-soft);color:var(--accent-text);border-radius:99px;padding:2px 7px">Hoje</span>
                  }
                </div>
                <button class="icon-btn" style="width:32px;height:32px" (click)="nextDay()">
                  <app-icon name="chevR" [size]="16"></app-icon>
                </button>
              </div>
              @if (mobileDayGroups.length === 0 && bloqueiosDoDia.length === 0) {
                <div style="padding:32px;text-align:center">
                  <div class="muted" style="font-size:14px">Nenhum agendamento para esse dia.</div>
                </div>
              }
              @for (b of bloqueiosDoDia; track b.id) {
                <div (click)="abrirBloqueio(b)"
                  style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-bottom:1px solid var(--border);cursor:pointer;background:var(--surface-2)">
                  <div class="mono" style="font-size:12px;font-weight:700;min-width:38px;color:var(--text-3)">{{ b.ini }}</div>
                  <div style="width:3px;align-self:stretch;border-radius:99px;flex-shrink:0;background:var(--text-3)"></div>
                  <div style="width:32px;height:32px;border-radius:99px;background:var(--surface-3);display:grid;place-items:center;flex-shrink:0">
                    <app-icon name="lock" [size]="15" style="color:var(--text-2)"></app-icon>
                  </div>
                  <div style="flex:1;min-width:0;line-height:1.3">
                    <div style="font-weight:700;font-size:13.5px">{{ tipoLabel(b.tipo) }} · {{ b.ini }}–{{ b.fim }}</div>
                    <div class="muted" style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                      {{ b.prof ? data.prof(b.prof).apelido : 'Todo o estabelecimento' }}{{ b.motivo ? ' · ' + b.motivo : '' }}
                    </div>
                  </div>
                </div>
              }
              @for (group of mobileDayGroups; track group.time) {
                @if (group.appts.length === 1) {
                  <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-bottom:1px solid var(--border);cursor:pointer"
                    (click)="onOpen.emit(group.appts[0])">
                    <div class="mono" style="font-size:12px;font-weight:700;min-width:38px;color:var(--text-3)">{{ group.time }}</div>
                    <div style="width:3px;align-self:stretch;border-radius:99px;flex-shrink:0" [style.background]="data.srv(group.appts[0].srv).cor"></div>
                    <app-avatar [nome]="data.cli(group.appts[0].cli).nome" [cor]="data.prof(group.appts[0].prof).cor" [size]="32"></app-avatar>
                    <div style="flex:1;min-width:0;line-height:1.3">
                      <div style="font-weight:700;font-size:13.5px">{{ data.cli(group.appts[0].cli).nome }}</div>
                      <div class="muted" style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ data.srv(group.appts[0].srv).nome }} · {{ data.prof(group.appts[0].prof).apelido }}</div>
                    </div>
                    <app-status-pill [status]="group.appts[0].status"></app-status-pill>
                  </div>
                } @else {
                  <div>
                    <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-bottom:1px solid var(--border);cursor:pointer;background:var(--surface-2)"
                      (click)="toggleSlot(group.time)">
                      <div class="mono" style="font-size:12px;font-weight:700;min-width:38px;color:var(--text-3)">{{ group.time }}</div>
                      <div style="flex:1">
                        <div style="font-weight:700;font-size:13.5px">{{ group.appts.length }} agendamentos</div>
                        <div class="muted" style="font-size:12px">Toque para {{ expandedSlots[group.time] ? 'recolher' : 'expandir' }}</div>
                      </div>
                      <app-icon [name]="expandedSlots[group.time] ? 'chevD' : 'chevR'" [size]="16" style="color:var(--text-3)"></app-icon>
                    </div>
                    @if (expandedSlots[group.time]) {
                      @for (a of group.appts; track a.id) {
                        <div style="display:flex;align-items:center;gap:10px;padding:10px 14px 10px 22px;border-bottom:1px solid var(--border);cursor:pointer"
                          (click)="onOpen.emit(a)">
                          <div style="width:3px;align-self:stretch;border-radius:99px;flex-shrink:0" [style.background]="data.srv(a.srv).cor"></div>
                          <app-avatar [nome]="data.cli(a.cli).nome" [cor]="data.prof(a.prof).cor" [size]="28"></app-avatar>
                          <div style="flex:1;min-width:0;line-height:1.3">
                            <div style="font-weight:700;font-size:13px">{{ data.cli(a.cli).nome }}</div>
                            <div class="muted" style="font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ data.srv(a.srv).nome }} · {{ data.prof(a.prof).apelido }}</div>
                          </div>
                          <app-status-pill [status]="a.status"></app-status-pill>
                        </div>
                      }
                    }
                  </div>
                }
              }
            </div>
          } @else {
            <!-- Desktop: Timeline drag-and-drop -->
            <div class="card" style="overflow:hidden">
              <div style="position:sticky;top:0;background:var(--surface);z-index:5;border-bottom:1px solid var(--border)">
                <div class="row" style="padding:8px 14px;border-bottom:1px solid var(--border);align-items:center;gap:8px">
                  @if (!isToday) {
                    <button class="icon-btn" style="width:30px;height:30px" (click)="prevDay()">
                      <app-icon name="chevL" [size]="16"></app-icon>
                    </button>
                  } @else {
                    <div style="width:30px;height:30px"></div>
                  }
                  <div style="flex:1;text-align:center;font-size:14px;font-weight:700;letter-spacing:-0.01em">
                    {{ currentDateLabel }}
                    @if (isToday) {
                      <span style="margin-left:8px;font-size:11px;font-weight:600;background:var(--accent-soft);color:var(--accent-text);border-radius:99px;padding:2px 8px">Hoje</span>
                    }
                  </div>
                  <button class="icon-btn" style="width:30px;height:30px" (click)="nextDay()">
                    <app-icon name="chevR" [size]="16"></app-icon>
                  </button>
                </div>
                <div [style.display]="'grid'" [style.gridTemplateColumns]="gridCols">
                  <div></div>
                  @for (p of profs; track p.id) {
                    <div style="padding:12px 14px;display:flex;align-items:center;gap:10px;border-left:1px solid var(--border)">
                      <app-avatar [nome]="p.nome" [cor]="p.cor" [size]="32"></app-avatar>
                      <div class="col" style="line-height:1.25">
                        <div style="font-weight:700;font-size:14px">{{ p.apelido }}</div>
                        <div class="muted" style="font-size:12px">{{ countFor(p) }} hoje</div>
                      </div>
                    </div>
                  }
                </div>
              </div>

              <div [style.display]="'grid'" [style.gridTemplateColumns]="gridCols" style="position:relative">
                <div style="position:relative" [style.height.px]="colH">
                  @for (h of data.horarios; track h; let i = $index) {
                    <div class="mono" style="position:absolute;right:8px;font-size:12px;color:var(--text-3);font-weight:600"
                      [style.top.px]="TOP_OFFSET + i * 60 * PX_MIN - 8">{{ h }}</div>
                  }
                </div>
                @for (p of profs; track p.id) {
                  <div [attr.data-prof]="p.id" style="position:relative;border-left:1px solid var(--border)" [style.height.px]="colH">
                    @for (h of data.horarios; track h; let i = $index) {
                      <div style="position:absolute;left:0;right:0;border-top:1px solid var(--border)" [style.top.px]="TOP_OFFSET + i * 60 * PX_MIN"></div>
                    }
                    @for (h of data.horarios; track h; let i = $index) {
                      <div style="position:absolute;left:0;right:0;border-top:1px dashed var(--border);opacity:0.5" [style.top.px]="TOP_OFFSET + i * 60 * PX_MIN + 30 * PX_MIN"></div>
                    }
                    @for (a of apptsFor(p); track a.id) {
                      <div
                        (pointerdown)="startMove($event, a, durOf(a))"
                        (click)="cardClick(a)"
                        [ngStyle]="cardStyle(a)">
                        <div class="row" style="gap:5px;justify-content:space-between">
                          <span class="mono" style="font-size:11px;font-weight:700;color:var(--text-2)">{{ cardTime(a) }}</span>
                          <div class="row" style="gap:4px">
                            @if (a.sinal) { <app-icon name="check" [size]="12" style="color:var(--accent)"></app-icon> }
                            <span aria-hidden="true"
                              [style.width.px]="8" [style.height.px]="8"
                              [style.background]="statusPalette(a.status).fg"
                              style="border-radius:99px;flex-shrink:0"></span>
                          </div>
                        </div>
                        <div style="font-weight:700;font-size:13px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ data.cli(a.cli).nome }}</div>
                        <div class="muted" style="font-size:12px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ data.srv(a.srv).nome }} · {{ data.prof(a.prof).apelido }}</div>
                        <div (pointerdown)="startResize($event, a, durOf(a))"
                          style="position:absolute;left:0;right:0;bottom:0;height:8px;cursor:ns-resize"></div>
                      </div>
                    }
                    @for (b of bloqueiosCol(p); track b.id) {
                      <div (click)="abrirBloqueio(b)"
                        [title]="'Bloqueio' + (b.motivo ? ' · ' + b.motivo : '')"
                        [ngStyle]="bloqueioStyle(b)">
                        <div class="row" style="gap:5px;justify-content:space-between;align-items:center">
                          <span class="mono" style="font-size:11px;font-weight:700;color:var(--text-2)">{{ b.ini }}–{{ b.fim }}</span>
                          <app-icon name="lock" [size]="12" style="color:var(--text-2)"></app-icon>
                        </div>
                        <div style="font-weight:700;font-size:13px;margin-top:2px;color:var(--text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                          {{ tipoLabel(b.tipo) }}{{ b.prof ? '' : ' (geral)' }}
                        </div>
                        @if (b.motivo) {
                          <div style="font-size:12px;margin-top:2px;color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ b.motivo }}</div>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            </div>

            <div class="drag-hint row" style="margin-top:14px;gap:16px;flex-wrap:wrap;font-size:12.5px;color:var(--text-3)">
              <span class="row" style="gap:6px"><app-icon name="grip" [size]="14"></app-icon> Arraste para remarcar</span>
              <span class="row" style="gap:6px">↕ Redimensione a borda inferior para ajustar a duração</span>
              <span class="row" style="gap:6px">Clique no card para ver detalhes</span>
            </div>
          }
        }
      }
    </div>

    <!-- ===== Modal de confirmação de remarcação ===== -->
    @if (pending) {
      <div class="mini-modal-overlay" (click)="cancelDrop()">
        <div class="mini-modal" style="padding:24px 28px" (click)="$event.stopPropagation()">
          <div style="font-weight:700;font-size:16px;margin-bottom:4px">Confirmar remarcação?</div>
          <div class="muted" style="font-size:13px;margin-bottom:20px">Verifique as alterações abaixo antes de salvar.</div>
          <div class="col" style="gap:12px;margin-bottom:24px">
            @if (pending.newIni !== pending.origIni) {
              <div style="background:var(--surface-2);border-radius:var(--r-md);padding:12px 14px">
                <div class="muted" style="font-size:11.5px;margin-bottom:6px">Horário</div>
                <div class="row" style="gap:10px;align-items:center;font-size:14px">
                  <span style="color:var(--text-3);text-decoration:line-through">{{ pending.origIni }}</span>
                  <app-icon name="chevR" [size]="14" style="color:var(--text-3)"></app-icon>
                  <span style="font-weight:700;color:var(--accent-text)">{{ pending.newIni }}</span>
                </div>
              </div>
            }
            @if (pending.newProf !== pending.origProf) {
              <div style="background:var(--surface-2);border-radius:var(--r-md);padding:12px 14px">
                <div class="muted" style="font-size:11.5px;margin-bottom:6px">Profissional</div>
                <div class="row" style="gap:10px;align-items:center;font-size:14px">
                  <span style="color:var(--text-3);text-decoration:line-through">{{ data.prof(pending.origProf).apelido }}</span>
                  <app-icon name="chevR" [size]="14" style="color:var(--text-3)"></app-icon>
                  <span style="font-weight:700;color:var(--accent-text)">{{ data.prof(pending.newProf).apelido }}</span>
                </div>
              </div>
            }
          </div>
          <div class="row" style="gap:10px;justify-content:flex-end">
            <button class="btn btn-ghost" (click)="cancelDrop()">Cancelar</button>
            <button class="btn btn-primary" (click)="confirmDrop()">Confirmar</button>
          </div>
        </div>
      </div>
    }

    <!-- ===== Modal de agendamentos do slot semanal ===== -->
    @if (semanaModal) {
      <div class="mini-modal-overlay" (click)="semanaModal = null">
        <div class="mini-modal wide" style="max-height:80vh" (click)="$event.stopPropagation()">
          <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px">
            <div style="flex:1">
              <div style="font-weight:700;font-size:15px">{{ semanaModal.label }}</div>
              <div class="muted" style="font-size:12.5px">{{ semanaModal.appts.length }} agendamento(s)</div>
            </div>
            <button class="icon-btn" style="width:30px;height:30px" (click)="semanaModal = null">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>
          <div style="overflow-y:auto;max-height:calc(80vh - 68px)">
            @for (a of semanaModal.appts; track a.id; let i = $index) {
              <div style="padding:12px 20px;display:flex;align-items:center;gap:12px"
                [style.borderBottom]="i < semanaModal.appts.length - 1 ? '1px solid var(--border)' : 'none'">
                <div style="width:4px;align-self:stretch;border-radius:99px;flex-shrink:0" [style.background]="data.srv(a.srv).cor"></div>
                <app-avatar [nome]="data.cli(a.cli).nome" [cor]="data.prof(a.prof).cor" [size]="36"></app-avatar>
                <div style="flex:1;line-height:1.3;min-width:0">
                  <div style="font-weight:700;font-size:14px">{{ data.cli(a.cli).nome }}</div>
                  <div class="muted" style="font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ data.srv(a.srv).nome }} · {{ data.prof(a.prof).apelido }}</div>
                </div>
                <div style="text-align:right;flex-shrink:0">
                  <div class="mono" style="font-size:13px;font-weight:700">{{ a.hora }}</div>
                  <app-status-pill [status]="a.status"></app-status-pill>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    }

    <!-- ===== Modal de bloqueio ===== -->
    @if (showBloqueioModal) {
      <app-bloqueio-modal
        [bloqueio]="bloqueioEditando"
        [dataInicial]="currentDate"
        (close)="fecharBloqueio()"
        (saved)="onBloqueioSalvo($event)"
        (removed)="onBloqueioRemovido($event)">
      </app-bloqueio-modal>
    }

    <!-- ===== Header template ===== -->
    <ng-template #header>
      <div class="col" style="gap:14px;margin-bottom:16px">
        <div class="row" style="gap:12px;flex-wrap:wrap;align-items:center">
          <!-- Modo: Agenda / Lista -->
          <div class="seg">
            <button [class.on]="mode === 'agenda'" (click)="mode = 'agenda'">
              <app-icon name="calendar" [size]="13" style="margin-right:5px"></app-icon>Agenda
            </button>
            <button [class.on]="mode === 'lista'" (click)="mode = 'lista'">
              <app-icon name="list" [size]="13" style="margin-right:5px"></app-icon>Lista
            </button>
          </div>

          @if (mode === 'agenda') {
            <!-- Tabs de lista (Todos / Próximos / Faltas) — no modo lista ficam aqui -->
            @if (view !== 'dia') {
              <div class="row" style="gap:4px">
                <button class="icon-btn" style="width:36px;height:36px" [style.visibility]="isToday ? 'hidden' : 'visible'" (click)="prevDay()"><app-icon name="chevL" [size]="18"></app-icon></button>
                <button class="btn btn-ghost btn-sm" (click)="goToday()">Hoje</button>
                <button class="icon-btn" style="width:36px;height:36px" (click)="nextDay()"><app-icon name="chevR" [size]="18"></app-icon></button>
              </div>
              <div style="font-size:17px;font-weight:700;letter-spacing:-0.01em">{{ currentDateLabel }}</div>
            }
            <div class="seg" [style.marginLeft]="isMobile ? '0' : 'auto'">
              @for (v of ['dia','semana','mes']; track v) {
                <button [class.on]="view === v" (click)="view = v">{{ v === 'dia' ? 'Dia' : v === 'semana' ? 'Semana' : 'Mês' }}</button>
              }
            </div>
          }

          @if (mode === 'lista') {
            <div class="seg" style="margin-left:auto">
              @for (t of listTabs; track t.id) {
                <button [class.on]="listTab === t.id" (click)="listTab = t.id; onFilterChange()">{{ t.label }}</button>
              }
            </div>
          }
        </div>

        @if (mode === 'agenda') {
          <div class="filter-bar">
            <div class="seg">
              @for (f of STATUS_FILTERS; track f.id) {
                <button [class.on]="statusFilter === f.id" (click)="statusFilter = f.id">{{ f.label }}</button>
              }
            </div>
            <div style="width:auto;min-width:200px">
              <app-select [value]="profFilter" (valueChange)="profFilter = $event" [options]="profFilterOptions"></app-select>
            </div>
            <button class="btn btn-ghost btn-sm" style="margin-left:auto" (click)="abrirNovoBloqueio()">
              <app-icon name="lock" [size]="14"></app-icon> Bloquear horário
            </button>
          </div>

          <!-- Legenda de cores por status: o card na grade muda de cor conforme o status. -->
          <div class="agenda-legenda" style="display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center;padding:10px 14px;margin-top:8px;background:var(--surface-2);border-radius:var(--r-md);font-size:12.5px">
            <span style="font-weight:700;color:var(--text-2);flex-shrink:0">Cor do card por status:</span>
            @for (l of STATUS_LEGENDA; track l.id) {
              <span style="display:inline-flex;align-items:center;gap:6px;flex-shrink:0" [title]="l.desc + ' — ' + l.label">
                <span [style.background]="statusPalette(l.id).bg"
                      [style.borderLeft]="'3px solid ' + statusPalette(l.id).fg"
                      style="width:22px;height:14px;border-radius:4px;border:1px solid color-mix(in oklch, currentColor 20%, transparent);flex-shrink:0"></span>
                <span style="font-weight:600;color:var(--text-2)">{{ l.label }}</span>
              </span>
            }
          </div>
        }
      </div>
    </ng-template>`,
})
export class AgendaComponent {
  @Input() appts: Appt[] = [];
  @Output() onOpen = new EventEmitter<Appt>();
  @Output() onNew = new EventEmitter<void>();

  /** Ao entrar na tela vindo de outra origem (ex.: botão "Ver agenda" da tela de Equipe),
   *  o pai passa o id do profissional a filtrar. 'todos' ou vazio = sem filtro. */
  @Input() set initialProfFilter(v: string | null | undefined) {
    if (v) this.profFilter = v;
  }

  get profFilterOptions(): SelectOption[] {
    return [
      { value: 'todos', label: 'Todos os profissionais' },
      ...this.data.staff.map(p => ({ value: p.id, label: p.nome })),
    ];
  }
  get profFilterAliasOptions(): SelectOption[] {
    return [
      { value: 'todos', label: 'Profissional' },
      ...this.data.staff.map(p => ({ value: p.id, label: p.apelido })),
    ];
  }
  get statusFilterOptions(): SelectOption[] {
    return [
      { value: 'todos', label: 'Status' },
      ...this.data.status.map(s => ({ value: s, label: this.data.statusLabels[s] })),
    ];
  }
  @Output() onOpenCliente = new EventEmitter<string>();

  // ---- modo principal ----
  mode: 'agenda' | 'lista' = 'agenda';

  // ---- agenda constants ----
  readonly DAY_START = 8 * 60;
  readonly DAY_END = 18 * 60;
  readonly PX_MIN = 1.30;
  readonly SNAP = 15;
  readonly TOP_OFFSET = 20;
  readonly BOTTOM_OFFSET = 32;
  readonly MIN_CARD_H = 68;
  get colH() { return this.TOP_OFFSET + (this.DAY_END - this.DAY_START) * this.PX_MIN + this.BOTTOM_OFFSET; }

  readonly STATUS_FILTERS = [
    { id: 'todos', label: 'Todos' },
    { id: 'pendente', label: 'Pendentes' },
    { id: 'confirmado', label: 'Confirmados' },
    { id: 'atendimento', label: 'Em atendim.' },
  ];

  readonly STATUS_LEGENDA: { id: string; label: string; desc: string }[] = [
    { id: 'pendente',    label: 'Pendente',    desc: 'aguardando confirmação do cliente' },
    { id: 'confirmado',  label: 'Confirmado',  desc: 'cliente confirmou; horário garantido' },
    { id: 'atendimento', label: 'Em atendimento', desc: 'atendimento em andamento agora' },
    { id: 'faltou',      label: 'Faltou',      desc: 'no-show — cliente não compareceu' },
    { id: 'cancelado',   label: 'Cancelado',   desc: 'agendamento desmarcado' },
  ];

  readonly mesDows = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  private readonly DIAS_ABR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  /** Data-base "hoje" recalculada quando a tela é criada. Todo o restante da
   * agenda navega a partir daqui através de `currentDayOffset`. */
  private readonly baseToday: Date = (() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; })();

  private isoLocal(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  private addDays(base: Date, n: number): Date { const d = new Date(base); d.setDate(d.getDate() + n); return d; }

  /** Segunda-feira da semana visível (a partir da data atualmente selecionada).
   * dow: 0=dom, 1=seg, ..., 6=sáb. Trata domingo como último dia da semana. */
  private semanaSegunda(): Date {
    const base = this.addDays(this.baseToday, this.currentDayOffset);
    const dow = base.getDay();
    const back = dow === 0 ? 6 : dow - 1;
    return this.addDays(base, -back);
  }

  /** Rótulos "Seg 8, Ter 9…" da semana visível (segunda a sábado). */
  get dias(): string[] {
    const seg = this.semanaSegunda();
    return Array.from({ length: 6 }, (_, i) => {
      const d = this.addDays(seg, i);
      return `${this.DIAS_ABR[d.getDay()]} ${d.getDate()}`;
    });
  }
  get diasDatas(): string[] {
    const seg = this.semanaSegunda();
    return Array.from({ length: 6 }, (_, i) => this.isoLocal(this.addDays(seg, i)));
  }

  /** Dias do mês visível — sempre o mês da data atualmente selecionada. */
  get mesCells(): number[] {
    const base = this.addDays(this.baseToday, this.currentDayOffset);
    const dias = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    return Array.from({ length: dias }, (_, i) => i + 1);
  }

  // ---- agenda state ----
  view = 'dia';
  profFilter = 'todos';
  statusFilter = 'todos';
  currentDayOffset = 0;

  drag: Drag | null = null;
  ghost: Ghost | null = null;
  pending: Pending | null = null;
  semanaModal: { label: string; appts: Agendamento[] } | null = null;
  expandedSlots: { [time: string]: boolean } = {};

  // ---- modal de bloqueio ----
  showBloqueioModal = false;
  bloqueioEditando: Bloqueio | null = null;

  readonly TIPO_LABELS: { [k: string]: string } = {
    almoco: 'Almoço', folga: 'Folga', manutencao: 'Manutenção', evento: 'Evento', outro: 'Bloqueio',
  };
  tipoLabel(t: string): string { return this.TIPO_LABELS[t] || 'Bloqueio'; }
  private wasDragged = false;
  private moveHandler?: (e: PointerEvent) => void;
  private upHandler?: () => void;

  // ---- lista state ----
  readonly listTabs = LIST_TABS;
  listTab = 'todos';
  q = '';
  listProfF = 'todos';
  listStatusF = 'todos';
  sel: string[] = [];

  constructor(public data: DataService, private host: ElementRef) {}

  get isMobile(): boolean { return typeof window !== 'undefined' && window.innerWidth <= 768; }
  get isToday(): boolean { return this.currentDayOffset === 0; }

  get currentDateLabel(): string {
    const d = this.addDays(this.baseToday, this.currentDayOffset);
    const months = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    return `${this.DIAS_ABR[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]}`;
  }

  get currentDate(): string {
    return this.isoLocal(this.addDays(this.baseToday, this.currentDayOffset));
  }

  get dayAppts(): Appt[] {
    if (this.currentDayOffset === 0) return this.appts;
    const date = this.currentDate;
    return this.data.agendamentos
      .filter(a => a.data === date)
      .map(a => ({ id: a.id, cli: a.cli, srv: a.srv, prof: a.prof, ini: a.hora, status: a.status, sinal: false }));
  }

  nextDay() { this.currentDayOffset++; }
  prevDay() { if (!this.isToday) this.currentDayOffset--; }
  goToday() { this.currentDayOffset = 0; }

  toggleSlot(time: string) { this.expandedSlots[time] = !this.expandedSlots[time]; }

  get mobileDayGroups(): { time: string; appts: Appt[] }[] {
    const visible = this.dayAppts.filter(a =>
      this.visible(a) && (this.profFilter === 'todos' || a.prof === this.profFilter)
    );
    const sorted = [...visible].sort((a, b) => this.data.toMin(a.ini) - this.data.toMin(b.ini));
    const map = new Map<string, Appt[]>();
    for (const a of sorted) {
      if (!map.has(a.ini)) map.set(a.ini, []);
      map.get(a.ini)!.push(a);
    }
    return Array.from(map.entries()).map(([time, appts]) => ({ time, appts }));
  }

  get profs(): Staff[] {
    const filtered = this.data.staff.filter(p => this.profFilter === 'todos' || p.id === this.profFilter);
    if (this.isMobile && this.view === 'dia' && this.profFilter === 'todos') return filtered.slice(0, 1);
    return filtered;
  }
  get gridCols() { return `64px repeat(${this.profs.length}, 1fr)`; }
  get semanaHrs() { return this.data.horarios.filter((_, i) => i % 2 === 0); }

  visible(a: Appt) {
    if (this.statusFilter === 'todos') return a.status !== 'concluido';
    return a.status === this.statusFilter;
  }
  durOf(a: Appt) { return a._dur || this.data.srv(a.srv).dur; }
  countFor(p: Staff) { return this.dayAppts.filter(a => a.prof === p.id && this.visible(a)).length; }
  apptsFor(p: Staff) { return this.dayAppts.filter(a => a.prof === p.id && this.visible(a)); }

  private g(a: Appt): Ghost | null { return this.ghost && this.ghost.id === a.id ? this.ghost : null; }
  aMin(a: Appt) { const gh = this.g(a); return this.data.toMin(gh ? gh.ini : a.ini); }
  aDur(a: Appt) { const gh = this.g(a); return gh ? gh.dur : this.durOf(a); }
  isDragging(a: Appt) { return !!this.drag && this.drag.id === a.id; }
  topOf(a: Appt) { return this.TOP_OFFSET + (this.aMin(a) - this.DAY_START) * this.PX_MIN; }
  heightOf(a: Appt) { return Math.max(this.aDur(a) * this.PX_MIN - 3, this.MIN_CARD_H); }
  cardTime(a: Appt) { return a.ini + '–' + this.data.fromMin(this.data.toMin(a.ini) + this.aDur(a)); }

  // ---- Layout de colunas para agendamentos sobrepostos ----
  // Cada card ocupa uma "faixa" dentro da coluna do profissional. Cards que se
  // sobrepõem no tempo dividem a largura em N faixas (estilo Google Calendar),
  // garantindo que todos fiquem visíveis lado a lado.
  private _layoutCache = new Map<string, { key: string; layout: Map<string, { col: number; cols: number }> }>();

  private layoutForProf(p: Staff): Map<string, { col: number; cols: number }> {
    const appts = this.apptsFor(p);
    // Chave que representa o estado atual dos appts desse profissional.
    // Usa posição "estática" (a.ini/durOf) para manter o layout estável durante
    // o drag — o card arrastado usa full-width via cardStyle+dragging.
    const key = appts
      .map(a => `${a.id}:${this.data.toMin(a.ini)}:${this.durOf(a)}`)
      .join('|');
    const cached = this._layoutCache.get(p.id);
    if (cached && cached.key === key) return cached.layout;

    // Duração mínima em minutos que respeita MIN_CARD_H (68px). Um card curto
    // ocupa visualmente mais do que sua duração real — precisamos considerar
    // isso ao detectar sobreposição, senão dois cards colam mesmo sem colidir
    // no tempo, e o segundo tapa o primeiro.
    const minDurVis = this.MIN_CARD_H / this.PX_MIN;

    interface Item { id: string; start: number; end: number; }
    const items: Item[] = appts.map(a => {
      const start = this.data.toMin(a.ini);
      const durVis = Math.max(this.durOf(a), minDurVis);
      return { id: a.id, start, end: start + durVis };
    }).sort((x, y) => x.start - y.start || x.end - y.end);

    const layout = new Map<string, { col: number; cols: number }>();
    let cluster: Item[] = [];
    let clusterEnd = -1;

    const flush = () => {
      // Aloca uma coluna para cada item; reaproveita colunas livres.
      const colsEnds: number[] = []; // end-time do último item de cada coluna
      const assigned: { id: string; col: number }[] = [];
      for (const it of cluster) {
        let placed = -1;
        for (let c = 0; c < colsEnds.length; c++) {
          if (colsEnds[c] <= it.start) { colsEnds[c] = it.end; placed = c; break; }
        }
        if (placed === -1) { colsEnds.push(it.end); placed = colsEnds.length - 1; }
        assigned.push({ id: it.id, col: placed });
      }
      const total = colsEnds.length;
      for (const a of assigned) layout.set(a.id, { col: a.col, cols: total });
    };

    for (const it of items) {
      if (cluster.length === 0 || it.start < clusterEnd) {
        cluster.push(it);
        clusterEnd = Math.max(clusterEnd, it.end);
      } else {
        flush();
        cluster = [it];
        clusterEnd = it.end;
      }
    }
    if (cluster.length) flush();

    this._layoutCache.set(p.id, { key, layout });
    return layout;
  }

  /** Paleta por status (usa as variáveis CSS já definidas em styles.css). */
  statusPalette(status: string): { bg: string; fg: string } {
    const map: Record<string, { bg: string; fg: string }> = {
      pendente:    { bg: 'var(--st-pendente-bg)',    fg: 'var(--st-pendente)' },
      confirmado:  { bg: 'var(--st-confirmado-bg)',  fg: 'var(--st-confirmado)' },
      atendimento: { bg: 'var(--st-atendimento-bg)', fg: 'var(--st-atendimento)' },
      concluido:   { bg: 'var(--st-concluido-bg)',   fg: 'var(--st-concluido)' },
      faltou:      { bg: 'var(--st-faltou-bg)',      fg: 'var(--st-faltou)' },
      cancelado:   { bg: 'var(--st-cancelado-bg)',   fg: 'var(--st-cancelado)' },
    };
    return map[status] || map['pendente'];
  }

  cardStyle(a: Appt) {
    const dragging = this.isDragging(a);
    // O card arrastado flutua em full-width acima do layout estático.
    const info = dragging
      ? { col: 0, cols: 1 }
      : (this.layoutForProf(this.data.prof(a.prof)).get(a.id) || { col: 0, cols: 1 });
    const { col, cols } = info;

    // Faixas percentuais com um pequeno respiro (4px em cada lado).
    const left  = `calc(${col} * (100% / ${cols}) + 4px)`;
    const width = `calc(100% / ${cols} - 8px)`;

    const pal = this.statusPalette(a.status);
    return {
      position: 'absolute', top: this.topOf(a) + 'px', left, width,
      height: this.heightOf(a) + 'px',
      background: dragging ? 'var(--surface)' : pal.bg,
      borderLeft: `3px solid ${pal.fg}`,
      border: `1px solid color-mix(in oklch, ${pal.fg} 35%, transparent)`,
      borderLeftWidth: '3px', borderRadius: '8px', padding: '6px 9px',
      cursor: dragging ? 'grabbing' : 'grab', overflow: 'hidden',
      boxShadow: dragging ? 'var(--sh-pop)' : 'none',
      opacity: a.status === 'cancelado' || a.status === 'faltou' ? 0.7 : 1,
      zIndex: dragging ? 50 : 2,
      transition: dragging ? 'none' : 'background .18s, border-color .18s, box-shadow .12s',
      userSelect: 'none',
    };
  }

  cardClick(a: Appt) {
    if (this.wasDragged) { this.wasDragged = false; return; }
    this.onOpen.emit(a);
  }

  startMove(e: PointerEvent, a: Appt, dur: number) {
    if (e.button !== 0 || this.isMobile) return;
    e.preventDefault();
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    this.wasDragged = false;
    this.drag = { id: a.id, mode: 'move', startY: e.clientY, origMin: this.data.toMin(a.ini), dur, prof: a.prof };
    this.ghost = { id: a.id, ini: a.ini, dur, prof: a.prof };
    this.attach();
  }

  startResize(e: PointerEvent, a: Appt, dur: number) {
    if (e.button !== 0 || this.isMobile) return;
    e.preventDefault(); e.stopPropagation();
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    this.drag = { id: a.id, mode: 'resize', startY: e.clientY, origMin: this.data.toMin(a.ini), origDur: dur, prof: a.prof };
    this.ghost = { id: a.id, ini: a.ini, dur, prof: a.prof };
    this.attach();
  }

  private attach() {
    this.moveHandler = (e: PointerEvent) => this.onPointerMove(e);
    this.upHandler = () => this.onPointerUp();
    window.addEventListener('pointermove', this.moveHandler);
    window.addEventListener('pointerup', this.upHandler);
  }

  private detach() {
    if (this.moveHandler) window.removeEventListener('pointermove', this.moveHandler);
    if (this.upHandler) window.removeEventListener('pointerup', this.upHandler);
    this.moveHandler = undefined; this.upHandler = undefined;
  }

  private onPointerMove(e: PointerEvent) {
    const drag = this.drag;
    if (!drag) return;
    this.wasDragged = true;
    const dy = e.clientY - drag.startY;
    if (drag.mode === 'move') {
      let newMin = drag.origMin + Math.round((dy / this.PX_MIN) / this.SNAP) * this.SNAP;
      newMin = Math.max(this.DAY_START, Math.min(this.DAY_END - (drag.dur || 0), newMin));
      let prof = drag.prof;
      const cols = this.host.nativeElement.querySelectorAll('[data-prof]');
      cols.forEach((el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right) prof = el.getAttribute('data-prof')!;
      });
      this.ghost = { id: drag.id, ini: this.data.fromMin(newMin), dur: drag.dur || 0, prof };
    } else {
      let newDur = (drag.origDur || 0) + Math.round((dy / this.PX_MIN) / this.SNAP) * this.SNAP;
      newDur = Math.max(this.SNAP, Math.min(this.DAY_END - drag.origMin, newDur));
      this.ghost = { id: drag.id, ini: this.data.fromMin(drag.origMin), dur: newDur, prof: drag.prof };
    }
  }

  private onPointerUp() {
    const gh = this.ghost;
    const drag = this.drag;
    if (gh && drag) {
      const a = this.appts.find(x => x.id === gh.id);
      if (a) {
        const dur = gh.dur || this.durOf(a);
        const conflito = this.data.bloqueadoParaAgendamento(gh.prof, this.currentDate, gh.ini, dur);
        if (conflito) {
          // reverte visualmente — não altera o agendamento
          this.drag = null; this.ghost = null;
          document.body.style.cursor = ''; document.body.style.userSelect = '';
          this.detach();
          alert(`Não é possível mover para esse horário: existe um bloqueio (${this.tipoLabel(conflito.tipo)}) das ${conflito.ini} às ${conflito.fim}.`);
          return;
        }
        if (drag.mode === 'move' && (a.ini !== gh.ini || a.prof !== gh.prof)) {
          const origIni = a.ini; const origProf = a.prof;
          a.ini = gh.ini; a.prof = gh.prof;
          this.pending = { apptId: a.id, newIni: gh.ini, newProf: gh.prof, origIni, origProf };
        } else {
          a.ini = gh.ini; a.prof = gh.prof; a._dur = gh.dur;
        }
      }
    }
    this.drag = null; this.ghost = null;
    document.body.style.cursor = ''; document.body.style.userSelect = '';
    this.detach();
  }

  confirmDrop() {
    if (this.pending) {
      const { apptId, newIni, newProf } = this.pending;
      this.data.updateAppt(apptId, { ini: newIni, prof: newProf });
    }
    this.pending = null;
  }

  cancelDrop() {
    if (this.pending) {
      const a = this.appts.find(x => x.id === this.pending!.apptId);
      if (a) { a.ini = this.pending.origIni; a.prof = this.pending.origProf; }
    }
    this.pending = null;
  }

  // ---- Bloqueios: helpers de renderização ----
  get bloqueiosDoDia(): Bloqueio[] {
    return this.data.bloqueios.filter(b => b.data === this.currentDate);
  }

  bloqueiosCol(p: Staff): Bloqueio[] {
    return this.bloqueiosDoDia.filter(b => b.prof === null || b.prof === p.id);
  }

  bloqueioStyle(b: Bloqueio) {
    const iniMin = this.data.toMin(b.ini);
    const dur = Math.max(this.SNAP, this.data.toMin(b.fim) - iniMin);
    const top = this.TOP_OFFSET + (iniMin - this.DAY_START) * this.PX_MIN;
    const height = Math.max(dur * this.PX_MIN - 3, 44);
    return {
      position: 'absolute', top: top + 'px', left: '4px', right: '4px',
      height: height + 'px',
      background: 'repeating-linear-gradient(45deg, var(--surface-2), var(--surface-2) 8px, var(--surface-3) 8px, var(--surface-3) 16px)',
      border: '1px dashed var(--border-strong)',
      borderRadius: '8px', padding: '6px 9px',
      cursor: 'pointer', overflow: 'hidden',
      zIndex: 1, userSelect: 'none',
    };
  }

  abrirNovoBloqueio() {
    this.bloqueioEditando = null;
    this.showBloqueioModal = true;
  }

  abrirBloqueio(b: Bloqueio) {
    this.bloqueioEditando = b;
    this.showBloqueioModal = true;
  }

  fecharBloqueio() {
    this.showBloqueioModal = false;
    this.bloqueioEditando = null;
  }

  onBloqueioSalvo(_b: Bloqueio) { this.fecharBloqueio(); }
  onBloqueioRemovido(_id: string) { this.fecharBloqueio(); }

  semanaSlotAppts(di: number, h: string): Agendamento[] {
    const date = this.diasDatas[di];
    const slotMin = this.data.toMin(h);
    return this.data.agendamentos.filter(a =>
      a.data === date && this.data.toMin(a.hora) >= slotMin && this.data.toMin(a.hora) < slotMin + 120
    );
  }

  openSemanaSlot(di: number, h: string) {
    const appts = this.semanaSlotAppts(di, h);
    if (!appts.length) return;
    const slotEnd = this.data.fromMin(this.data.toMin(h) + 120);
    this.semanaModal = { label: `${this.dias[di]} · ${h}–${slotEnd}`, appts };
  }

  /** Mês/ano do calendário visível (segue o dia selecionado). */
  private viewMonthPrefix(): string {
    const d = this.addDays(this.baseToday, this.currentDayOffset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  private mesDate(day: number): string {
    return `${this.viewMonthPrefix()}-${String(day).padStart(2, '0')}`;
  }

  get mesTrailing(): null[] {
    const base = this.addDays(this.baseToday, this.currentDayOffset);
    const ultimo = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    const dow = ultimo.getDay();
    const segBased = dow === 0 ? 6 : dow - 1;
    return Array(segBased === 6 ? 0 : 6 - segBased).fill(null);
  }

  mesCnt(day: number): number {
    const date = this.mesDate(day);
    return this.data.agendamentos.filter(a => a.data === date && a.status !== 'cancelado' && a.status !== 'faltou').length;
  }

  isPastDay(day: number): boolean {
    const today = this.isoLocal(this.baseToday);
    return this.mesDate(day) < today;
  }

  isTodayCell(day: number): boolean {
    return this.mesDate(day) === this.isoLocal(this.baseToday);
  }

  isTodayDia(i: number): boolean {
    return this.diasDatas[i] === this.isoLocal(this.baseToday);
  }

  mesFaturamento(day: number): number {
    const date = this.mesDate(day);
    return this.data.agendamentos
      .filter(a => a.data === date && a.status !== 'cancelado' && a.status !== 'faltou')
      .reduce((sum, a) => sum + a.valor, 0);
  }

  // ---- lista: cache + paginação ----
  readonly PAGE_SIZE = 50;
  page = 0;

  private _rowsCache: Agendamento[] | null = null;
  private _rowsKey = '';

  /** Lista filtrada e ordenada COMPLETA. Cacheada por (agendamentos.length +
   * filtros), invalida-se automaticamente quando algum filtro muda. Isso é
   * essencial porque o template referencia `rows` várias vezes por ciclo de
   * change detection — sem cache, a lista de milhares de itens era ordenada
   * e filtrada dezenas de vezes por interação, travando o navegador. */
  get rows(): Agendamento[] {
    const key = [
      this.data.agendamentos.length, this.listTab, this.listProfF,
      this.listStatusF, this.q,
    ].join('|');
    if (this._rowsCache && this._rowsKey === key) return this._rowsCache;

    let rows = [...this.data.agendamentos].sort((a, b) =>
      (b.data + b.hora).localeCompare(a.data + a.hora)
    );
    if (this.listTab === 'faltas')
      rows = rows.filter(r => r.status === 'faltou' || r.status === 'cancelado');
    if (this.listProfF !== 'todos') rows = rows.filter(r => r.prof === this.listProfF);
    if (this.listStatusF !== 'todos') rows = rows.filter(r => r.status === this.listStatusF);
    if (this.q) {
      const qLower = this.q.toLowerCase();
      rows = rows.filter(r => {
        const c = this.data.cli(r.cli);
        return c && c.nome.toLowerCase().includes(qLower);
      });
    }
    this._rowsCache = rows;
    this._rowsKey = key;
    // reset da página se o total encolheu
    const maxPage = Math.max(0, Math.ceil(rows.length / this.PAGE_SIZE) - 1);
    if (this.page > maxPage) this.page = maxPage;
    return rows;
  }

  /** Linhas visíveis na página atual — é isso que a tabela renderiza. */
  get pageRows(): Agendamento[] {
    const start = this.page * this.PAGE_SIZE;
    return this.rows.slice(start, start + this.PAGE_SIZE);
  }
  get totalPages(): number { return Math.max(1, Math.ceil(this.rows.length / this.PAGE_SIZE)); }
  get pageStart(): number { return this.rows.length === 0 ? 0 : this.page * this.PAGE_SIZE + 1; }
  get pageEnd(): number { return Math.min(this.rows.length, (this.page + 1) * this.PAGE_SIZE); }

  prevPage() { if (this.page > 0) this.page--; }
  nextPage() { if (this.page < this.totalPages - 1) this.page++; }

  /** Chamado sempre que um filtro muda: invalida cache e volta para a 1ª página. */
  onFilterChange() { this._rowsCache = null; this.page = 0; this.sel = []; }

  /** allSel/toggleAll operam sobre a página visível — evita ações em massa
   * acidentais sobre milhares de linhas. */
  get allSel(): boolean {
    const pr = this.pageRows;
    return pr.length > 0 && pr.every(r => this.sel.includes(r.id));
  }
  toggleAll() {
    const pr = this.pageRows;
    if (this.allSel) {
      const ids = new Set(pr.map(r => r.id));
      this.sel = this.sel.filter(id => !ids.has(id));
    } else {
      const set = new Set(this.sel);
      for (const r of pr) set.add(r.id);
      this.sel = Array.from(set);
    }
  }
  toggle(id: string) { this.sel = this.sel.includes(id) ? this.sel.filter(x => x !== id) : [...this.sel, id]; }

  get totalFaltas(): number { return this.data.agendamentos.filter(r => r.status === 'faltou').length; }
  get totalCancel(): number { return this.data.agendamentos.filter(r => r.status === 'cancelado').length; }
  get custoFaltas(): number {
    return this.data.agendamentos.filter(r => r.status === 'faltou').reduce((s, r) => s + r.valor, 0);
  }
}
