/* Tela: Agenda — timeline por profissional, drag-and-drop + redimensionar */
import { Component, ElementRef, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon.component';
import { AvatarComponent } from '../shared/avatar.component';
import { StatusPillComponent } from '../shared/status-pill.component';
import { DataService, Appt, Staff } from '../data.service';

interface Ghost { id: string; ini: string; dur: number; prof: string; }
interface Drag {
  id: string; mode: 'move' | 'resize'; startY: number;
  origMin: number; dur?: number; origDur?: number; prof: string;
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
                  <div style="min-height:52px;border:1px solid var(--border);border-radius:8px;margin:1px;padding:4px;background:var(--surface)">
                    @if (semanaHas(di, h)) {
                      <div style="background:var(--accent-soft);border-left:3px solid var(--accent);border-radius:6px;padding:3px 6px;font-size:11px;font-weight:600;color:var(--accent-text)">Atendimento</div>
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
                  [style.background]="day === 9 ? 'var(--accent-soft)' : 'var(--surface)'">
                  <div style="font-weight:700;font-size:13px" [style.color]="day === 9 ? 'var(--accent-text)' : 'var(--text)'">{{ day }}</div>
                  @if (mesCnt(day) > 0) {
                    <div style="margin-top:6px;font-size:11.5px;font-weight:600;color:var(--text-2)">
                      <span style="display:inline-block;width:7px;height:7px;border-radius:99px;background:var(--accent);margin-right:5px"></span>{{ mesCnt(day) }} agend.
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
      } @else {
        <!-- ===== Dia (timeline) ===== -->
        <div class="card" style="overflow:hidden">
          <!-- cabeçalho de colunas -->
          <div [style.display]="'grid'" [style.gridTemplateColumns]="gridCols" style="border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--surface);z-index:5">
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

          <!-- grade -->
          <div [style.display]="'grid'" [style.gridTemplateColumns]="gridCols" style="position:relative">
            <!-- coluna de horas -->
            <div style="position:relative" [style.height.px]="colH">
              @for (h of data.horarios; track h; let i = $index) {
                <div class="mono" style="position:absolute;right:8px;font-size:12px;color:var(--text-3);font-weight:600"
                  [style.top.px]="i * 60 * PX_MIN - 8">{{ h }}</div>
              }
            </div>
            <!-- colunas por profissional -->
            @for (p of profs; track p.id) {
              <div [attr.data-prof]="p.id" style="position:relative;border-left:1px solid var(--border)" [style.height.px]="colH">
                @for (h of data.horarios; track h; let i = $index) {
                  <div style="position:absolute;left:0;right:0;border-top:1px solid var(--border)" [style.top.px]="i * 60 * PX_MIN"></div>
                }
                @for (h of data.horarios; track h; let i = $index) {
                  <div style="position:absolute;left:0;right:0;border-top:1px dashed var(--border);opacity:0.5" [style.top.px]="i * 60 * PX_MIN + 30 * PX_MIN"></div>
                }
                @if (now >= DAY_START && now <= DAY_END) {
                  <div style="position:absolute;left:0;right:0;height:2px;background:var(--st-faltou);z-index:4" [style.top.px]="(now - DAY_START) * PX_MIN">
                    <div style="position:absolute;left:-4px;top:-3px;width:8px;height:8px;border-radius:99px;background:var(--st-faltou)"></div>
                  </div>
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
                    @if (!isCompact(a)) {
                      <div style="font-weight:700;font-size:13px;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ data.cli(a.cli).nome }}</div>
                    }
                    @if (isCompact(a)) {
                      <span style="font-size:11px;font-weight:600;color:var(--text-2)"> {{ data.cli(a.cli).nome.split(' ')[0] }}</span>
                    } @else if (heightOf(a) > 58) {
                      <div class="muted" style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ data.srv(a.srv).nome }}</div>
                    }
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

    <!-- ===== Header template ===== -->
    <ng-template #header>
      <div class="col" style="gap:14px;margin-bottom:16px">
        <div class="row" style="gap:12px;flex-wrap:wrap">
          <div class="row" style="gap:4px">
            <button class="icon-btn" style="width:36px;height:36px"><app-icon name="chevL" [size]="18"></app-icon></button>
            <button class="btn btn-ghost btn-sm">Hoje</button>
            <button class="icon-btn" style="width:36px;height:36px"><app-icon name="chevR" [size]="18"></app-icon></button>
          </div>
          <div style="font-size:17px;font-weight:700;letter-spacing:-0.01em">Terça, 9 de junho</div>
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

  readonly DAY_START = 9 * 60;
  readonly DAY_END = 20 * 60;
  readonly PX_MIN = 1.30;
  readonly SNAP = 15;
  get colH() { return (this.DAY_END - this.DAY_START) * this.PX_MIN; }
  readonly now = 13 * 60 + 20;

  readonly STATUS_FILTERS = [
    { id: 'todos', label: 'Todos' },
    { id: 'pendente', label: 'Pendentes' },
    { id: 'confirmado', label: 'Confirmados' },
    { id: 'atendimento', label: 'Em atendim.' },
  ];

  // outras visões
  readonly dias = ['Seg 8', 'Ter 9', 'Qua 10', 'Qui 11', 'Sex 12', 'Sáb 13'];
  readonly mesDows = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  readonly mesCells = Array.from({ length: 30 }, (_, i) => i + 1);

  view = 'dia';
  profFilter = 'todos';
  statusFilter = 'todos';
  drag: Drag | null = null;
  ghost: Ghost | null = null;

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
  topOf(a: Appt) { return (this.aMin(a) - this.DAY_START) * this.PX_MIN; }
  heightOf(a: Appt) { return this.aDur(a) * this.PX_MIN - 3; }
  isCompact(a: Appt) { return this.heightOf(a) < 46; }
  cardTime(a: Appt) {
    const compact = this.isCompact(a);
    return a.ini + (compact ? '' : '–' + this.data.fromMin(this.data.toMin(a.ini) + this.aDur(a)));
  }

  cardStyle(a: Appt) {
    const s = this.data.srv(a.srv);
    const dragging = this.isDragging(a);
    const compact = this.isCompact(a);
    return {
      position: 'absolute', top: this.topOf(a) + 'px', left: '4px', right: '4px',
      height: Math.max(this.heightOf(a), 22) + 'px',
      background: dragging ? 'var(--surface)' : `color-mix(in oklch, ${s.cor} 9%, white)`,
      borderLeft: `3px solid ${s.cor}`,
      border: `1px solid color-mix(in oklch, ${s.cor} 28%, var(--border))`,
      borderLeftWidth: '3px', borderRadius: '8px',
      padding: compact ? '3px 8px' : '6px 9px',
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

  cardClick(a: Appt) { if (!this.isDragging(a)) this.onOpen.emit(a); }

  // ---- drag ----
  startMove(e: PointerEvent, a: Appt, dur: number) {
    if (e.button !== 0) return;
    e.preventDefault();
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
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
    if (this.ghost) {
      const gh = this.ghost;
      const a = this.appts.find(x => x.id === gh.id);
      if (a) { a.ini = gh.ini; a.prof = gh.prof; a._dur = gh.dur; }
    }
    this.drag = null; this.ghost = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    this.detach();
  }

  // ---- semana / mês helpers ----
  semanaHas(di: number, h: string) {
    return (di === 1 && (h === '09:00' || h === '11:00' || h === '15:00')) || (di === 3 && h === '11:00') || (di === 0 && h === '13:00');
  }
  mesCnt(day: number) {
    return [9, 11, 12].includes(day) ? (day === 9 ? 15 : 8) : (day % 4 === 0 ? 6 : day % 3 === 0 ? 4 : day % 7 === 0 ? 9 : 0);
  }
}
