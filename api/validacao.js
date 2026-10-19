// ============================================================
// Validação de entrada da API — espelho de src/app/shared/validacao.ts.
// O front valida para orientar o usuário; aqui é a garantia: nenhuma
// escrita chega ao banco com dado inválido, venha de onde vier.
//
// Uso numa rota:
//   const erro = validar({ nome: [R.obrigatorio(b.nome), R.tamanho(b.nome, 2, 80)] });
//   if (erro) return res.status(400).json(erro);   // { error, campo }
// Em PUT parcial, use `parcial(b, 'nome', ...regras)` para só checar o que veio.
// ============================================================

const vazio = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
const dig = (v) => String(v ?? '').replace(/\D/g, '');
const num = (v) => (typeof v === 'number' ? v : Number(String(v ?? '').trim().replace(',', '.')));
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const minutos = (h) => { const [a, b] = String(h).split(':').map(Number); return a * 60 + b; };
const hoje = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function dataValida(v) {
  const s = String(v ?? '').slice(0, 10);
  if (!DATA_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function cpfValido(v) {
  const d = dig(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  for (const t of [9, 10]) {
    let s = 0;
    for (let i = 0; i < t; i++) s += +d[i] * (t + 1 - i);
    if (((s * 10) % 11) % 10 !== +d[t]) return false;
  }
  return true;
}
export function cnpjValido(v) {
  const d = dig(v);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (n) => {
    const p = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const r = p.reduce((t, x, i) => t + +d[i] * x, 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === +d[12] && calc(13) === +d[13];
}

/** Regras: devolvem a mensagem de erro ou null. Vazio só falha em `obrigatorio`. */
export const R = {
  obrigatorio: (v, msg = 'Campo obrigatório.') => (vazio(v) ? msg : null),
  tamanho: (v, min, max) => {
    if (vazio(v)) return null;
    const n = String(v).trim().length;
    if (n < min) return `Mínimo de ${min} caracteres.`;
    if (n > max) return `Máximo de ${max} caracteres.`;
    return null;
  },
  email: (v) => (vazio(v) || EMAIL_RE.test(String(v).trim()) ? null : 'E-mail inválido.'),
  telefone: (v) => {
    if (vazio(v)) return null;
    const d = dig(v);
    if (d.length !== 10 && d.length !== 11) return 'Telefone deve ter DDD + número.';
    if (+d.slice(0, 2) < 11) return 'DDD inválido.';
    if (d.length === 11 && d[2] !== '9') return 'Celular deve começar com 9.';
    return null;
  },
  cpfCnpj: (v) => {
    if (vazio(v)) return null;
    const n = dig(v).length;
    if (n === 11) return cpfValido(v) ? null : 'CPF inválido.';
    if (n === 14) return cnpjValido(v) ? null : 'CNPJ inválido.';
    return 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).';
  },
  cep: (v) => (vazio(v) || dig(v).length === 8 ? null : 'CEP deve ter 8 dígitos.'),
  numero: (v, { min, max, inteiro } = {}) => {
    if (vazio(v)) return null;
    const n = num(v);
    if (!Number.isFinite(n)) return 'Informe um número válido.';
    if (inteiro && !Number.isInteger(n)) return 'Use um número inteiro.';
    if (min !== undefined && n < min) return `Valor mínimo: ${min}.`;
    if (max !== undefined && n > max) return `Valor máximo: ${max}.`;
    return null;
  },
  dinheiro: (v, { min = 0, max } = {}) => {
    if (vazio(v)) return null;
    const n = num(v);
    if (!Number.isFinite(n)) return 'Informe um valor válido.';
    if (n < min) return min ? `Valor mínimo: R$ ${min}.` : 'O valor não pode ser negativo.';
    if (max !== undefined && n > max) return `Valor máximo: R$ ${max}.`;
    if (Math.round(n * 100) / 100 !== n) return 'Use no máximo 2 casas decimais.';
    return null;
  },
  hora: (v) => (vazio(v) || HORA_RE.test(String(v)) ? null : 'Horário inválido (HH:MM).'),
  horaDepois: (fim, ini, msg = 'O horário final deve ser depois do inicial.') =>
    (vazio(fim) || vazio(ini) || !HORA_RE.test(String(fim)) || !HORA_RE.test(String(ini)) || minutos(fim) > minutos(ini) ? null : msg),
  data: (v) => (vazio(v) || dataValida(v) ? null : 'Data inválida.'),
  nascimento: (v) => {
    if (vazio(v)) return null;
    if (!dataValida(v)) return 'Data inválida.';
    if (String(v).slice(0, 10) > hoje()) return 'A data de nascimento não pode ser no futuro.';
    if (+String(v).slice(0, 4) < new Date().getFullYear() - 120) return 'Data de nascimento muito antiga.';
    return null;
  },
  url: (v) => {
    if (vazio(v)) return null;
    try { const u = new URL(String(v).trim()); return /^https?:$/.test(u.protocol) ? null : 'Use um endereço http(s).'; }
    catch { return 'Endereço inválido.'; }
  },
  /** Senha nova: 6 a 72 caracteres (limite do bcrypt), com letras e números. */
  senha: (v) => {
    if (vazio(v)) return null;
    const s = String(v);
    if (s.length < 6) return 'A senha deve ter ao menos 6 caracteres.';
    if (s.length > 72) return 'A senha deve ter no máximo 72 caracteres.';
    if (!/[A-Za-z]/.test(s) || !/\d/.test(s)) return 'Use letras e números na senha.';
    return null;
  },
  umDe: (v, lista, msg = 'Valor inválido.') => (vazio(v) || lista.includes(v) ? null : msg),
  lista: (v, msg = 'Lista inválida.') => (v === undefined || Array.isArray(v) ? null : msg),
  se: (cond, msg) => (cond ? msg : null),
};

/** Primeiro erro encontrado → { error, campo } (formato que o front já mostra); null se tudo ok. */
export function validar(campos) {
  for (const [campo, regras] of Object.entries(campos)) {
    const msg = regras.find((r) => r);
    if (msg) return { error: `${ROTULOS[campo] || campo}: ${msg}`, campo };
  }
  return null;
}

/** Em PUT parcial: só aplica as regras se o campo veio no corpo. */
export const parcial = (body, campo, ...regras) => (body[campo] === undefined ? [] : regras);

const ROTULOS = {
  nome: 'Nome', cat: 'Categoria', desc: 'Descrição', dur: 'Duração', preco: 'Preço', custo: 'Custo',
  sinalPct: 'Sinal', apelido: 'Apelido', contato: 'Contato', comissao: 'Comissão', meta: 'Meta',
  inicio: 'Início', fim: 'Fim', bio: 'Apresentação', qtd: 'Quantidade', min: 'Quantidade mínima',
  fornecedor: 'Fornecedor', wpp: 'WhatsApp', email: 'E-mail', nasc: 'Nascimento', obs: 'Observações',
  doc: 'CNPJ/CPF', tel: 'Telefone', end: 'Endereço', cidade: 'Cidade', cep: 'CEP', site: 'Site',
  google: 'Google Meu Negócio', instagram: 'Instagram', valor: 'Valor', tipo: 'Tipo', forma: 'Forma de pagamento',
  data: 'Data', ini: 'Início', hora: 'Horário', status: 'Status', cli: 'Cliente', srv: 'Serviço', prof: 'Profissional',
  texto: 'Conteúdo', assunto: 'Assunto', canal: 'Canal', gatilho: 'Gatilho', alvo: 'Segmento',
  pixChave: 'Chave Pix', pixNome: 'Nome do Pix', taxaPct: 'Taxa do cartão', motivo: 'Motivo',
  exec: 'Profissionais', prod: 'Produto', pixTipo: 'Tipo de chave Pix', email2: 'Login',
  antecedenciaAgendamento: 'Antecedência', antecedenciaCancelamento: 'Prazo de cancelamento', dias: 'Horários',
};
