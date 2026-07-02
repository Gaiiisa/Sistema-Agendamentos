import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon.component';
import { AvatarComponent } from '../shared/avatar.component';
import { ModalComponent } from '../shared/modal.component';
import { DataService } from '../data.service';

@Component({
  selector: 'app-comissoes',
  standalone: true,
  imports: [CommonModule, IconComponent, AvatarComponent, ModalComponent],
  template: `
<div class="page">

  <!-- header row -->
  <div class="row" style="margin-bottom:16px;flex-wrap:wrap;gap:10px">
    <div class="col" style="line-height:1.3">
      <div style="font-weight:700;font-size:16px">Período: {{ periodoLabel }}</div>
      <div class="muted" style="font-size:13px">Cálculo automático sobre atendimentos concluídos.</div>
    </div>
    <div class="seg" style="margin-left:auto">
      <button [class.on]="periodo === 'semana'"  (click)="periodo='semana'">Semana</button>
      <button [class.on]="periodo === 'quinzena'" (click)="periodo='quinzena'">Quinzena</button>
      <button [class.on]="periodo === 'mes'"     (click)="periodo='mes'">Mês</button>
    </div>
  </div>

  <!-- stat-grid -->
  <div class="stat-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">

    <div class="stat" style="flex-direction:row;align-items:center;gap:14px">
      <div class="stat-ico" style="background:var(--accent-soft);width:44px;height:44px">
        <app-icon name="coins" [size]="21" style="color:var(--accent)"></app-icon>
      </div>
      <div class="col">
        <div class="stat-val tnum" style="font-size:23px">{{ data.money(totalComissao) }}</div>
        <div class="stat-label">Total em comissões</div>
      </div>
    </div>

    <div class="stat" style="flex-direction:row;align-items:center;gap:14px">
      <div class="stat-ico" style="background:var(--st-pendente-bg);width:44px;height:44px">
        <app-icon name="clock" [size]="21" style="color:var(--st-pendente)"></app-icon>
      </div>
      <div class="col">
        <div class="stat-val tnum" style="font-size:23px">{{ data.money(aPagar) }}</div>
        <div class="stat-label">A pagar</div>
      </div>
    </div>

    <div class="stat" style="flex-direction:row;align-items:center;gap:14px">
      <div class="stat-ico" style="background:var(--st-atendimento-bg);width:44px;height:44px">
        <app-icon name="check" [size]="21" style="color:var(--st-atendimento)"></app-icon>
      </div>
      <div class="col">
        <div class="stat-val tnum" style="font-size:23px">{{ data.money(pago) }}</div>
        <div class="stat-label">Já pago</div>
      </div>
    </div>

  </div>

  <!-- cards grid -->
  <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(min(100%, 340px),1fr));gap:16px">
    @for (d of dados; track d.p.id) {
      <div class="card" style="padding:18px;display:flex;flex-direction:column;gap:14px">

        <!-- prof header row -->
        <div class="row" style="gap:12px">
          <app-avatar [nome]="d.p.nome" [cor]="d.p.cor" [size]="44"></app-avatar>
          <div class="col" style="flex:1;line-height:1.3">
            <div style="font-weight:700;font-size:15.5px">{{ d.p.nome }}</div>
            <div class="muted" style="font-size:12.5px">{{ d.p.comissao }}% · {{ d.qtd }} atendimentos</div>
          </div>
          @if (d.c.status === 'pago') {
            <span class="pill pill-confirmado"><app-icon name="check" [size]="12"></app-icon>Pago</span>
          } @else {
            <span class="pill pill-pendente"><span class="pdot"></span>A pagar</span>
          }
        </div>

        <!-- faturou / comissão boxes -->
        <div class="row" style="gap:10px">
          <div class="col" style="flex:1;background:var(--surface-2);border-radius:var(--r-md);padding:10px 13px">
            <span class="muted" style="font-size:11.5px">Faturou</span>
            <span class="tnum" style="font-weight:700;font-size:16px">{{ data.money(d.bruto) }}</span>
          </div>
          <div class="col" style="flex:1;background:var(--accent-soft);border-radius:var(--r-md);padding:10px 13px">
            <span style="font-size:11.5px;color:var(--accent-text)">Comissão</span>
            <span class="tnum" style="font-weight:800;font-size:16px;color:var(--accent-text)">{{ data.money(d.comissao) }}</span>
          </div>
        </div>

        <!-- detalhamento serviço a serviço -->
        <div class="col" style="gap:0;border:1px solid var(--border);border-radius:var(--r-md);overflow:hidden">
          @for (it of d.c.itens.slice(0,3); track $index) {
            <div class="row" style="gap:9px;padding:8px 11px;font-size:12.5px"
              [style.borderBottom]="$index < (d.c.itens.length > 3 ? 3 : d.c.itens.length) - 1 || d.c.itens.length > 3 ? '1px solid var(--border)' : 'none'">
              <span [style.width.px]="7" [style.height.px]="7" [style.borderRadius.px]="2"
                    [style.background]="data.srv(it.srv).cor" style="flex-shrink:0"></span>
              <span style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1">{{ data.srv(it.srv).nome }}</span>
              <span class="muted" style="font-size:11.5px">{{ data.fmtData(it.data) }}</span>
              <span class="tnum" style="font-weight:600">{{ data.money(it.valor) }}</span>
            </div>
          }
          @if (d.c.itens.length > 3) {
            <div style="padding:7px 11px;font-size:12px;color:var(--text-3);font-weight:600">
              + {{ d.c.itens.length - 3 }} atendimentos
            </div>
          }
        </div>

        <!-- action buttons -->
        <div class="row" style="gap:8px">
          <button class="btn btn-ghost btn-sm" style="flex:1" (click)="recibo=d">
            <app-icon name="download" [size]="14"></app-icon> Recibo
          </button>
          <button class="btn btn-ghost btn-sm" style="flex:1" (click)="historico=d">
            <app-icon name="clock" [size]="14"></app-icon> Histórico
          </button>
          @if (d.c.status === 'aberto') {
            <button class="btn btn-primary btn-sm" style="flex:1"
              (click)="notify.emit('Comissão de ' + d.p.apelido + ' marcada como paga')">
              <app-icon name="check" [size]="14"></app-icon> Pagar {{ data.money(d.comissao) }}
            </button>
          } @else {
            <button class="btn btn-subtle btn-sm" style="flex:1" disabled>Quitado</button>
          }
        </div>

      </div>
    }
  </div>

  <!-- recibo modal -->
  @if (recibo) {
    <app-modal title="Recibo de comissão" (close)="recibo=null">

      <div style="text-align:center;padding-bottom:6px">
        <div style="font-weight:800;font-size:17px;letter-spacing:-0.01em">{{ data.estabelecimento.nome }}</div>
        <div class="muted" style="font-size:13px">Recibo de comissão · {{ periodoLabel }}</div>
      </div>

      <div class="divider"></div>

      <div class="row" style="gap:12px">
        <app-avatar [nome]="recibo.p.nome" [cor]="recibo.p.cor" [size]="42"></app-avatar>
        <div class="col" style="line-height:1.3">
          <span style="font-weight:700;font-size:15px">{{ recibo.p.nome }}</span>
          <span class="muted" style="font-size:12.5px">Comissão de {{ recibo.p.comissao }}% · {{ recibo.qtd }} atendimentos</span>
        </div>
      </div>

      <div style="overflow-x:auto;border:1px solid var(--border);border-radius:var(--r-md)">
        <table class="tbl">
          <thead>
            <tr>
              <th>Data</th>
              <th>Cliente</th>
              <th>Serviço</th>
              <th>Valor</th>
              <th>Comissão</th>
            </tr>
          </thead>
          <tbody>
            @for (it of recibo.c.itens; track $index) {
              <tr>
                <td class="mono" style="font-size:12.5px">{{ data.fmtData(it.data) }}</td>
                <td>{{ data.cli(it.cli).nome.split(' ')[0] }}</td>
                <td>{{ data.srv(it.srv).nome }}</td>
                <td class="tnum">{{ data.money(it.valor) }}</td>
                <td class="tnum" style="font-weight:600">{{ data.money(calcComissaoItem(it.valor, recibo.p.comissao)) }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="row" style="padding:12px 14px;background:var(--accent-soft);border-radius:var(--r-md)">
        <span style="font-weight:700;color:var(--accent-text)">Total a receber</span>
        <span class="tnum" style="margin-left:auto;font-weight:800;font-size:18px;color:var(--accent-text)">{{ data.money(recibo.comissao) }}</span>
      </div>

      <div modalFoot>
        <button class="btn btn-ghost" (click)="recibo=null">Fechar</button>
        <button class="btn btn-primary" (click)="recibo=null; notify.emit('Recibo gerado em PDF')">
          <app-icon name="download" [size]="15"></app-icon> Baixar PDF
        </button>
      </div>

    </app-modal>
  }

  <!-- histórico modal -->
  @if (historico) {
    <app-modal title="Histórico de pagamentos" [wide]="true" (close)="historico=null">

      <div style="text-align:center;padding-bottom:6px">
        <div style="font-weight:800;font-size:17px;letter-spacing:-0.01em">{{ data.estabelecimento.nome }}</div>
        <div class="muted" style="font-size:13px">Histórico de comissões pagas</div>
      </div>

      <div class="divider"></div>

      <div class="row" style="gap:12px">
        <app-avatar [nome]="historico.p.nome" [cor]="historico.p.cor" [size]="42"></app-avatar>
        <div class="col" style="line-height:1.3">
          <span style="font-weight:700;font-size:15px">{{ historico.p.nome }}</span>
          <span class="muted" style="font-size:12.5px">Comissão de {{ historico.p.comissao }}% · {{ histProf.length }} períodos registrados</span>
        </div>
      </div>

      <!-- mini KPIs -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
        <div style="background:var(--surface-2);border-radius:var(--r-md);padding:10px 12px">
          <div class="muted" style="font-size:11.5px">Total recebido</div>
          <div class="tnum" style="font-weight:800;font-size:15px;color:var(--accent-text)">{{ data.money(histTotalProf) }}</div>
        </div>
        <div style="background:var(--surface-2);border-radius:var(--r-md);padding:10px 12px">
          <div class="muted" style="font-size:11.5px">Atendimentos</div>
          <div class="tnum" style="font-weight:800;font-size:15px">{{ histAtendProf }}</div>
        </div>
        <div style="background:var(--surface-2);border-radius:var(--r-md);padding:10px 12px">
          <div class="muted" style="font-size:11.5px">Média / período</div>
          <div class="tnum" style="font-weight:800;font-size:15px">{{ data.money(histMediaProf) }}</div>
        </div>
      </div>

      <div style="overflow-x:auto;border:1px solid var(--border);border-radius:var(--r-md)">
        <table class="tbl">
          <thead>
            <tr>
              <th>Período</th>
              <th style="text-align:center">Atend.</th>
              <th style="text-align:right">Faturado</th>
              <th style="text-align:right">Comissão</th>
              <th>Data pgto</th>
              <th>Forma</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            @for (h of histProf; track h.id) {
              <tr>
                <td style="font-weight:600;font-size:13px">{{ h.periodo }}</td>
                <td class="tnum muted" style="text-align:center;font-size:13px">{{ h.atendimentos }}</td>
                <td class="tnum" style="text-align:right;font-size:13px">{{ data.money(h.bruto) }}</td>
                <td class="tnum" style="text-align:right;font-weight:700;color:var(--accent-text)">{{ data.money(h.comissao) }}</td>
                <td class="mono muted" style="font-size:12.5px">{{ h.dataPagamento ? data.fmtDataFull(h.dataPagamento) : '—' }}</td>
                <td>
                  @if (h.formaPagamento) {
                    <span class="tag" style="border-color:transparent"
                          [style.background]="FORMA_BG[h.formaPagamento]"
                          [style.color]="FORMA_COR[h.formaPagamento]">{{ FORMA_LABEL[h.formaPagamento] }}</span>
                  }
                </td>
                <td>
                  @if (h.status === 'pago') {
                    <span class="pill pill-confirmado"><app-icon name="check" [size]="11"></app-icon> Pago</span>
                  } @else {
                    <span class="pill pill-pendente"><span class="pdot"></span> Aberto</span>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7"><div class="empty">Nenhum registro encontrado.</div></td></tr>
            }
          </tbody>
        </table>
      </div>

      <div class="row" style="padding:12px 14px;background:var(--accent-soft);border-radius:var(--r-md)">
        <span style="font-weight:700;color:var(--accent-text)">Total recebido (histórico)</span>
        <span class="tnum" style="margin-left:auto;font-weight:800;font-size:18px;color:var(--accent-text)">{{ data.money(histTotalProf) }}</span>
      </div>

      <div modalFoot>
        <button class="btn btn-ghost" (click)="historico=null">Fechar</button>
        <button class="btn btn-primary" (click)="historico=null; notify.emit('Histórico de ' + historico.p.apelido + ' exportado em PDF')">
          <app-icon name="download" [size]="15"></app-icon> Exportar PDF
        </button>
      </div>

    </app-modal>
  }

</div>
`,
})
export class ComissoesComponent {
  @Output() notify = new EventEmitter<string>();

