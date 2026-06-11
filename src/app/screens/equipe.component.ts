import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../icon.component';
import { AvatarComponent } from '../shared/avatar.component';
import { MenuComponent, MenuItem } from '../shared/menu.component';
import { ModalComponent } from '../shared/modal.component';
import { DataService, Staff } from '../data.service';

@Component({
  selector: 'app-equipe',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, AvatarComponent, MenuComponent, ModalComponent],
  template: `
    <div class="page">

      <!-- Cabeçalho -->
      <div class="row" style="margin-bottom:16px">
        <div class="col" style="line-height:1.3">
          <div style="font-weight:700;font-size:16px">{{ data.staff.length }} profissionais ativos</div>
          <div class="muted" style="font-size:13px">Horários, especialidades, comissão e metas alimentam a disponibilidade da agenda.</div>
        </div>
        <button class="btn btn-primary" style="margin-left:auto" (click)="openNovo()">
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
              <app-menu [items]="menuItems(p)"></app-menu>
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

    @if (modalAberto) {
      <app-modal [title]="editando ? 'Editar profissional' : 'Novo profissional'" [wide]="true" (close)="closeModal()">

        <div style="display:flex;flex-direction:column;gap:16px">

          <!-- Nome + Apelido + Cor -->
          <div class="row" style="gap:12px;flex-wrap:wrap">
            <div class="field" style="flex:2;min-width:160px">
              <label>Nome completo</label>
              <input class="input" [(ngModel)]="draft.nome" placeholder="Ex: Rafael Moura">
            </div>
            <div class="field" style="flex:1;min-width:100px">
              <label>Apelido</label>
              <input class="input" [(ngModel)]="draft.apelido" placeholder="Ex: Rafa">
            </div>
            <div class="field">
              <label>Cor</label>
              <input type="color" [(ngModel)]="draft.cor"
                     style="height:38px;width:60px;padding:2px;border:1px solid var(--border);border-radius:var(--r-md);cursor:pointer;background:var(--surface)">
            </div>
          </div>

          <!-- Apresentação -->
          <div class="field">
            <label>Apresentação</label>
            <input class="input" [(ngModel)]="draft.bio" placeholder="Ex: Barbeiro-chefe. 8 anos de navalha.">
          </div>

          <!-- Contato + Comissão + Meta -->
          <div class="row" style="gap:12px;flex-wrap:wrap">
            <div class="field" style="flex:2;min-width:160px">
              <label>Contato (WhatsApp)</label>
              <input class="input" [(ngModel)]="draft.contato" placeholder="(11) 99999-0000">
            </div>
            <div class="field" style="flex:1;min-width:80px">
              <label>Comissão %</label>
              <input class="input" type="number" [(ngModel)]="draft.comissao" min="0" max="100">
            </div>
            <div class="field" style="flex:1;min-width:110px">
              <label>Meta mensal (R$)</label>
              <input class="input" type="number" [(ngModel)]="draft.meta" min="0">
            </div>
          </div>

          <!-- Horário de trabalho -->
          <div class="row" style="gap:12px;flex-wrap:wrap">
            <div class="field" style="flex:1;min-width:110px">
              <label>Início do expediente</label>
              <input class="input" type="time" [(ngModel)]="draft.inicio">
            </div>
            <div class="field" style="flex:1;min-width:110px">
              <label>Fim do expediente</label>
              <input class="input" type="time" [(ngModel)]="draft.fim">
            </div>
          </div>

          <!-- Dias de trabalho -->
          <div class="field">
            <label>Dias de trabalho</label>
            <div class="row" style="gap:6px;margin-top:6px">
              @for (dia of DIAS; track dia[0]) {
                <button type="button" (click)="toggleFolga(dia[0])"
                  style="flex:1;padding:8px 0;border-radius:8px;font-size:12px;font-weight:700;border:1px solid;transition:background .15s,color .15s,border-color .15s"
                  [style.background]="draftFolga.includes(dia[0]) ? 'var(--surface-2)' : 'var(--accent-soft)'"
                  [style.color]="draftFolga.includes(dia[0]) ? 'var(--text-3)' : 'var(--accent-text)'"
                  [style.borderColor]="draftFolga.includes(dia[0]) ? 'var(--border)' : 'var(--accent)'"
                  [title]="draftFolga.includes(dia[0]) ? 'Folga — clique para marcar como dia útil' : 'Trabalha — clique para definir folga'">
                  {{ dia[2] }}
                </button>
              }
            </div>
            <div class="muted" style="font-size:12px;margin-top:5px">Dias destacados = trabalha. Clique para alternar.</div>
          </div>

          <!-- Especialidades -->
          <div class="field">
            <label>Especialidades</label>
            <div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:6px">
              @for (e of draftEsp; track $index; let i = $index) {
                <span class="tag" style="display:inline-flex;align-items:center;gap:5px">
                  {{ e }}
                  <button type="button" (click)="removeEsp(i)"
                    style="display:grid;place-items:center;width:14px;height:14px;border-radius:99px;background:rgba(0,0,0,.18);color:#fff;font-size:9px;font-weight:800;line-height:1;flex-shrink:0">
                    ✕
                  </button>
                </span>
              }
              <div class="row" style="gap:5px">
                <input class="input" [(ngModel)]="espInput"
                       placeholder="Nova especialidade…"
                       style="width:170px;height:28px;font-size:13px;padding:0 10px"
                       (keydown.enter)="addEsp()">
                <button type="button" class="btn btn-subtle btn-sm" (click)="addEsp()">
                  <app-icon name="plus" [size]="13"></app-icon>
                </button>
              </div>
            </div>
          </div>

        </div>

        <div modalFoot style="display:flex;justify-content:flex-end;gap:8px">
          <button class="btn" (click)="closeModal()">Cancelar</button>
          <button class="btn btn-primary" (click)="salvar()">
            {{ editando ? 'Salvar alterações' : 'Adicionar profissional' }}
          </button>
        </div>

      </app-modal>
    }
  `,
})
export class EquipeComponent {
  readonly DIAS: [string, string, string][] = [
    ['seg', 'S', 'Seg'], ['ter', 'T', 'Ter'], ['qua', 'Q', 'Qua'], ['qui', 'Q', 'Qui'],
    ['sex', 'S', 'Sex'], ['sab', 'S', 'Sáb'], ['dom', 'D', 'Dom'],
  ];

