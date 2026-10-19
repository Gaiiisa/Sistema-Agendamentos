/* ============================================================
   Máscara de digitação para inputs com ngModel.
     <input class="input" [(ngModel)]="c.wpp" mascara="telefone">
   Tipos: telefone · documento (CPF/CNPJ) · cpf · cnpj · cep.
   O modelo recebe o valor já formatado (como os dados existentes);
   a validação/servidor comparam só os dígitos.
   ============================================================ */
import { Directive, ElementRef, HostListener, Input, Optional, Self } from '@angular/core';
import { NgControl } from '@angular/forms';
import { telefone, documento, cep, soDigitos } from './formatacao';

export type TipoMascara = 'telefone' | 'documento' | 'cpf' | 'cnpj' | 'cep';

const FORMATADORES: Record<TipoMascara, (v: string) => string> = {
  telefone,
  documento,
  cpf: (v) => documento(soDigitos(v).slice(0, 11)),
  cnpj: (v) => documento(soDigitos(v).slice(0, 14)),
  cep,
};
const MAX_DIGITOS: Record<TipoMascara, number> = { telefone: 11, documento: 14, cpf: 11, cnpj: 14, cep: 8 };

@Directive({ selector: 'input[mascara]', standalone: true })
export class MascaraDirective {
  @Input('mascara') tipo!: TipoMascara;

  constructor(private el: ElementRef<HTMLInputElement>, @Optional() @Self() private ctrl: NgControl) {}

  @HostListener('input')
  onInput() {
    const input = this.el.nativeElement;
    const bruto = input.value;
    const fmt = FORMATADORES[this.tipo]?.(soDigitos(bruto).slice(0, MAX_DIGITOS[this.tipo])) ?? bruto;
    if (fmt === bruto) return;
    // mantém o cursor no fim quando o usuário digita no final (caso comum)
    const noFim = input.selectionStart === bruto.length;
    input.value = fmt;
    if (noFim) input.setSelectionRange(fmt.length, fmt.length);
    this.ctrl?.viewToModelUpdate(fmt);
    this.ctrl?.control?.setValue(fmt, { emitEvent: false, emitModelToViewChange: false });
  }

  /** Teclado numérico no celular. */
  @HostListener('focus')
  onFocus() { this.el.nativeElement.setAttribute('inputmode', 'numeric'); }
}