  periodo = 'quinzena';
  recibo: any = null;
  historico: any = null;

  readonly FORMA_LABEL: any = { pix: 'Pix', dinheiro: 'Dinheiro', cartao: 'Cartão' };
  readonly FORMA_COR: any = { pix: 'var(--st-atendimento)', dinheiro: 'var(--accent)', cartao: '#7c3aed' };
  readonly FORMA_BG: any = { pix: 'var(--st-atendimento-bg)', dinheiro: 'var(--accent-soft)', cartao: '#ede9fe' };

  constructor(public data: DataService) {}

  private static readonly MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  private static readonly MES_ABR = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

  private fmtISO(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /** Faixa (ini, fim, rótulo) do período selecionado, calculada a partir de hoje. */
  private periodRange(): { ini: string; fim: string; label: string } {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const y = today.getFullYear(), m = today.getMonth(), day = today.getDate();

    if (this.periodo === 'semana') {
      const dow = today.getDay();
      const back = dow === 0 ? 6 : dow - 1;
      const ini = new Date(today); ini.setDate(today.getDate() - back);
      const fim = new Date(ini);   fim.setDate(ini.getDate() + 6);
      const M = ComissoesComponent.MES_ABR;
      return {
        ini: this.fmtISO(ini), fim: this.fmtISO(fim),
        label: `Semana · ${ini.getDate()} ${M[ini.getMonth()]} – ${fim.getDate()} ${M[fim.getMonth()]}`,
      };
    }
    if (this.periodo === 'mes') {
      const ini = new Date(y, m, 1);
      const fim = new Date(y, m + 1, 0);
      const mesCap = ComissoesComponent.MESES[m].charAt(0).toUpperCase() + ComissoesComponent.MESES[m].slice(1);
      return { ini: this.fmtISO(ini), fim: this.fmtISO(fim), label: `${mesCap} · ${y}` };
    }
    // quinzena (padrão)
    const primeira = day <= 15;
    const ini = new Date(y, m, primeira ? 1 : 16);
    const fim = primeira ? new Date(y, m, 15) : new Date(y, m + 1, 0);
    return {
      ini: this.fmtISO(ini), fim: this.fmtISO(fim),
      label: `${String(ini.getDate()).padStart(2, '0')} – ${String(fim.getDate()).padStart(2, '0')} de ${ComissoesComponent.MESES[m]}`,
    };
  }

  get periodoLabel(): string { return this.periodRange().label; }

  private calcInRange(profId: string, ini: string, fim: string) {
    const p = this.data.prof(profId);
    const src = this.data.comissoes[profId] || { status: 'aberto', itens: [] };
    const itens = src.itens.filter(i => i.data >= ini && i.data <= fim);
    const bruto = itens.reduce((s, i) => s + i.valor, 0);
    const comissao = Math.round(bruto * (p?.comissao || 0) / 100);
    return { p, c: { status: src.status, itens }, bruto, comissao, qtd: itens.length };
  }

  /** API mantida para chamadas externas (se houver). */
  calc(profId: string) {
    const { ini, fim } = this.periodRange();
    return this.calcInRange(profId, ini, fim);
  }

  calcComissaoItem(valor: number, comissaoPct: number): number {
    return Math.round(valor * comissaoPct / 100);
  }

  // Cache dos dados computados por período. Sem cache, `dados` recomputa a
  // filtragem+redução em cada acesso — e o template referencia dados/allSel
  // várias vezes por ciclo de change detection.
  private _dadosCache: any = null;
  private _dadosKey = '';

  get dados() {
    const totalItens = this.data.staff.reduce(
      (s, p) => s + (this.data.comissoes[p.id]?.itens.length || 0), 0);
    const key = `${this.periodo}|${totalItens}`;
    if (this._dadosCache && this._dadosKey === key) return this._dadosCache;
    const { ini, fim } = this.periodRange();
    this._dadosCache = this.data.staff.map(p => this.calcInRange(p.id, ini, fim));
    this._dadosKey = key;
    return this._dadosCache;
  }

  get totalComissao(): number { return this.dados.reduce((s: number, d: any) => s + d.comissao, 0); }
  get aPagar(): number { return this.dados.filter((d: any) => d.c.status === 'aberto').reduce((s: number, d: any) => s + d.comissao, 0); }
  get pago(): number { return this.dados.filter((d: any) => d.c.status === 'pago').reduce((s: number, d: any) => s + d.comissao, 0); }

  get histProf() {
    if (!this.historico) return [];
    return [...this.data.historicoComissoes]
      .filter(h => h.profId === this.historico.p.id)
      .sort((a, b) => b.dataInicio.localeCompare(a.dataInicio));
  }

  get histTotalProf() { return this.histProf.filter(h => h.status === 'pago').reduce((s, h) => s + h.comissao, 0); }
  get histAtendProf() { return this.histProf.reduce((s, h) => s + h.atendimentos, 0); }
  get histMediaProf() { const p = this.histProf.filter(h => h.status === 'pago'); return p.length ? Math.round(this.histTotalProf / p.length) : 0; }
}
