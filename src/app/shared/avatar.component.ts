import { Component, Input } from '@angular/core';
import { DataService } from '../data.service';

@Component({
  selector: 'app-avatar',
  standalone: true,
  template: `<div class="avatar"
      [style.width.px]="size" [style.height.px]="size"
      [style.fontSize.px]="fs" [style.background]="cor || '#0e9f6e'">{{ data.initials(nome) }}</div>`,
})
export class AvatarComponent {
  @Input() nome = '';
  @Input() cor?: string;
  @Input() size = 36;
  constructor(public data: DataService) {}
  get fs() { return Math.round(this.size * 0.38); }
}
