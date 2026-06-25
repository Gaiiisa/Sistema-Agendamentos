import { Component, EventEmitter, HostListener, Output } from '@angular/core';
import { IconComponent } from '../icon.component';

interface Notification {
  id: number;
  type: 'agendamento' | 'pagamento' | 'cliente' | 'estoque' | 'lembrete';
  title: string;
  desc: string;
  time: string;
  read: boolean;
}

@Component({
  selector: 'app-notifications-panel',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="drawer-overlay" (click)="close.emit()"></div>
    <div class="drawer notif-drawer">

      <div class="drawer-head">
        <div style="display:flex;align-items:center;gap:10px">
          <span class="drawer-title">Notificações</span>
          @if (unreadCount > 0) {
            <span class="notif-count">{{ unreadCount }}</span>
          }
        </div>
        <div style="display:flex;align-items:center;gap:4px">
          @if (unreadCount > 0) {
            <button class="icon-btn" title="Marcar todas como lidas" (click)="markAllRead()">
              <app-icon name="check" [size]="16"></app-icon>
            </button>
          }
          <button class="icon-btn" title="Fechar" (click)="close.emit()">
            <app-icon name="x" [size]="18"></app-icon>
          </button>
        </div>
      </div>

      <div class="notif-list">
        @for (n of notifications; track n.id) {
          <div class="notif-card" [class.unread]="!n.read" (click)="markRead(n)">
            <div class="notif-ico" [class]="'notif-ico--' + n.type">
              <app-icon [name]="iconFor(n.type)" [size]="14"></app-icon>
            </div>
            <div class="notif-body">
              <div class="notif-title">{{ n.title }}</div>
              <div class="notif-desc">{{ n.desc }}</div>
              <div class="notif-time">{{ n.time }}</div>
            </div>
            @if (!n.read) {
              <span class="notif-dot"></span>
            }
          </div>
        }

        @if (notifications.length === 0) {
          <div class="empty" style="padding:60px 24px">
            <app-icon name="bell" [size]="32" style="color:var(--text-3);display:block;margin:0 auto 12px"></app-icon>
            Nenhuma notificação
          </div>
        }
      </div>

    </div>
  `,
  styles: [`
    .notif-drawer {
      width: 380px;
      display: flex;
      flex-direction: column;
    }

    .drawer-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 20px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }

    .drawer-title {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--text);
    }

    .notif-count {
      background: var(--accent);
      color: var(--on-accent);
      font-size: 11px;
      font-weight: 700;
      border-radius: 99px;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      display: grid;
      place-items: center;
    }

    .notif-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px 0;
    }

    .notif-card {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 13px 20px;
      cursor: pointer;
      position: relative;
      transition: background .10s;
    }
    .notif-card:hover { background: var(--surface-2); }
    .notif-card.unread { background: var(--accent-soft); }
    .notif-card.unread:hover { background: var(--accent-soft-2); }

    .notif-ico {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      display: grid;
      place-items: center;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .notif-ico--agendamento  { background: rgba(37,99,235,0.12);  color: #2563eb; }
    .notif-ico--pagamento    { background: rgba(5,150,105,0.12);  color: #059669; }
    .notif-ico--cliente      { background: rgba(79,70,229,0.12);  color: var(--accent); }
    .notif-ico--estoque      { background: rgba(217,119,6,0.12);  color: #d97706; }
    .notif-ico--lembrete     { background: rgba(220,38,38,0.12);  color: #dc2626; }

    .notif-body { flex: 1; min-width: 0; }

    .notif-title {
      font-size: 13.5px;
      font-weight: 600;
      color: var(--text);
      line-height: 1.3;
    }

    .notif-desc {
      font-size: 12.5px;
      color: var(--text-2);
      margin-top: 2px;
      line-height: 1.4;
    }

    .notif-time {
      font-size: 11.5px;
      color: var(--text-3);
      margin-top: 5px;
      font-weight: 500;
    }

    .notif-dot {
      width: 8px;
      height: 8px;
      border-radius: 99px;
      background: var(--accent);
      flex-shrink: 0;
      margin-top: 5px;
    }
  `],
})
export class NotificationsPanelComponent {
  @Output() close = new EventEmitter<void>();

  notifications: Notification[] = [
    { id: 1, type: 'agendamento', title: 'Novo agendamento confirmado', desc: 'Ana Lima — Corte + Escova · hoje às 14h00', time: 'Há 5 minutos', read: false },
    { id: 2, type: 'pagamento',   title: 'Pagamento recebido', desc: 'R$ 120,00 · Marcos Oliveira · Cartão de crédito', time: 'Há 18 minutos', read: false },
    { id: 3, type: 'lembrete',    title: 'Lembrete: agendamento em 1h', desc: 'Fernanda Costa — Coloração · 15h30', time: 'Há 32 minutos', read: false },
    { id: 4, type: 'cliente',     title: 'Novo cliente cadastrado', desc: 'Rafael Souza entrou pela primeira vez', time: 'Há 1 hora', read: false },
    { id: 5, type: 'estoque',     title: 'Estoque baixo', desc: 'Coloração Louro 8.1 — apenas 2 unidades restantes', time: 'Há 2 horas', read: true },
    { id: 6, type: 'agendamento', title: 'Agendamento cancelado', desc: 'Juliana Mendes — Manicure · amanhã 10h00', time: 'Há 3 horas', read: true },
    { id: 7, type: 'pagamento',   title: 'Pagamento recebido', desc: 'R$ 85,00 · Carla Dias · Pix', time: 'Ontem 17h42', read: true },
    { id: 8, type: 'lembrete',    title: 'Resumo do dia', desc: '12 atendimentos realizados · R$ 1.340 faturados', time: 'Ontem 18h00', read: true },
  ];

  get unreadCount() { return this.notifications.filter(n => !n.read).length; }

  iconFor(type: Notification['type']): string {
    const map: Record<Notification['type'], string> = {
      agendamento: 'calendar',
      pagamento:   'money',
      cliente:     'users',
      estoque:     'box',
      lembrete:    'bell',
    };
    return map[type];
  }

  markRead(n: Notification) { n.read = true; }

  markAllRead() { this.notifications.forEach(n => (n.read = true)); }

  @HostListener('document:keydown.escape')
  onEsc() { this.close.emit(); }
}
