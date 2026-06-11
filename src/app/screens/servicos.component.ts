import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../icon.component';
import { AvatarComponent } from '../shared/avatar.component';
import { MenuComponent, MenuItem } from '../shared/menu.component';
import { ModalComponent } from '../shared/modal.component';
import { DataService, Servico, Staff } from '../data.service';

@Component({
  selector: 'app-servicos',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, AvatarComponent, MenuComponent, ModalComponent],
  template: `
    <div class="page">
      <div class="row" style="margin-bottom:16px;flex-wrap:wrap;gap:10px">
        <div class="seg">
          @for (cval of cats; track cval) {
            <button [class.on]="cat === cval" (click)="cat = cval">
              {{ cval === 'todas' ? 'Todas' : cval }}
            </button>
          }
        </div>
        <button class="btn btn-primary" style="margin-left:auto" (click)="openNovo()">
          <app-icon name="plus" [size]="16"></app-icon>
          Novo serviço
        </button>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:14px">
        @for (s of list; track s.id) {
          <div class="card" style="overflow:hidden;display:flex;flex-direction:column">

            <!-- faixa de cor / "foto" -->
            <div
              [style.height.px]="96"
              [style.background]="'linear-gradient(135deg, color-mix(in oklch, ' + s.cor + ' 16%, white), color-mix(in oklch, ' + s.cor + ' 6%, white))'"
              style="position:relative;display:grid;place-items:center">

              <div style="width:48px;height:48px;border-radius:12px;background:var(--surface);display:grid;place-items:center;box-shadow:var(--sh-sm)">
                <app-icon
                  [name]="s.cat === 'Barba' ? 'user' : s.cat === 'Estética' ? 'sparkle' : 'scissors'"
                  [size]="22"
                  [style.color]="s.cor">
                </app-icon>
              </div>

              @if (s.combo) {
                <span class="tag" style="position:absolute;top:10px;left:10px;background:var(--surface)">Combo</span>
              }
              @if (s.sinal) {
                <span class="tag tag-novo" style="position:absolute;top:10px;right:10px">Exige sinal</span>
              }

              <div style="position:absolute;bottom:10px;right:12px;font-size:11.5px;font-weight:600"
                   [style.color]="s.cor">
                {{ s.cat }}
              </div>
            </div>
            <!-- /faixa -->

            <div style="padding:16px;display:flex;flex-direction:column;gap:12px;flex:1">

              <div class="row" style="align-items:flex-start">
                <div class="col" style="flex:1;line-height:1.3">
                  <div style="font-weight:700;font-size:16px;letter-spacing:-0.01em">{{ s.nome }}</div>
                  <div class="muted" style="font-size:12.5px">{{ s.desc }}</div>
                </div>
                <app-menu [items]="menuItems(s)"></app-menu>
              </div>

              <div class="row" style="gap:16px;padding-top:4px">
                <div class="col">
                  <span class="tnum" style="font-size:20px;font-weight:800;letter-spacing:-0.02em">{{ data.money(s.preco) }}</span>
                  <span class="muted" style="font-size:11.5px">preço</span>
                </div>
                <div class="col">
                  <span class="row tnum" style="font-size:15px;font-weight:700;gap:4px">
                    <app-icon name="clock" [size]="14" style="color:var(--text-3)"></app-icon>
                    {{ s.dur }}min
                  </span>
                  <span class="muted" style="font-size:11.5px">duração</span>
                </div>
                <div class="col" style="margin-left:auto;align-items:flex-end">
                  <span class="tnum" style="font-size:15px;font-weight:700;color:var(--accent-text)">{{ margem(s) }}%</span>
                  <span class="muted" style="font-size:11.5px">margem</span>
                </div>
              </div>

              <div class="divider"></div>

              <div class="row" style="gap:8px">
                <div style="display:flex">
                  @for (p of execs(s).slice(0, 4); track p.id; let i = $index) {
                    <div [style.marginLeft.px]="i ? -8 : 0"
                         style="border:2px solid var(--surface);border-radius:99px">
                      <app-avatar [nome]="p.nome" [cor]="p.cor" [size]="26"></app-avatar>
                    </div>
                  }
                </div>
                <span class="muted" style="font-size:12.5px">{{ execs(s).length }} profissionais executam</span>
              </div>

            </div>
          </div>
        }
      </div>
    </div>

    @if (modalAberto) {
      <app-modal [title]="editando ? 'Editar serviço' : 'Novo serviço'" [wide]="true" (close)="closeModal()">

        <div style="display:flex;flex-direction:column;gap:16px">

          <div class="row" style="gap:12px;flex-wrap:wrap">
            <div class="field" style="flex:1;min-width:160px">
              <label>Nome</label>
              <input class="input" [(ngModel)]="draft.nome" placeholder="Nome do serviço">
            </div>
            <div class="field" style="min-width:140px">
              <label>Categoria</label>
              <input class="input" [(ngModel)]="draft.cat" list="srv-cats-list" placeholder="Ex: Cabelo">
              <datalist id="srv-cats-list">
                @for (c of allCats; track c) { <option [value]="c"></option> }
              </datalist>
            </div>
          </div>

          <div class="field">
            <label>Descrição</label>
            <input class="input" [(ngModel)]="draft.desc" placeholder="Breve descrição do serviço">
          </div>

          <div class="row" style="gap:12px;flex-wrap:wrap">
            <div class="field" style="flex:1;min-width:100px">
              <label>Duração (min)</label>
              <input class="input" type="number" [(ngModel)]="draft.dur" min="1">
            </div>
            <div class="field" style="flex:1;min-width:100px">
              <label>Preço (R$)</label>
              <input class="input" type="number" [(ngModel)]="draft.preco" min="0" step="0.01">
            </div>
            <div class="field" style="flex:1;min-width:100px">
              <label>Custo (R$)</label>
              <input class="input" type="number" [(ngModel)]="draft.custo" min="0" step="0.01">
            </div>
            <div class="field">
              <label>Cor</label>
              <input type="color" [(ngModel)]="draft.cor"
                     style="height:38px;width:60px;padding:2px;border:1px solid var(--border);border-radius:var(--r-md);cursor:pointer;background:var(--surface)">
            </div>
          </div>

          <div class="row" style="gap:20px">
            <label style="display:flex;align-items:center;gap:8px;font-size:14px;font-weight:500;cursor:pointer">
              <input type="checkbox" [(ngModel)]="draft.combo"
                     style="width:16px;height:16px;accent-color:var(--accent)">
              É combo
            </label>
            <label style="display:flex;align-items:center;gap:8px;font-size:14px;font-weight:500;cursor:pointer">
              <input type="checkbox" [(ngModel)]="draft.sinal"
                     style="width:16px;height:16px;accent-color:var(--accent)">
              Exige sinal
            </label>
          </div>

          <div class="field">
            <label>Profissionais que executam</label>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px">
              @for (p of data.staff; track p.id) {
                <button type="button" (click)="toggleExec(p.id)"
                  style="display:flex;align-items:center;gap:8px;padding:7px 12px;border-radius:var(--r-md);border:1px solid var(--border);font-size:13.5px;font-weight:500;transition:background .15s,border-color .15s"
                  [style.background]="draftExec.includes(p.id) ? 'color-mix(in oklch, ' + p.cor + ' 14%, var(--surface))' : 'var(--surface)'"
                  [style.borderColor]="draftExec.includes(p.id) ? p.cor : 'var(--border)'">
                  <app-avatar [nome]="p.nome" [cor]="p.cor" [size]="22"></app-avatar>
                  {{ p.apelido }}
                </button>
              }
            </div>
          </div>

        </div>

        <div modalFoot style="display:flex;justify-content:flex-end;gap:8px">
          <button class="btn" (click)="closeModal()">Cancelar</button>
          <button class="btn btn-primary" (click)="salvar()">
            {{ editando ? 'Salvar alterações' : 'Criar serviço' }}
          </button>
        </div>

      </app-modal>
    }
  `,
})
export class ServicosComponent {
  cat = 'todas';
  modalAberto = false;
  editando: Servico | null = null;
  draft: Partial<Servico> = {};
  draftExec: string[] = [];

