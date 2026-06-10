import { Component, Input } from '@angular/core';
import { IconComponent } from '../icon.component';

@Component({
  selector: 'app-tag',
  standalone: true,
  imports: [IconComponent],
  template: `<span [class]="cls">
    @if (kind === 'vip') { <app-icon name="star" [size]="11" [fill]="true"></app-icon> }
    {{ label }}</span>`,
})
export class TagComponent {
  @Input() kind = '';
  /** Texto opcional; quando ausente, deriva-se do kind. */
  @Input() text?: string;

  get cls() {
    return this.kind === 'vip' ? 'tag tag-vip'
      : this.kind === 'novo' ? 'tag tag-novo'
      : this.kind === 'sumido' ? 'tag tag-sumido'
      : 'tag';
  }
  get label() {
    if (this.text) return this.text;
    return this.kind === 'vip' ? 'VIP'
      : this.kind === 'novo' ? 'Novo'
      : this.kind === 'sumido' ? 'Sumido'
      : this.kind;
  }
}
