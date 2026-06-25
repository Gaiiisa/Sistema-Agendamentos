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
      <div style="font-weight:700;font-size:16px">Período: {{ data.periodoComissao }}</div>
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

    <!-- CStat: Total em comissões -->
    <div class="stat" style="flex-direction:row;align-items:center;gap:14px">
      <div class="stat-ico" style="background:var(--accent-soft);width:44px;height:44px">
        <app-icon name="coins" [size]="21" style="color:var(--accent)"></app-icon>
      </div>
      <div class="col">
        <div class="stat-val tnum" style="font-size:23px">{{ data.money(totalComissao) }}</div>
        <div class="stat-label">Total em comissões</div>
      </div>
    </div>

    <!-- CStat: A pagar -->
    <div class="stat" style="flex-direction:row;align-items:center;gap:14px">
      <div class="stat-ico" style="background:var(--st-pendente-bg);width:44px;height:44px">
        <app-icon name="clock" [size]="21" style="color:var(--st-pendente)"></app-icon>
      </div>
      <div class="col">
        <div class="stat-val tnum" style="font-size:23px">{{ data.money(aPagar) }}</div>
        <div class="stat-label">A pagar</div>
      </div>
    </div>

    <!-- CStat: Já pago -->
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
        <div class="muted" style="font-size:13px">Recibo de comissão · {{ data.periodoComissao }}</div>
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

</div>
`,
})
export class ComissoesComponent {
  @Output() notify = new EventEmitter<string>();

  periodo = 'quinzena';
  recibo: any = null;

  constructor(public data: DataService) {}

  calc(profId: string) {
    const p = this.data.prof(profId);
    const c = this.data.comissoes[profId];
    const bruto = c.itens.reduce((s, i) => s + i.valor, 0);
    const comissao = Math.round(bruto * p.comissao / 100);
    return { p, c, bruto, comissao, qtd: c.itens.length };
  }

  calcComissaoItem(valor: number, comissaoPct: number): number {
    return Math.round(valor * comissaoPct / 100);
  }

  get dados() {
    return this.data.staff.map(p => this.calc(p.id));
  }

  get totalComissao() {
    return this.dados.reduce((s, d) => s + d.comissao, 0);
  }

  get aPagar() {
    return this.dados.filter(d => d.c.status === 'aberto').reduce((s, d) => s + d.comissao, 0);
  }

  get pago() {
    return this.dados.filter(d => d.c.status === 'pago').reduce((s, d) => s + d.comissao, 0);
  }
}
