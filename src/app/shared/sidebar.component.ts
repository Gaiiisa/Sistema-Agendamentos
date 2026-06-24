import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, QueryList, SimpleChanges, ViewChild, ViewChildren, AfterViewInit } from '@angular/core';
import { IconComponent } from '../icon.component';
import { AvatarComponent } from './avatar.component';
import { DataService } from '../data.service';

interface NavItem { id: string; label: string; icon: string; badge?: string; }

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [IconComponent, AvatarComponent],
  template: `
    <nav class="sidebar">

      <div class="tn-brand">
        <div class="tn-logo">
          <app-icon name="scissors" [size]="15" style="color:var(--topbar-text)"></app-icon>
        </div>
        <span class="tn-brand-name">{{ data.estabelecimento.nome }}</span>
      </div>

      <div class="tn-groups" #container (mouseleave)="resetIndicator()">
        <div class="tn-indicator"
          [class.visible]="indicatorVisible"
          [style.left.px]="indicatorX"
          [style.width.px]="indicatorW"></div>
        @for (item of ALL_NAV; track item.id; let i = $index) {
          <button #btn class="tn-nav-item" [class.active]="active === item.id"
            (click)="navigate(item.id)"
            (mouseenter)="hoverItem(i)">
            <app-icon [name]="item.icon" [size]="14"></app-icon>
            {{ item.label }}
            @if (item.badge) {
              <span class="tn-badge">{{ item.badge }}</span>
            }
          </button>
        }
      </div>

      <div class="tn-end">
        <button class="tn-icon-btn" title="Buscar">
          <app-icon name="search" [size]="16"></app-icon>
        </button>
        <button class="tn-icon-btn"
          [title]="theme === 'dark' ? 'Tema claro' : 'Tema escuro'"
          (click)="toggleTheme()">
          <app-icon [name]="theme === 'dark' ? 'sun' : 'moon'" [size]="16"></app-icon>
        </button>
        <button class="tn-icon-btn" title="Configurações" (click)="navigate('config')">
          <app-icon name="settings" [size]="16"></app-icon>
        </button>
        <button class="tn-icon-btn" title="Notificações" style="position:relative">
          <span class="tn-dot"></span>
          <app-icon name="bell" [size]="16"></app-icon>
        </button>
        <button class="tn-user" [title]="data.usuario.nome">
          <app-avatar [nome]="data.usuario.nome" [cor]="data.usuario.cor" [size]="28"></app-avatar>
        </button>
      </div>

    </nav>`,
})
export class SidebarComponent implements OnChanges, AfterViewInit {
  @Input() active = '';
  @Output() nav = new EventEmitter<string>();

  @ViewChild('container') container!: ElementRef<HTMLElement>;
  @ViewChildren('btn') btns!: QueryList<ElementRef<HTMLElement>>;

  indicatorX = 0;
  indicatorW = 0;
  indicatorVisible = false;
  theme: 'dark' | 'light' = 'dark';

  readonly ALL_NAV: NavItem[] = [
    { id: 'dashboard',    label: 'Dashboard',   icon: 'dashboard' },
    { id: 'agenda',       label: 'Agenda',       icon: 'calendar', badge: '15' },
    { id: 'agendamentos', label: 'Agendamentos', icon: 'list' },
    { id: 'clientes',     label: 'Clientes',     icon: 'users' },
    { id: 'servicos',     label: 'Serviços',     icon: 'scissors' },
    { id: 'equipe',       label: 'Equipe',       icon: 'team' },
    { id: 'financeiro',   label: 'Financeiro',   icon: 'money' },
    { id: 'comissoes',    label: 'Comissões',    icon: 'coins' },
    { id: 'estoque',      label: 'Estoque',      icon: 'box' },
    { id: 'fidelidade',   label: 'Fidelidade',   icon: 'gift' },
    { id: 'relatorios',   label: 'Relatórios',   icon: 'chart' },
  ];

  constructor(public data: DataService) {
    const saved = localStorage.getItem('app-theme');
    this.theme = saved === 'light' ? 'light' : 'dark';
    this.applyTheme();
  }

  ngAfterViewInit() { this.moveIndicator(); }

  ngOnChanges(c: SimpleChanges) { if (c['active']) this.moveIndicator(); }

  navigate(id: string) { this.nav.emit(id); }

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('app-theme', this.theme);
    this.applyTheme();
  }

  hoverItem(idx: number) {
    const btns = this.btns?.toArray();
    if (btns?.[idx]) this.placeIndicatorOn(btns[idx].nativeElement);
  }

  resetIndicator() {
    const idx = this.ALL_NAV.findIndex(i => i.id === this.active);
    const btns = this.btns?.toArray();
    if (idx >= 0 && btns?.[idx]) this.placeIndicatorOn(btns[idx].nativeElement);
  }

  private moveIndicator() {
    setTimeout(() => {
      const idx = this.ALL_NAV.findIndex(i => i.id === this.active);
      const btns = this.btns?.toArray();
      if (idx >= 0 && btns?.[idx]) this.placeIndicatorOn(btns[idx].nativeElement);
    });
  }

  private placeIndicatorOn(el: HTMLElement) {
    const cont = this.container?.nativeElement;
    if (!cont) return;
    const cR = cont.getBoundingClientRect();
    const bR = el.getBoundingClientRect();
    this.indicatorX = bR.left - cR.left;
    this.indicatorW = bR.width;
    this.indicatorVisible = true;
  }

  private applyTheme() {
    document.documentElement.setAttribute('data-theme', this.theme);
  }
}
