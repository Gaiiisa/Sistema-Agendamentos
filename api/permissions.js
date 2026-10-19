// ============================================================
// Catálogo de permissões — fonte ÚNICA da verdade (backend + frontend).
// Mapeado sobre os módulos e ações REAIS do sistema (telas + endpoints).
// O frontend consome este catálogo via GET /api/permissoes/catalogo.
// ============================================================

// Rótulos das ações (para a matriz na UI)
export const ACOES = {
  ver:      'Visualizar',
  criar:    'Criar',
  editar:   'Editar',
  excluir:  'Excluir',
  exportar: 'Exportar',
};

// Módulos reais e as ações que fazem sentido em cada um (nada inventado).
export const CATALOGO = [
  { modulo: 'dashboard',  label: 'Dashboard',              acoes: ['ver'] },
  { modulo: 'agenda',     label: 'Agenda',                 acoes: ['ver', 'criar', 'editar', 'excluir'] },
  { modulo: 'clientes',   label: 'Clientes',               acoes: ['ver', 'criar', 'editar'] },
  { modulo: 'servicos',   label: 'Serviços',               acoes: ['ver', 'criar', 'editar'] },
  { modulo: 'equipe',     label: 'Equipe',                 acoes: ['ver', 'criar', 'editar'] },
  { modulo: 'estoque',    label: 'Estoque',                acoes: ['ver', 'criar', 'editar'] },
  { modulo: 'financeiro', label: 'Financeiro',             acoes: ['ver', 'criar', 'exportar'] },
  { modulo: 'comissoes',  label: 'Comissões',              acoes: ['ver', 'exportar'] },
  { modulo: 'fidelidade', label: 'Fidelidade & Marketing', acoes: ['ver', 'criar', 'editar'] },
  { modulo: 'relatorios', label: 'Relatórios & Alertas',   acoes: ['ver', 'exportar'] },
  { modulo: 'config',     label: 'Configurações',          acoes: ['ver', 'editar'] },
];

// Conjunto de todas as permissões válidas ('modulo:acao').
export const PERMISSOES_VALIDAS = new Set(
  CATALOGO.flatMap((m) => m.acoes.map((a) => `${m.modulo}:${a}`)),
);

// Filtra uma lista recebida do cliente, mantendo só permissões válidas e sem duplicatas.
export function sanitizePermissoes(list) {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.filter((p) => typeof p === 'string' && PERMISSOES_VALIDAS.has(p)))];
}
