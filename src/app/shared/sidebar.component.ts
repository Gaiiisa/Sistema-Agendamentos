import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, QueryList, SimpleChanges, ViewChild, ViewChildren, AfterViewInit, signal } from '@angular/core';
import { IconComponent } from '../icon.component';
import { AvatarComponent } from './avatar.component';
import { DataService } from '../data.service';
import { AuthService } from '../auth.service';

interface NavItem { id: string; label: string; icon: string; badge?: string; }

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [IconComponent, AvatarComponent],
  template: `
    <nav class="sidebar" #nav [class.nav-fill]="preencheBarra">

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
        @for (item of allNavVisiveis; track item.id; let i = $index) {
          <button #btn class="tn-nav-item" [class.active]="active === item.id"
            [title]="item.label"
            (click)="navigate(item.id)"
            (mouseenter)="hoverItem(i)">
            <app-icon [name]="item.icon" [size]="14"></app-icon>
            <span class="tn-nav-label">{{ item.label }}</span>
            @if (item.badge) {
              <span class="tn-badge">{{ item.badge }}</span>
            }
          </button>
        }
      </div>

      <div class="tn-end">
        <button class="tn-icon-btn tn-hide-mobile tn-hide-compact" title="Buscar">
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
      @for (item of bottomNavVisiveis; track item.id) {
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
        @for (item of moreNavVisiveis; track item.id) {
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

  @ViewChild('nav') navEl!: ElementRef<HTMLElement>;
  @ViewChild('container') container!: ElementRef<HTMLElement>;
  @ViewChildren('btn') btns!: QueryList<ElementRef<HTMLElement>>;

  private resizeRaf = 0;

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

  // Itens restantes no sheet "Mais" (config só aparece aqui — no desktop fica no ícone de engrenagem)
  readonly MORE_NAV: NavItem[] = [
    { id: 'servicos',     label: 'Serviços',     icon: 'scissors' },
    { id: 'equipe',       label: 'Equipe',       icon: 'team' },
    { id: 'comissoes',    label: 'Comissões',    icon: 'coins' },
    { id: 'estoque',      label: 'Estoque',      icon: 'box' },
    { id: 'fidelidade',   label: 'Fidelidade',   icon: 'gift' },
    { id: 'central',      label: 'Central',       icon: 'bell' },
    { id: 'config',       label: 'Configurações', icon: 'settings' },
  ];

  // ---- Filtro por permissão (RBAC) ----
  // 'central' é a tela do módulo 'relatorios'. 'config' fica sempre acessível
  // (contém "Minha conta" — self-service; as abas internas são gated no próprio config).
  podeVer(id: string): boolean {
    if (id === 'config') return true;
    const modulo = id === 'central' ? 'relatorios' : id;
    return this.auth.canView(modulo);
  }
  get allNavVisiveis(): NavItem[] { return this.ALL_NAV.filter(i => this.podeVer(i.id)); }

  /** A partir de 8 telas liberadas, os botões crescem para preencher a barra e
   *  escalam com a largura da tela. Com menos, ficam no tamanho natural, lado a lado. */
  private readonly MIN_TELAS_PREENCHER = 8;
  get preencheBarra(): boolean { return this.allNavVisiveis.length >= this.MIN_TELAS_PREENCHER; }
  get bottomNavVisiveis(): NavItem[] { return this.BOTTOM_NAV.filter(i => this.podeVer(i.id)); }
  get moreNavVisiveis(): NavItem[] { return this.MORE_NAV.filter(i => this.podeVer(i.id)); }

  get isMoreActive(): boolean {
    return this.moreNavVisiveis.some(i => i.id === this.active);
  }

  get brandName(): string { return this.data.estabelecimento.nome.split(' ')[0]; }

  constructor(public data: DataService, public auth: AuthService) {
    const saved = localStorage.getItem('app-theme');
    this.theme = saved === 'light' ? 'light' : 'dark';
    this.applyTheme();
  }

  ngAfterViewInit() {
    this.fit();
    // Reajusta quando a fonte (Inter) termina de carregar — a largura dos
    // rótulos muda e o ponto de colapso precisa ser recalculado.
    (document as any).fonts?.ready?.then(() => this.fit());
  }

  ngOnChanges(c: SimpleChanges) {
    if (c['active']) {
      this.menuOpen = false;
      this.moveIndicator();
    }
  }

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth > 768) this.menuOpen = false;
    // Debounce por frame para não medir layout a cada pixel do resize.
    cancelAnimationFrame(this.resizeRaf);
    this.resizeRaf = requestAnimationFrame(() => this.fit());
  }

  /**
   * Colapso progressivo da barra: mede o overflow real dos itens e escolhe o
   * modo mais rico que ainda cabe — 'full' (marca + rótulos + ícones extras),
   * depois 'compact' (rótulos, sem marca-texto/ícones secundários) e por fim
   * 'icons' (só ícones). Baseado em medição, é imune a fonte/zoom/idioma.
   */
  private fit() {
    const nav = this.navEl?.nativeElement;
    const groups = this.container?.nativeElement;
    if (!nav || !groups) return;

    // No mobile os itens ficam escondidos (bottom bar assume) — nada a medir.
    if (getComputedStyle(groups).display === 'none') {
      nav.classList.remove('nav-compact', 'nav-icons');
      return;
    }

    const overflows = () => groups.scrollWidth > groups.clientWidth + 1;

    nav.classList.remove('nav-compact', 'nav-icons');
    if (overflows()) {
      nav.classList.add('nav-compact');
      if (overflows()) {
        nav.classList.remove('nav-compact');
        nav.classList.add('nav-icons');
      }
    }
    this.moveIndicator();
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
    // Índice na lista VISÍVEL (filtrada por permissão) — é ela que gera os botões.
    const idx = this.allNavVisiveis.findIndex(i => i.id === this.active);
    const btns = this.btns?.toArray();
    if (idx >= 0 && btns?.[idx]) this.placeIndicatorOn(btns[idx].nativeElement);
    else this.indicatorVisible = false;   // rota atual fora da barra (ex.: config)
  }

  private moveIndicator() {
    setTimeout(() => this.resetIndicator());
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
