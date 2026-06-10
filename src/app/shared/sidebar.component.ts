import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from '../icon.component';
import { AvatarComponent } from './avatar.component';
import { DataService } from '../data.service';

interface NavItem { id: string; label: string; icon: string; badge?: string; }

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [IconComponent, AvatarComponent],
  template: `
    <aside class="sidebar">
      <div class="sb-brand">
        <div class="sb-logo">
          <app-icon name="scissors" [size]="19" style="color:#fff"></app-icon>
        </div>
        <div class="col">
          <div class="sb-brand-name">{{ data.estabelecimento.nome }}</div>
          <div class="sb-brand-sub">Plano {{ data.estabelecimento.plano }}</div>
        </div>
      </div>

      <div class="sb-search">
        <app-icon name="search" [size]="15"></app-icon>
        Buscar…
        <kbd>⌘K</kbd>
      </div>

      <nav class="sb-nav">
        @for (item of NAV; track item.id) {
          <button class="sb-item" [class.active]="active === item.id" (click)="nav.emit(item.id)">
            <app-icon [name]="item.icon" [size]="18"></app-icon>
            {{ item.label }}
            @if (item.badge) {
              <span class="sb-badge" [class.muted]="active !== item.id">{{ item.badge }}</span>
            }
          </button>
        }
        <div class="sb-section">Financeiro · Fase 2</div>
        @for (item of NAV_FIN; track item.id) {
          <button class="sb-item" [class.active]="active === item.id" (click)="nav.emit(item.id)">
            <app-icon [name]="item.icon" [size]="18"></app-icon>
            {{ item.label }}
          </button>
        }
        <div class="sb-section">Marketing & BI · Fase 3</div>
        @for (item of NAV_SOON; track item.id) {
          <button class="sb-item" [class.active]="active === item.id" (click)="nav.emit(item.id)">
            <app-icon [name]="item.icon" [size]="18"></app-icon>
            {{ item.label }}
          </button>
        }
      </nav>

      <div class="sb-foot">
        <button class="sb-item" (click)="nav.emit('config')">
          <app-icon name="settings" [size]="18"></app-icon>
          Configurações
        </button>
        <div class="sb-user">
          <app-avatar [nome]="data.usuario.nome" [cor]="data.usuario.cor" [size]="34"></app-avatar>
          <div class="col" style="line-height:1.25">
            <div class="sb-user-name">{{ data.usuario.nome }}</div>
            <div class="sb-user-role">{{ data.usuario.papel }}</div>
          </div>
          <app-icon name="chevD" [size]="15" style="margin-left:auto;color:var(--text-3)"></app-icon>
        </div>
      </div>
    </aside>`,
})
export class SidebarComponent {
  @Input() active = '';
  @Output() nav = new EventEmitter<string>();

  readonly NAV: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'agenda', label: 'Agenda', icon: 'calendar', badge: '15' },
    { id: 'agendamentos', label: 'Agendamentos', icon: 'list' },
    { id: 'clientes', label: 'Clientes', icon: 'users' },
    { id: 'servicos', label: 'Serviços', icon: 'scissors' },
    { id: 'equipe', label: 'Equipe', icon: 'team' },
  ];
  readonly NAV_FIN: NavItem[] = [
    { id: 'financeiro', label: 'Financeiro', icon: 'money' },
    { id: 'comissoes', label: 'Comissões', icon: 'coins' },
    { id: 'estoque', label: 'Estoque', icon: 'box' },
  ];
  readonly NAV_SOON: NavItem[] = [
    { id: 'fidelidade', label: 'Fidelidade', icon: 'gift' },
    { id: 'relatorios', label: 'Relatórios', icon: 'chart' },
  ];

  constructor(public data: DataService) {}
}
