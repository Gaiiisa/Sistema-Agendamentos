import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../icon.component';
import { AvatarComponent } from '../shared/avatar.component';
import { MenuComponent, MenuItem } from '../shared/menu.component';
import { ModalComponent } from '../shared/modal.component';
import { CheckboxComponent } from '../shared/checkbox.component';
import { SelectComponent, SelectOption } from '../shared/select.component';
import { DataService, Servico, Staff } from '../data.service';

@Component({
  selector: 'app-servicos',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, AvatarComponent, MenuComponent, ModalComponent, CheckboxComponent, SelectComponent],
  template: `
    <div class="page">
      <div class="row" style="margin-bottom:16px;flex-wrap:wrap;gap:10px">
        <div class="seg">
          @for (cval of cats; track cval) {
            <button [class.on]="cat === cval" (click)="cat = cval"
              style="display:inline-flex;align-items:center;gap:6px">
              <span>{{ cval === 'todas' ? 'Todas' : cval }}</span>
              @if (podeRemoverCategoria(cval)) {
                <span (click)="removerCategoria(cval, $event)"
                  title="Remover categoria"
                  style="display:inline-grid;place-items:center;width:16px;height:16px;border-radius:99px;opacity:.55;transition:opacity .15s,background .15s"
                  onmouseover="this.style.opacity='1';this.style.background='var(--surface-2)'"
                  onmouseout="this.style.opacity='.55';this.style.background='transparent'">
                  <app-icon name="x" [size]="11" [stroke]="2.5"></app-icon>
                </span>
              }
            </button>
          }
        </div>

        @if (!criandoCategoria) {
          <button class="btn btn-ghost" (click)="abrirNovaCategoria()"
            style="display:flex;align-items:center;gap:6px;padding:6px 12px;font-size:13px;font-weight:600">
            <app-icon name="plus" [size]="14"></app-icon>
            Nova categoria
          </button>
        } @else {
          <div class="row" style="gap:6px">
            <input class="input" #catInput [(ngModel)]="novaCategoria"
              (keydown.enter)="salvarCategoria()" (keydown.escape)="cancelarCategoria()"
              placeholder="Nome da categoria"
              style="height:34px;font-size:13px;width:180px">
            <button class="btn btn-primary" (click)="salvarCategoria()" [disabled]="!novaCategoria.trim()"
              style="height:34px;padding:0 12px;font-size:13px">Criar</button>
            <button class="btn btn-ghost" (click)="cancelarCategoria()"
              style="height:34px;padding:0 10px;font-size:13px">Cancelar</button>
          </div>
        }
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%, 290px),1fr));gap:14px">
        @for (s of list; track s.id) {
          <div class="card" style="overflow:hidden;display:flex;flex-direction:column"
            [style.opacity]="isAtivo(s) ? 1 : 0.55"
            [style.filter]="isAtivo(s) ? null : 'grayscale(0.4)'">

            <!-- faixa de cor / "foto" -->
            <div
              [style.height.px]="96"
              [style.background]="'linear-gradient(135deg, color-mix(in oklch, ' + s.cor + ' 18%, #ffffff), color-mix(in oklch, ' + s.cor + ' 8%, #ffffff))'"
              style="position:relative;display:grid;place-items:center">

              <div style="width:48px;height:48px;border-radius:12px;background:var(--surface);display:grid;place-items:center;box-shadow:var(--sh-sm)">
                <app-icon
                  [name]="s.cat === 'Barba' ? 'user' : s.cat === 'Estética' ? 'sparkle' : 'scissors'"
                  [size]="22"
                  [style.color]="s.cor">
                </app-icon>
              </div>

              @if (!isAtivo(s)) {
                <span class="tag" style="position:absolute;top:10px;left:10px;background:var(--st-faltou-bg);color:var(--st-faltou);font-weight:700">Inativo</span>
              } @else if (s.combo) {
                <span class="tag" style="position:absolute;top:10px;left:10px;background:var(--surface)">Combo</span>
              }
              @if (s.sinal) {
                <span class="tag tag-novo" style="position:absolute;top:10px;right:10px">Sinal {{ sinalPctDe(s) }}%</span>
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
                  <span class="muted" style="font-size:11.5px">
                    preço
                    @if (s.combo && economiaCombo(s) > 0) {
                      · <span style="color:var(--accent-text);font-weight:600">economiza {{ data.money(economiaCombo(s)) }}</span>
                    }
                  </span>
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
              <app-select [(ngModel)]="draft.cat" [options]="catOptions" [allowCreate]="true" placeholder="Ex: Cabelo"></app-select>
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
          </div>

          <div class="row" style="gap:20px">
            <app-checkbox [(ngModel)]="draft.combo" (ngModelChange)="onComboToggle()" label="É combo"></app-checkbox>
            <app-checkbox [(ngModel)]="draft.sinal" label="Exige sinal"></app-checkbox>
          </div>

          @if (draft.combo) {
            <div class="field">
              <label>Serviços incluídos no combo</label>
              <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px">
                @for (s of servicosBase(); track s.id) {
                  <button type="button" (click)="toggleItem(s.id)"
                    style="display:flex;align-items:center;gap:8px;padding:7px 12px;border-radius:var(--r-md);border:1px solid var(--border);font-size:13.5px;font-weight:500;transition:background .15s,border-color .15s"
                    [style.background]="draftItens.includes(s.id) ? 'color-mix(in oklch, ' + s.cor + ' 14%, var(--surface))' : 'var(--surface)'"
                    [style.borderColor]="draftItens.includes(s.id) ? s.cor : 'var(--border)'">
                    <span [style.background]="s.cor" style="width:8px;height:8px;border-radius:99px"></span>
                    {{ s.nome }}
                    <span class="muted tnum" style="font-size:11.5px">{{ data.money(s.preco) }} · {{ s.dur }}min</span>
                  </button>
                }
              </div>
              @if (draftItens.length) {
                <div class="row" style="margin-top:10px;padding:10px 12px;background:var(--surface-2);border-radius:var(--r-md);gap:16px;font-size:12.5px">
                  <div class="col"><span class="muted">Soma dos itens</span><span class="tnum" style="font-weight:700">{{ data.money(somaItens()) }} · {{ duracaoItens() }}min</span></div>
                  @if (draft.preco && draft.preco < somaItens()) {
                    <div class="col" style="margin-left:auto;align-items:flex-end"><span class="muted">Economia do combo</span><span class="tnum" style="font-weight:700;color:var(--accent-text)">{{ data.money(somaItens() - (draft.preco || 0)) }}</span></div>
                  }
                </div>
              }
            </div>
          }

          @if (draft.sinal) {
            <div class="field" style="max-width:220px">
              <label>% de sinal deste serviço</label>
              <input class="input" type="number" min="0" max="100" [ngModel]="draft.sinalPct ?? null" (ngModelChange)="draft.sinalPct = $event === null || $event === '' ? undefined : +$event" [placeholder]="'Padrão do sistema: ' + sinalPadrao + '%'">
              <span class="muted" style="font-size:11.5px;margin-top:4px">Deixe em branco para usar o padrão global das Configurações.</span>
            </div>
          }

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

        <div modalFoot>
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
  draftItens: string[] = [];

  criandoCategoria = false;
  novaCategoria = '';

  constructor(public data: DataService) {}

  get cats(): string[] {
    return ['todas', ...this.allCats];
  }

  get allCats(): string[] {
    const doServico = this.data.servicos.map(s => s.cat).filter(c => !!c);
    return Array.from(new Set([...doServico, ...this.data.categoriasServico]));
  }
  get catOptions(): SelectOption[] {
    return this.allCats.map(c => ({ value: c, label: c }));
  }

  get list(): Servico[] {
    return this.cat === 'todas'
      ? this.data.servicos
      : this.data.servicos.filter(s => s.cat === this.cat);
  }

  isAtivo(s: Servico): boolean {
    return s.ativo !== false;
  }

  menuItems(s: Servico): MenuItem[] {
    const ativo = this.isAtivo(s);
    return [
      { label: 'Editar', icon: 'edit', onClick: () => this.openEdit(s) },
      { label: 'Duplicar', icon: 'list' },
      { divider: true },
      ativo
        ? { label: 'Desativar', icon: 'x', danger: true, onClick: () => this.toggleAtivo(s) }
        : { label: 'Reativar', icon: 'check', onClick: () => this.toggleAtivo(s) },
    ];
  }

  toggleAtivo(s: Servico) {
    const acao = this.isAtivo(s) ? 'Desativar' : 'Reativar';
    if (!confirm(`${acao} o serviço "${s.nome}"?`)) return;
    this.data.toggleServicoAtivo(s.id);
  }

  private readonly paletaCores = [
    '#0e9f6e', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
    '#ef4444', '#14b8a6', '#f97316', '#6366f1', '#06b6d4',
    '#84cc16', '#d946ef',
  ];

  private proximaCor(): string {
    const uso = new Map<string, number>(this.paletaCores.map(c => [c, 0]));
    for (const s of this.data.servicos) {
      if (uso.has(s.cor)) uso.set(s.cor, uso.get(s.cor)! + 1);
    }
    let melhor = this.paletaCores[0];
    let menor = Infinity;
    for (const c of this.paletaCores) {
      const n = uso.get(c)!;
      if (n < menor) { menor = n; melhor = c; }
    }
    return melhor;
  }

  openNovo() {
    this.editando = null;
    this.draft = { nome: '', cat: '', desc: '', dur: 30, preco: 0, custo: 0, cor: this.proximaCor(), combo: false, sinal: false };
    this.draftExec = [];
    this.draftItens = [];
    this.modalAberto = true;
  }

  openEdit(s: Servico) {
    this.editando = s;
    this.draft = { ...s };
    this.draftExec = [...s.exec];
    this.draftItens = [...(s.itens || [])];
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
    const payload: Partial<Servico> = {
      ...this.draft,
      exec: this.draftExec,
      itens: this.draft.combo ? this.draftItens : undefined,
      sinalPct: this.draft.sinal ? this.draft.sinalPct : undefined,
    };
    if (this.editando) {
      this.data.updateServico(this.editando.id, payload);
    } else {
      this.data.addServico(payload as Omit<Servico, 'id'>);
    }
    this.closeModal();
  }

  abrirNovaCategoria() {
    this.novaCategoria = '';
    this.criandoCategoria = true;
  }

  cancelarCategoria() {
    this.criandoCategoria = false;
    this.novaCategoria = '';
  }

  salvarCategoria() {
    const nome = this.novaCategoria.trim();
    if (!nome) return;
    this.data.addCategoriaServico(nome);
    this.cat = this.allCats.find(c => c.toLowerCase() === nome.toLowerCase()) || nome;
    this.cancelarCategoria();
  }

  podeRemoverCategoria(cval: string): boolean {
    if (cval === 'todas') return false;
    return !this.data.servicos.some(s => s.cat === cval);
  }

  removerCategoria(cval: string, ev: Event) {
    ev.stopPropagation();
    if (!this.podeRemoverCategoria(cval)) return;
    if (!confirm(`Remover a categoria "${cval}"?`)) return;
    this.data.removeCategoriaServico(cval);
    if (this.cat === cval) this.cat = 'todas';
  }

  onComboToggle() {
    if (!this.draft.combo) {
      this.draftItens = [];
    }
  }

  toggleItem(id: string) {
    const i = this.draftItens.indexOf(id);
    if (i >= 0) this.draftItens.splice(i, 1);
    else this.draftItens.push(id);
    if (this.draftItens.length) {
      this.draft.dur = this.duracaoItens();
    }
  }

  servicosBase(): Servico[] {
    return this.data.servicos.filter(s => !s.combo && s.id !== this.editando?.id);
  }

  somaItens(): number {
    return this.draftItens.reduce((t, id) => t + (this.data.servicos.find(s => s.id === id)?.preco || 0), 0);
  }

  duracaoItens(): number {
    return this.draftItens.reduce((t, id) => t + (this.data.servicos.find(s => s.id === id)?.dur || 0), 0);
  }

  get sinalPadrao(): number {
    return (this.data as any).agenda?.sinalPct ?? 30;
  }

  sinalPctDe(s: Servico): number {
    return s.sinalPct ?? this.sinalPadrao;
  }

  economiaCombo(s: Servico): number {
    if (!s.combo || !s.itens?.length) return 0;
    const soma = s.itens.reduce((t, id) => t + (this.data.servicos.find(x => x.id === id)?.preco || 0), 0);
    return Math.max(0, soma - s.preco);
  }

  execs(s: Servico): Staff[] {
    return s.exec.map(id => this.data.prof(id));
  }

  margem(s: Servico): number {
    return Math.round((s.preco - s.custo) / s.preco * 100);
  }
}
