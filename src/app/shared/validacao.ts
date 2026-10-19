/* ============================================================
   Validação de formulários — regras puras + agregador por campo.
   Espelhada no backend (api/validacao.js): o front avisa na hora,
   a API garante (quem chama a API direto não passa sem validar).

   Uso:
     get erros() {
       return this.enviado ? validar({
         nome:  [V.obrigatorio(d.nome), V.tamanho(d.nome, 2, 80)],
         preco: [V.obrigatorio(d.preco), V.numero(d.preco, { min: 0 })],
       }) : {};
     }
     salvar() { this.enviado = true; if (temErros(this.erros)) return; ... }
   ============================================================ */
import { paraNumero, soDigitos } from './formatacao';

/** Mensagem de erro por campo (só os campos com problema aparecem). */
export type Erros = Record<string, string>;
type Regra = string | null;

export const vazio = (v: unknown): boolean =>
  v === null || v === undefined || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

export function cpfValido(v: unknown): boolean {
  const d = soDigitos(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  for (const t of [9, 10]) {
    let s = 0;
    for (let i = 0; i < t; i++) s += +d[i] * (t + 1 - i);
    if (((s * 10) % 11) % 10 !== +d[t]) return false;
  }
  return true;
}

export function cnpjValido(v: unknown): boolean {
  const d = soDigitos(v);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (n: number) => {
    const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const s = pesos.reduce((t, p, i) => t + +d[i] * p, 0);
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === +d[12] && calc(13) === +d[13];
}

function dataValida(v: unknown): boolean {
  const s = String(v ?? '');
  if (!DATA_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}
const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const minutos = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

/** Regras: cada uma devolve a mensagem de erro ou null. Campos vazios só falham em `obrigatorio`. */
export const V = {
  obrigatorio: (v: unknown, msg = 'Campo obrigatório.'): Regra => (vazio(v) ? msg : null),

  tamanho: (v: unknown, min: number, max: number): Regra => {
    if (vazio(v)) return null;
    const n = String(v).trim().length;
    if (n < min) return `Mínimo de ${min} caracteres.`;
    if (n > max) return `Máximo de ${max} caracteres.`;
    return null;
  },

  email: (v: unknown): Regra => (vazio(v) || EMAIL_RE.test(String(v).trim()) ? null : 'E-mail inválido.'),

  /** Login: e-mail ou nome de usuário sem espaços (regra da API). */
  login: (v: unknown): Regra => (vazio(v) || /^\S{3,255}$/.test(String(v).trim()) ? null : 'Use ao menos 3 caracteres, sem espaços.'),

  /** Fixo (10 dígitos) ou celular (11 dígitos, começando com 9) com DDD válido. */
  telefone: (v: unknown): Regra => {
    if (vazio(v)) return null;
    const d = soDigitos(v);
    if (d.length !== 10 && d.length !== 11) return 'Telefone deve ter DDD + número.';
    if (+d.slice(0, 2) < 11) return 'DDD inválido.';
    if (d.length === 11 && d[2] !== '9') return 'Celular deve começar com 9.';
    return null;
  },

  cpf: (v: unknown): Regra => (vazio(v) || cpfValido(v) ? null : 'CPF inválido.'),
  cnpj: (v: unknown): Regra => (vazio(v) || cnpjValido(v) ? null : 'CNPJ inválido.'),
  cpfCnpj: (v: unknown): Regra => {
    if (vazio(v)) return null;
    const n = soDigitos(v).length;
    if (n === 11) return cpfValido(v) ? null : 'CPF inválido.';
    if (n === 14) return cnpjValido(v) ? null : 'CNPJ inválido.';
    return 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).';
  },

  cep: (v: unknown): Regra => (vazio(v) || soDigitos(v).length === 8 ? null : 'CEP deve ter 8 dígitos.'),

  numero: (v: unknown, o: { min?: number; max?: number; inteiro?: boolean; rotulo?: string } = {}): Regra => {
    if (vazio(v)) return null;
    const n = paraNumero(v);
    if (!isFinite(n)) return 'Informe um número válido.';
    if (o.inteiro && !Number.isInteger(n)) return 'Use um número inteiro.';
    if (o.min !== undefined && n < o.min) return `Valor mínimo: ${o.min.toLocaleString('pt-BR')}.`;
    if (o.max !== undefined && n > o.max) return `Valor máximo: ${o.max.toLocaleString('pt-BR')}.`;
    return null;
  },

  /** Valor monetário: não negativo, até 2 casas decimais. */
  dinheiro: (v: unknown, o: { min?: number; max?: number } = {}): Regra => {
    if (vazio(v)) return null;
    const n = paraNumero(v);
    if (!isFinite(n)) return 'Informe um valor válido.';
    if (n < (o.min ?? 0)) return o.min ? `Valor mínimo: R$ ${o.min.toLocaleString('pt-BR')}.` : 'O valor não pode ser negativo.';
    if (o.max !== undefined && n > o.max) return `Valor máximo: R$ ${o.max.toLocaleString('pt-BR')}.`;
    if (Math.round(n * 100) / 100 !== n) return 'Use no máximo 2 casas decimais.';
    return null;
  },

  percentual: (v: unknown): Regra => V.numero(v, { min: 0, max: 100 }),

  hora: (v: unknown): Regra => (vazio(v) || HORA_RE.test(String(v)) ? null : 'Horário inválido (HH:MM).'),

  /** fim deve ser depois de início (ambos HH:MM). */
  horaDepois: (fim: unknown, inicio: unknown, msg = 'Deve ser depois do horário de início.'): Regra => {
    if (vazio(fim) || vazio(inicio) || !HORA_RE.test(String(fim)) || !HORA_RE.test(String(inicio))) return null;
    return minutos(String(fim)) > minutos(String(inicio)) ? null : msg;
  },

  data: (v: unknown): Regra => (vazio(v) || dataValida(v) ? null : 'Data inválida.'),
  dataNaoFutura: (v: unknown, msg = 'A data não pode ser no futuro.'): Regra =>
    (vazio(v) || !dataValida(v) || String(v) <= hojeISO() ? null : msg),
  dataNaoPassada: (v: unknown, msg = 'A data não pode ser no passado.'): Regra =>
    (vazio(v) || !dataValida(v) || String(v) >= hojeISO() ? null : msg),
  /** Nascimento: data válida, não futura e idade até 120 anos. */
  nascimento: (v: unknown): Regra => {
    if (vazio(v)) return null;
    if (!dataValida(v)) return 'Data inválida.';
    if (String(v) > hojeISO()) return 'A data de nascimento não pode ser no futuro.';
    if (+String(v).slice(0, 4) < new Date().getFullYear() - 120) return 'Data de nascimento muito antiga.';
    return null;
  },

  url: (v: unknown): Regra => {
    if (vazio(v)) return null;
    try { const u = new URL(String(v).trim()); return /^https?:$/.test(u.protocol) ? null : 'Use um endereço http(s).'; }
    catch { return 'Endereço inválido (ex.: https://seusite.com.br).'; }
  },

  /** Senha nova: 6 a 72 caracteres (limite do bcrypt), com letras e números. */
  senha: (v: unknown): Regra => {
    if (vazio(v)) return null;
    const s = String(v);
    if (s.length < 6) return 'A senha deve ter ao menos 6 caracteres.';
    if (s.length > 72) return 'A senha deve ter no máximo 72 caracteres.';
    if (!/[A-Za-z]/.test(s) || !/\d/.test(s)) return 'Use letras e números na senha.';
    return null;
  },

  /** Condição livre: `V.se(cond, msg)` falha quando cond é verdadeira. */
  se: (cond: boolean, msg: string): Regra => (cond ? msg : null),
};

/** Junta as regras de cada campo e mantém a primeira mensagem de erro de cada um. */
export function validar(campos: Record<string, Regra[]>): Erros {
  const erros: Erros = {};
  for (const [campo, regras] of Object.entries(campos)) {
    const msg = regras.find((r) => r);
    if (msg) erros[campo] = msg;
  }
  return erros;
}

export const temErros = (e: Erros): boolean => Object.keys(e).length > 0;
