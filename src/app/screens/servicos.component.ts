import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon.component';
import { AvatarComponent } from '../shared/avatar.component';
import { MenuComponent } from '../shared/menu.component';
import { DataService, Servico, Staff } from '../data.service';

@Component({
  selector: 'app-servicos',
  standalone: true,
  imports: [CommonModule, IconComponent, AvatarComponent, MenuComponent],
  template: `
    <div class="page">
      <div class="row" style="margin-bottom:16px;flex-wrap:wrap;gap:10px">
        <div class="seg">
          @for (cval of cats; track cval) {
            <button [class.on]="cat === cval" (click)="cat = cval">
              {{ cval === 'todas' ? 'Todas' : cval }}
            </button>
          }
        </div>
        <button class="btn btn-primary" style="margin-left:auto">
          <app-icon name="plus" [size]="16"></app-icon>
          Novo serviço
        </button>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:14px">
        @for (s of list; track s.id) {
          <div class="card" style="overflow:hidden;display:flex;flex-direction:column">

            <!-- faixa de cor / "foto" -->
            <div
              [style.height.px]="96"
              [style.background]="'linear-gradient(135deg, color-mix(in oklch, ' + s.cor + ' 16%, white), color-mix(in oklch, ' + s.cor + ' 6%, white))'"
              style="position:relative;display:grid;place-items:center">

              <div style="width:48px;height:48px;border-radius:12px;background:var(--surface);display:grid;place-items:center;box-shadow:var(--sh-sm)">
                <app-icon
                  [name]="s.cat === 'Barba' ? 'user' : s.cat === 'Estética' ? 'sparkle' : 'scissors'"
                  [size]="22"
                  [style.color]="s.cor">
                </app-icon>
              </div>

              @if (s.combo) {
                <span class="tag" style="position:absolute;top:10px;left:10px;background:var(--surface)">Combo</span>
              }
              @if (s.sinal) {
                <span class="tag tag-novo" style="position:absolute;top:10px;right:10px">Exige sinal</span>
              }

              <div style="position:absolute;bottom:10px;right:12px;font-size:11.5px;font-weight:600"
                   [style.color]="s.cor">
                {{ s.cat }}
              </div>
            </div>
            <!-- /faixa -->

            <div style="padding:16px;display:flex;flex-direction:column;gap:12px;flex:1">

              <div class="row" style="align-items:flex-start">
                <div class="col" style="flex:1;line-height:1.3">
                  <div style="font-weight:700;font-size:16px;letter-spacing:-0.01em">{{ s.nome }}</div>
                  <div class="muted" style="font-size:12.5px">{{ s.desc }}</div>
                </div>
                <app-menu [items]="[{label:'Editar',icon:'edit'},{label:'Duplicar',icon:'list'},{divider:true},{label:'Desativar',icon:'x',danger:true}]"></app-menu>
              </div>

              <div class="row" style="gap:16px;padding-top:4px">
                <div class="col">
                  <span class="tnum" style="font-size:20px;font-weight:800;letter-spacing:-0.02em">{{ data.money(s.preco) }}</span>
                  <span class="muted" style="font-size:11.5px">preço</span>
                </div>
                <div class="col">
                  <span class="row tnum" style="font-size:15px;font-weight:700;gap:4px">
                    <app-icon name="clock" [size]="14" style="color:var(--text-3)"></app-icon>
                    {{ s.dur }}min
                  </span>
                  <span class="muted" style="font-size:11.5px">duração</span>
                </div>
                <div class="col" style="margin-left:auto;align-items:flex-end">
                  <span class="tnum" style="font-size:15px;font-weight:700;color:var(--accent-text)">{{ margem(s) }}%</span>
                  <span class="muted" style="font-size:11.5px">margem</span>
                </div>
              </div>

              <div class="divider"></div>

              <div class="row" style="gap:8px">
                <div style="display:flex">
                  @for (p of execs(s).slice(0, 4); track p.id; let i = $index) {
                    <div [style.marginLeft.px]="i ? -8 : 0"
                         style="border:2px solid var(--surface);border-radius:99px">
                      <app-avatar [nome]="p.nome" [cor]="p.cor" [size]="26"></app-avatar>
                    </div>
                  }
                </div>
                <span class="muted" style="font-size:12.5px">{{ execs(s).length }} profissionais executam</span>
              </div>

            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class ServicosComponent {
  cat = 'todas';

  constructor(public data: DataService) {}

  get cats(): string[] {
    return ['todas', ...Array.from(new Set(this.data.servicos.map(s => s.cat)))];
  }

  get list(): Servico[] {
    return this.cat === 'todas'
      ? this.data.servicos
      : this.data.servicos.filter(s => s.cat === this.cat);
  }

  execs(s: Servico): Staff[] {
    return s.exec.map(id => this.data.prof(id));
  }

  margem(s: Servico): number {
    return Math.round((s.preco - s.custo) / s.preco * 100);
  }
}
