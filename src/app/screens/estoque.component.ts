import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../icon.component';
import { MenuComponent } from '../shared/menu.component';
import { ModalComponent } from '../shared/modal.component';
import { DataService } from '../data.service';
import type { MenuItem } from '../shared/menu.component';
import type { Produto } from '../data.service';

@Component({
  selector: 'app-estoque',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, MenuComponent, ModalComponent],
  template: `
<div class="page">

  <!-- ── Stat grid ── -->
  <div class="stat-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">

    <div class="stat">
      <div class="stat-top">
        <div class="stat-label">Produtos cadastrados</div>
        <div class="stat-ico" [style.background]="'var(--surface-3)'">
          <app-icon name="box" [size]="17" style="color:var(--text-2)"></app-icon>
        </div>
      </div>
      <div class="stat-val tnum">{{ data.produtos.length }}</div>
    </div>

    <div class="stat">
      <div class="stat-top">
        <div class="stat-label">Valor em estoque</div>
        <div class="stat-ico" [style.background]="'var(--accent-soft)'">
          <app-icon name="money" [size]="17" style="color:var(--accent)"></app-icon>
        </div>
      </div>
      <div class="stat-val tnum">{{ data.money(valorEstoque) }}</div>
    </div>

    <div class="stat">
      <div class="stat-top">
        <div class="stat-label">Precisam repor</div>
        <div class="stat-ico" [style.background]="'var(--st-faltou-bg)'">
          <app-icon name="alert" [size]="17" style="color:var(--st-faltou)"></app-icon>
        </div>
      </div>
      <div class="stat-val tnum">{{ alerta.length }}</div>
    </div>

    <div class="stat">
      <div class="stat-top">
        <div class="stat-label">Com baixa automática</div>
        <div class="stat-ico" [style.background]="'var(--st-atendimento-bg)'">
          <app-icon name="sparkle" [size]="17" style="color:var(--st-atendimento)"></app-icon>
        </div>
      </div>
      <div class="stat-val tnum">{{ itensConsumo }}</div>
    </div>

  </div>

  <!-- ── Alerta de reposição ── -->
  @if (alerta.length > 0) {
    <div class="card card-pad" style="margin-bottom:16px;border-left:3px solid var(--st-faltou)">
      <div class="row" style="margin-bottom:10px">
        <app-icon name="alert" [size]="17" style="color:var(--st-faltou)"></app-icon>
        <div style="font-weight:700;font-size:14.5px">{{ alerta.length }} produtos no nível mínimo</div>
        <button class="btn btn-primary btn-sm" style="margin-left:auto"
          (click)="notify.emit('Pedido de reposição gerado')">
          <app-icon name="pkg" [size]="14"></app-icon>
          Gerar pedido de reposição
        </button>
      </div>
      <div class="row" style="gap:8px;flex-wrap:wrap">
        @for (p of alerta; track p.id) {
          <span class="tag"
            [style.background]="NIVEL[nivel(p)].bg"
            [style.color]="NIVEL[nivel(p)].cor"
            style="border-color:transparent">
            <span class="pdot" style="width:6px;height:6px;border-radius:99px;background:currentColor"></span>
            {{ p.nome }} · {{ p.qtd }}/{{ p.min }}
          </span>
        }
      </div>
    </div>
  }

  <!-- ── Tabs + search + new button ── -->
  <div class="row" style="margin-bottom:16px;gap:10px;flex-wrap:wrap">
    <div class="seg">
      <button [class.on]="tab==='produtos'"  (click)="tab='produtos'">Produtos</button>
      <button [class.on]="tab==='historico'" (click)="tab='historico'">Histórico</button>
      <button [class.on]="tab==='consumo'"   (click)="tab='consumo'">Mais consumidos</button>
    </div>
    @if (tab === 'produtos') {
      <div class="search-inp">
        <app-icon name="search" [size]="16"></app-icon>
        <input placeholder="Buscar produto…" [value]="q" (input)="q=$any($event.target).value">
      </div>
    }
  </div>

  <!-- ── Tab: Produtos ── -->
  @if (tab === 'produtos') {
    <div class="card">
      <div style="overflow-x:auto">
        <table class="tbl">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Categoria</th>
              <th>Em estoque</th>
              <th>Mínimo</th>
              <th>Custo unit.</th>
              <th>Fornecedor</th>
              <th>Baixa automática</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (p of list; track p.id) {
              <tr>
                <td>
                  <div class="row" style="gap:10px">
                    <div style="width:30px;height:30px;border-radius:8px;background:var(--surface-2);display:grid;place-items:center;flex-shrink:0">
                      <app-icon name="pkg" [size]="15" style="color:var(--text-2)"></app-icon>
                    </div>
                    <span style="font-weight:600">{{ p.nome }}</span>
                  </div>
                </td>
                <td><span class="tag">{{ p.cat }}</span></td>
                <td>
                  <div class="col" style="gap:4px;min-width:90px">
                    <span class="tnum" [style.fontWeight]="700" [style.color]="NIVEL[nivel(p)].cor">{{ p.qtd }} un</span>
                    <div class="progress" style="width:70px">
                      <span [style.width]="pct(p) + '%'" [style.background]="NIVEL[nivel(p)].cor"></span>
                    </div>
                  </div>
                </td>
                <td class="tnum muted">{{ p.min }}</td>
                <td class="tnum">{{ data.money(p.custo) }}</td>
                <td class="muted" style="font-size:13px">{{ p.fornecedor }}</td>
                <td>
                  @if (p.consumo) {
                    <span class="row" style="gap:5px;font-size:12.5px;color:var(--st-atendimento)">
                      <app-icon name="sparkle" [size]="13"></app-icon>
                      {{ p.consumo }}
                    </span>
                  } @else {
                    <span class="muted" style="font-size:12.5px">—</span>
                  }
                </td>
                <td>
                  <span class="pill"
                    [style.background]="NIVEL[nivel(p)].bg"
                    [style.color]="NIVEL[nivel(p)].cor">
                    <span class="pdot"></span>
                    {{ NIVEL[nivel(p)].label }}
                  </span>
                </td>
                <td>
                  <app-menu [items]="itemsFor(p)"></app-menu>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  }

  <!-- ── Tab: Histórico ── -->
  @if (tab === 'historico') {
    <div class="card">
      <table class="tbl">
        <thead>
          <tr>
            <th>Data / Hora</th>
            <th>Produto</th>
            <th>Movimentação</th>
            <th>Motivo</th>
            <th>Qtd</th>
          </tr>
        </thead>
        <tbody>
          @for (m of movSorted; track m.id) {
            <tr>
              <td class="mono muted" style="font-size:13px">{{ data.fmtData(m.data) }} · {{ m.hora }}</td>
              <td style="font-weight:600">{{ data.prod(m.prod).nome }}</td>
              <td>
                @if (m.tipo === 'entrada') {
                  <span class="pill pill-confirmado">
                    <app-icon name="plus" [size]="12"></app-icon>
                    Entrada
                  </span>
                } @else {
                  <span class="pill pill-faltou">
                    <app-icon name="download" [size]="12"></app-icon>
                    Saída
                  </span>
                }
              </td>
              <td class="muted">{{ m.motivo }}</td>
              <td class="tnum" [style.fontWeight]="700"
                [style.color]="m.tipo === 'entrada' ? 'var(--accent-text)' : 'var(--st-faltou)'">
                {{ m.tipo === 'entrada' ? '+' : '−' }}{{ m.qtd }}
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  }

  <!-- ── Tab: Mais consumidos ── -->
  @if (tab === 'consumo') {
    <div class="card">
      <div class="card-head">
        <app-icon name="chart" [size]="17" style="color:var(--text-2)"></app-icon>
        <div class="card-title">Produtos mais consumidos · últimos 30 dias</div>
      </div>
      <div style="padding:18px;display:flex;flex-direction:column;gap:16px">
        @for (r of rank; track r.id; let i = $index) {
          <div class="col" style="gap:7px">
            <div class="row" style="gap:10px">
              <span class="tnum" style="font-weight:800;color:var(--text-3);width:22px">#{{ i + 1 }}</span>
              <span style="font-weight:600;font-size:14px;flex:1">{{ data.prod(r.id).nome }}</span>
              <span class="tnum" style="font-weight:700">{{ r.n }} un</span>
              <span class="muted tnum" style="font-size:12.5px">{{ data.money(r.n * data.prod(r.id).custo) }} em custo</span>
            </div>
            <div class="progress" style="margin-left:32px">
              <span [style.width]="(r.n / rankMax * 100) + '%'"></span>
            </div>
          </div>
        }
      </div>
    </div>
  }

</div>

<!-- ── Modais ── -->
@if (modalTipo) {
  <app-modal [title]="modalTitle" [wide]="modalTipo === 'editar' || modalTipo === 'novo'" (close)="closeModal()">

    <!-- Entrada / Saída -->
    @if (modalTipo === 'entrada' || modalTipo === 'saida') {
      <div style="display:flex;flex-direction:column;gap:16px">

        <div style="display:flex;gap:12px;align-items:center;padding:12px 14px;background:var(--surface-2);border-radius:var(--r-md)">
          <div style="width:36px;height:36px;border-radius:9px;background:var(--surface);display:grid;place-items:center;box-shadow:var(--sh-sm);flex-shrink:0">
            <app-icon name="pkg" [size]="17" style="color:var(--text-2)"></app-icon>
          </div>
          <div class="col" style="line-height:1.35">
            <span style="font-weight:700;font-size:15px">{{ prodSel?.nome }}</span>
            <span class="muted" style="font-size:12.5px">{{ prodSel?.cat }} · estoque atual: <strong>{{ prodSel?.qtd }} un</strong></span>
          </div>
        </div>

        <div class="field">
          <label>Quantidade</label>
          <input class="input" type="number" [(ngModel)]="movQtd" min="1" style="max-width:160px">
          @if (modalTipo === 'saida' && prodSel && movQtd > prodSel.qtd) {
            <span style="color:var(--st-faltou);font-size:12.5px;margin-top:4px;display:block">
              Quantidade maior que o estoque disponível ({{ prodSel.qtd }} un)
            </span>
          }
        </div>

        <div class="field">
          <label>Motivo</label>
          <input class="input" [(ngModel)]="movMotivo"
            [placeholder]="modalTipo === 'entrada' ? 'Ex: Compra — Barba Brava Dist.' : 'Ex: Consumo — Corte Masculino'">
        </div>

      </div>

      <div modalFoot style="display:flex;justify-content:flex-end;gap:8px">
        <button class="btn" (click)="closeModal()">Cancelar</button>
        <button class="btn btn-primary" (click)="salvarMov()" [disabled]="movQtd < 1">
          {{ modalTipo === 'entrada' ? 'Registrar entrada' : 'Registrar saída' }}
        </button>
      </div>
    }

    <!-- Editar / Novo produto -->
    @if (modalTipo === 'editar' || modalTipo === 'novo') {
      <div style="display:flex;flex-direction:column;gap:16px">

        <div class="row" style="gap:12px;flex-wrap:wrap">
          <div class="field" style="flex:2;min-width:160px">
            <label>Nome do produto</label>
            <input class="input" [(ngModel)]="draft.nome" placeholder="Ex: Pomada Modeladora">
          </div>
          <div class="field" style="flex:1;min-width:130px">
            <label>Categoria</label>
            <input class="input" [(ngModel)]="draft.cat" list="prod-cats-list" placeholder="Ex: Finalização">
            <datalist id="prod-cats-list">
              @for (c of prodCats; track c) { <option [value]="c"></option> }
            </datalist>
          </div>
        </div>

        <div class="row" style="gap:12px;flex-wrap:wrap">
          <div class="field" style="flex:1;min-width:100px">
            <label>Qtd em estoque</label>
            <input class="input" type="number" [(ngModel)]="draft.qtd" min="0">
          </div>
          <div class="field" style="flex:1;min-width:100px">
            <label>Qtd mínima</label>
            <input class="input" type="number" [(ngModel)]="draft.min" min="0">
          </div>
          <div class="field" style="flex:1;min-width:100px">
            <label>Custo unit. (R$)</label>
            <input class="input" type="number" [(ngModel)]="draft.custo" min="0" step="0.01">
          </div>
          <div class="field" style="flex:1;min-width:110px">
            <label>Preço de venda (R$)</label>
            <input class="input" type="number" [(ngModel)]="draftPreco" min="0" step="0.01" placeholder="Sem venda">
          </div>
        </div>

        <div class="row" style="gap:12px;flex-wrap:wrap">
          <div class="field" style="flex:1;min-width:160px">
            <label>Fornecedor</label>
            <input class="input" [(ngModel)]="draft.fornecedor" placeholder="Ex: Beauty Pro">
          </div>
          <div class="field" style="flex:1;min-width:180px">
            <label>Baixa automática (serviço vinculado)</label>
            <input class="input" [(ngModel)]="draftConsumo" placeholder="Ex: Corte Masculino">
          </div>
        </div>

      </div>

      <div modalFoot style="display:flex;justify-content:flex-end;gap:8px">
        <button class="btn" (click)="closeModal()">Cancelar</button>
        <button class="btn btn-primary" (click)="salvarProduto()">
          {{ modalTipo === 'novo' ? 'Criar produto' : 'Salvar alterações' }}
        </button>
      </div>
    }

  </app-modal>
}
`,
})
export class EstoqueComponent {
  @Output() notify = new EventEmitter<string>();

