/* ============================================================
   Formatação — funções puras (pt-BR), fonte única para pipes,
   máscaras de digitação e helpers legados do DataService.
   ============================================================ */

/** Só os dígitos de um valor qualquer. */
export const soDigitos = (v: unknown): string => String(v ?? '').replace(/\D/g, '');

const nfCache = new Map<string, Intl.NumberFormat>();
function nf(min: number, max: number): Intl.NumberFormat {
  const k = min + ':' + max;
  if (!nfCache.has(k)) nfCache.set(k, new Intl.NumberFormat('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: max }));
  return nfCache.get(k)!;
}

/** Converte entrada numérica tolerante ('1.234,56', '12,5', 12.5) em número; NaN se inválida. */
export function paraNumero(v: unknown): number {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').trim();
  if (!s) return NaN;
  // formato brasileiro com vírgula decimal: remove separador de milhar
  const norm = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  return Number(norm);
}

/** R$ 1.234 (casas = 0, padrão do sistema) ou R$ 1.234,56 (casas = 2). */
export function brl(v: unknown, casas = 0): string {
  const n = paraNumero(v);
  if (!isFinite(n)) return '—';
  return 'R$ ' + nf(casas === 0 ? 0 : casas, casas === 0 ? 2 : casas).format(n);
}

/** 1.234,5 — número no padrão brasileiro. */
export function numeroBR(v: unknown, casas = 0): string {
  const n = paraNumero(v);
  return isFinite(n) ? nf(casas, casas).format(n) : '—';
}

/** 45% · 12,5% */
export function percentual(v: unknown, casas = 0): string {
  const n = paraNumero(v);
  return isFinite(n) ? nf(0, casas).format(n) + '%' : '—';
}

/** (11) 98812-4471 · (11) 3456-7890 */
export function telefone(v: unknown): string {
  const d = soDigitos(v).slice(0, 11);
  if (!d) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** CPF 123.456.789-09 ou CNPJ 12.345.678/0001-90 (decide pelo nº de dígitos). */
export function documento(v: unknown): string {
  const d = soDigitos(v).slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
  }
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

/** 01310-000 */
export function cep(v: unknown): string {
  const d = soDigitos(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** Data ISO ('2026-06-09' ou '2026-06-09 14:30:00') no formato pedido. */
export type FormatoData = 'completa' | 'curta' | 'ano2' | 'datahora' | 'extenso';
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export function dataBR(v: unknown, formato: FormatoData = 'completa'): string {
  if (!v) return '—';
  const s = v instanceof Date ? v.toISOString() : String(v);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!m) return '—';
  const [, y, mo, d, hh, mi] = m;
  switch (formato) {
    case 'curta': return `${d}/${mo}`;
    case 'ano2': return `${d}/${mo}/${y.slice(2)}`;
    case 'datahora': return `${d}/${mo}/${y}` + (hh ? ` ${hh}:${mi}` : '');
    case 'extenso': return `${+d} de ${MESES[+mo - 1]} de ${y}`;
    default: return `${d}/${mo}/${y}`;
  }
}

/** 90 → '1h30' · 45 → '45min' · 120 → '2h' */
export function duracao(min: unknown): string {
  const n = Math.round(paraNumero(min));
  if (!isFinite(n) || n <= 0) return '—';
  const h = Math.floor(n / 60), m = n % 60;
  if (!h) return `${m}min`;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}