  modalAberto = false;
  editando: Staff | null = null;
  draft: Partial<Staff> = {};
  draftFolga: string[] = [];
  draftEsp: string[] = [];
  espInput = '';

  constructor(public data: DataService) {}

  menuItems(p: Staff): MenuItem[] {
    return [
      { label: 'Editar perfil',  icon: 'edit',     onClick: () => this.openEdit(p) },
      { label: 'Ver agenda',     icon: 'calendar' },
      { label: 'Definir folga',  icon: 'clock'    },
      { divider: true },
      { label: 'Desativar',      icon: 'x', danger: true },
    ];
  }

  openNovo() {
    this.editando = null;
    this.draft = { nome: '', apelido: '', bio: '', cor: '#0e9f6e', contato: '', comissao: 40, meta: 5000, inicio: '09:00', fim: '18:00' };
    this.draftFolga = ['dom'];
    this.draftEsp = [];
    this.espInput = '';
    this.modalAberto = true;
  }

  openEdit(p: Staff) {
    this.editando = p;
    this.draft = { ...p };
    this.draftFolga = [...p.folga];
    this.draftEsp = [...p.especialidades];
    this.espInput = '';
    this.modalAberto = true;
  }

  closeModal() {
    this.modalAberto = false;
    this.editando = null;
  }

  toggleFolga(dia: string) {
    const i = this.draftFolga.indexOf(dia);
    if (i >= 0) this.draftFolga.splice(i, 1);
    else this.draftFolga.push(dia);
  }

  addEsp() {
    const val = this.espInput.trim();
    if (val && !this.draftEsp.includes(val)) this.draftEsp.push(val);
    this.espInput = '';
  }

  removeEsp(i: number) {
    this.draftEsp.splice(i, 1);
  }

  salvar() {
    const dados = { ...this.draft, folga: this.draftFolga, especialidades: this.draftEsp };
    if (this.editando) {
      this.data.updateStaff(this.editando.id, dados);
    } else {
      this.data.addStaff(dados as Omit<Staff, 'id' | 'vendido'>);
    }
    this.closeModal();
  }

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
