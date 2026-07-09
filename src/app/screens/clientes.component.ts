/* Tela: Clientes (CRM) — lista + ficha detalhada (drawer) */
import { Component, EventEmitter, Input, Output, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../icon.component';
import { AvatarComponent } from '../shared/avatar.component';
import { TagComponent } from '../shared/tag.component';
import { ModalComponent } from '../shared/modal.component';
import { DataService } from '../data.service';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, AvatarComponent, TagComponent, ModalComponent],
  template: `
<div class="page">

  <!-- toolbar -->
  <div class="row" style="margin-bottom:16px; flex-wrap:wrap; gap:10px">
    <div class="search-inp" style="flex:1;min-width:min(300px, 100%)">
      <app-icon name="search" [size]="16"></app-icon>
      <input placeholder="Buscar por nome ou WhatsApp…"
             [value]="q"
             (input)="q=$any($event.target).value">
    </div>

    <div class="seg">
      @for (f of filters; track f.id) {
        <button [class]="tag === f.id ? 'on' : ''" (click)="tag = f.id">
          {{ f.label }}<span style="margin-left:6px; opacity:0.6">{{ f.n }}</span>
        </button>
      }
    </div>
  </div>

  <!-- banner sumidos -->
  @if (sumidos > 0 && tag !== 'sumido') {
    <div class="card card-pad sumidos-banner"
         style="margin-bottom:16px; display:flex; align-items:center; gap:14px; border-left:3px solid var(--st-faltou)">
      <div class="alert-ico" style="background:var(--st-faltou-bg)">
        <app-icon name="alert" [size]="17" style="color:var(--st-faltou)"></app-icon>
      </div>
      <div class="col" style="flex:1; min-width:0">
        <div style="font-weight:600">{{ sumidos }} clientes sumiram</div>
        <div class="muted" style="font-size:13px">Não voltam há mais de 60 dias — bons candidatos a uma campanha de retorno.</div>
      </div>
      <div class="sumidos-actions">
        <button class="btn btn-ghost btn-sm" (click)="tag = 'sumido'">Ver lista</button>
        <button class="btn btn-whatsapp btn-sm">
          <app-icon name="whatsapp" [size]="14"></app-icon> Campanha de retorno
        </button>
      </div>
    </div>
  }

  <!-- tabela -->
  <div class="card tbl-card-outer">
    <div style="overflow-x:auto">
      <table class="tbl tbl-card">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>WhatsApp</th>
            <th>Última visita</th>
            <th>Visitas</th>
            <th>Ticket médio</th>
            <th>Total gasto</th>
            <th>Tags</th>
          </tr>
        </thead>
        <tbody>
          @for (c of list; track c.id) {
            <tr class="tbl-row-click" (click)="onOpen.emit(c.id)">
              <td class="card-header">
                <div class="row" style="gap:11px">
                  <app-avatar [nome]="c.nome"
                              [cor]="c.tags.includes('vip') ? '#0e9f6e' : c.tags.includes('sumido') ? '#9ca3af' : '#2563eb'"
                              [size]="36"></app-avatar>
                  <div class="col" style="line-height:1.25">
                    <span style="font-weight:600">{{ c.nome }}</span>
                    <span class="muted" style="font-size:12.5px">{{ c.email }}</span>
                  </div>
                </div>
              </td>
              <td class="mono muted" data-label="WhatsApp" style="font-size:13px">{{ c.wpp }}</td>
              <td data-label="Última visita">
                <span [style.color]="data.diasDesde(c.ultima) > 60 ? 'var(--st-faltou)' : 'var(--text)'">
                  {{ data.diasDesde(c.ultima) === 0 ? 'Hoje' : 'há ' + data.diasDesde(c.ultima) + ' dias' }}
                </span>
              </td>
              <td class="tnum" data-label="Visitas">{{ c.visitas }}</td>
              <td class="tnum" data-label="Ticket médio">{{ data.money(c.ticket) }}</td>
              <td class="tnum" data-label="Total gasto" style="font-weight:600">{{ data.money(c.total) }}</td>
              <td data-label="Tags">
                <div class="row" style="gap:5px;flex-wrap:wrap;justify-content:flex-end">
                  @for (t of c.tags; track t) {
                    <app-tag [kind]="t"></app-tag>
                  }
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>

      @if (list.length === 0) {
        <div class="empty">Nenhum cliente encontrado.</div>
      }
    </div>
  </div>

  <!-- drawer ficha -->
  @if (openId) {
    <ng-container *ngIf="data.cli(openId) as c">
      <div class="drawer-overlay" (click)="onClose.emit()"></div>
      <div class="drawer">

        <!-- drawer header -->
        <div style="padding:20px 22px; border-bottom:1px solid var(--border); background:var(--surface)">
          <div class="row" style="margin-bottom:14px">
            <div style="font-weight:700; font-size:13px; color:var(--text-3); text-transform:uppercase; letter-spacing:0.05em">
              Ficha do cliente
            </div>
            <button class="icon-btn" style="margin-left:auto; width:32px; height:32px" (click)="onClose.emit()">
              <app-icon name="x" [size]="18"></app-icon>
            </button>
          </div>

          <div class="row" style="gap:14px">
            <app-avatar [nome]="c.nome"
                        [cor]="c.tags.includes('vip') ? '#0e9f6e' : '#2563eb'"
                        [size]="58"></app-avatar>
            <div class="col" style="gap:5px; flex:1">
              <div style="font-size:20px; font-weight:800; letter-spacing:-0.02em">{{ c.nome }}</div>
              <div class="row" style="gap:6px">
                @for (t of c.tags; track t) {
                  <app-tag [kind]="t"></app-tag>
                }
              </div>
            </div>
          </div>

          <div class="row" style="gap:8px; margin-top:16px">
            <button class="btn btn-primary btn-sm" style="flex:1">
              <app-icon name="calendar" [size]="15"></app-icon> Agendar
            </button>
            <button class="btn btn-whatsapp btn-sm" style="flex:1">
              <app-icon name="whatsapp" [size]="15"></app-icon> WhatsApp
            </button>
            <button class="btn btn-ghost btn-sm btn-icon-only">
              <app-icon name="edit" [size]="15"></app-icon>
            </button>
          </div>
        </div>

        <!-- drawer body -->
        <div style="flex:1; overflow-y:auto; padding:22px; display:flex; flex-direction:column; gap:18px">

          <!-- métricas -->
          <div style="display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:10px">
            <!-- Metric: Total gasto -->
            <div class="card" style="padding:12px 14px">
              <div class="stat-val tnum" style="font-size:21px">{{ data.money(c.total) }}</div>
              <div class="stat-label" style="font-size:12px">Total gasto</div>
            </div>
            <!-- Metric: Ticket médio -->
            <div class="card" style="padding:12px 14px">
              <div class="stat-val tnum" style="font-size:21px">{{ data.money(c.ticket) }}</div>
              <div class="stat-label" style="font-size:12px">Ticket médio</div>
            </div>
            <!-- Metric: Visitas -->
            <div class="card" style="padding:12px 14px">
              <div class="stat-val tnum" style="font-size:21px">{{ c.visitas }}</div>
              <div class="stat-label" style="font-size:12px">Visitas</div>
            </div>
            <!-- Metric: Frequência -->
            <div class="card" style="padding:12px 14px">
              <div class="stat-val tnum" style="font-size:21px">a cada {{ c.freq }}d</div>
              <div class="stat-label" style="font-size:12px">Frequência</div>
            </div>
          </div>

          <!-- último atendimento + cashback -->
          <div class="card card-pad"
               style="display:flex; align-items:center; gap:12px; padding:14px; border:none"
               [style.background]="data.diasDesde(c.ultima) > 60 ? 'var(--st-faltou-bg)' : 'var(--accent-soft)'">
            <app-icon
              [name]="data.diasDesde(c.ultima) > 60 ? 'alert' : 'history'"
              [size]="18"
              [style.color]="data.diasDesde(c.ultima) > 60 ? 'var(--st-faltou)' : 'var(--accent)'">
            </app-icon>
            <div class="col" style="line-height:1.3">
              <span style="font-weight:600; font-size:13.5px"
                    [style.color]="data.diasDesde(c.ultima) > 60 ? 'var(--st-faltou)' : 'var(--accent-text)'">
                {{ data.diasDesde(c.ultima) === 0 ? 'Esteve aqui hoje' : 'Última visita há ' + data.diasDesde(c.ultima) + ' dias' }}
              </span>
              <span style="font-size:12.5px; opacity:0.85"
                    [style.color]="data.diasDesde(c.ultima) > 60 ? 'var(--st-faltou)' : 'var(--accent-text)'">
                {{ data.diasDesde(c.ultima) > 60 ? 'Cliente sumido — vale uma mensagem' : 'Cliente ativo' }}
              </span>
            </div>
          </div>

          <!-- contato (Section) -->
          <div class="col" style="gap:10px">
            <div style="font-size:12px; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; color:var(--text-3)">Contato</div>

            <!-- InfoRow: WhatsApp -->
            <div class="row" style="gap:11px; padding:4px 0">
              <div style="width:30px; height:30px; border-radius:8px; background:var(--surface-2); display:grid; place-items:center">
                <app-icon name="whatsapp" [size]="15" style="color:var(--text-2)"></app-icon>
              </div>
              <div class="col" style="line-height:1.3">
                <span class="muted" style="font-size:12px">WhatsApp</span>
                <span style="font-weight:600; font-size:13.5px">{{ c.wpp }}</span>
              </div>
            </div>

            <!-- InfoRow: E-mail -->
            <div class="row" style="gap:11px; padding:4px 0">
              <div style="width:30px; height:30px; border-radius:8px; background:var(--surface-2); display:grid; place-items:center">
                <app-icon name="mail" [size]="15" style="color:var(--text-2)"></app-icon>
              </div>
              <div class="col" style="line-height:1.3">
                <span class="muted" style="font-size:12px">E-mail</span>
                <span style="font-weight:600; font-size:13.5px">{{ c.email }}</span>
              </div>
            </div>

            <!-- InfoRow: Nascimento -->
            <div class="row" style="gap:11px; padding:4px 0">
              <div style="width:30px; height:30px; border-radius:8px; background:var(--surface-2); display:grid; place-items:center">
                <app-icon name="cake" [size]="15" style="color:var(--text-2)"></app-icon>
              </div>
              <div class="col" style="line-height:1.3">
                <span class="muted" style="font-size:12px">Nascimento</span>
                <span style="font-weight:600; font-size:13.5px">{{ fmtNasc(c.nasc) }}</span>
              </div>
            </div>

            <!-- InfoRow: Profissional favorito (conditional) -->
            @if (c.fav && data.prof(c.fav)) {
              <div class="row" style="gap:11px; padding:4px 0">
                <div style="width:30px; height:30px; border-radius:8px; background:var(--surface-2); display:grid; place-items:center">
                  <app-icon name="star" [size]="15" style="color:var(--text-2)"></app-icon>
                </div>
                <div class="col" style="line-height:1.3">
                  <span class="muted" style="font-size:12px">Profissional favorito</span>
                  <span style="font-weight:600; font-size:13.5px">{{ data.prof(c.fav!).nome }}</span>
                </div>
              </div>
            }
          </div>

          <!-- fidelidade (Section) -->
          <div class="col" style="gap:10px">
            <div style="font-size:12px; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; color:var(--text-3)">Fidelidade</div>
            <div class="card card-pad" style="display:flex; align-items:center; gap:12px; padding:14px">
              <div style="width:40px; height:40px; border-radius:10px; background:var(--accent-soft); display:grid; place-items:center">
                <app-icon name="coins" [size]="19" style="color:var(--accent-text)"></app-icon>
              </div>
              <div class="col" style="flex:1; line-height:1.3">
                <span style="font-weight:700; font-size:15px">{{ c.visitas % 10 }} / 10 cortes</span>
                <span class="muted" style="font-size:12.5px">Faltam {{ 10 - (c.visitas % 10) }} para um corte grátis</span>
              </div>
              <div class="progress" style="width:70px">
                <span [style.width]="(c.visitas % 10) * 10 + '%'"></span>
              </div>
            </div>
          </div>

          <!-- observações (Section, conditional) -->
          @if (c.obs) {
            <div class="col" style="gap:10px">
              <div style="font-size:12px; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; color:var(--text-3)">Observações</div>
              <div style="font-size:13.5px; color:var(--text-2); background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md); padding:12px; line-height:1.5">
                {{ c.obs }}
              </div>
            </div>
          }

          <!-- histórico (Section) -->
          <div class="col" style="gap:10px">
            <div style="font-size:12px; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; color:var(--text-3)">Histórico de atendimentos</div>
            @if ((data.historico[openId!] || []).length === 0) {
              <div class="muted" style="font-size:13px">Sem atendimentos registrados.</div>
            } @else {
              <div class="col" style="gap:0">
                @for (h of (data.historico[openId!] || []); track $index; let i = $index; let last = $last) {
                  <div class="row"
                       style="gap:11px; padding:11px 0"
                       [style.border-bottom]="!last ? '1px solid var(--border)' : 'none'">
                    <div style="width:3px; align-self:stretch; border-radius:99px"
                         [style.background]="data.srv(h.srv).cor"></div>
                    <div class="col" style="flex:1; line-height:1.3">
                      <span style="font-weight:600; font-size:13.5px">{{ data.srv(h.srv).nome }}</span>
                      <span class="muted" style="font-size:12.5px">{{ data.prof(h.prof).apelido }} · {{ fmtHistData(h.data) }}</span>
                    </div>
                    <span class="tnum" style="font-weight:600; font-size:13.5px">{{ data.money(h.valor) }}</span>
                  </div>
                }
              </div>
            }
          </div>

        </div><!-- /drawer body -->
      </div><!-- /drawer -->
    </ng-container>
  }

</div>

@if (novoModal) {
  <app-modal title="Novo cliente" (close)="novoModal = false">
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="field">
        <label>Nome completo *</label>
        <input class="input" [(ngModel)]="draft.nome" placeholder="Ex: João Silva" autofocus>
      </div>
      <div class="field">
        <label>WhatsApp</label>
        <input class="input" [(ngModel)]="draft.wpp" placeholder="(11) 99999-0000">
      </div>
      <div class="field">
        <label>E-mail</label>
        <input class="input" [(ngModel)]="draft.email" placeholder="joao@email.com">
      </div>
      <div class="field">
        <label>Data de nascimento</label>
        <input class="input" type="date" [(ngModel)]="draft.nasc">
      </div>
    </div>
    <div modalFoot>
      <button class="btn btn-ghost" (click)="novoModal = false">Cancelar</button>
      <button class="btn btn-primary" [disabled]="!draft.nome.trim()" (click)="salvarCliente()">
        <app-icon name="check" [size]="15"></app-icon>
        Cadastrar
      </button>
    </div>
  </app-modal>
}
  `,
})
export class ClientesComponent {
  @Input() openId: string | null = null;
  @Output() onOpen = new EventEmitter<string>();
  @Output() onClose = new EventEmitter<void>();

