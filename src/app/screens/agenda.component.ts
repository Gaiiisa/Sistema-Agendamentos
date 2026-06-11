/* Tela: Agenda — timeline por profissional, drag-and-drop + redimensionar */
import { Component, ElementRef, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon.component';
import { AvatarComponent } from '../shared/avatar.component';
import { StatusPillComponent } from '../shared/status-pill.component';
import { DataService, Appt, Agendamento, Staff } from '../data.service';

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

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule, IconComponent, AvatarComponent, StatusPillComponent],
  template: `
    <div class="page" [style.paddingBottom.px]="24">
      <!-- ===== Header ===== -->
      <ng-container *ngTemplateOutlet="header"></ng-container>

      @if (view !== 'dia') {
        <!-- ===== Semana / Mês ===== -->
        @if (view === 'semana') {
          <div class="card" style="padding:16px;overflow-x:auto">
            <div style="display:grid;grid-template-columns:56px repeat(6, minmax(120px,1fr));gap:1px">
              <div></div>
              @for (d of dias; track d; let i = $index) {
                <div [style.textAlign]="'center'" style="font-weight:700;font-size:13px;padding:6px 0;border-radius:8px"
                  [style.color]="i === 1 ? 'var(--accent-text)' : 'var(--text)'"
                  [style.background]="i === 1 ? 'var(--accent-soft)' : 'transparent'">{{ d }}</div>
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
          <div class="card" style="padding:16px">
            <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">
              @for (d of mesDows; track d) {
                <div style="text-align:center;font-size:12px;font-weight:700;color:var(--text-3);padding:4px 0">{{ d }}</div>
              }
              @for (day of mesCells; track day) {
                <div [style.minHeight.px]="92" style="border-radius:10px;padding:8px"
                  [style.border]="'1px solid ' + (day === 9 ? 'var(--accent)' : 'var(--border)')"
                  [style.background]="day === 9 ? 'var(--accent-soft)' : isPastDay(day) ? 'var(--surface-2)' : 'var(--surface)'">
                  <div style="font-weight:700;font-size:13px" [style.color]="day === 9 ? 'var(--accent-text)' : isPastDay(day) ? 'var(--text-3)' : 'var(--text)'">{{ day }}</div>
                  @if (mesCnt(day) > 0) {
                    <div style="margin-top:6px;font-size:11.5px;font-weight:600;color:var(--text-2)">
                      <span style="display:inline-block;width:7px;height:7px;border-radius:99px;background:var(--accent);margin-right:5px"></span>{{ mesCnt(day) }} agend.
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
        <!-- ===== Dia (timeline) ===== -->
        <div class="card" style="overflow:hidden">
          <!-- cabeçalho de colunas -->
          <div style="position:sticky;top:0;background:var(--surface);z-index:5;border-bottom:1px solid var(--border)">
            <!-- barra de navegação de dia -->
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
            <!-- colunas de profissionais -->
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

          <!-- grade -->
          <div [style.display]="'grid'" [style.gridTemplateColumns]="gridCols" style="position:relative">
            <!-- coluna de horas -->
            <div style="position:relative" [style.height.px]="colH">
              @for (h of data.horarios; track h; let i = $index) {
                <div class="mono" style="position:absolute;right:8px;font-size:12px;color:var(--text-3);font-weight:600"
                  [style.top.px]="TOP_OFFSET + i * 60 * PX_MIN - 8">{{ h }}</div>
              }
            </div>
            <!-- colunas por profissional -->
            @for (p of profs; track p.id) {
              <div [attr.data-prof]="p.id" style="position:relative;border-left:1px solid var(--border)" [style.height.px]="colH">
                @for (h of data.horarios; track h; let i = $index) {
                  <div style="position:absolute;left:0;right:0;border-top:1px solid var(--border)" [style.top.px]="TOP_OFFSET + i * 60 * PX_MIN"></div>
                }
                @for (h of data.horarios; track h; let i = $index) {
                  <div style="position:absolute;left:0;right:0;border-top:1px dashed var(--border);opacity:0.5" [style.top.px]="TOP_OFFSET + i * 60 * PX_MIN + 30 * PX_MIN"></div>
                }
                <!-- agendamentos -->
                @for (a of apptsFor(p); track a.id) {
                  <div
                    (pointerdown)="startMove($event, a, durOf(a))"
                    (click)="cardClick(a)"
                    [ngStyle]="cardStyle(a)">
                    <div class="row" style="gap:5px;justify-content:space-between">
                      <span class="mono" style="font-size:11px;font-weight:700" [style.color]="data.srv(a.srv).cor">{{ cardTime(a) }}</span>
                      <div class="row" style="gap:4px">
                        @if (a.sinal) { <app-icon name="check" [size]="12" style="color:var(--accent)"></app-icon> }
                        <span [style.width.px]="8" [style.height.px]="8" style="border-radius:99px;flex-shrink:0" [style.background]="dotColor(a.status)" [title]="data.statusLabels[a.status]"></span>
                      </div>
                    </div>
                    <div style="font-weight:700;font-size:13px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ data.cli(a.cli).nome }}</div>
                    <div class="muted" style="font-size:12px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ data.srv(a.srv).nome }} · {{ data.prof(a.prof).apelido }}</div>
                    <!-- alça de resize -->
                    <div (pointerdown)="startResize($event, a, durOf(a))"
                      style="position:absolute;left:0;right:0;bottom:0;height:8px;cursor:ns-resize"></div>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <div class="row" style="margin-top:14px;gap:16px;flex-wrap:wrap;font-size:12.5px;color:var(--text-3)">
          <span class="row" style="gap:6px"><app-icon name="grip" [size]="14"></app-icon> Arraste para remarcar</span>
          <span class="row" style="gap:6px">↕ Redimensione a borda inferior para ajustar a duração</span>
          <span class="row" style="gap:6px">Clique no card para ver detalhes</span>
        </div>
      }
    </div>

    <!-- ===== Modal de confirmação de remarcação ===== -->
    @if (pending) {
      <div style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:100;display:grid;place-items:center"
        (click)="cancelDrop()">
        <div style="background:var(--surface);border-radius:var(--r-lg);padding:24px 28px;min-width:320px;max-width:420px;box-shadow:var(--sh-pop)"
          (click)="$event.stopPropagation()">
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
      <div style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:100;display:grid;place-items:center"
        (click)="semanaModal = null">
        <div style="background:var(--surface);border-radius:var(--r-lg);min-width:380px;max-width:500px;max-height:80vh;overflow:hidden;box-shadow:var(--sh-pop)"
          (click)="$event.stopPropagation()">
          <!-- cabeçalho -->
          <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px">
            <div style="flex:1">
              <div style="font-weight:700;font-size:15px">{{ semanaModal.label }}</div>
              <div class="muted" style="font-size:12.5px">{{ semanaModal.appts.length }} agendamento(s)</div>
            </div>
            <button class="icon-btn" style="width:30px;height:30px" (click)="semanaModal = null">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>
          <!-- lista -->
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

    <!-- ===== Header template ===== -->
    <ng-template #header>
      <div class="col" style="gap:14px;margin-bottom:16px">
        <div class="row" style="gap:12px;flex-wrap:wrap">
          <div class="row" style="gap:4px">
            <button class="icon-btn" style="width:36px;height:36px" [style.visibility]="isToday ? 'hidden' : 'visible'" (click)="prevDay()"><app-icon name="chevL" [size]="18"></app-icon></button>
            <button class="btn btn-ghost btn-sm" (click)="goToday()">Hoje</button>
            <button class="icon-btn" style="width:36px;height:36px" (click)="nextDay()"><app-icon name="chevR" [size]="18"></app-icon></button>
          </div>
          <div style="font-size:17px;font-weight:700;letter-spacing:-0.01em">{{ currentDateLabel }}</div>
          <div class="seg" style="margin-left:auto">
            @for (v of ['dia','semana','mes']; track v) {
              <button [class.on]="view === v" (click)="view = v">{{ v === 'dia' ? 'Dia' : v === 'semana' ? 'Semana' : 'Mês' }}</button>
            }
          </div>
        </div>
        <div class="filter-bar">
          <div class="seg">
            @for (f of STATUS_FILTERS; track f.id) {
              <button [class.on]="statusFilter === f.id" (click)="statusFilter = f.id">{{ f.label }}</button>
            }
          </div>
          <select class="select" style="width:auto;min-width:180px" [value]="profFilter" (change)="profFilter = $any($event.target).value">
            <option value="todos">Todos os profissionais</option>
            @for (p of data.staff; track p.id) { <option [value]="p.id">{{ p.nome }}</option> }
          </select>
          <button class="btn btn-ghost btn-sm" style="margin-left:auto">
            <app-icon name="lock" [size]="14"></app-icon> Bloquear horário
          </button>
        </div>
      </div>
    </ng-template>`,
})
export class AgendaComponent {
  @Input() appts: Appt[] = [];
  @Output() onOpen = new EventEmitter<Appt>();
  @Output() onNew = new EventEmitter<void>();