  constructor(public data: DataService) {}

  get cats(): string[] {
    return ['todas', ...Array.from(new Set(this.data.servicos.map(s => s.cat)))];
  }

  get allCats(): string[] {
    return Array.from(new Set(this.data.servicos.map(s => s.cat)));
  }

  get list(): Servico[] {
    return this.cat === 'todas'
      ? this.data.servicos
      : this.data.servicos.filter(s => s.cat === this.cat);
  }

  menuItems(s: Servico): MenuItem[] {
    return [
      { label: 'Editar', icon: 'edit', onClick: () => this.openEdit(s) },
      { label: 'Duplicar', icon: 'list' },
      { divider: true },
      { label: 'Desativar', icon: 'x', danger: true },
    ];
  }

  openNovo() {
    this.editando = null;
    this.draft = { nome: '', cat: '', desc: '', dur: 30, preco: 0, custo: 0, cor: '#0e9f6e', combo: false, sinal: false };
    this.draftExec = [];
    this.modalAberto = true;
  }

  openEdit(s: Servico) {
    this.editando = s;
    this.draft = { ...s };
    this.draftExec = [...s.exec];
    this.modalAberto = true;
  }

  closeModal() {
    this.modalAberto = false;
    this.editando = null;
  }

  toggleExec(id: string) {
    const i = this.draftExec.indexOf(id);
    if (i >= 0) this.draftExec.splice(i, 1);
    else this.draftExec.push(id);
  }

  salvar() {
    if (this.editando) {
      this.data.updateServico(this.editando.id, { ...this.draft, exec: this.draftExec });
    } else {
      this.data.addServico({ ...this.draft, exec: this.draftExec } as Omit<Servico, 'id'>);
    }
    this.closeModal();
  }

  execs(s: Servico): Staff[] {
    return s.exec.map(id => this.data.prof(id));
  }

  margem(s: Servico): number {
    return Math.round((s.preco - s.custo) / s.preco * 100);
  }
}
