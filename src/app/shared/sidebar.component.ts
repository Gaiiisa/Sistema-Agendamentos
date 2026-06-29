import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, QueryList, SimpleChanges, ViewChild, ViewChildren, AfterViewInit, signal } from '@angular/core';
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
        <span class="tn-brand-name">{{ brandName }}</span>
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
        <button class="tn-icon-btn tn-hide-mobile" title="Buscar">
          <app-icon name="search" [size]="16"></app-icon>
        </button>
        <button class="tn-icon-btn"
          [title]="theme === 'dark' ? 'Tema claro' : 'Tema escuro'"
          (click)="toggleTheme()">
          <app-icon [name]="theme === 'dark' ? 'sun' : 'moon'" [size]="16"></app-icon>
        </button>
        <button class="tn-icon-btn tn-hide-mobile" title="Configurações" (click)="navigate('config')">
          <app-icon name="settings" [size]="16"></app-icon>
        </button>
        <button class="tn-icon-btn" title="Notificações" style="position:relative" (click)="onNotif.emit()">
          <span class="tn-dot"></span>
          <app-icon name="bell" [size]="16"></app-icon>
        </button>
        <button class="tn-user" [title]="data.usuario.nome">
          <app-avatar [nome]="data.usuario.nome" [cor]="data.usuario.cor" [size]="28"></app-avatar>
        </button>
      </div>

    </nav>

    <!-- ── Bottom Tab Bar (mobile) ── -->
    <div class="tn-bottom-bar">
      @for (item of BOTTOM_NAV; track item.id) {
        <button class="tn-tab" [class.active]="active === item.id && !menuOpen"
          (click)="navigate(item.id); menuOpen = false">
          <app-icon [name]="item.icon" [size]="20"></app-icon>
          <span>{{ item.label }}</span>
          @if (item.badge && active !== item.id) {
            <span style="position:absolute;top:5px;right:calc(50% - 14px);width:7px;height:7px;background:var(--st-faltou);border-radius:99px;border:1.5px solid var(--surface)"></span>
          }
        </button>
      }
      <button class="tn-tab" [class.active]="isMoreActive || menuOpen"
        (click)="menuOpen = !menuOpen">
        <app-icon name="menu" [size]="20"></app-icon>
        <span>Mais</span>
      </button>
    </div>

    <!-- ── Sheet "Mais" (mobile) ── -->
    @if (menuOpen) {
      <div class="tn-sheet-overlay" (click)="menuOpen = false"></div>
      <div class="tn-sheet">
        <div class="tn-sheet-handle"></div>
        @for (item of MORE_NAV; track item.id) {
          <button class="tn-sheet-item" [class.active]="active === item.id"
            (click)="navigate(item.id); menuOpen = false">
            <app-icon [name]="item.icon" [size]="20"
              [style.color]="active === item.id ? 'var(--accent)' : 'var(--text-2)'"></app-icon>
            {{ item.label }}
            @if (item.badge) {
              <span class="tn-sheet-badge">{{ item.badge }}</span>
            }
          </button>
        }
      </div>
    }
  `,
})
export class SidebarComponent implements OnChanges, AfterViewInit {
  @Input() active = '';
  @Output() nav = new EventEmitter<string>();
  @Output() onNotif = new EventEmitter<void>();

  @ViewChild('container') container!: ElementRef<HTMLElement>;
  @ViewChildren('btn') btns!: QueryList<ElementRef<HTMLElement>>;

  indicatorX = 0;
  indicatorW = 0;
  indicatorVisible = false;
  theme: 'dark' | 'light' = 'dark';
  menuOpen = false;

  readonly ALL_NAV: NavItem[] = [
    { id: 'dashboard',    label: 'Dashboard',   icon: 'dashboard' },
    { id: 'agenda',       label: 'Agenda',       icon: 'calendar', badge: '15' },
    { id: 'clientes',     label: 'Clientes',     icon: 'users' },
    { id: 'servicos',     label: 'Serviços',     icon: 'scissors' },
    { id: 'equipe',       label: 'Equipe',       icon: 'team' },
    { id: 'financeiro',   label: 'Financeiro',   icon: 'money' },
    { id: 'comissoes',    label: 'Comissões',    icon: 'coins' },
    { id: 'estoque',      label: 'Estoque',      icon: 'box' },
    { id: 'fidelidade',   label: 'Fidelidade',   icon: 'gift' },
    { id: 'central',      label: 'Central',       icon: 'bell' },
  ];

  // 4 itens primários na bottom bar
  readonly BOTTOM_NAV: NavItem[] = [
    { id: 'dashboard',  label: 'Início',      icon: 'dashboard' },
    { id: 'agenda',     label: 'Agenda',      icon: 'calendar', badge: '15' },
    { id: 'clientes',   label: 'Clientes',    icon: 'users' },
    { id: 'financeiro', label: 'Financeiro',  icon: 'money' },
  ];

  // Itens restantes no sheet "Mais"
  readonly MORE_NAV: NavItem[] = [
    { id: 'servicos',     label: 'Serviços',     icon: 'scissors' },
    { id: 'equipe',       label: 'Equipe',       icon: 'team' },
    { id: 'comissoes',    label: 'Comissões',    icon: 'coins' },
    { id: 'estoque',      label: 'Estoque',      icon: 'box' },
    { id: 'fidelidade',   label: 'Fidelidade',   icon: 'gift' },
    { id: 'central',      label: 'Central',       icon: 'bell' },
  ];

  get isMoreActive(): boolean {
    return this.MORE_NAV.some(i => i.id === this.active);
  }

  get brandName(): string { return this.data.estabelecimento.nome.split(' ')[0]; }

  constructor(public data: DataService) {
    const saved = localStorage.getItem('app-theme');
    this.theme = saved === 'light' ? 'light' : 'dark';
    this.applyTheme();
  }

  ngAfterViewInit() { this.moveIndicator(); }

  ngOnChanges(c: SimpleChanges) {
    if (c['active']) {
      this.menuOpen = false;
      this.moveIndicator();
    }
  }

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth > 768) this.menuOpen = false;
  }

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