  readonly DAY_START = 8 * 60;
  readonly DAY_END = 18 * 60;
  readonly PX_MIN = 1.30;
  readonly SNAP = 15;
  readonly TOP_OFFSET = 20;
  readonly BOTTOM_OFFSET = 32;
  readonly MIN_CARD_H = 68;
  get colH() { return this.TOP_OFFSET + (this.DAY_END - this.DAY_START) * this.PX_MIN + this.BOTTOM_OFFSET; }
  readonly now = 13 * 60 + 20;

  readonly STATUS_FILTERS = [
    { id: 'todos', label: 'Todos' },
    { id: 'pendente', label: 'Pendentes' },
    { id: 'confirmado', label: 'Confirmados' },
    { id: 'atendimento', label: 'Em atendim.' },
  ];

  // outras visões
  readonly dias = ['Seg 8', 'Ter 9', 'Qua 10', 'Qui 11', 'Sex 12', 'Sáb 13'];
  readonly diasDatas = ['2026-06-08','2026-06-09','2026-06-10','2026-06-11','2026-06-12','2026-06-13'];
  readonly mesDows = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  readonly mesCells = Array.from({ length: 30 }, (_, i) => i + 1);

  view = 'dia';
  profFilter = 'todos';
  statusFilter = 'todos';
  currentDayOffset = 0; // 0 = hoje, +N = dias à frente

