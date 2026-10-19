/* Mensagem de erro de um campo de formulário: <app-campo-erro [msg]="erros['nome']"></app-campo-erro> */
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-campo-erro',
  standalone: true,
  template: `@if (msg) { <span class="field-erro" role="alert">{{ msg }}</span> }`,
})
export class CampoErroComponent {
  @Input() msg: string | null | undefined;
}
