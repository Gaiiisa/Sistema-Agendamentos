import { Component, Input } from '@angular/core';
import { IconComponent } from '../icon.component';

@Component({
  selector: 'app-coming-soon',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="page">
      <div class="card" style="padding:48px;text-align:center;max-width:460px;margin:40px auto">
        <div style="width:56px;height:56px;border-radius:14px;background:var(--accent-soft);display:grid;place-items:center;margin:0 auto 16px">
          <app-icon name="sparkle" [size]="26" style="color:var(--accent)"></app-icon>
        </div>
        <div style="font-size:18px;font-weight:700;margin-bottom:6px">{{ title || 'Em breve' }}</div>
        <div class="muted" style="font-size:14px">Este módulo faz parte da Fase 2 do roadmap. O MVP foca em Agenda, Clientes, Serviços e Equipe.</div>
      </div>
    </div>`,
})
export class ComingSoonComponent {
  @Input() title = '';
}