  get isToday(): boolean { return this.currentDayOffset === 0; }

  get currentDateLabel(): string {
    const base = new Date('2026-06-09T12:00:00');
    base.setDate(base.getDate() + this.currentDayOffset);
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const months = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    return `${days[base.getDay()]}, ${base.getDate()} de ${months[base.getMonth()]}`;
  }

  nextDay() { this.currentDayOffset++; }
  prevDay() { if (!this.isToday) this.currentDayOffset--; }
  goToday() { this.currentDayOffset = 0; }

  drag: Drag | null = null;
  ghost: Ghost | null = null;
  pending: Pending | null = null;
  semanaModal: { label: string; appts: Agendamento[] } | null = null;
  private wasDragged = false;

  private moveHandler?: (e: PointerEvent) => void;
  private upHandler?: () => void;

  constructor(public data: DataService, private host: ElementRef) {}

  get profs(): Staff[] {
    return this.data.staff.filter(p => this.profFilter === 'todos' || p.id === this.profFilter);
  }
  get gridCols() { return `64px repeat(${this.profs.length}, 1fr)`; }
  get semanaHrs() { return this.data.horarios.filter((_, i) => i % 2 === 0); }

  visible(a: Appt) {
    return this.statusFilter === 'todos' || a.status === this.statusFilter;
  }
  durOf(a: Appt) { return a._dur || this.data.srv(a.srv).dur; }
  countFor(p: Staff) { return this.appts.filter(a => a.prof === p.id && this.visible(a)).length; }
  apptsFor(p: Staff) { return this.appts.filter(a => a.prof === p.id && this.visible(a)); }

  // ---- valores efetivos (com ghost) ----
  private g(a: Appt): Ghost | null { return this.ghost && this.ghost.id === a.id ? this.ghost : null; }
  aMin(a: Appt) { const gh = this.g(a); return this.data.toMin(gh ? gh.ini : a.ini); }
  aDur(a: Appt) { const gh = this.g(a); return gh ? gh.dur : this.durOf(a); }
  isDragging(a: Appt) { return !!this.drag && this.drag.id === a.id; }
  topOf(a: Appt) { return this.TOP_OFFSET + (this.aMin(a) - this.DAY_START) * this.PX_MIN; }
  heightOf(a: Appt) { return Math.max(this.aDur(a) * this.PX_MIN - 3, this.MIN_CARD_H); }
  cardTime(a: Appt) {
    return a.ini + '–' + this.data.fromMin(this.data.toMin(a.ini) + this.aDur(a));
  }