  q = '';
  tag = 'todos';
  novoModal = false;
  draft = { nome: '', wpp: '', email: '', nasc: '' };

  constructor(public data: DataService) {}

  openNovo() {
    this.draft = { nome: '', wpp: '', email: '', nasc: '' };
    this.novoModal = true;
  }

  salvarCliente() {
    if (!this.draft.nome.trim()) return;
    this.data.addCliente({
      nome: this.draft.nome.trim(),
      wpp: this.draft.wpp.trim(),
      email: this.draft.email.trim(),
      nasc: this.draft.nasc || '2000-01-01',
      tags: ['novo'],
      visitas: 0, ticket: 0, total: 0,
      ultima: new Date().toISOString().slice(0, 10),
      freq: 0, obs: '', fav: null,
    });
    this.novoModal = false;
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    if (this.openId) this.onClose.emit();
  }

  get sumidos(): number {
    return this.data.clientes.filter(c => c.tags.includes('sumido')).length;
  }

  get filters() {
    return [
      { id: 'todos',  label: 'Todos',   n: this.data.clientes.length },
      { id: 'vip',    label: 'VIP',     n: this.data.clientes.filter(c => c.tags.includes('vip')).length },
      { id: 'novo',   label: 'Novos',   n: this.data.clientes.filter(c => c.tags.includes('novo')).length },
      { id: 'sumido', label: 'Sumidos', n: this.sumidos },
    ];
  }

  get list() {
    let list = this.data.clientes;
    if (this.tag === 'vip')    list = list.filter(c => c.tags.includes('vip'));
    else if (this.tag === 'novo')   list = list.filter(c => c.tags.includes('novo'));
    else if (this.tag === 'sumido') list = list.filter(c => c.tags.includes('sumido'));
    if (this.q) {
      const lq = this.q.toLowerCase();
      list = list.filter(c => c.nome.toLowerCase().includes(lq) || c.wpp.includes(this.q));
    }
    return list;
  }

  /** '1990-06-12' → '12/06/1990' */
  fmtNasc(s: string): string {
    return s.split('-').reverse().join('/');
  }

  /** '2026-06-02' → '02/06' (day/month only, matching React slice(0,2) after reverse) */
  fmtHistData(s: string): string {
    const parts = s.split('-').reverse(); // ['02','06','2026']
    return parts.slice(0, 2).join('/');   // '02/06'
  }
}