  tab = 'produtos';
  q = '';

  modalTipo: 'entrada' | 'saida' | 'editar' | 'novo' | null = null;
  prodSel: Produto | null = null;
  draft: Partial<Produto> = {};
  draftPreco: number | null = null;
  draftConsumo = '';
  movQtd = 1;
  movMotivo = '';

  readonly NIVEL: Record<string, { label: string; cor: string; bg: string }> = {
    critico: { label: 'Crítico', cor: 'var(--st-faltou)',   bg: 'var(--st-faltou-bg)'   },
    baixo:   { label: 'Baixo',  cor: 'var(--st-pendente)', bg: 'var(--st-pendente-bg)' },
    ok:      { label: 'OK',     cor: 'var(--accent-text)', bg: 'var(--accent-soft)'    },
  };

  readonly rank = [
    { id: 'pr1', n: 38 }, { id: 'pr2', n: 31 }, { id: 'pr7', n: 22 },
    { id: 'pr4', n: 17 }, { id: 'pr5', n: 12 }, { id: 'pr9', n: 6  },
  ];

  readonly rankMax = this.rank[0].n;

  constructor(public data: DataService) {}

  get modalTitle(): string {
    const labels: Record<string, string> = {
      entrada: 'Registrar entrada',
      saida:   'Registrar saída',
      editar:  'Editar produto',
      novo:    'Novo produto',
    };
    return this.modalTipo ? labels[this.modalTipo] : '';
  }

