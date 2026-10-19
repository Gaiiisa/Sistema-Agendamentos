import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../icon.component';
import { MenuComponent } from '../shared/menu.component';
import { ModalComponent } from '../shared/modal.component';
import { SelectComponent, SelectOption } from '../shared/select.component';
import { DataService } from '../data.service';
import type { MenuItem } from '../shared/menu.component';
import type { Produto } from '../data.service';
import { ToastService } from '../toast.service';
import { CampoErroComponent } from '../shared/campo-erro.component';
import { PIPES } from '../shared/pipes';
import { V, validar, temErros, Erros } from '../shared/validacao';

@Component({
  selector: 'app-estoque',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, MenuComponent, ModalComponent, SelectComponent, CampoErroComponent, ...PIPES],
  template: `
<div class="page">

  <!-- ── Stat grid ── -->
  <div class="stat-grid" style="margin-bottom:16px">

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
      <div class="stat-val tnum">{{ valorEstoque | brl }}</div>
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
      <div class="row" style="margin-bottom:10px;flex-wrap:wrap">
        <app-icon name="alert" [size]="17" style="color:var(--st-faltou);flex-shrink:0"></app-icon>
        <div style="font-weight:700;font-size:14.5px;flex:1;min-width:180px">{{ alerta.length }} produtos no nível mínimo</div>
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
        <table class="tbl tbl-card">
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
                <td class="card-header">
                  <div class="row" style="gap:10px">
                    <div style="width:30px;height:30px;border-radius:8px;background:var(--surface-2);display:grid;place-items:center;flex-shrink:0;overflow:hidden">
                      @if (p.imagem) {
                        <img [src]="p.imagem" [alt]="p.nome" style="width:100%;height:100%;object-fit:cover">
                      } @else {
                        <app-icon name="pkg" [size]="15" style="color:var(--text-2)"></app-icon>
                      }
                    </div>
                    <span style="font-weight:600">{{ p.nome }}</span>
                  </div>
                </td>
                <td data-label="Categoria"><span class="tag">{{ p.cat }}</span></td>
                <td data-label="Em estoque">
                  <div class="col" style="gap:4px;min-width:90px">
                    <span class="tnum" [style.fontWeight]="700" [style.color]="NIVEL[nivel(p)].cor">{{ p.qtd }} un</span>
                    <div class="progress" style="width:70px">
                      <span [style.width]="pct(p) + '%'" [style.background]="NIVEL[nivel(p)].cor"></span>
                    </div>
                  </div>
                </td>
                <td class="tnum muted" data-label="Mínimo">{{ p.min }}</td>
                <td class="tnum" data-label="Custo">{{ p.custo | brl }}</td>
                <td class="muted" data-label="Fornecedor" style="font-size:13px">{{ p.fornecedor }}</td>
                <td data-label="Baixa auto.">
                  @if (p.consumo && data.srv(p.consumo)) {
                    <span class="row" style="gap:5px;font-size:12.5px;color:var(--st-atendimento)">
                      <app-icon name="sparkle" [size]="13"></app-icon>
                      {{ data.srv(p.consumo).nome }}
                    </span>
                  } @else {
                    <span class="muted" style="font-size:12.5px">—</span>
                  }
                </td>
                <td data-label="Status">
                  <span class="pill"
                    [style.background]="NIVEL[nivel(p)].bg"
                    [style.color]="NIVEL[nivel(p)].cor">
                    <span class="pdot"></span>
                    {{ NIVEL[nivel(p)].label }}
                  </span>
                </td>
                <td class="card-actions">
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
      <div style="overflow-x:auto">
      <table class="tbl tbl-card">
        <thead>
          <tr>
            <th>Produto</th>
            <th>Movimentação</th>
            <th>Data / Hora</th>
            <th>Motivo</th>
            <th>Qtd</th>
          </tr>
        </thead>
        <tbody>
          @for (m of movSorted; track m.id) {
            <tr>
              <td class="card-header" style="font-weight:600">{{ data.prod(m.prod).nome }}</td>
              <td data-label="Movimento">
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
              <td class="mono muted" data-label="Data / Hora" style="font-size:13px">{{ m.data | dataBR:'curta' }} · {{ m.hora }}</td>
              <td class="muted" data-label="Motivo">{{ m.motivo }}</td>
              <td class="tnum" data-label="Qtd" [style.fontWeight]="700"
                [style.color]="m.tipo === 'entrada' ? 'var(--accent-text)' : 'var(--st-faltou)'">
                {{ m.tipo === 'entrada' ? '+' : '−' }}{{ m.qtd }}
              </td>
            </tr>
          }
        </tbody>
      </table>
      </div>
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
              <span class="muted tnum" style="font-size:12.5px">{{ r.n * data.prod(r.id).custo | brl }} em custo</span>
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
          <div style="width:36px;height:36px;border-radius:9px;background:var(--surface);display:grid;place-items:center;box-shadow:var(--sh-sm);flex-shrink:0;overflow:hidden">
            @if (prodSel?.imagem) {
              <img [src]="prodSel!.imagem!" [alt]="prodSel?.nome" style="width:100%;height:100%;object-fit:cover">
            } @else {
              <app-icon name="pkg" [size]="17" style="color:var(--text-2)"></app-icon>
            }
          </div>
          <div class="col" style="line-height:1.35">
            <span style="font-weight:700;font-size:15px">{{ prodSel?.nome }}</span>
            <span class="muted" style="font-size:12.5px">{{ prodSel?.cat }} · mínimo: <strong>{{ prodSel?.min }} un</strong></span>
          </div>
        </div>

        <!-- Preview atual → novo -->
        @if (prodSel) {
          <div class="row" style="gap:14px;align-items:center;padding:14px;background:var(--surface-2);border-radius:var(--r-md)">
            <div class="col" style="gap:2px;align-items:center;flex:1">
              <span class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.4px">Atual</span>
              <span class="tnum" style="font-size:22px;font-weight:700">{{ prodSel.qtd }} un</span>
            </div>
            <app-icon name="chevR" [size]="20" style="color:var(--text-3);flex-shrink:0"></app-icon>
            <div class="col" style="gap:2px;align-items:center;flex:1">
              <span class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.4px">Após</span>
              <span class="tnum" style="font-size:22px;font-weight:700" [style.color]="NIVEL[novoNivel].cor">{{ novaQtd }} un</span>
            </div>
            <span class="pill"
              [style.background]="NIVEL[novoNivel].bg"
              [style.color]="NIVEL[novoNivel].cor"
              style="flex-shrink:0">
              <span class="pdot"></span>
              {{ NIVEL[novoNivel].label }}
            </span>
          </div>
        }

        <!-- Quantidade + stepper + presets -->
        <div class="field">
          <label>Quantidade</label>
          <div class="row" style="gap:10px;align-items:center;flex-wrap:wrap">
            <div class="row" style="gap:6px;align-items:center">
              <button class="btn btn-sm" (click)="dec()" [disabled]="movQtd <= 1"
                style="width:34px;padding:5px 0;font-size:16px;line-height:1">−</button>
              <input class="input" [class.invalid]="erroMovQtd" type="number" [(ngModel)]="movQtd" min="1" max="10000" step="1"
                style="width:90px;text-align:center">
              <button class="btn btn-sm" (click)="inc(1)"
                style="width:34px;padding:5px 0;font-size:16px;line-height:1">+</button>
            </div>
            <div class="row" style="gap:6px">
              <button class="btn btn-sm btn-subtle" (click)="inc(5)">+5</button>
              <button class="btn btn-sm btn-subtle" (click)="inc(10)">+10</button>
              <button class="btn btn-sm btn-subtle" (click)="inc(25)">+25</button>
            </div>
          </div>
          <app-campo-erro [msg]="erroMovQtd"></app-campo-erro>
          @if (modalTipo === 'saida' && prodSel && movQtd > prodSel.qtd) {
            <span style="color:var(--st-faltou);font-size:12.5px;margin-top:6px;display:flex;align-items:center;gap:5px">
              <app-icon name="alert" [size]="13"></app-icon>
              Quantidade maior que o estoque disponível ({{ prodSel.qtd }} un)
            </span>
          } @else if (modalTipo === 'saida' && prodSel && movQtd > 0 && (prodSel.qtd - movQtd) <= prodSel.min) {
            <span style="color:var(--st-pendente);font-size:12.5px;margin-top:6px;display:flex;align-items:center;gap:5px">
              <app-icon name="alert" [size]="13"></app-icon>
              Após a saída o estoque fica em {{ prodSel.qtd - movQtd }} un (mínimo {{ prodSel.min }}) — considere repor
            </span>
          }
        </div>

        <!-- Motivo com chips + fallback livre -->
        <div class="field">
          <label>Motivo</label>
          <div class="seg" style="flex-wrap:wrap;max-width:100%">
            @for (m of motivosDisponiveis; track m) {
              <button [class.on]="!movMotivoCustom && movMotivo === m"
                (click)="movMotivo = m; movMotivoCustom = false">{{ m }}</button>
            }
            <button [class.on]="movMotivoCustom" (click)="ativarOutroMotivo()">Outro</button>
          </div>
          @if (movMotivoCustom) {
            <input class="input" [(ngModel)]="movMotivo" maxlength="120"
              [class.invalid]="!movMotivo.trim()"
              [placeholder]="modalTipo === 'entrada' ? 'Ex: Compra — Barba Brava Dist.' : 'Ex: Consumo — Corte Masculino'"
              style="margin-top:8px">
            <app-campo-erro [msg]="movMotivo.trim() ? null : 'Descreva o motivo.'"></app-campo-erro>
          }
        </div>

      </div>

      <div modalFoot>
        <button class="btn" (click)="closeModal()">Cancelar</button>
        <button class="btn btn-primary" (click)="salvarMov()"
          [disabled]="!movValido">
          {{ modalTipo === 'entrada' ? 'Registrar entrada' : 'Registrar saída' }}
        </button>
      </div>
    }

    <!-- Editar / Novo produto -->
    @if (modalTipo === 'editar' || modalTipo === 'novo') {
      <div style="display:flex;flex-direction:column;gap:16px">

        <!-- Imagem -->
        <div class="field">
          <label>Imagem do produto</label>
          <div class="row" style="gap:12px;align-items:center">
            <div style="width:72px;height:72px;border-radius:10px;background:var(--surface-2);border:1px solid var(--border);display:grid;place-items:center;overflow:hidden;flex-shrink:0">
              @if (draftImagem) {
                <img [src]="draftImagem" alt="preview"
                  style="width:100%;height:100%;object-fit:cover">
              } @else {
                <app-icon name="pkg" [size]="22" style="color:var(--text-3)"></app-icon>
              }
            </div>
            <div class="col" style="gap:6px;flex:1">
              <div class="row" style="gap:8px;flex-wrap:wrap">
                <label class="btn btn-sm" style="cursor:pointer;margin:0">
                  <app-icon name="download" [size]="13" style="transform:rotate(180deg)"></app-icon>
                  {{ draftImagem ? 'Trocar imagem' : 'Escolher imagem' }}
                  <input type="file" accept="image/*" (change)="onImgFile($event)" hidden>
                </label>
                @if (draftImagem) {
                  <button class="btn btn-sm" (click)="removerImg()" style="color:var(--st-faltou)">
                    <app-icon name="trash" [size]="13"></app-icon>
                    Remover
                  </button>
                }
              </div>
              <span class="muted" style="font-size:12px">PNG, JPG ou WebP · até 2 MB</span>
            </div>
          </div>
        </div>

        <div class="row" style="gap:12px;flex-wrap:wrap">
          <div class="field" style="flex:2;min-width:160px">
            <label>Nome do produto<span class="req">*</span></label>
            <input class="input" [class.invalid]="erros['nome']" [(ngModel)]="draft.nome" placeholder="Ex: Pomada Modeladora" maxlength="80">
            <app-campo-erro [msg]="erros['nome']"></app-campo-erro>
          </div>
          <div class="field" style="flex:1;min-width:130px">
            <label>Categoria<span class="req">*</span></label>
            <app-select [class.invalid]="erros['cat']" [(ngModel)]="draft.cat" [options]="prodCatsOptions" [allowCreate]="true" placeholder="Ex: Finalização"></app-select>
            <app-campo-erro [msg]="erros['cat']"></app-campo-erro>
          </div>
        </div>

        <div class="row" style="gap:12px;flex-wrap:wrap">
          <div class="field" style="flex:1;min-width:100px">
            <label>Qtd em estoque<span class="req">*</span></label>
            <input class="input" [class.invalid]="erros['qtd']" type="number" [(ngModel)]="draft.qtd" min="0" step="1">
            <app-campo-erro [msg]="erros['qtd']"></app-campo-erro>
          </div>
          <div class="field" style="flex:1;min-width:100px">
            <label>Qtd mínima<span class="req">*</span></label>
            <input class="input" [class.invalid]="erros['min']" type="number" [(ngModel)]="draft.min" min="0" step="1">
            <app-campo-erro [msg]="erros['min']"></app-campo-erro>
          </div>
          <div class="field" style="flex:1;min-width:100px">
            <label>Custo unit. (R$)<span class="req">*</span></label>
            <input class="input" [class.invalid]="erros['custo']" type="number" [(ngModel)]="draft.custo" min="0" step="0.01">
            <app-campo-erro [msg]="erros['custo']"></app-campo-erro>
          </div>
          <div class="field" style="flex:1;min-width:110px">
            <label>Preço de venda (R$)</label>
            <input class="input" [class.invalid]="erros['preco']" type="number" [(ngModel)]="draftPreco" min="0" step="0.01" placeholder="Sem venda">
            <app-campo-erro [msg]="erros['preco']"></app-campo-erro>
          </div>
        </div>

        <div class="row" style="gap:12px;flex-wrap:wrap">
          <div class="field" style="flex:1;min-width:160px">
            <label>Fornecedor ou Link de compra</label>
            <input class="input" [class.invalid]="erros['fornecedor']" [(ngModel)]="draft.fornecedor" placeholder="Ex: Beauty Pro" maxlength="255">
            <app-campo-erro [msg]="erros['fornecedor']"></app-campo-erro>
          </div>
          <div class="field" style="flex:1;min-width:180px">
            <label>Baixa automática (serviço vinculado)</label>
            <app-select [(ngModel)]="draftConsumo" [options]="consumoOptions" placeholder="Sem serviço vinculado"></app-select>
          </div>
        </div>

      </div>

      <div modalFoot>
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
  draftImagem: string | null = null;
  movQtd = 1;
  movMotivo = '';
  movMotivoCustom = false;

  readonly motivosEntrada = ['Compra', 'Devolução', 'Ajuste', 'Bonificação'];
  readonly motivosSaida   = ['Consumo', 'Perda/quebra', 'Vencimento', 'Ajuste'];

  readonly NIVEL: Record<string, { label: string; cor: string; bg: string }> = {
    critico: { label: 'Crítico', cor: 'var(--st-faltou)',   bg: 'var(--st-faltou-bg)'   },
    baixo:   { label: 'Baixo',  cor: 'var(--st-pendente)', bg: 'var(--st-pendente-bg)' },
    ok:      { label: 'OK',     cor: 'var(--accent-text)', bg: 'var(--accent-soft)'    },
  };

  /** Ranking de produtos mais consumidos, derivado das saídas reais de estoque.
   *  Antes era mock com IDs fixos (pr1..), que quebrava com dados reais (BUG-08). */
  get rank(): { id: string; n: number }[] {
    const totais: Record<string, number> = {};
    for (const m of this.data.movEstoque) {
      if (m.tipo !== 'saida') continue;
      totais[m.prod] = (totais[m.prod] || 0) + m.qtd;
    }
    return Object.entries(totais)
      .filter(([id]) => this.data.produtos.some(p => p.id === id))
      .map(([id, n]) => ({ id, n }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 8);
  }

  get rankMax(): number { return this.rank[0]?.n ?? 1; }

  constructor(public data: DataService, private toast: ToastService) {}

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

  get prodCatsOptions(): SelectOption[] {
    return this.prodCats.map(c => ({ value: c, label: c }));
  }

  get consumoOptions(): SelectOption[] {
    return [
      { value: '', label: 'Sem serviço vinculado' },
      ...this.data.servicos.map(s => ({ value: s.id, label: s.nome })),
    ];
  }

  openEntrada(p: Produto) {
    this.prodSel = p;
    this.movQtd = 1;
    this.movMotivo = this.motivosEntrada[0];
    this.movMotivoCustom = false;
    this.modalTipo = 'entrada';
  }

  openSaida(p: Produto) {
    this.prodSel = p;
    this.movQtd = 1;
    this.movMotivo = this.motivosSaida[0];
    this.movMotivoCustom = false;
    this.modalTipo = 'saida';
  }

  get motivosDisponiveis(): string[] {
    return this.modalTipo === 'entrada' ? this.motivosEntrada : this.motivosSaida;
  }

  ativarOutroMotivo() {
    this.movMotivoCustom = true;
    this.movMotivo = '';
  }

  inc(n: number) { this.movQtd = (Number(this.movQtd) || 0) + n; }
  dec()          { this.movQtd = Math.max(1, (Number(this.movQtd) || 1) - 1); }

  get novaQtd(): number {
    if (!this.prodSel) return 0;
    const q = Number(this.movQtd) || 0;
    return this.modalTipo === 'entrada' ? this.prodSel.qtd + q : this.prodSel.qtd - q;
  }

  get novoNivel(): 'critico' | 'baixo' | 'ok' {
    if (!this.prodSel) return 'ok';
    return this.nivel({ ...this.prodSel, qtd: Math.max(0, this.novaQtd) } as Produto);
  }

  get movValido(): boolean {
    if (!this.prodSel) return false;
    const q = Number(this.movQtd);
    if (!Number.isInteger(q) || q < 1 || q > 10000) return false;
    const motivo = this.movMotivo.trim();
    if (!motivo || motivo.length > 120) return false;
    if (this.modalTipo === 'saida' && q > this.prodSel.qtd) return false;
    return true;
  }

  /** Mensagem do campo quantidade da movimentação (inteiro entre 1 e 10.000). */
  get erroMovQtd(): string | null {
    return V.obrigatorio(this.movQtd) || V.numero(this.movQtd, { min: 1, max: 10000, inteiro: true });
  }

  /** Erros do cadastro de produto: aparecem após a 1ª tentativa de salvar. */
  enviado = false;

  get erros(): Erros {
    if (!this.enviado) return {};
    const d = this.draft;
    const nomeDup = !!d.nome?.trim() && this.data.produtos.some(p =>
      p.id !== this.prodSel?.id && p.nome.trim().toLowerCase() === d.nome!.trim().toLowerCase());
    const forn = String(d.fornecedor ?? '').trim();
    return validar({
      nome: [V.obrigatorio(d.nome), V.tamanho(d.nome, 2, 80), V.se(nomeDup, 'Já existe um produto com esse nome.')],
      cat: [V.obrigatorio(d.cat, 'Escolha ou crie uma categoria.'), V.tamanho(d.cat, 2, 40)],
      qtd: [V.obrigatorio(d.qtd), V.numero(d.qtd, { min: 0, max: 100000, inteiro: true })],
      min: [V.obrigatorio(d.min), V.numero(d.min, { min: 0, max: 100000, inteiro: true })],
      custo: [V.obrigatorio(d.custo), V.dinheiro(d.custo, { max: 100000 })],
      preco: [V.dinheiro(this.draftPreco, { max: 100000 }),
        V.se(this.draftPreco != null && (this.draftPreco as any) !== '' && Number(this.draftPreco) < Number(d.custo),
          'O preço de venda não pode ser menor que o custo.')],
      fornecedor: [V.tamanho(forn, 0, 255), /^https?:/i.test(forn) ? V.url(forn) : null],
    });
  }

  openEditar(p: Produto) {
    this.prodSel = p;
    this.draft = { ...p };
    this.draftPreco = p.preco;
    this.draftConsumo = p.consumo ?? '';
    this.draftImagem = p.imagem ?? null;
    this.modalTipo = 'editar';
  }

  openNovo() {
    this.prodSel = null;
    this.draft = { nome: '', cat: '', qtd: 0, min: 5, custo: 0, fornecedor: '' };
    this.draftPreco = null;
    this.draftConsumo = '';
    this.draftImagem = null;
    this.modalTipo = 'novo';
  }

  onImgFile(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.notify.emit('Arquivo precisa ser uma imagem');
      input.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.notify.emit('Imagem muito grande (máx. 2 MB)');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { this.draftImagem = reader.result as string; };
    reader.readAsDataURL(file);
    input.value = '';
  }

  removerImg() { this.draftImagem = null; }

  closeModal() {
    this.modalTipo = null;
    this.prodSel = null;
    this.enviado = false;
  }

  salvarMov() {
    if (!this.prodSel || !this.movValido) return;
    this.data.registrarMov(this.prodSel.id, this.modalTipo as 'entrada' | 'saida', Number(this.movQtd), this.movMotivo.trim());
    this.closeModal();
  }

  salvarProduto() {
    this.enviado = true;
    if (temErros(this.erros)) { this.toast.error('Corrija os campos destacados.'); return; }
    const preco = this.draftPreco != null && !isNaN(Number(this.draftPreco)) ? Number(this.draftPreco) : null;
    const consumo = this.draftConsumo.trim() || null;
    const imagem = this.draftImagem;
    if (this.modalTipo === 'editar' && this.prodSel) {
      this.data.updateProduto(this.prodSel.id, { ...this.draft, preco, consumo, imagem });
    } else {
      this.data.addProduto({ ...this.draft, preco, consumo, imagem } as Omit<Produto, 'id'>);
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