  cardStyle(a: Appt) {
    const s = this.data.srv(a.srv);
    const dragging = this.isDragging(a);
    return {
      position: 'absolute', top: this.topOf(a) + 'px', left: '4px', right: '4px',
      height: this.heightOf(a) + 'px',
      background: dragging ? 'var(--surface)' : `color-mix(in oklch, ${s.cor} 10%, white)`,
      borderLeft: `3px solid ${s.cor}`,
      border: `1px solid color-mix(in oklch, ${s.cor} 28%, var(--border))`,
      borderLeftWidth: '3px', borderRadius: '8px',
      padding: '6px 9px',
      cursor: dragging ? 'grabbing' : 'grab', overflow: 'hidden',
      boxShadow: dragging ? 'var(--sh-pop)' : 'none',
      opacity: a.status === 'cancelado' || a.status === 'faltou' ? 0.6 : 1,
      zIndex: dragging ? 50 : 2, transition: dragging ? 'none' : 'box-shadow .12s',
      userSelect: 'none',
    };
  }

  dotColor(status: string) {
    return ({
      pendente: 'var(--st-pendente)', confirmado: 'var(--accent)', atendimento: 'var(--st-atendimento)',
      concluido: 'var(--st-concluido)', faltou: 'var(--st-faltou)', cancelado: 'var(--st-cancelado)',
    } as any)[status];
  }

  cardClick(a: Appt) {
    if (this.wasDragged) { this.wasDragged = false; return; }
    this.onOpen.emit(a);
  }

  // ---- drag ----
  startMove(e: PointerEvent, a: Appt, dur: number) {
    if (e.button !== 0) return;
    e.preventDefault();
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    this.wasDragged = false;
    this.drag = { id: a.id, mode: 'move', startY: e.clientY, origMin: this.data.toMin(a.ini), dur, prof: a.prof };
    this.ghost = { id: a.id, ini: a.ini, dur, prof: a.prof };
    this.attach();
  }
  startResize(e: PointerEvent, a: Appt, dur: number) {
    if (e.button !== 0) return;
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
      if (a && drag.mode === 'move' && (a.ini !== gh.ini || a.prof !== gh.prof)) {
        // Aplicar temporariamente para preview visual e exibir confirmação
        const origIni = a.ini;
        const origProf = a.prof;
        a.ini = gh.ini;
        a.prof = gh.prof;
        this.pending = { apptId: a.id, newIni: gh.ini, newProf: gh.prof, origIni, origProf };
      } else if (a) {
        // Resize ou sem mudança: aplica diretamente
        a.ini = gh.ini; a.prof = gh.prof; a._dur = gh.dur;
      }
    }
    this.drag = null;
    this.ghost = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    this.detach();
  }

  confirmDrop() {
    this.pending = null;
  }

  cancelDrop() {
    if (this.pending) {
      const a = this.appts.find(x => x.id === this.pending!.apptId);
      if (a) {
        a.ini = this.pending.origIni;
        a.prof = this.pending.origProf;
      }
    }
    this.pending = null;
  }

  // ---- semana / mês helpers ----
  semanaSlotAppts(di: number, h: string): Agendamento[] {
    const date = this.diasDatas[di];
    const slotMin = this.data.toMin(h);
    return this.data.agendamentos.filter(a =>
      a.data === date &&
      this.data.toMin(a.hora) >= slotMin &&
      this.data.toMin(a.hora) < slotMin + 120
    );
  }

  openSemanaSlot(di: number, h: string) {
    const appts = this.semanaSlotAppts(di, h);
    if (!appts.length) return;
    const slotEnd = this.data.fromMin(this.data.toMin(h) + 120);
    this.semanaModal = { label: `${this.dias[di]} · ${h}–${slotEnd}`, appts };
  }
  get mesTrailing(): null[] {
    // Junho 2026: dia 30 = Terça (getDay=2, Seg-based=1) → 5 células de preenchimento
    const d = new Date('2026-06-30T12:00:00');
    const dow = d.getDay();
    const segBased = dow === 0 ? 6 : dow - 1;
    return Array(segBased === 6 ? 0 : 6 - segBased).fill(null);
  }

  mesCnt(day: number) {
    return [9, 11, 12].includes(day) ? (day === 9 ? 15 : 8) : (day % 4 === 0 ? 6 : day % 3 === 0 ? 4 : day % 7 === 0 ? 9 : 0);
  }

  isPastDay(day: number): boolean { return day < 9; }

  mesFaturamento(day: number): number {
    const date = `2026-06-${String(day).padStart(2, '0')}`;
    return this.data.agendamentos
      .filter(a => a.data === date && a.status !== 'cancelado' && a.status !== 'faltou')
      .reduce((sum, a) => sum + a.valor, 0);
  }
}