  get prodCats(): string[] {
    return Array.from(new Set(this.data.produtos.map(p => p.cat)));
  }

  openEntrada(p: Produto) {
    this.prodSel = p;
    this.movQtd = 1;
    this.movMotivo = '';
    this.modalTipo = 'entrada';
  }

  openSaida(p: Produto) {
    this.prodSel = p;
    this.movQtd = 1;
    this.movMotivo = '';
    this.modalTipo = 'saida';
  }

  openEditar(p: Produto) {
    this.prodSel = p;
    this.draft = { ...p };
    this.draftPreco = p.preco;
    this.draftConsumo = p.consumo ?? '';
    this.modalTipo = 'editar';
  }

  openNovo() {
    this.prodSel = null;
    this.draft = { nome: '', cat: '', qtd: 0, min: 5, custo: 0, fornecedor: '' };
    this.draftPreco = null;
    this.draftConsumo = '';
    this.modalTipo = 'novo';
  }

  closeModal() {
    this.modalTipo = null;
    this.prodSel = null;
  }

  salvarMov() {
    if (!this.prodSel || this.movQtd < 1) return;
    this.data.registrarMov(this.prodSel.id, this.modalTipo as 'entrada' | 'saida', this.movQtd, this.movMotivo);
    this.closeModal();
  }

