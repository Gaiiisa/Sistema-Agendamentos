/* ============================================================
   Pipes de exibição (pt-BR). Todos puros e standalone.
     {{ valor | brl }}            R$ 1.234      ({{ v | brl:2 }} → R$ 1.234,56)
     {{ n | numeroBR:1 }}         1.234,5
     {{ taxa | percentual }}      45%
     {{ wpp | telefone }}         (11) 98812-4471
     {{ doc | documento }}        123.456.789-09 / 12.345.678/0001-90
     {{ cep | cep }}              01310-000
     {{ iso | dataBR }}           09/06/2026    (:'curta' 09/06 · :'ano2' 09/06/26 · :'datahora' · :'extenso')
     {{ min | duracao }}          1h30
   Importe PIPES no `imports` do componente.
   ============================================================ */
import { Pipe, PipeTransform } from '@angular/core';
import { brl, numeroBR, percentual, telefone, documento, cep, dataBR, duracao, FormatoData } from './formatacao';

@Pipe({ name: 'brl', standalone: true })
export class BrlPipe implements PipeTransform {
  transform(v: unknown, casas = 0): string { return brl(v, casas); }
}

@Pipe({ name: 'numeroBR', standalone: true })
export class NumeroBrPipe implements PipeTransform {
  transform(v: unknown, casas = 0): string { return numeroBR(v, casas); }
}

@Pipe({ name: 'percentual', standalone: true })
export class PercentualPipe implements PipeTransform {
  transform(v: unknown, casas = 0): string { return percentual(v, casas); }
}

@Pipe({ name: 'telefone', standalone: true })
export class TelefonePipe implements PipeTransform {
  transform(v: unknown): string { return telefone(v) || '—'; }
}

@Pipe({ name: 'documento', standalone: true })
export class DocumentoPipe implements PipeTransform {
  transform(v: unknown): string { return documento(v) || '—'; }
}

@Pipe({ name: 'cep', standalone: true })
export class CepPipe implements PipeTransform {
  transform(v: unknown): string { return cep(v) || '—'; }
}

@Pipe({ name: 'dataBR', standalone: true })
export class DataBrPipe implements PipeTransform {
  transform(v: unknown, formato: FormatoData = 'completa'): string { return dataBR(v, formato); }
}

@Pipe({ name: 'duracao', standalone: true })
export class DuracaoPipe implements PipeTransform {
  transform(v: unknown): string { return duracao(v); }
}

export const PIPES = [BrlPipe, NumeroBrPipe, PercentualPipe, TelefonePipe, DocumentoPipe, CepPipe, DataBrPipe, DuracaoPipe] as const;
