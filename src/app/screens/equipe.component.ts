import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon.component';
import { AvatarComponent } from '../shared/avatar.component';
import { MenuComponent } from '../shared/menu.component';
import { DataService } from '../data.service';
import { Staff } from '../data.service';

@Component({
  selector: 'app-equipe',
  standalone: true,
  imports: [CommonModule, IconComponent, AvatarComponent, MenuComponent],
  template: `
    <div class="page">

      <!-- Cabeçalho -->
      <div class="row" style="margin-bottom:16px">
        <div class="col" style="line-height:1.3">
          <div style="font-weight:700;font-size:16px">{{ data.staff.length }} profissionais ativos</div>
          <div class="muted" style="font-size:13px">Horários, especialidades, comissão e metas alimentam a disponibilidade da agenda.</div>
        </div>
        <button class="btn btn-primary" style="margin-left:auto">
          <app-icon name="plus" [size]="16"></app-icon>
          Adicionar profissional
        </button>
      </div>

      <!-- Grade de cards -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(360px, 1fr));gap:16px">

        @for (p of data.staff; track p.id) {
          <div class="card" style="padding:18px;display:flex;flex-direction:column;gap:15px">

            <!-- Topo: avatar + nome/bio + menu -->
            <div class="row" style="gap:13px;align-items:flex-start">
              <app-avatar [nome]="p.nome" [cor]="p.cor" [size]="52"></app-avatar>
              <div class="col" style="flex:1;line-height:1.3">
                <div style="font-weight:700;font-size:16.5px;letter-spacing:-0.01em">{{ p.nome }}</div>
                <div class="muted" style="font-size:13px">{{ p.bio }}</div>
              </div>
              <app-menu [items]="[
                { label: 'Editar perfil',  icon: 'edit'     },
                { label: 'Ver agenda',     icon: 'calendar' },
                { label: 'Definir folga',  icon: 'clock'    },
                { divider: true },
                { label: 'Desativar',      icon: 'x', danger: true }
              ]"></app-menu>
            </div>

            <!-- Especialidades -->
            <div class="row" style="gap:6px;flex-wrap:wrap">
              @for (e of p.especialidades; track $index) {
                <span class="tag">{{ e }}</span>
              }
            </div>

            <div class="divider"></div>

            <!-- Meta do mês -->
            <div class="col" style="gap:7px">
              <div class="row" style="font-size:13px">
                <app-icon name="target" [size]="14" style="color:var(--text-3);margin-right:6px"></app-icon>
                <span style="font-weight:600">Meta do mês</span>
                <span class="tnum"
                      style="margin-left:auto;font-weight:700"
                      [style.color]="pct(p) >= 100 ? 'var(--accent-text)' : 'var(--text)'">
                  {{ data.money(p.vendido) }} / {{ data.money(p.meta) }}
                </span>
              </div>
              <div class="progress">
                <span [style.width]="progressWidth(p)"
                      [style.background]="progressBg(p)"></span>
              </div>
              <div class="muted" style="font-size:12px">{{ pct(p) }}% da meta</div>
            </div>

            <!-- Jornada / dias da semana -->
            <div class="col" style="gap:8px">
              <div class="row" style="font-size:13px">
                <app-icon name="clock" [size]="14" style="color:var(--text-3);margin-right:6px"></app-icon>
                <span style="font-weight:600">Jornada</span>
                <span class="mono muted" style="margin-left:auto;font-size:12.5px">{{ p.inicio }}–{{ p.fim }}</span>
              </div>
              <div class="row" style="gap:5px">
                @for (dia of DIAS; track $index) {
                  <div
                    [title]="p.folga.includes(dia[0]) ? 'Folga' : 'Trabalha'"
                    [ngStyle]="{
                      flex: 1,
                      'text-align': 'center',
                      padding: '5px 0',
                      'border-radius': '6px',
                      'font-size': '11.5px',
                      'font-weight': 700,
                      background: p.folga.includes(dia[0]) ? 'var(--surface-2)' : 'var(--accent-soft)',
                      color: p.folga.includes(dia[0]) ? 'var(--text-3)' : 'var(--accent-text)',
                      'text-decoration': p.folga.includes(dia[0]) ? 'line-through' : 'none'
                    }">{{ dia[1] }}</div>
                }
              </div>
            </div>

            <!-- Rodapé: comissão + atendimentos hoje -->
            <div class="row" style="gap:10px;padding-top:4px">
              <div class="col" style="flex:1;background:var(--surface-2);border-radius:var(--r-md);padding:9px 12px">
                <span class="tnum" style="font-weight:700;font-size:15px">{{ p.comissao }}%</span>
                <span class="muted" style="font-size:11.5px">comissão · {{ data.money(comissaoMes(p)) }} no mês</span>
              </div>
              <div class="col" style="flex:1;background:var(--surface-2);border-radius:var(--r-md);padding:9px 12px">
                <span class="tnum" style="font-weight:700;font-size:15px">{{ atendeHoje(p) }}</span>
                <span class="muted" style="font-size:11.5px">atendimentos hoje</span>
              </div>
            </div>

          </div>
        }

      </div>
    </div>
  `,
})
export class EquipeComponent {
  readonly DIAS: [string, string][] = [
    ['seg','S'], ['ter','T'], ['qua','Q'], ['qui','Q'],
    ['sex','S'], ['sab','S'], ['dom','D'],
  ];

  constructor(public data: DataService) {}

  pct(p: Staff): number {
    return Math.round(p.vendido / p.meta * 100);
  }

  atendeHoje(p: Staff): number {
    return this.data.hoje.filter(a => a.prof === p.id).length;
  }

  comissaoMes(p: Staff): number {
    return Math.round(p.vendido * p.comissao / 100);
  }

  progressWidth(p: Staff): string {
    return Math.min(this.pct(p), 100) + '%';
  }

  progressBg(p: Staff): string {
    return this.pct(p) >= 100 ? 'var(--accent)' : p.cor;
  }
}