  salvarProduto() {
    const preco = this.draftPreco != null && !isNaN(Number(this.draftPreco)) ? Number(this.draftPreco) : null;
    const consumo = this.draftConsumo.trim() || null;
    if (this.modalTipo === 'editar' && this.prodSel) {
      this.data.updateProduto(this.prodSel.id, { ...this.draft, preco, consumo });
    } else {
      this.data.addProduto({ ...this.draft, preco, consumo } as Omit<Produto, 'id'>);
    }
    this.closeModal();
  }

  nivel(p: Produto): 'critico' | 'baixo' | 'ok' {
    if (p.qtd <= p.min * 0.5) return 'critico';
    if (p.qtd <= p.min)       return 'baixo';
    return 'ok';
  }

  pct(p: Produto): number {
    return Math.min(p.qtd / (p.min * 2) * 100, 100);
  }

  get alerta(): Produto[] {
    return this.data.produtos.filter(p => this.nivel(p) !== 'ok');
  }

  get valorEstoque(): number {
    return this.data.produtos.reduce((s, p) => s + p.qtd * p.custo, 0);
  }

  get itensConsumo(): number {
    return this.data.produtos.filter(p => p.consumo).length;
  }

  get list(): Produto[] {
    if (!this.q) return this.data.produtos;
    const lc = this.q.toLowerCase();
    return this.data.produtos.filter(p => p.nome.toLowerCase().includes(lc));
  }

  get movSorted() {
    return [...this.data.movEstoque].sort((a, b) =>
      (b.data + b.hora).localeCompare(a.data + a.hora)
    );
  }

  itemsFor(p: Produto): MenuItem[] {
    return [
      { label: 'Registrar entrada', icon: 'plus',     onClick: () => this.openEntrada(p) },
      { label: 'Registrar saída',   icon: 'download', onClick: () => this.openSaida(p)   },
      { label: 'Editar',            icon: 'edit',     onClick: () => this.openEditar(p)  },
      { divider: true },
      { label: 'Remover',           icon: 'trash',    danger: true },
    ];
  }
}
