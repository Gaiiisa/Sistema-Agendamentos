import { Component, Input } from '@angular/core';
import { DataService } from '../data.service';

@Component({
  selector: 'app-status-pill',
  standalone: true,
  template: `<span class="pill pill-{{ status }}"><span class="pdot"></span>{{ data.statusLabels[status] }}</span>`,
})
export class StatusPillComponent {
  @Input() status = '';
  constructor(public data: DataService) {}
}
