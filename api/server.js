// ============================================================
// API REST — Sistema de Agendamento
// Lê do MySQL e devolve os dados no formato que o front (DataService) espera.
// ============================================================
import express from 'express';
import cors from 'cors';
import { randomUUID, randomBytes } from 'crypto';
import { pool, q, tx } from './db.js';
import { hashPassword, verifyPassword, signToken, authRequired } from './auth.js';
import { CATALOGO, ACOES, sanitizePermissoes } from './permissions.js';
import { R, validar, parcial } from './validacao.js';

const app = express();
// CORS: por padrão libera qualquer origem (uso em LAN — PC + celular na mesma rede).
// Em produção, defina CORS_ORIGINS='https://app.exemplo.com,https://...' para restringir.
const corsOrigins = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors(corsOrigins.length ? { origin: corsOrigins } : undefined));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const EST = process.env.EST_ID || 'e1';   // estabelecimento atual (single-tenant por enquanto)

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const PAPEL_LABEL = { dono: 'Dono / Admin', admin: 'Admin', gerente: 'Gerente', profissional: 'Profissional', recepcao: 'Recepção' };
// Níveis de acesso: master (desenvolvedor) > ceo (dono) > usuario (permissões granulares).
const NIVEIS = ['master', 'ceo', 'usuario'];
const NIVEL_LABEL = { master: 'Master', ceo: 'CEO', usuario: 'Usuário' };
const acessoTotal = (nivel) => nivel === 'master' || nivel === 'ceo';
const publicUser = (u, permissoes = []) => ({
  id: u.id, nome: u.nome, email: u.email,
  papel: PAPEL_LABEL[u.papel] || u.papel, papelCod: u.papel,
  nivel: u.nivel, permissoes, cor: u.cor || '#0e9f6e',
});
// Lista de permissões concedidas a um usuário no formato 'modulo:acao'.
async function permissoesDe(userId) {
  const rows = await q('SELECT modulo, acao FROM usuario_permissoes WHERE usuario_id=?', [userId]);
  return rows.map((r) => `${r.modulo}:${r.acao}`);
}
const hhmm = (t) => (t ? String(t).slice(0, 5) : t);          // 'HH:MM:SS' -> 'HH:MM'
const toMin = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };  // 'HH:MM' -> minutos
const diaTxt = (n) => DIAS[n];
const diaNum = (s) => DIAS.indexOf(s);
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MESES_ABR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// erro -> 500 json (loga o detalhe internamente; devolve mensagem genérica ao cliente)
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(e);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Erro interno no servidor. Tente novamente.' });
});

// ============================================================
// Autenticação (rotas públicas) + gate para o restante da API
// ============================================================
// Rate-limit simples do login (em memória) — mitiga força-bruta.
const loginHits = new Map();                 // chave (IP) -> { count, resetAt }
const LOGIN_MAX = Number(process.env.LOGIN_MAX || 10);
const LOGIN_WINDOW_MS = Number(process.env.LOGIN_WINDOW_MS || 15 * 60 * 1000);
function loginRateLimit(req, res, next) {
  const key = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  let e = loginHits.get(key);
  if (!e || now > e.resetAt) { e = { count: 0, resetAt: now + LOGIN_WINDOW_MS }; loginHits.set(key, e); }
  e.count++;
  if (e.count > LOGIN_MAX) {
    const min = Math.ceil((e.resetAt - now) / 60000);
    return res.status(429).json({ error: `Muitas tentativas de login. Tente novamente em ${min} min.` });
  }
  next();
}

// POST /api/login — valida e-mail + senha, devolve token JWT
app.post('/api/login', loginRateLimit, wrap(async (req, res) => {
  const { email, senha } = req.body || {};
  if (!email || !senha) return res.status(400).json({ error: 'Informe e-mail e senha.' });
  const rows = await q('SELECT * FROM usuarios WHERE estabelecimento_id=? AND LOWER(email)=LOWER(?) LIMIT 1', [EST, String(email).trim()]);
  const u = rows[0];
  // mesma mensagem para inexistente ou senha errada (não revela qual)
  if (!u || !(await verifyPassword(senha, u.senha_hash))) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  }
  if (!u.ativo) return res.status(403).json({ error: 'Usuário inativo. Procure o administrador.' });
  loginHits.delete(req.ip || req.socket?.remoteAddress || 'unknown');   // login OK zera o contador
  await q('UPDATE usuarios SET ultimo_acesso=NOW() WHERE id=?', [u.id]);
  const perms = acessoTotal(u.nivel) ? [] : await permissoesDe(u.id);
  res.json({ token: signToken(u), usuario: publicUser(u, perms) });
}));

// POST /api/logout — JWT é stateless; o cliente descarta o token. Mantido por padrão de API.
app.post('/api/logout', (_req, res) => res.json({ ok: true }));

// health público (antes do gate)
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ---- daqui em diante, TODA rota /api exige Bearer token válido ----
app.use('/api', authRequired);

// Carrega autorização do usuário da sessão em req.authz (uma vez por requisição).
// Fonte ÚNICA de autorização: o nível da conta (master/ceo = acesso total) ou,
// para nível 'usuario', o conjunto de permissões granulares em usuario_permissoes.
// Lido do banco a cada requisição: mudanças valem na hora, sem novo login.
app.use('/api', async (req, res, next) => {
  try {
    const rows = await q('SELECT nivel, ativo FROM usuarios WHERE id=? AND estabelecimento_id=? LIMIT 1', [req.auth.sub, EST]);
    const u = rows[0];
    if (!u || !u.ativo) return res.status(401).json({ error: 'Sessão inválida.' });
    const total = acessoTotal(u.nivel);
    const perms = total ? null : new Set(await permissoesDe(req.auth.sub));
    req.authz = { nivel: u.nivel, total, perms };
    next();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// Exige uma permissão específica (master/ceo sempre passam).
const requirePerm = (modulo, acao) => (req, res, next) => {
  if (req.authz?.total) return next();
  if (req.authz?.perms?.has(`${modulo}:${acao}`)) return next();
  return res.status(403).json({ error: 'Acesso negado: você não tem permissão para esta ação.' });
};
// Exige QUALQUER uma das permissões (útil quando uma ação cruza módulos).
const requireAnyPerm = (...pares) => (req, res, next) => {
  if (req.authz?.total) return next();
  if (pares.some(([m, a]) => req.authz?.perms?.has(`${m}:${a}`))) return next();
  return res.status(403).json({ error: 'Acesso negado: você não tem permissão para esta ação.' });
};
// Gestão de contas e permissões: só master e ceo.
const gestorOnly = (req, res, next) => {
  if (req.authz?.total) return next();
  return res.status(403).json({ error: 'Acesso restrito à administração.' });
};

// GET /api/me — usuário da sessão atual (validação de sessão no front)
app.get('/api/me', wrap(async (req, res) => {
  const rows = await q('SELECT * FROM usuarios WHERE id=? LIMIT 1', [req.auth.sub]);
  if (!rows[0] || !rows[0].ativo) return res.status(401).json({ error: 'Sessão inválida.' });
  const perms = acessoTotal(rows[0].nivel) ? [] : await permissoesDe(rows[0].id);
  res.json({ usuario: publicUser(rows[0], perms) });
}));

// ============================================================
// GET /api/bootstrap — tudo de uma vez
// ============================================================
app.get('/api/bootstrap', wrap(async (req, res) => {
  const [
    dbDate, estab, usuario, profs, esps, folgas, vend,
    servicos, exec, clientes, tags, stats,
    ags, produtos, mov, caixaRow, lanc, receber,
    comItens, fechamentos, fid, camps, envios, modelos, kpiRows,
    fluxoRows, recCatRows, despCatRows, recFormaRows, recProfRows, mesRow, mesAntRow,
    fidMovRow, fechPagos, semanaRows, horariosRows, bloqueiosRows, catServRows,
  ] = await Promise.all([
    q('SELECT CURRENT_DATE() AS hoje'),
    q(`SELECT nome, plano, slug, documento, tipo_negocio, cidade, cep, telefone, endereco,
              descricao, instagram, site, google_perfil,
              antecedencia_min_agendamento_horas, antecedencia_min_cancelamento_horas,
              exige_sinal_padrao, sinal_tipo, sinal_valor,
              aceita_pix, aceita_debito, aceita_credito, aceita_dinheiro, aceita_fiado,
              pix_tipo, pix_chave, pix_nome, repassa_taxa_cartao, taxa_cartao_pct
         FROM estabelecimentos WHERE id=?`, [EST]),
    q('SELECT id, nome, email, papel, nivel, cor FROM usuarios WHERE id=?', [req.auth.sub]),
    q('SELECT * FROM profissionais WHERE estabelecimento_id=? ORDER BY id', [EST]),
    q('SELECT * FROM profissional_especialidades'),
    q('SELECT * FROM profissional_folgas'),
    q('SELECT * FROM vw_profissional_vendido'),
    q('SELECT * FROM servicos WHERE estabelecimento_id=? ORDER BY id', [EST]),
    q('SELECT * FROM servico_profissionais'),
    q('SELECT * FROM clientes WHERE estabelecimento_id=? ORDER BY id', [EST]),
    q('SELECT * FROM cliente_tags'),
    q('SELECT * FROM vw_cliente_stats'),
    q('SELECT * FROM agendamentos WHERE estabelecimento_id=? ORDER BY data, hora_inicio', [EST]),
    q(`SELECT p.*, f.nome AS fornecedor_nome,
              (SELECT s.nome FROM servico_consumo sc JOIN servicos s ON s.id=sc.servico_id
               WHERE sc.produto_id=p.id LIMIT 1) AS consumo_nome
       FROM produtos p LEFT JOIN fornecedores f ON f.id=p.fornecedor_id
       WHERE p.estabelecimento_id=? ORDER BY p.id`, [EST]),
    q('SELECT * FROM movimentacoes_estoque ORDER BY criado_em DESC'),
    q('SELECT c.*, u.nome AS operador_nome FROM caixas c JOIN usuarios u ON u.id=c.operador_id WHERE c.estabelecimento_id=? AND c.fechado_em IS NULL ORDER BY c.aberto_em DESC LIMIT 1', [EST]),
    q('SELECT * FROM lancamentos WHERE estabelecimento_id=? ORDER BY criado_em', [EST]),
    q('SELECT *, DATEDIFF(vencimento, CURRENT_DATE()) AS dias FROM contas_receber WHERE estabelecimento_id=? ORDER BY vencimento', [EST]),
    q('SELECT * FROM vw_comissao_itens ORDER BY data DESC'),
    q('SELECT profissional_id, status FROM fechamentos_comissao WHERE estabelecimento_id=?', [EST]),
    q('SELECT * FROM config_fidelidade WHERE estabelecimento_id=?', [EST]),
    q('SELECT * FROM campanhas WHERE estabelecimento_id=? ORDER BY id', [EST]),
    q('SELECT campanha_id, COUNT(*) AS enviadas, COUNT(retornou_em) AS retorno FROM campanha_envios GROUP BY campanha_id'),
    q('SELECT * FROM modelos_mensagem WHERE estabelecimento_id=? ORDER BY id', [EST]),
    q("SELECT status, COUNT(*) c, COALESCE(SUM(valor),0) v FROM agendamentos WHERE estabelecimento_id=? AND data=CURRENT_DATE() GROUP BY status", [EST]),
    // ----- financeiro: agregados reais -----
    q(`SELECT DATE(criado_em) AS dia,
              COALESCE(SUM(CASE WHEN tipo='receita' THEN valor END),0) AS rec,
              COALESCE(SUM(CASE WHEN tipo='despesa' THEN valor END),0) AS desp
         FROM lancamentos
         WHERE estabelecimento_id=? AND criado_em >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 DAY)
         GROUP BY DATE(criado_em)`, [EST]),
    q(`SELECT categoria, COALESCE(SUM(valor),0) v, COUNT(*) c FROM lancamentos
        WHERE estabelecimento_id=? AND tipo='receita'
          AND DATE_FORMAT(criado_em,'%Y-%m')=DATE_FORMAT(CURRENT_DATE(),'%Y-%m')
        GROUP BY categoria ORDER BY v DESC`, [EST]),
    q(`SELECT categoria, COALESCE(SUM(valor),0) v, COUNT(*) c FROM lancamentos
        WHERE estabelecimento_id=? AND tipo='despesa'
          AND DATE_FORMAT(criado_em,'%Y-%m')=DATE_FORMAT(CURRENT_DATE(),'%Y-%m')
        GROUP BY categoria ORDER BY v DESC`, [EST]),
    q(`SELECT forma, COALESCE(SUM(valor),0) v FROM lancamentos
        WHERE estabelecimento_id=? AND tipo='receita'
          AND DATE_FORMAT(criado_em,'%Y-%m')=DATE_FORMAT(CURRENT_DATE(),'%Y-%m')
        GROUP BY forma`, [EST]),
    q(`SELECT profissional_id, COALESCE(SUM(valor),0) v, COUNT(*) c FROM lancamentos
        WHERE estabelecimento_id=? AND tipo='receita' AND profissional_id IS NOT NULL
          AND DATE_FORMAT(criado_em,'%Y-%m')=DATE_FORMAT(CURRENT_DATE(),'%Y-%m')
        GROUP BY profissional_id ORDER BY v DESC`, [EST]),
    q(`SELECT
          COALESCE(SUM(CASE WHEN tipo='receita' THEN valor END),0) rec,
          COALESCE(SUM(CASE WHEN tipo='despesa' THEN valor END),0) desp,
          COALESCE(SUM(CASE WHEN tipo='receita' AND categoria='Atendimento' THEN valor END),0) atend_valor,
          COUNT(CASE WHEN tipo='receita' AND categoria='Atendimento' THEN 1 END) atend_qtd
        FROM lancamentos
        WHERE estabelecimento_id=? AND DATE_FORMAT(criado_em,'%Y-%m')=DATE_FORMAT(CURRENT_DATE(),'%Y-%m')`, [EST]),
    q(`SELECT
          COALESCE(SUM(CASE WHEN tipo='receita' THEN valor END),0) rec,
          COALESCE(SUM(CASE WHEN tipo='despesa' THEN valor END),0) desp
        FROM lancamentos
        WHERE estabelecimento_id=? AND DATE_FORMAT(criado_em,'%Y-%m')=DATE_FORMAT(DATE_SUB(CURRENT_DATE(),INTERVAL 1 MONTH),'%Y-%m')`, [EST]),
    // ----- fidelidade: agregados de pontos -----
    q(`SELECT
          COALESCE(SUM(CASE WHEN fm.tipo='acumulo' THEN fm.pontos END),0) AS emitidos,
          COALESCE(SUM(CASE WHEN fm.tipo='resgate' THEN 1 END),0)         AS resgatados,
          COUNT(DISTINCT fm.cliente_id)                                   AS ativos
        FROM fidelidade_movimentos fm
        JOIN clientes c ON c.id = fm.cliente_id
        WHERE c.estabelecimento_id=?`, [EST]),
    // ----- comissões: fechamentos já pagos (histórico) -----
    q(`SELECT fc.*, DATE_FORMAT(fc.periodo_inicio,'%d/%m') AS ini_lbl, DATE_FORMAT(fc.periodo_fim,'%d/%m') AS fim_lbl
         FROM fechamentos_comissao fc
        WHERE fc.estabelecimento_id=? AND fc.status='pago'
        ORDER BY fc.periodo_inicio DESC`, [EST]),
    // ----- faturamento das últimas 8 semanas (receita por semana ISO) -----
    q(`SELECT YEARWEEK(criado_em, 3) AS yw, MIN(DATE(criado_em)) AS ini,
              COALESCE(SUM(CASE WHEN tipo='receita' THEN valor END),0) AS rec
         FROM lancamentos
        WHERE estabelecimento_id=? AND criado_em >= DATE_SUB(CURRENT_DATE(), INTERVAL 56 DAY)
        GROUP BY YEARWEEK(criado_em, 3) ORDER BY yw`, [EST]),
    // ----- horários de funcionamento (tela Configurações › Horários) -----
    q('SELECT * FROM estabelecimento_horarios WHERE estabelecimento_id=? ORDER BY dia_semana', [EST]),
    // ----- bloqueios de agenda -----
    q('SELECT * FROM bloqueios_agenda WHERE estabelecimento_id=? ORDER BY data, hora_inicio', [EST]),
    // ----- categorias de serviço (avulsas, criadas na tela de Serviços) -----
    q('SELECT nome FROM categorias_servico WHERE estabelecimento_id=? ORDER BY nome', [EST]),
  ]);

  // ----- staff -----
  const espBy = group(esps, 'profissional_id', (r) => r.especialidade);
  const folBy = group(folgas, 'profissional_id', (r) => diaTxt(r.dia_semana));
  const vendBy = index(vend, 'profissional_id');
  const staff = profs.map((p) => ({
    id: p.id, nome: p.nome, apelido: p.apelido || '', cor: p.cor || '#0e9f6e',
    especialidades: espBy[p.id] || [],
    comissao: Number(p.comissao_pct), contato: p.contato || '', bio: p.bio || '',
    meta: Number(p.meta_mensal || 0),
    vendido: Number(vendBy[p.id]?.vendido_mes || 0),
    folga: folBy[p.id] || [], inicio: hhmm(p.hora_inicio), fim: hhmm(p.hora_fim),
  }));

  // ----- servicos -----
  const execBy = group(exec, 'servico_id', (r) => r.profissional_id);
  const servicos2 = servicos.map((s) => ({
    id: s.id, nome: s.nome, cat: s.categoria, dur: Number(s.duracao_min),
    preco: Number(s.preco), custo: Number(s.custo), desc: s.descricao || '',
    cor: s.cor || '#0e9f6e', exec: execBy[s.id] || [],
    combo: !!s.combo, sinal: !!s.exige_sinal, ativo: s.ativo == null ? true : !!s.ativo,
    sinalPct: s.sinal_valor == null ? undefined : Number(s.sinal_valor),
  }));

  // ----- clientes -----
  const tagBy = group(tags, 'cliente_id', (r) => r.tag);
  const statBy = index(stats, 'cliente_id');
  const clientes2 = clientes.map((c) => {
    const st = statBy[c.id] || {};
    return {
      id: c.id, nome: c.nome, wpp: c.whatsapp || '', email: c.email || '',
      nasc: c.nascimento || '', tags: tagBy[c.id] || [],
      visitas: Number(st.visitas || 0), ticket: Math.round(Number(st.ticket_medio || 0)),
      total: Number(st.total_gasto || 0), ultima: st.ultima_visita || '',
      freq: Math.round(Number(st.frequencia_dias || 0)),
      obs: c.observacoes || '', fav: c.profissional_favorito_id,
    };
  });

  // ----- agendamentos -----
  const today = dbDate[0].hoje;
  const hoje = ags.filter((a) => a.data === today).map((a) => ({
    id: a.id, cli: a.cliente_id, srv: a.servico_id, prof: a.profissional_id,
    ini: hhmm(a.hora_inicio), status: a.status, sinal: !!a.sinal_pago, _dur: Number(a.duracao_min),
  }));
  const agendamentos = ags.map((a) => ({
    id: a.id, cli: a.cliente_id, srv: a.servico_id, prof: a.profissional_id,
    data: a.data, hora: hhmm(a.hora_inicio), status: a.status, valor: Number(a.valor),
  }));

  // ----- historico por cliente (concluídos) -----
  const historico = {};
  for (const a of ags) {
    if (a.status !== 'concluido') continue;
    (historico[a.cliente_id] ||= []).push({ data: a.data, srv: a.servico_id, prof: a.profissional_id, valor: Number(a.valor) });
  }
  for (const k of Object.keys(historico)) historico[k].sort((x, y) => (x.data < y.data ? 1 : -1));

  // ----- produtos -----
  const produtos2 = produtos.map((p) => ({
    id: p.id, nome: p.nome, cat: p.categoria, qtd: Number(p.quantidade),
    min: Number(p.quantidade_minima), custo: Number(p.custo),
    preco: p.preco_venda == null ? null : Number(p.preco_venda),
    fornecedor: p.fornecedor_nome || '', consumo: p.consumo_nome || null,
    imagem: p.imagem || null,
  }));

  // ----- movimentações -----
  const movEstoque = mov.map((m) => ({
    id: m.id, prod: m.produto_id, tipo: m.tipo, qtd: Number(m.quantidade),
    motivo: m.motivo || '', data: String(m.criado_em).slice(0, 10), hora: String(m.criado_em).slice(11, 16),
  }));

  // ----- caixa -----
  const cx = caixaRow[0];
  const caixa = cx
    ? { aberto: true, abertura: String(cx.aberto_em).slice(11, 16), valorAbertura: Number(cx.valor_abertura), operador: cx.operador_nome }
    : { aberto: false, abertura: '', valorAbertura: 0, operador: '' };

  // ----- lançamentos -----
  const lancamentos = lanc.map((l) => ({
    id: l.id, tipo: l.tipo, cat: l.categoria, desc: l.descricao, valor: Number(l.valor),
    forma: l.forma, data: String(l.criado_em).slice(0, 10), hora: String(l.criado_em).slice(11, 16),
    prof: l.profissional_id || undefined,
  }));

  // ----- a receber -----
  const aReceber = receber.map((r) => ({
    id: r.id, cli: r.cliente_id, desc: r.descricao, valor: Number(r.valor),
    venc: r.vencimento, dias: Number(r.dias),
  }));

  // ----- comissões -----
  const fechBy = index(fechamentos, 'profissional_id');
  const comissoes = {};
  for (const it of comItens) {
    const pid = it.profissional_id;
    (comissoes[pid] ||= { status: fechBy[pid]?.status || 'aberto', itens: [] })
      .itens.push({ data: it.data, cli: it.cliente_id, srv: it.servico_id, valor: Number(it.valor) });
  }
  for (const f of fechamentos) comissoes[f.profissional_id] ||= { status: f.status, itens: [] };

  // ----- fidelidade -----
  const fr = fid[0];
  const fidelidade = fr
    ? { tipo: fr.tipo, meta: Number(fr.meta_pontos), recompensa: fr.recompensa || '', cashbackPct: Number(fr.cashback_pct) }
    : {};

  // ----- campanhas -----
  const envBy = index(envios, 'campanha_id');
  const campanhas = camps.map((c) => {
    const e = envBy[c.id] || {};
    const enviadas = Number(e.enviadas || 0), retorno = Number(e.retorno || 0);
    return {
      id: c.id, nome: c.nome, tipo: c.tipo, alvo: c.alvo, cor: c.cor || 'var(--accent)',
      status: c.status, publico: enviadas, enviadas, retorno,
      taxa: enviadas ? Math.round((retorno / enviadas) * 100) : 0,
    };
  });

  // ----- modelos -----
  const modelos2 = modelos.map((m) => ({
    id: m.id, nome: m.nome, desc: m.descricao || '', cat: m.categoria || '',
    gatilho: m.gatilho, canal: m.canal || 'whatsapp', assunto: m.assunto || '',
    texto: m.texto, status: m.status || 'ativo',
  }));

  // ----- kpis (do dia) -----
  const byStatus = index(kpiRows, 'status');
  const num = (s) => Number(byStatus[s]?.c || 0);
  const val = (s) => Number(byStatus[s]?.v || 0);
  const kpis = {
    agendamentos: kpiRows.reduce((a, r) => a + Number(r.c), 0),
    confirmados: num('confirmado'), pendentes: num('pendente'),
    faturaPrevisto: val('confirmado') + val('atendimento') + val('pendente') + val('concluido'),
    faturaRealizado: val('concluido'),
    faltas: num('faltou'), cancelamentos: num('cancelado'),
  };

  // ----- financeiro (agregados reais a partir de lancamentos) -----
  const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const fluxoBy = index(fluxoRows, 'dia');
  const isoLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const baseToday = new Date(today + 'T00:00:00');
  const fluxo = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(baseToday);
    d.setDate(d.getDate() - i);
    const r = fluxoBy[isoLocal(d)] || {};
    fluxo.push({ dia: `${DOW[d.getDay()]} ${d.getDate()}`, rec: Number(r.rec || 0), desp: Number(r.desp || 0) });
  }

  const FORMA_LABEL = { pix: 'Pix', cartao: 'Cartão', dinheiro: 'Dinheiro' };
  const receitaCategoria = recCatRows.map((r) => ({ cat: r.categoria, valor: Number(r.v), qtd: Number(r.c) }));
  const despesaCategoria = despCatRows.map((r) => ({ cat: r.categoria, valor: Number(r.v), qtd: Number(r.c) }));
  const receitaForma = recFormaRows.map((r) => ({ forma: r.forma, label: FORMA_LABEL[r.forma] || r.forma, valor: Number(r.v) }));
  const porProfissional = recProfRows.map((r) => ({ prof: r.profissional_id, valor: Number(r.v), qtd: Number(r.c) }));

  const mr = mesRow[0] || {}, mar = mesAntRow[0] || {};
  const atendQtd = Number(mr.atend_qtd || 0);
  const financeiro = {
    hoje: today,
    fluxo, receitaCategoria, despesaCategoria, receitaForma, porProfissional,
    mes: {
      receita: Number(mr.rec || 0), despesa: Number(mr.desp || 0),
      resultado: Number(mr.rec || 0) - Number(mr.desp || 0),
      ticketMedio: atendQtd ? Math.round(Number(mr.atend_valor || 0) / atendQtd) : 0,
      atendimentos: atendQtd,
    },
    mesAnterior: {
      receita: Number(mar.rec || 0), despesa: Number(mar.desp || 0),
      resultado: Number(mar.rec || 0) - Number(mar.desp || 0),
    },
  };

  // ============================================================
  // Relatórios / BI — agregados reais (substituem o mock de data.service)
  // ============================================================
  const ym = today.slice(0, 7);                       // 'YYYY-MM'
  const inMonth = (d) => String(d).slice(0, 7) === ym;
  const mNum = Number(today.slice(5, 7)) - 1;
  const diaMes = Number(today.slice(8, 10));
  const ano = Number(today.slice(0, 4));

  const agsMes = ags.filter((a) => inMonth(a.data));
  const concluidosMes = agsMes.filter((a) => a.status === 'concluido');
  const faltasMes = agsMes.filter((a) => a.status === 'faltou');
  const finalizaveis = agsMes.filter((a) => ['concluido', 'faltou'].includes(a.status));
  const noShowQtd = faltasMes.length;
  const noShowTaxa = finalizaveis.length ? Math.round((noShowQtd / finalizaveis.length) * 1000) / 10 : 0;
  const noShowCusto = faltasMes.reduce((s, a) => s + Number(a.valor), 0);

  // ranking de serviços (concluídos no mês, por receita)
  const rankMap = {};
  for (const a of concluidosMes) {
    (rankMap[a.servico_id] ||= { srv: a.servico_id, qtd: 0, receita: 0 });
    rankMap[a.servico_id].qtd += 1;
    rankMap[a.servico_id].receita += Number(a.valor);
  }
  const rankingServicos = Object.values(rankMap).sort((a, b) => b.receita - a.receita).slice(0, 5);

  // novos × recorrentes entre os atendidos no mês
  const primeiraVisita = {};
  for (const a of ags) {
    if (a.status !== 'concluido') continue;
    if (!primeiraVisita[a.cliente_id] || a.data < primeiraVisita[a.cliente_id]) primeiraVisita[a.cliente_id] = a.data;
  }
  let novos = 0, recorrentes = 0;
  for (const cid of new Set(concluidosMes.map((a) => a.cliente_id))) {
    (inMonth(primeiraVisita[cid]) ? novos++ : recorrentes++);
  }

  // ocupação: minutos vendidos / capacidade dos profissionais (dias decorridos do mês)
  const folgaSet = {};
  for (const f of folgas) (folgaSet[f.profissional_id] ||= new Set()).add(f.dia_semana);
  let capacidadeMin = 0;
  for (let dia = 1; dia <= diaMes; dia++) {
    const dow = new Date(`${ym}-${String(dia).padStart(2, '0')}T00:00:00`).getDay();
    for (const p of profs) if (!folgaSet[p.id]?.has(dow)) capacidadeMin += toMin(hhmm(p.hora_fim)) - toMin(hhmm(p.hora_inicio));
  }
  const vendidosMin = agsMes
    .filter((a) => a.data <= today && ['concluido', 'atendimento', 'confirmado', 'pendente'].includes(a.status))
    .reduce((s, a) => s + Number(a.duracao_min), 0);
  const ocupacaoMes = capacidadeMin ? Math.min(100, Math.round((vendidosMin / capacidadeMin) * 100)) : 0;

  // forma de pagamento (mês) com pct
  const totalForma = receitaForma.reduce((s, f) => s + f.valor, 0);
  const porForma = receitaForma.map((f) => ({
    forma: f.label, valor: f.valor, pct: totalForma ? Math.round((f.valor / totalForma) * 100) : 0,
  }));

  // heatmap: distribuição de atendimentos por dia-da-semana × faixa horária (escala 0–5)
  const heatDias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const faixas = [9, 11, 13, 15, 17, 19];
  const heatmap = faixas.map(() => heatDias.map(() => 0));
  for (const a of ags) {
    if (!['concluido', 'atendimento', 'confirmado'].includes(a.status)) continue;
    const dow = new Date(a.data + 'T00:00:00').getDay();
    if (dow < 1 || dow > 6) continue;
    const h = Number(String(a.hora_inicio).slice(0, 2));
    let fi = -1;
    for (let i = faixas.length - 1; i >= 0; i--) if (h >= faixas[i]) { fi = i; break; }
    if (fi >= 0) heatmap[fi][dow - 1] += 1;
  }
  let heatMax = 0;
  for (const row of heatmap) for (const v of row) heatMax = Math.max(heatMax, v);
  const heatmapScaled = heatmap.map((row) => row.map((v) => (heatMax ? Math.round((v / heatMax) * 5) : 0)));

  // faturamento das últimas 8 semanas
  const ultimas = semanaRows.slice(-8);
  const faturamentoSemanal = ultimas.map((r) => Number(r.rec));
  const faturamentoSemanalLabels = ultimas.map((r) => {
    const d = new Date(r.ini + 'T00:00:00');
    return `${MESES_ABR[d.getMonth()]} ${d.getDate()}`;
  });
  const metaMensalTotal = staff.reduce((s, p) => s + (p.meta || 0), 0);
  const metaSemanal = Math.round(metaMensalTotal / 4.3) || 5000;

  const relatorio = {
    periodo: `${cap(MESES[mNum])} · 1–${diaMes}`,
    faturamento: Number(mr.rec || 0),
    faturamentoAnt: Number(mar.rec || 0),
    atendimentos: atendQtd,
    ticketMedio: financeiro.mes.ticketMedio,
    ocupacao: ocupacaoMes,
    noShowTaxa, noShowQtd, noShowCusto,
    novos, recorrentes,
    porForma, rankingServicos,
    heatmapDias: heatDias,
    heatmapFaixas: faixas.map((h) => `${h}h`),
    heatmap: heatmapScaled,
    faturamentoSemanal: faturamentoSemanal.length ? faturamentoSemanal : [0],
    faturamentoSemanalLabels: faturamentoSemanalLabels.length ? faturamentoSemanalLabels : [''],
    metaSemanal,
  };

  // ocupação de HOJE (card do dashboard)
  const dowHoje = new Date(today + 'T00:00:00').getDay();
  let capHojeMin = 0;
  for (const p of profs) if (!folgaSet[p.id]?.has(dowHoje)) capHojeMin += toMin(hhmm(p.hora_fim)) - toMin(hhmm(p.hora_inicio));
  const vendHojeMin = ags
    .filter((a) => a.data === today && ['concluido', 'atendimento', 'confirmado', 'pendente'].includes(a.status))
    .reduce((s, a) => s + Number(a.duracao_min), 0);
  kpis.ocupacao = capHojeMin ? Math.min(100, Math.round((vendHojeMin / capHojeMin) * 100)) : 0;

  // ----- fidelidade: agregados de pontos -----
  const fm0 = fidMovRow[0] || {};
  fidelidade.ativos = Number(fm0.ativos || 0);
  fidelidade.resgatados = Number(fm0.resgatados || 0);
  fidelidade.pontosEmitidos = Number(fm0.emitidos || 0);

  // ----- comissões: período da quinzena + histórico de pagamentos -----
  const ultimoDia = new Date(ano, mNum + 1, 0).getDate();
  const periodoComissao = diaMes <= 15
    ? `01 – 15 de ${MESES[mNum]}`
    : `16 – ${ultimoDia} de ${MESES[mNum]}`;
  const historicoComissoes = fechPagos.map((f) => ({
    id: f.id, profId: f.profissional_id,
    periodo: `${f.ini_lbl} – ${f.fim_lbl}`,
    dataInicio: f.periodo_inicio, dataFim: f.periodo_fim,
    atendimentos: Number(f.qtd_atendimentos || 0),
    bruto: Number(f.valor_bruto || 0),
    comissao: Number(f.valor_comissao != null ? f.valor_comissao : (f.valor_pago || 0)),
    status: f.status,
    dataPagamento: f.pago_em ? String(f.pago_em).slice(0, 10) : undefined,
    formaPagamento: f.forma_pagamento || undefined,
  }));

  // ----- horários de funcionamento -----
  const DIAS_LABEL = [
    { dia: 'Domingo', abrev: 'Dom' }, { dia: 'Segunda-feira', abrev: 'Seg' }, { dia: 'Terça-feira', abrev: 'Ter' },
    { dia: 'Quarta-feira', abrev: 'Qua' }, { dia: 'Quinta-feira', abrev: 'Qui' }, { dia: 'Sexta-feira', abrev: 'Sex' },
    { dia: 'Sábado', abrev: 'Sáb' },
  ];
  const horarios = horariosRows.map((h) => ({
    diaSemana: h.dia_semana, dia: DIAS_LABEL[h.dia_semana].dia, abrev: DIAS_LABEL[h.dia_semana].abrev,
    aberto: !!h.aberto, inicio: hhmm(h.hora_inicio), fim: hhmm(h.hora_fim),
    pausaInicio: h.pausa_inicio ? hhmm(h.pausa_inicio) : null,
    pausaFim: h.pausa_fim ? hhmm(h.pausa_fim) : null,
  }));

  // ----- bloqueios de agenda -----
  const bloqueios = bloqueiosRows.map((b) => ({
    id: b.id, prof: b.profissional_id || null, data: b.data,
    ini: hhmm(b.hora_inicio), fim: hhmm(b.hora_fim),
    tipo: b.tipo || 'outro', motivo: b.motivo || '',
  }));

  res.json(filtrarBootstrap(req.authz, {
    estabelecimento: estab[0] || {}, usuario: usuario[0] ? { ...usuario[0], papel: PAPEL_LABEL[usuario[0].papel] || usuario[0].papel, papelCod: usuario[0].papel } : {},
    staff, servicos: servicos2, clientes: clientes2, hoje, agendamentos, historico,
    produtos: produtos2, movEstoque, caixa, lancamentos, aReceber,
    comissoes, fidelidade, campanhas, modelos: modelos2, kpis, financeiro,
    relatorio, periodoComissao, historicoComissoes, horarios, bloqueios,
    categoriasServico: catServRows.map((r) => r.nome),
  }));
}));

// Mesma forma, sem conteúdo: números viram 0 e listas ficam vazias (o front não
// quebra ao ler campos aninhados, mas não recebe nenhum valor real).
function zerar(v) {
  if (Array.isArray(v)) return [];
  if (typeof v === 'number') return 0;
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, zerar(x)]));
  }
  return v;
}

// Leitura também respeita as permissões: cada bloco do bootstrap só vai com
// conteúdo real para quem pode 'ver' o módulo dono daquele dado.
function filtrarBootstrap(authz, b) {
  if (authz?.total) return b;
  const ver = (...mods) => mods.some((m) => authz?.perms?.has(`${m}:ver`));
  const out = { ...b };
  if (!ver('financeiro')) {
    out.lancamentos = []; out.aReceber = []; out.caixa = zerar(b.caixa);
  }
  if (!ver('financeiro', 'dashboard', 'relatorios')) out.financeiro = zerar(b.financeiro);
  if (!ver('dashboard')) out.kpis = zerar(b.kpis);
  if (!ver('relatorios', 'dashboard')) out.relatorio = zerar(b.relatorio);
  if (!ver('comissoes')) { out.comissoes = {}; out.historicoComissoes = []; }
  if (!ver('estoque')) { out.produtos = []; out.movEstoque = []; }
  if (!ver('fidelidade')) { out.campanhas = []; out.modelos = []; out.fidelidade = zerar(b.fidelidade); }
  return out;
}

// ============================================================
// Escrita — agendamentos, serviços, profissionais, produtos, campanhas, movimentações
// (ids vêm do cliente; CHAR(36) aceita 'sn123', 'p1' etc.)
// ============================================================

// criar agendamento
const STATUS_AG = ['pendente', 'confirmado', 'atendimento', 'concluido', 'faltou', 'cancelado'];
app.post('/api/agendamentos', requirePerm('agenda', 'criar'), wrap(async (req, res) => {
  const b = req.body || {};
  const id = b.id || randomUUID();
  const dur = Number(b._dur || b.duracao_min || 30);
  const data = b.data || new Date().toISOString().slice(0, 10);
  const iniStr = b.ini || b.hora;
  const erro = validar({
    cli: [R.obrigatorio(b.cli, 'Selecione o cliente.')],
    srv: [R.obrigatorio(b.srv, 'Selecione o serviço.')],
    prof: [R.obrigatorio(b.prof, 'Selecione o profissional.')],
    data: [R.data(data)],
    ini: [R.obrigatorio(iniStr, 'Informe o horário.'), R.hora(iniStr)],
    dur: [R.numero(dur, { min: 5, max: 600, inteiro: true })],
    valor: [R.dinheiro(b.valor, { max: 100000 })],
    status: [R.umDe(b.status, STATUS_AG, 'Status inválido.')],
  });
  if (erro) return res.status(400).json(erro);
  // referências precisam existir neste estabelecimento
  const [c, s, p] = await Promise.all([
    q('SELECT id FROM clientes WHERE id=? AND estabelecimento_id=?', [b.cli, EST]),
    q('SELECT id FROM servicos WHERE id=? AND estabelecimento_id=?', [b.srv, EST]),
    q('SELECT id FROM profissionais WHERE id=? AND estabelecimento_id=?', [b.prof, EST]),
  ]);
  if (!c.length || !s.length || !p.length) return res.status(400).json({ error: 'Cliente, serviço ou profissional não encontrado.' });

  // BUG-04: impede overbooking — dois agendamentos ativos no mesmo slot do profissional.
  if (b.prof && iniStr) {
    const novoIni = toMin(hhmm(iniStr)), novoFim = novoIni + dur;
    const existentes = await q(
      `SELECT hora_inicio, duracao_min FROM agendamentos
       WHERE estabelecimento_id=? AND profissional_id=? AND data=?
         AND status IN ('pendente','confirmado','atendimento','concluido')`,
      [EST, b.prof, data],
    );
    const conflito = existentes.some((a) => {
      const aIni = toMin(hhmm(a.hora_inicio)), aFim = aIni + Number(a.duracao_min);
      return aIni < novoFim && aFim > novoIni;
    });
    if (conflito) return res.status(409).json({ error: 'Já existe um agendamento para esse profissional nesse horário.' });
  }

  await q(
    `INSERT INTO agendamentos (id, estabelecimento_id, cliente_id, servico_id, profissional_id, data, hora_inicio, duracao_min, valor, status, sinal_pago)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [id, EST, b.cli, b.srv, b.prof, data, iniStr, dur, b.valor || 0, b.status || 'pendente', !!b.sinal],
  );
  res.json({ id });
}));

// atualizar status / campos do agendamento
app.put('/api/agendamentos/:id', requirePerm('agenda', 'editar'), wrap(async (req, res) => {
  const b = req.body || {};
  const erro = validar({
    status: parcial(b, 'status', R.umDe(b.status, STATUS_AG, 'Status inválido.')),
    valor: parcial(b, 'valor', R.dinheiro(b.valor, { max: 100000 })),
    ini: parcial(b, 'ini', R.hora(b.ini)),
    hora: parcial(b, 'hora', R.hora(b.hora)),
    data: parcial(b, 'data', R.data(b.data)),
  });
  if (erro) return res.status(400).json(erro);
  if (b.prof !== undefined) {
    const p = await q('SELECT id FROM profissionais WHERE id=? AND estabelecimento_id=?', [b.prof, EST]);
    if (!p.length) return res.status(400).json({ error: 'Profissional não encontrado.' });
  }
  const map = { status: 'status', sinal: 'sinal_pago', valor: 'valor', ini: 'hora_inicio', hora: 'hora_inicio', data: 'data', prof: 'profissional_id' };
  await updateRow('agendamentos', map, req.params.id, req.body);
  res.json({ ok: true });
}));

// lançamentos financeiros (receita/despesa) — usado ao concluir atendimento (BUG-03)
app.post('/api/lancamentos', requireAnyPerm(['financeiro', 'criar'], ['agenda', 'editar']), wrap(async (req, res) => {
  const b = req.body || {}, id = b.id || randomUUID();
  const erroL = validar({
    valor: [R.obrigatorio(b.valor, 'Informe o valor.'), R.dinheiro(b.valor, { max: 1000000 })],
    tipo: [R.umDe(b.tipo, ['receita', 'despesa'], 'Tipo deve ser receita ou despesa.')],
    forma: [R.umDe(b.forma, ['pix', 'cartao', 'dinheiro'], 'Forma de pagamento inválida.')],
    cat: [R.tamanho(b.cat, 2, 60)],
    desc: [R.tamanho(b.desc, 0, 255)],
  });
  if (erroL) return res.status(400).json(erroL);
  // Idempotente por agendamento: não duplica a receita se o atendimento já gerou lançamento.
  if (b.agendamento) {
    const ex = await q('SELECT id FROM lancamentos WHERE agendamento_id=? AND estabelecimento_id=? LIMIT 1', [b.agendamento, EST]);
    if (ex.length) return res.json({ id: ex[0].id, duplicate: true });
  }
  await q(
    `INSERT INTO lancamentos (id, estabelecimento_id, tipo, categoria, descricao, valor, forma, profissional_id, agendamento_id)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [id, EST, b.tipo || 'receita', b.cat || 'Atendimento', b.desc || '', b.valor || 0, b.forma || 'dinheiro', b.prof || null, b.agendamento || null],
  );
  res.json({ id });
}));

// serviços
const SERVICO_MAP = { nome: 'nome', cat: 'categoria', dur: 'duracao_min', preco: 'preco', custo: 'custo', desc: 'descricao', cor: 'cor', combo: 'combo', sinal: 'exige_sinal', sinalPct: 'sinal_valor', ativo: 'ativo' };
// regras de serviço; `exigir` = POST (tudo obrigatório) vs PUT parcial
function erroServico(b, exigir) {
  const reg = (campo, ...r) => (exigir ? r : parcial(b, campo, ...r));
  return validar({
    nome: reg('nome', R.obrigatorio(b.nome), R.tamanho(b.nome, 2, 80)),
    cat: reg('cat', R.obrigatorio(b.cat, 'Escolha uma categoria.'), R.tamanho(b.cat, 2, 40)),
    desc: parcial(b, 'desc', R.tamanho(b.desc, 0, 255)),
    dur: reg('dur', R.obrigatorio(b.dur), R.numero(b.dur, { min: 5, max: 600, inteiro: true })),
    preco: reg('preco', R.obrigatorio(b.preco), R.dinheiro(b.preco, { max: 100000 })),
    custo: [...parcial(b, 'custo', R.dinheiro(b.custo, { max: 100000 })),
      R.se(b.custo !== undefined && b.preco !== undefined && Number(b.custo) > Number(b.preco), 'O custo não pode ser maior que o preço.')],
    sinalPct: parcial(b, 'sinalPct', R.numero(b.sinalPct, { min: 1, max: 100, inteiro: true })),
    exec: [...parcial(b, 'exec', R.lista(b.exec)),
      R.se(exigir && (!Array.isArray(b.exec) || !b.exec.length), 'Selecione ao menos um profissional.')],
  });
}
async function nomeDuplicado(tabela, nome, exceptId = null) {
  if (vazioStr(nome)) return false;
  const r = await q(`SELECT id FROM ${tabela} WHERE estabelecimento_id=? AND LOWER(TRIM(nome))=LOWER(TRIM(?)) AND (? IS NULL OR id<>?) LIMIT 1`,
    [EST, nome, exceptId, exceptId]);
  return r.length > 0;
}
const vazioStr = (v) => v === undefined || v === null || String(v).trim() === '';

app.post('/api/servicos', requirePerm('servicos', 'criar'), wrap(async (req, res) => {
  const b = req.body || {}, id = b.id || randomUUID();
  const erro = erroServico(b, true);
  if (erro) return res.status(400).json(erro);
  if (await nomeDuplicado('servicos', b.nome)) return res.status(409).json({ error: 'Já existe um serviço com esse nome.', campo: 'nome' });
  await tx(async (run) => {
    await run('INSERT INTO servicos (id, estabelecimento_id, nome, categoria, duracao_min, preco, custo, descricao, cor, combo, exige_sinal, sinal_valor) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [id, EST, b.nome, b.cat, b.dur, b.preco, b.custo || 0, b.desc || '', b.cor || null, !!b.combo, !!b.sinal, b.sinalPct ?? null]);
    await setExec(id, b.exec, run);
  });
  res.json({ id });
}));
app.put('/api/servicos/:id', requirePerm('servicos', 'editar'), wrap(async (req, res) => {
  const erro = erroServico(req.body || {}, false);
  if (erro) return res.status(400).json(erro);
  if (req.body.nome !== undefined && await nomeDuplicado('servicos', req.body.nome, req.params.id)) {
    return res.status(409).json({ error: 'Já existe um serviço com esse nome.', campo: 'nome' });
  }
  await tx(async (run) => {
    await updateRow('servicos', SERVICO_MAP, req.params.id, req.body, run);
    if (req.body.exec) await setExec(req.params.id, req.body.exec, run);
  });
  res.json({ ok: true });
}));

// categorias de serviço (avulsas)
app.post('/api/categorias-servico', requirePerm('servicos', 'editar'), wrap(async (req, res) => {
  const nome = String(req.body?.nome || '').trim();
  const erroCat = validar({ cat: [R.obrigatorio(nome), R.tamanho(nome, 2, 40)] });
  if (erroCat) return res.status(400).json(erroCat);
  await q('INSERT IGNORE INTO categorias_servico (id, estabelecimento_id, nome) VALUES (UUID(), ?, ?)', [EST, nome]);
  res.json({ ok: true, nome });
}));

app.delete('/api/categorias-servico/:nome', requirePerm('servicos', 'editar'), wrap(async (req, res) => {
  const nome = String(req.params.nome || '').trim();
  if (!nome) return res.status(400).json({ error: 'Nome obrigatório.' });
  const usados = await q('SELECT COUNT(*) AS n FROM servicos WHERE estabelecimento_id=? AND categoria=?', [EST, nome]);
  if (Number(usados[0]?.n || 0) > 0) {
    return res.status(409).json({ error: 'Categoria em uso por serviços — remova ou reclassifique-os antes.' });
  }
  await q('DELETE FROM categorias_servico WHERE estabelecimento_id=? AND nome=?', [EST, nome]);
  res.json({ ok: true });
}));

// profissionais
const PROF_MAP = { nome: 'nome', apelido: 'apelido', cor: 'cor', comissao: 'comissao_pct', contato: 'contato', bio: 'bio', meta: 'meta_mensal', inicio: 'hora_inicio', fim: 'hora_fim' };
const DIAS_TXT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
function erroProfissional(b, exigir) {
  const reg = (campo, ...r) => (exigir ? r : parcial(b, campo, ...r));
  return validar({
    nome: reg('nome', R.obrigatorio(b.nome), R.tamanho(b.nome, 3, 80)),
    apelido: reg('apelido', R.obrigatorio(b.apelido), R.tamanho(b.apelido, 2, 20)),
    bio: parcial(b, 'bio', R.tamanho(b.bio, 0, 160)),
    contato: reg('contato', R.obrigatorio(b.contato, 'Informe o WhatsApp.'), R.telefone(b.contato)),
    comissao: reg('comissao', R.obrigatorio(b.comissao), R.numero(b.comissao, { min: 0, max: 100 })),
    meta: parcial(b, 'meta', R.dinheiro(b.meta, { max: 1000000 })),
    inicio: reg('inicio', R.obrigatorio(b.inicio), R.hora(b.inicio)),
    fim: [...reg('fim', R.obrigatorio(b.fim), R.hora(b.fim)), R.horaDepois(b.fim, b.inicio, 'O fim do expediente deve ser depois do início.')],
    dias: [...parcial(b, 'folga', R.lista(b.folga)),
      R.se(Array.isArray(b.folga) && b.folga.some((d) => !DIAS_TXT.includes(d)), 'Dia de folga inválido.'),
      R.se(Array.isArray(b.folga) && new Set(b.folga).size >= 7, 'Selecione ao menos um dia de trabalho.')],
  });
}

app.post('/api/profissionais', requirePerm('equipe', 'criar'), wrap(async (req, res) => {
  const b = req.body || {}, id = b.id || randomUUID();
  const erro = erroProfissional(b, true);
  if (erro) return res.status(400).json(erro);
  if (await nomeDuplicado('profissionais', b.nome)) return res.status(409).json({ error: 'Já existe um profissional com esse nome.', campo: 'nome' });
  await tx(async (run) => {
    await run('INSERT INTO profissionais (id, estabelecimento_id, nome, apelido, cor, comissao_pct, contato, bio, meta_mensal, hora_inicio, hora_fim) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [id, EST, b.nome, b.apelido || null, b.cor || null, b.comissao || 0, b.contato || null, b.bio || null, b.meta || null, b.inicio || '09:00', b.fim || '19:00']);
    await setEsp(id, b.especialidades, run);
    await setFolga(id, b.folga, run);
  });
  res.json({ id });
}));
app.put('/api/profissionais/:id', requirePerm('equipe', 'editar'), wrap(async (req, res) => {
  const b = req.body || {};
  // fim depois do início: compara com o valor salvo quando só um dos dois veio
  if ((b.inicio === undefined) !== (b.fim === undefined)) {
    const cur = await q('SELECT hora_inicio, hora_fim FROM profissionais WHERE id=? AND estabelecimento_id=?', [req.params.id, EST]);
    if (cur[0]) { b.inicio ??= hhmm(cur[0].hora_inicio); b.fim ??= hhmm(cur[0].hora_fim); }
  }
  const erro = erroProfissional(b, false);
  if (erro) return res.status(400).json(erro);
  if (b.nome !== undefined && await nomeDuplicado('profissionais', b.nome, req.params.id)) {
    return res.status(409).json({ error: 'Já existe um profissional com esse nome.', campo: 'nome' });
  }
  await tx(async (run) => {
    await updateRow('profissionais', PROF_MAP, req.params.id, req.body, run);
    if (req.body.especialidades) await setEsp(req.params.id, req.body.especialidades, run);
    if (req.body.folga) await setFolga(req.params.id, req.body.folga, run);
  });
  res.json({ ok: true });
}));

// produtos
const PROD_MAP = { nome: 'nome', cat: 'categoria', qtd: 'quantidade', min: 'quantidade_minima', custo: 'custo', preco: 'preco_venda', imagem: 'imagem' };
function erroProduto(b, exigir) {
  const reg = (campo, ...r) => (exigir ? r : parcial(b, campo, ...r));
  return validar({
    nome: reg('nome', R.obrigatorio(b.nome), R.tamanho(b.nome, 2, 80)),
    cat: reg('cat', R.obrigatorio(b.cat, 'Escolha uma categoria.'), R.tamanho(b.cat, 2, 40)),
    qtd: reg('qtd', R.obrigatorio(b.qtd), R.numero(b.qtd, { min: 0, max: 100000, inteiro: true })),
    min: reg('min', R.obrigatorio(b.min), R.numero(b.min, { min: 0, max: 100000, inteiro: true })),
    custo: reg('custo', R.obrigatorio(b.custo), R.dinheiro(b.custo, { max: 100000 })),
    preco: [...parcial(b, 'preco', R.dinheiro(b.preco, { max: 100000 })),
      R.se(b.preco != null && b.custo != null && Number(b.preco) < Number(b.custo), 'O preço de venda não pode ser menor que o custo.')],
    fornecedor: parcial(b, 'fornecedor', R.tamanho(b.fornecedor, 0, 255)),
    // imagem: data URL de imagem até ~2 MB (base64 ≈ 2,8 MB) ou URL http(s)
    imagem: parcial(b, 'imagem',
      R.se(!!b.imagem && !/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(b.imagem) && !/^https?:\/\//i.test(b.imagem), 'Imagem inválida.'),
      R.se(!!b.imagem && String(b.imagem).length > 2_900_000, 'Imagem muito grande (máx. 2 MB).')),
  });
}

app.post('/api/produtos', requirePerm('estoque', 'criar'), wrap(async (req, res) => {
  const b = req.body || {}, id = b.id || randomUUID();
  const erro = erroProduto(b, true);
  if (erro) return res.status(400).json(erro);
  if (await nomeDuplicado('produtos', b.nome)) return res.status(409).json({ error: 'Já existe um produto com esse nome.', campo: 'nome' });
  await tx(async (run) => {
    const fid = await fornecedorId(b.fornecedor, run);
    await run('INSERT INTO produtos (id, estabelecimento_id, nome, categoria, quantidade, quantidade_minima, custo, preco_venda, fornecedor_id, imagem) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [id, EST, b.nome, b.cat, b.qtd || 0, b.min || 0, b.custo || 0, b.preco ?? null, fid, b.imagem || null]);
  });
  res.json({ id });
}));
app.put('/api/produtos/:id', requirePerm('estoque', 'editar'), wrap(async (req, res) => {
  const erro = erroProduto(req.body || {}, false);
  if (erro) return res.status(400).json(erro);
  if (req.body.nome !== undefined && await nomeDuplicado('produtos', req.body.nome, req.params.id)) {
    return res.status(409).json({ error: 'Já existe um produto com esse nome.', campo: 'nome' });
  }
  await tx(async (run) => {
    await updateRow('produtos', PROD_MAP, req.params.id, req.body, run);
    if (req.body.fornecedor !== undefined) {
      const fid = await fornecedorId(req.body.fornecedor, run);
      await run('UPDATE produtos SET fornecedor_id=? WHERE id=? AND estabelecimento_id=?', [fid, req.params.id, EST]);
    }
  });
  res.json({ ok: true });
}));

// campanhas
const CAMP_MAP = { nome: 'nome', tipo: 'tipo', alvo: 'alvo', cor: 'cor', status: 'status' };
const STATUS_CAMP = ['rascunho', 'agendada', 'ativa', 'encerrada'];
function erroCampanha(b, exigir) {
  const reg = (campo, ...r) => (exigir ? r : parcial(b, campo, ...r));
  return validar({
    nome: reg('nome', R.obrigatorio(b.nome), R.tamanho(b.nome, 3, 80)),
    tipo: reg('tipo', R.obrigatorio(b.tipo), R.umDe(b.tipo, ['retorno', 'aniversario', 'promo'], 'Tipo de campanha inválido.')),
    alvo: reg('alvo', R.obrigatorio(b.alvo, 'Escolha o segmento de clientes.'), R.tamanho(b.alvo, 2, 120)),
    status: parcial(b, 'status', R.umDe(b.status, STATUS_CAMP, 'Status inválido.')),
  });
}
app.post('/api/campanhas', requirePerm('fidelidade', 'criar'), wrap(async (req, res) => {
  const b = req.body || {}, id = b.id || randomUUID();
  const erro = erroCampanha(b, true);
  if (erro) return res.status(400).json(erro);
  await q('INSERT INTO campanhas (id, estabelecimento_id, nome, tipo, alvo, cor, status) VALUES (?,?,?,?,?,?,?)',
    [id, EST, b.nome, b.tipo, b.alvo, b.cor || null, b.status || 'rascunho']);
  res.json({ id });
}));
app.put('/api/campanhas/:id', requirePerm('fidelidade', 'editar'), wrap(async (req, res) => {
  const erro = erroCampanha(req.body || {}, false);
  if (erro) return res.status(400).json(erro);
  await updateRow('campanhas', CAMP_MAP, req.params.id, req.body);
  res.json({ ok: true });
}));

// modelos de mensagem
const MODELO_MAP = { nome: 'nome', desc: 'descricao', cat: 'categoria', gatilho: 'gatilho', canal: 'canal', assunto: 'assunto', texto: 'texto', status: 'status' };
function erroModelo(b, exigir) {
  const reg = (campo, ...r) => (exigir ? r : parcial(b, campo, ...r));
  const texto = String(b.texto ?? '');
  return validar({
    nome: reg('nome', R.obrigatorio(b.nome), R.tamanho(b.nome, 3, 80)),
    desc: parcial(b, 'desc', R.tamanho(b.desc, 0, 255)),
    gatilho: reg('gatilho', R.obrigatorio(b.gatilho, 'Gatilho obrigatório.'), R.tamanho(b.gatilho, 2, 60)),
    canal: reg('canal', R.obrigatorio(b.canal, 'Canal obrigatório.'), R.umDe(b.canal, ['whatsapp', 'email', 'sms', 'app'], 'Canal inválido.')),
    texto: [...reg('texto', R.obrigatorio(b.texto, 'Conteúdo obrigatório.'), R.tamanho(b.texto, 10, 1000)),
      R.se(b.canal === 'sms' && texto.length > 160, 'SMS aceita até 160 caracteres.')],
    assunto: [R.se(b.canal === 'email' && vazioStr(b.assunto), 'Assunto obrigatório para e-mail.'), ...parcial(b, 'assunto', R.tamanho(b.assunto, 0, 120))],
    status: parcial(b, 'status', R.umDe(b.status, ['ativo', 'inativo', 'rascunho'], 'Status inválido.')),
  });
}
app.post('/api/modelos', requirePerm('fidelidade', 'criar'), wrap(async (req, res) => {
  const b = req.body || {}, id = b.id || randomUUID();
  const erro = erroModelo(b, true);
  if (erro) return res.status(400).json(erro);
  await q('INSERT INTO modelos_mensagem (id, estabelecimento_id, nome, descricao, categoria, gatilho, canal, assunto, texto, status) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [id, EST, b.nome, b.desc || null, b.cat || null, b.gatilho || '', b.canal || 'whatsapp', b.assunto || null, b.texto || '', b.status || 'ativo']);
  res.json({ id });
}));
app.put('/api/modelos/:id', requirePerm('fidelidade', 'editar'), wrap(async (req, res) => {
  const erro = erroModelo(req.body || {}, false);
  if (erro) return res.status(400).json(erro);
  await updateRow('modelos_mensagem', MODELO_MAP, req.params.id, req.body);
  res.json({ ok: true });
}));

// clientes
const CLIENTE_MAP = { nome: 'nome', wpp: 'whatsapp', email: 'email', nasc: 'nascimento', obs: 'observacoes', fav: 'profissional_favorito_id' };
function erroCliente(b, exigir) {
  const reg = (campo, ...r) => (exigir ? r : parcial(b, campo, ...r));
  return validar({
    nome: reg('nome', R.obrigatorio(b.nome), R.tamanho(b.nome, 3, 100)),
    wpp: reg('wpp', R.obrigatorio(b.wpp, 'Informe o WhatsApp.'), R.telefone(b.wpp)),
    email: parcial(b, 'email', R.email(b.email), R.tamanho(b.email, 0, 255)),
    nasc: parcial(b, 'nasc', R.nascimento(b.nasc)),
    obs: parcial(b, 'obs', R.tamanho(b.obs, 0, 1000)),
  });
}
// WhatsApp/e-mail únicos por estabelecimento (compara só os dígitos do telefone)
async function clienteDuplicado(b, exceptId = null) {
  const d = String(b.wpp ?? '').replace(/\D/g, '');
  if (d.length >= 10) {
    const r = await q(`SELECT id FROM clientes WHERE estabelecimento_id=? AND REGEXP_REPLACE(whatsapp, '[^0-9]', '')=? AND (? IS NULL OR id<>?) LIMIT 1`,
      [EST, d, exceptId, exceptId]);
    if (r.length) return { error: 'Já existe um cliente com esse WhatsApp.', campo: 'wpp' };
  }
  if (!vazioStr(b.email)) {
    const r = await q('SELECT id FROM clientes WHERE estabelecimento_id=? AND LOWER(email)=LOWER(?) AND (? IS NULL OR id<>?) LIMIT 1',
      [EST, String(b.email).trim(), exceptId, exceptId]);
    if (r.length) return { error: 'Já existe um cliente com esse e-mail.', campo: 'email' };
  }
  return null;
}
app.post('/api/clientes', requirePerm('clientes', 'criar'), wrap(async (req, res) => {
  const b = req.body || {}, id = b.id || randomUUID();
  const erro = erroCliente(b, true) || await clienteDuplicado(b);
  if (erro) return res.status(erro.campo && /Já existe/.test(erro.error) ? 409 : 400).json(erro);
  await tx(async (run) => {
    await run('INSERT INTO clientes (id, estabelecimento_id, nome, whatsapp, email, nascimento, observacoes, profissional_favorito_id) VALUES (?,?,?,?,?,?,?,?)',
      [id, EST, b.nome, b.wpp || null, b.email || null, b.nasc || null, b.obs || null, b.fav || null]);
    await setTags(id, b.tags, run);
  });
  res.json({ id });
}));
app.put('/api/clientes/:id', requirePerm('clientes', 'editar'), wrap(async (req, res) => {
  const b = req.body || {};
  const erro = erroCliente(b, false) || await clienteDuplicado(b, req.params.id);
  if (erro) return res.status(/Já existe/.test(erro.error) ? 409 : 400).json(erro);
  await tx(async (run) => {
    await updateRow('clientes', CLIENTE_MAP, req.params.id, req.body, run);
    if (req.body.tags) await setTags(req.params.id, req.body.tags, run);
  });
  res.json({ ok: true });
}));

// estabelecimento (tela Configurações › Estabelecimento)
const ESTAB_MAP = { nome: 'nome', tipo: 'tipo_negocio', doc: 'documento', tel: 'telefone', end: 'endereco', cidade: 'cidade', cep: 'cep', desc: 'descricao', instagram: 'instagram', google: 'google_perfil', site: 'site' };
app.put('/api/estabelecimento', requirePerm('config', 'editar'), wrap(async (req, res) => {
  const b = req.body || {};
  const insta = String(b.instagram ?? '').trim().replace(/^@/, '');
  const erro = validar({
    nome: parcial(b, 'nome', R.obrigatorio(b.nome), R.tamanho(b.nome, 2, 100)),
    tipo: parcial(b, 'tipo', R.obrigatorio(b.tipo), R.tamanho(b.tipo, 2, 60)),
    doc: parcial(b, 'doc', R.cpfCnpj(b.doc)),
    tel: parcial(b, 'tel', R.obrigatorio(b.tel, 'Informe o telefone.'), R.telefone(b.tel)),
    end: parcial(b, 'end', R.tamanho(b.end, 0, 255)),
    cidade: parcial(b, 'cidade', R.tamanho(b.cidade, 0, 80)),
    cep: parcial(b, 'cep', R.cep(b.cep)),
    desc: parcial(b, 'desc', R.tamanho(b.desc, 0, 500)),
    instagram: [R.se(!!insta && !/^[A-Za-z0-9._]{1,30}$/.test(insta), 'Use só o @ do perfil.')],
    google: parcial(b, 'google', R.url(b.google)),
    site: parcial(b, 'site', R.url(b.site)),
  });
  if (erro) return res.status(400).json(erro);
  if (b.instagram !== undefined) b.instagram = insta;
  await updateRow('estabelecimentos', ESTAB_MAP, EST, b);
  res.json({ ok: true });
}));

// horários de funcionamento (tela Configurações › Horários)
app.put('/api/horarios', requirePerm('config', 'editar'), wrap(async (req, res) => {
  const dias = req.body?.dias;
  if (!Array.isArray(dias) || !dias.length) return res.status(400).json({ error: 'Envie os horários dos dias da semana.' });
  for (const d of dias) {
    const n = Number(d.diaSemana);
    const erro = validar({
      dias: [R.se(!Number.isInteger(n) || n < 0 || n > 6, 'Dia da semana inválido.'),
        ...(d.aberto ? [R.obrigatorio(d.inicio, 'Informe a abertura.'), R.hora(d.inicio),
          R.obrigatorio(d.fim, 'Informe o fechamento.'), R.hora(d.fim),
          R.horaDepois(d.fim, d.inicio, 'O fechamento deve ser depois da abertura.')] : []),
        R.hora(d.pausaInicio), R.hora(d.pausaFim),
        R.se(!!d.pausaInicio !== !!d.pausaFim, 'Informe início e fim da pausa.'),
        R.horaDepois(d.pausaFim, d.pausaInicio, 'O fim da pausa deve ser depois do início.'),
        R.se(!!d.aberto && !!d.pausaInicio && !!d.pausaFim && (d.pausaInicio < d.inicio || d.pausaFim > d.fim),
          'A pausa precisa ficar dentro do horário de funcionamento.')],
    });
    if (erro) return res.status(400).json(erro);
  }
  if (!dias.some((d) => d.aberto)) return res.status(400).json({ error: 'Deixe ao menos um dia aberto.' });
  await tx(async (run) => {
    for (const d of dias) {
      await run(`INSERT INTO estabelecimento_horarios (estabelecimento_id, dia_semana, aberto, hora_inicio, hora_fim, pausa_inicio, pausa_fim)
               VALUES (?,?,?,?,?,?,?)
               ON DUPLICATE KEY UPDATE aberto=VALUES(aberto), hora_inicio=VALUES(hora_inicio),
                 hora_fim=VALUES(hora_fim), pausa_inicio=VALUES(pausa_inicio), pausa_fim=VALUES(pausa_fim)`,
        [EST, d.diaSemana, d.aberto ? 1 : 0, d.inicio, d.fim, d.pausaInicio || null, d.pausaFim || null]);
    }
  });
  res.json({ ok: true });
}));

// políticas de agenda (Configurações › Agenda) — grava colunas do estabelecimento
app.put('/api/config/agenda', requirePerm('config', 'editar'), wrap(async (req, res) => {
  const b = req.body || {};
  const erro = validar({
    antecedenciaAgendamento: parcial(b, 'antecedenciaAgendamento', R.numero(b.antecedenciaAgendamento, { min: 0, max: 720 })),
    antecedenciaCancelamento: parcial(b, 'antecedenciaCancelamento', R.numero(b.antecedenciaCancelamento, { min: 0, max: 720 })),
    sinalPct: parcial(b, 'sinalPct', R.numero(b.sinalPct, { min: 0, max: 100, inteiro: true })),
  });
  if (erro) return res.status(400).json(erro);
  const sets = [], vals = [];
  const add = (col, v) => { sets.push(`${col}=?`); vals.push(v); };
  if (b.antecedenciaAgendamento !== undefined) add('antecedencia_min_agendamento_horas', Math.max(0, Number(b.antecedenciaAgendamento) || 0));
  if (b.antecedenciaCancelamento !== undefined) add('antecedencia_min_cancelamento_horas', Math.max(0, Number(b.antecedenciaCancelamento) || 0));
  if (b.sinalPct !== undefined) {
    const pct = Math.min(100, Math.max(0, Number(b.sinalPct) || 0));
    add('exige_sinal_padrao', pct > 0 ? 1 : 0);
    add('sinal_tipo', 'percentual');
    add('sinal_valor', pct);
  }
  if (!sets.length) return res.json({ ok: true });
  vals.push(EST);
  await q(`UPDATE estabelecimentos SET ${sets.join(', ')} WHERE id=?`, vals);
  res.json({ ok: true });
}));

// formas de pagamento, chave Pix e taxa de cartão (Configurações › Pagamentos)
app.put('/api/config/pagamentos', requirePerm('config', 'editar'), wrap(async (req, res) => {
  const b = req.body || {};
  const chave = String(b.pixChave ?? '').trim();
  const regraChave = {
    'CPF/CNPJ': R.cpfCnpj(chave), Telefone: R.telefone(chave), 'E-mail': R.email(chave),
    'Chave aleatória': !chave || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chave) ? null : 'Chave aleatória inválida.',
  }[b.pixTipo] ?? null;
  const metodos = ['aceitaPix', 'aceitaDebito', 'aceitaCredito', 'aceitaDinheiro', 'aceitaFiado'];
  const erro = validar({
    dias: [R.se(metodos.every((m) => b[m] !== undefined) && !metodos.some((m) => b[m]), 'Mantenha ao menos uma forma de pagamento ativa.')],
    pixTipo: parcial(b, 'pixTipo', R.umDe(b.pixTipo, ['CPF/CNPJ', 'Telefone', 'E-mail', 'Chave aleatória'], 'Tipo de chave Pix inválido.')),
    pixChave: [b.aceitaPix ? R.obrigatorio(chave, 'Informe a chave Pix.') : null, regraChave],
    pixNome: [b.aceitaPix ? R.obrigatorio(b.pixNome, 'Informe o nome exibido no Pix.') : null, ...parcial(b, 'pixNome', R.tamanho(b.pixNome, 0, 25))],
    taxaPct: parcial(b, 'taxaPct', R.numero(b.taxaPct, { min: 0, max: 10 })),
  });
  if (erro) return res.status(400).json(erro);
  const sets = [], vals = [];
  const add = (col, v) => { sets.push(`${col}=?`); vals.push(v); };
  const bool = (col, v) => { if (v !== undefined) add(col, v ? 1 : 0); };
  bool('aceita_pix', b.aceitaPix);
  bool('aceita_debito', b.aceitaDebito);
  bool('aceita_credito', b.aceitaCredito);
  bool('aceita_dinheiro', b.aceitaDinheiro);
  bool('aceita_fiado', b.aceitaFiado);
  if (b.pixTipo !== undefined) add('pix_tipo', b.pixTipo || null);
  if (b.pixChave !== undefined) add('pix_chave', b.pixChave || null);
  if (b.pixNome !== undefined) add('pix_nome', b.pixNome || null);
  bool('repassa_taxa_cartao', b.repassaTaxa);
  if (b.taxaPct !== undefined) add('taxa_cartao_pct', Math.min(100, Math.max(0, Number(b.taxaPct) || 0)));
  if (!sets.length) return res.json({ ok: true });
  vals.push(EST);
  await q(`UPDATE estabelecimentos SET ${sets.join(', ')} WHERE id=?`, vals);
  res.json({ ok: true });
}));

// conta do usuário logado (Configurações › Conta) — self-service, sem gate de gestão
app.put('/api/conta', wrap(async (req, res) => {
  const { nome, email, senha } = req.body || {};
  const rows = await q('SELECT * FROM usuarios WHERE id=? AND estabelecimento_id=? LIMIT 1', [req.auth.sub, EST]);
  const u = rows[0];
  if (!u) return res.status(404).json({ error: 'Usuário não encontrado.' });
  const novoNome = nome != null ? String(nome).trim() : u.nome;
  const novoEmail = email != null ? String(email).trim() : u.email;
  const erroConta = validar({
    nome: [R.obrigatorio(novoNome), R.tamanho(novoNome, 3, 100)],
    // login é e-mail ou nome de usuário sem espaços (ex.: 'admin')
    email: [R.obrigatorio(novoEmail), novoEmail.includes('@') ? R.email(novoEmail)
      : R.se(!LOGIN_RE.test(novoEmail), 'Use ao menos 3 caracteres, sem espaços.')],
  });
  if (erroConta) return res.status(400).json(erroConta);
  // trocar o e-mail exige confirmação da senha atual
  if (novoEmail.toLowerCase() !== String(u.email).toLowerCase()) {
    if (!senha || !(await verifyPassword(senha, u.senha_hash))) {
      return res.status(401).json({ error: 'Senha atual incorreta.' });
    }
    const dup = await q('SELECT id FROM usuarios WHERE estabelecimento_id=? AND LOWER(email)=LOWER(?) AND id<>? LIMIT 1', [EST, novoEmail, u.id]);
    if (dup.length) return res.status(409).json({ error: 'Já existe um usuário com esse e-mail.' });
  }
  await q('UPDATE usuarios SET nome=?, email=? WHERE id=? AND estabelecimento_id=?', [novoNome, novoEmail, u.id, EST]);
  res.json({ ok: true });
}));

// troca de senha do usuário logado (verifica a senha atual antes de gravar)
app.put('/api/senha', wrap(async (req, res) => {
  const { atual, nova } = req.body || {};
  const erroSenha = R.obrigatorio(nova, 'Informe a nova senha.') || R.senha(nova);
  if (erroSenha) return res.status(400).json({ error: erroSenha, campo: 'nova' });
  const rows = await q('SELECT * FROM usuarios WHERE id=? AND estabelecimento_id=? LIMIT 1', [req.auth.sub, EST]);
  const u = rows[0];
  if (!u) return res.status(404).json({ error: 'Usuário não encontrado.' });
  if (!atual || !(await verifyPassword(atual, u.senha_hash))) return res.status(401).json({ error: 'Senha atual incorreta.' });
  await q('UPDATE usuarios SET senha_hash=? WHERE id=? AND estabelecimento_id=?', [await hashPassword(nova), u.id, EST]);
  res.json({ ok: true });
}));

// ============================================================
// Usuários e Permissões (Configurações › Usuários e Permissões)
// Hierarquia (todas as rotas abaixo exigem nível master ou ceo):
//   master → vê, cria, edita e exclui QUALQUER conta (inclusive CEOs).
//   ceo    → vê só a própria conta e as contas de nível 'usuario' que ELE criou
//            (usuarios.criado_por). Não vê o master nem outros CEOs, e só cria
//            contas de nível 'usuario'.
// Ninguém gerencia a própria conta por aqui (use Minha conta), e o nível
// master não é atribuível: existe uma única conta master (api/criar-master.mjs).
// ============================================================

// Login aceita e-mail ou nome de usuário (ex.: 'admin'); só não pode ter espaços.
const LOGIN_RE = /^\S{3,255}$/;
const PAPEIS = Object.keys(PAPEL_LABEL);
// Criadas pelo CEO da sessão e ainda de nível 'usuario' (se o master promover a CEO, some da vista dele).
const criadaPorMim = (req, u) => u.criado_por === req.auth.sub && u.nivel === 'usuario';
// O que a sessão enxerga. Fora disso, a conta responde como inexistente (404).
const visivel = (req, u) => req.authz.nivel === 'master' || u.id === req.auth.sub || criadaPorMim(req, u);
const podeGerenciar = (req, alvo) =>
  alvo.id !== req.auth.sub && (req.authz.nivel === 'master' || criadaPorMim(req, alvo));
const niveisAtribuiveis = (req) => (req.authz.nivel === 'master' ? ['ceo', 'usuario'] : ['usuario']);
const usuarioDTO = (u, req) => ({
  id: u.id, nome: u.nome, email: u.email,
  papel: PAPEL_LABEL[u.papel] || u.papel, papelCod: u.papel,
  nivel: u.nivel, ativo: !!u.ativo,
  criadoEm: u.criado_em, ultimoAcesso: u.ultimo_acesso,
  // autor só é exibido ao master (o CEO só vê as contas que ele mesmo criou)
  criadoPor: req.authz.nivel === 'master' ? (u.criado_por_nome || null) : undefined,
  gerenciavel: podeGerenciar(req, u),
});
async function loginEmUso(login, exceptId = null) {
  const r = await q('SELECT id FROM usuarios WHERE estabelecimento_id=? AND LOWER(email)=LOWER(?) AND (? IS NULL OR id<>?) LIMIT 1',
    [EST, login, exceptId, exceptId]);
  return r.length > 0;
}
async function gravarPermissoes(run, id, perms) {
  await run('DELETE FROM usuario_permissoes WHERE usuario_id=?', [id]);
  for (const p of perms) {
    const [modulo, acao] = p.split(':');
    await run('INSERT INTO usuario_permissoes (usuario_id, modulo, acao) VALUES (?,?,?)', [id, modulo, acao]);
  }
}
// Carrega a conta-alvo e aplica a hierarquia (quem pode mexer em quem).
// Conta fora da vista da sessão responde 404, sem revelar que existe.
async function alvoGerenciavel(req, res) {
  const rows = await q('SELECT * FROM usuarios WHERE id=? AND estabelecimento_id=? LIMIT 1', [req.params.id, EST]);
  const alvo = rows[0];
  if (!alvo || !visivel(req, alvo)) { res.status(404).json({ error: 'Usuário não encontrado.' }); return null; }
  if (alvo.id === req.auth.sub) { res.status(403).json({ error: 'Sua própria conta é editada em "Minha conta".' }); return null; }
  if (!podeGerenciar(req, alvo)) { res.status(403).json({ error: 'Você não pode alterar esta conta.' }); return null; }
  return alvo;
}
const nivelValido = (req, n) => niveisAtribuiveis(req).includes(n);

// catálogo de módulos/ações (para montar a matriz na UI)
app.get('/api/permissoes/catalogo', gestorOnly, wrap(async (_req, res) => {
  res.json({ catalogo: CATALOGO, acoes: ACOES });
}));

// lista as contas que a sessão pode ver (master: todas; CEO: a própria + as que criou)
app.get('/api/usuarios', gestorOnly, wrap(async (req, res) => {
  const rows = await q(
    `SELECT u.id, u.nome, u.email, u.papel, u.nivel, u.criado_por, u.ativo, u.criado_em, u.ultimo_acesso,
            c.nome AS criado_por_nome
       FROM usuarios u LEFT JOIN usuarios c ON c.id = u.criado_por
      WHERE u.estabelecimento_id=? ORDER BY FIELD(u.nivel,'master','ceo','usuario'), u.nome ASC`, [EST]);
  res.json({
    usuarios: rows.filter((u) => visivel(req, u)).map((u) => usuarioDTO(u, req)),
    papeis: PAPEIS.map((p) => ({ value: p, label: PAPEL_LABEL[p] })),
    niveis: niveisAtribuiveis(req).map((n) => ({ value: n, label: NIVEL_LABEL[n] })),
  });
}));

// cria uma conta (já com o nível e as permissões escolhidas)
app.post('/api/usuarios', gestorOnly, wrap(async (req, res) => {
  const b = req.body || {};
  const nome = String(b.nome || '').trim();
  const login = String(b.email || '').trim();
  const senha = String(b.senha || '');
  const papel = PAPEIS.includes(b.papel) ? b.papel : 'profissional';
  const nivel = b.nivel === undefined ? 'usuario' : b.nivel;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório.' });
  if (!LOGIN_RE.test(login)) return res.status(400).json({ error: 'Informe um e-mail ou usuário (mín. 3 caracteres, sem espaços).' });
  const erroSenha = R.obrigatorio(senha, 'Defina a senha inicial.') || R.senha(senha);
  if (erroSenha) return res.status(400).json({ error: erroSenha, campo: 'senha' });
  if (nome.length < 3 || nome.length > 100) return res.status(400).json({ error: 'O nome deve ter entre 3 e 100 caracteres.', campo: 'nome' });
  if (!nivelValido(req, nivel)) return res.status(400).json({ error: 'Nível inválido.' });
  if (await loginEmUso(login)) return res.status(409).json({ error: 'Já existe uma conta com esse e-mail/usuário.' });

  const id = randomUUID();
  const perms = nivel === 'usuario' ? sanitizePermissoes(b.permissoes) : [];
  const hash = await hashPassword(senha);
  await tx(async (run) => {
    await run('INSERT INTO usuarios (id, estabelecimento_id, nome, email, senha_hash, papel, nivel, criado_por, ativo) VALUES (?,?,?,?,?,?,?,?,?)',
      [id, EST, nome, login, hash, papel, nivel, req.auth.sub, b.ativo === false ? 0 : 1]);
    await gravarPermissoes(run, id, perms);
  });
  const rows = await q('SELECT * FROM usuarios WHERE id=?', [id]);
  res.status(201).json({ usuario: usuarioDTO(rows[0], req), permissoes: perms });
}));

// edita nome, login, perfil, nível e status de uma conta
app.put('/api/usuarios/:id', gestorOnly, wrap(async (req, res) => {
  const alvo = await alvoGerenciavel(req, res);
  if (!alvo) return;
  const b = req.body || {};
  const nome = b.nome !== undefined ? String(b.nome).trim() : alvo.nome;
  const login = b.email !== undefined ? String(b.email).trim() : alvo.email;
  const papel = b.papel !== undefined ? b.papel : alvo.papel;
  const nivel = b.nivel !== undefined ? b.nivel : alvo.nivel;
  const ativo = b.ativo !== undefined ? (b.ativo ? 1 : 0) : alvo.ativo;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório.' });
  if (!LOGIN_RE.test(login)) return res.status(400).json({ error: 'Informe um e-mail ou usuário (mín. 3 caracteres, sem espaços).' });
  if (!PAPEIS.includes(papel)) return res.status(400).json({ error: 'Perfil inválido.' });
  if (nivel !== alvo.nivel && !nivelValido(req, nivel)) return res.status(400).json({ error: 'Nível inválido.' });
  if (await loginEmUso(login, alvo.id)) return res.status(409).json({ error: 'Já existe uma conta com esse e-mail/usuário.' });
  await tx(async (run) => {
    await run('UPDATE usuarios SET nome=?, email=?, papel=?, nivel=?, ativo=? WHERE id=? AND estabelecimento_id=?',
      [nome, login, papel, nivel, ativo, alvo.id, EST]);
    // virou CEO: acesso total, as permissões granulares deixam de valer
    if (nivel !== 'usuario') await run('DELETE FROM usuario_permissoes WHERE usuario_id=?', [alvo.id]);
  });
  const rows = await q('SELECT * FROM usuarios WHERE id=?', [alvo.id]);
  res.json({ usuario: usuarioDTO(rows[0], req) });
}));

// redefine a senha de uma conta (quem gerencia não precisa saber a senha antiga)
app.put('/api/usuarios/:id/senha', gestorOnly, wrap(async (req, res) => {
  const alvo = await alvoGerenciavel(req, res);
  if (!alvo) return;
  const nova = String(req.body?.nova || '');
  const erroSenha = R.obrigatorio(nova, 'Informe a nova senha.') || R.senha(nova);
  if (erroSenha) return res.status(400).json({ error: erroSenha, campo: 'nova' });
  await q('UPDATE usuarios SET senha_hash=? WHERE id=? AND estabelecimento_id=?', [await hashPassword(nova), alvo.id, EST]);
  res.json({ ok: true });
}));

// exclui uma conta. Quem já operou o caixa fica no histórico: nesse caso, desative.
app.delete('/api/usuarios/:id', gestorOnly, wrap(async (req, res) => {
  const alvo = await alvoGerenciavel(req, res);
  if (!alvo) return;
  const uso = await q('SELECT COUNT(*) c FROM caixas WHERE operador_id=?', [alvo.id]);
  if (Number(uso[0].c) > 0) {
    return res.status(409).json({ error: 'Esta conta já operou o caixa e faz parte do histórico. Desative-a em vez de excluir.' });
  }
  await q('DELETE FROM usuarios WHERE id=? AND estabelecimento_id=?', [alvo.id, EST]);   // permissões saem em cascata
  res.json({ ok: true });
}));

// permissões atuais de uma conta
app.get('/api/usuarios/:id/permissoes', gestorOnly, wrap(async (req, res) => {
  const rows = await q('SELECT id, nivel, criado_por FROM usuarios WHERE id=? AND estabelecimento_id=? LIMIT 1', [req.params.id, EST]);
  if (!rows[0] || !visivel(req, rows[0])) return res.status(404).json({ error: 'Usuário não encontrado.' });
  res.json({ permissoes: await permissoesDe(req.params.id), nivel: rows[0].nivel });
}));

// grava as permissões (e opcionalmente o status ativo) de uma conta de nível 'usuario'
app.put('/api/usuarios/:id/permissoes', gestorOnly, wrap(async (req, res) => {
  const alvo = await alvoGerenciavel(req, res);
  if (!alvo) return;
  const id = alvo.id;
  if (alvo.nivel !== 'usuario' && (req.body?.permissoes || []).length) {
    return res.status(400).json({ error: 'Esta conta tem acesso total; permissões não se aplicam.' });
  }

  const perms = alvo.nivel === 'usuario' ? sanitizePermissoes(req.body?.permissoes) : [];
  await tx(async (run) => {
    await gravarPermissoes(run, id, perms);
    if (req.body?.ativo !== undefined) {
      await run('UPDATE usuarios SET ativo=? WHERE id=? AND estabelecimento_id=?', [req.body.ativo ? 1 : 0, id, EST]);
    }
  });
  res.json({ ok: true, permissoes: perms });
}));

// ------------------------------------------------------------
// Bloqueios de agenda (almoço, folga pontual, manutenção, etc.)
// ------------------------------------------------------------
// Verifica conflito com bloqueios existentes ou agendamentos ativos
// no mesmo profissional/dia. Retorna { ok: true } ou { ok: false, motivo }.
async function conflitoBloqueio({ id, prof, data, ini, fim, tipo, motivo }) {
  if (!data || !ini || !fim) return { ok: false, motivo: 'Período inválido.' };
  const erro = validar({
    data: [R.data(data)], ini: [R.hora(ini)], hora: [R.hora(fim)],
    tipo: [R.umDe(tipo, ['almoco', 'folga', 'manutencao', 'evento', 'outro'], 'Tipo de bloqueio inválido.')],
    motivo: [R.tamanho(motivo, 0, 255)],
  });
  if (erro) return { ok: false, motivo: erro.error };
  if (String(ini) >= String(fim)) return { ok: false, motivo: 'Hora final deve ser posterior à inicial.' };

  // outros bloqueios (mesmo profissional OU bloqueio geral do salão)
  const blQuery = `
    SELECT id, hora_inicio, hora_fim, motivo FROM bloqueios_agenda
    WHERE estabelecimento_id=? AND data=?
      AND (profissional_id <=> ? OR profissional_id IS NULL OR ? IS NULL)
      AND (? IS NULL OR id <> ?)
      AND hora_inicio < ? AND hora_fim > ?`;
  const outros = await q(blQuery, [EST, data, prof || null, prof || null, id || null, id || null, fim, ini]);
  if (outros.length) return { ok: false, motivo: 'Já existe outro bloqueio nesse período.' };

  // agendamentos ativos que colidem
  const ags = await q(
    `SELECT id, hora_inicio, duracao_min FROM agendamentos
      WHERE estabelecimento_id=? AND data=?
        AND status IN ('pendente','confirmado','atendimento')
        AND (? IS NULL OR profissional_id=?)`,
    [EST, data, prof || null, prof || null],
  );
  const iniMin = toMin(ini), fimMin = toMin(fim);
  for (const a of ags) {
    const aIni = toMin(hhmm(a.hora_inicio));
    const aFim = aIni + Number(a.duracao_min || 0);
    if (aIni < fimMin && aFim > iniMin) {
      return { ok: false, motivo: 'Já existe um agendamento nesse intervalo.' };
    }
  }
  return { ok: true };
}

// criar bloqueio
app.post('/api/bloqueios', requirePerm('agenda', 'editar'), wrap(async (req, res) => {
  const b = req.body || {};
  const id = b.id || randomUUID();
  const check = await conflitoBloqueio({ id: null, prof: b.prof || null, data: b.data, ini: b.ini, fim: b.fim, tipo: b.tipo, motivo: b.motivo });
  if (!check.ok) return res.status(409).json({ error: check.motivo });
  await q(
    `INSERT INTO bloqueios_agenda (id, estabelecimento_id, profissional_id, data, hora_inicio, hora_fim, tipo, motivo)
     VALUES (?,?,?,?,?,?,?,?)`,
    [id, EST, b.prof || null, b.data, b.ini, b.fim, b.tipo || 'outro', b.motivo || null],
  );
  res.json({ id });
}));

// atualizar bloqueio
app.put('/api/bloqueios/:id', requirePerm('agenda', 'editar'), wrap(async (req, res) => {
  const id = req.params.id;
  const rows = await q('SELECT * FROM bloqueios_agenda WHERE id=? AND estabelecimento_id=?', [id, EST]);
  if (!rows[0]) return res.status(404).json({ error: 'Bloqueio não encontrado.' });
  const cur = rows[0];
  const b = req.body || {};
  const next = {
    prof: b.prof === undefined ? cur.profissional_id : (b.prof || null),
    data: b.data === undefined ? cur.data : b.data,
    ini:  b.ini  === undefined ? hhmm(cur.hora_inicio) : b.ini,
    fim:  b.fim  === undefined ? hhmm(cur.hora_fim)    : b.fim,
    tipo: b.tipo === undefined ? cur.tipo   : b.tipo,
    motivo: b.motivo === undefined ? cur.motivo : (b.motivo || null),
  };
  const check = await conflitoBloqueio({ id, prof: next.prof, data: next.data, ini: next.ini, fim: next.fim, tipo: next.tipo, motivo: next.motivo });
  if (!check.ok) return res.status(409).json({ error: check.motivo });
  await q(
    `UPDATE bloqueios_agenda SET profissional_id=?, data=?, hora_inicio=?, hora_fim=?, tipo=?, motivo=? WHERE id=?`,
    [next.prof, next.data, next.ini, next.fim, next.tipo, next.motivo, id],
  );
  res.json({ ok: true });
}));

// excluir bloqueio
app.delete('/api/bloqueios/:id', requirePerm('agenda', 'excluir'), wrap(async (req, res) => {
  await q('DELETE FROM bloqueios_agenda WHERE id=? AND estabelecimento_id=?', [req.params.id, EST]);
  res.json({ ok: true });
}));

// movimentação de estoque (+ ajusta quantidade do produto)
app.post('/api/movimentacoes', requirePerm('estoque', 'criar'), wrap(async (req, res) => {
  const b = req.body || {}, id = b.id || randomUUID();
  const erroMov = validar({
    prod: [R.obrigatorio(b.prod, 'Selecione o produto.')],
    tipo: [R.obrigatorio(b.tipo), R.umDe(b.tipo, ['entrada', 'saida'], 'Tipo deve ser entrada ou saída.')],
    qtd: [R.obrigatorio(b.qtd), R.numero(b.qtd, { min: 1, max: 10000, inteiro: true })],
    motivo: [R.tamanho(b.motivo, 0, 120)],
  });
  if (erroMov) return res.status(400).json(erroMov);
  const prod = await q('SELECT quantidade FROM produtos WHERE id=? AND estabelecimento_id=?', [b.prod, EST]);
  if (!prod.length) return res.status(400).json({ error: 'Produto não encontrado.' });
  if (b.tipo === 'saida' && Number(b.qtd) > Number(prod[0].quantidade)) {
    return res.status(400).json({ error: `Quantidade maior que o estoque disponível (${prod[0].quantidade} un).`, campo: 'qtd' });
  }
  await tx(async (run) => {
    await run('INSERT INTO movimentacoes_estoque (id, produto_id, tipo, quantidade, motivo) VALUES (?,?,?,?,?)',
      [id, b.prod, b.tipo, b.qtd, b.motivo || null]);
    const delta = b.tipo === 'entrada' ? b.qtd : -b.qtd;
    await run('UPDATE produtos SET quantidade = GREATEST(0, quantidade + ?) WHERE id=? AND estabelecimento_id=?', [delta, b.prod, EST]);
  });
  res.json({ id });
}));

// ---------- helpers de escrita ----------
async function updateRow(table, map, id, body, run = q) {
  const sets = [], vals = [];
  for (const [k, col] of Object.entries(map)) {
    if (body[k] === undefined) continue;
    let v = body[k];
    if (['combo', 'exige_sinal', 'sinal_pago'].includes(col)) v = v ? 1 : 0;
    sets.push(`${col}=?`); vals.push(v);
  }
  if (!sets.length) return;
  vals.push(id);
  // Escopo multi-tenant: não permite editar registro de outro estabelecimento.
  // A tabela `estabelecimentos` é a própria conta (não tem coluna estabelecimento_id).
  let where = 'id=?';
  if (table !== 'estabelecimentos') { where += ' AND estabelecimento_id=?'; vals.push(EST); }
  await run(`UPDATE ${table} SET ${sets.join(', ')} WHERE ${where}`, vals);
}
async function setExec(servicoId, execs, run = q) {
  if (!Array.isArray(execs)) return;
  await run('DELETE FROM servico_profissionais WHERE servico_id=?', [servicoId]);
  for (const pid of execs) await run('INSERT INTO servico_profissionais (servico_id, profissional_id) VALUES (?,?)', [servicoId, pid]);
}
async function setEsp(profId, esps, run = q) {
  if (!Array.isArray(esps)) return;
  await run('DELETE FROM profissional_especialidades WHERE profissional_id=?', [profId]);
  for (const e of esps) await run('INSERT INTO profissional_especialidades (profissional_id, especialidade) VALUES (?,?)', [profId, e]);
}
async function setFolga(profId, folgas, run = q) {
  if (!Array.isArray(folgas)) return;
  await run('DELETE FROM profissional_folgas WHERE profissional_id=?', [profId]);
  for (const f of folgas) {
    const n = diaNum(f);
    if (n >= 0) await run('INSERT INTO profissional_folgas (profissional_id, dia_semana) VALUES (?,?)', [profId, n]);
  }
}
async function setTags(clienteId, tags, run = q) {
  if (!Array.isArray(tags)) return;
  await run('DELETE FROM cliente_tags WHERE cliente_id=?', [clienteId]);
  for (const t of tags) if (t) await run('INSERT INTO cliente_tags (cliente_id, tag) VALUES (?,?)', [clienteId, t]);
}
async function fornecedorId(nome, run = q) {
  if (!nome) return null;
  const rows = await run('SELECT id FROM fornecedores WHERE estabelecimento_id=? AND nome=? LIMIT 1', [EST, nome]);
  if (rows.length) return rows[0].id;
  const id = randomUUID();
  await run('INSERT INTO fornecedores (id, estabelecimento_id, nome) VALUES (?,?,?)', [id, EST, nome]);
  return id;
}

// ---------- utils ----------
function group(rows, key, pick) {
  const out = {};
  for (const r of rows) (out[r[key]] ||= []).push(pick(r));
  return out;
}
function index(rows, key) {
  const out = {};
  for (const r of rows) out[r[key]] = r;
  return out;
}

// Cria um admin automaticamente se não houver nenhum ativo (DB recém-criado).
// Sem credenciais fixas: usa ADMIN_EMAIL/ADMIN_SENHA do ambiente ou gera senha
// aleatória e a imprime uma única vez. Para resetar depois: node api/criar-admin.mjs
async function ensureAdmin() {
  // Conta apenas admins com senha REALMENTE utilizável (hash bcrypt começa com '$2').
  // O seed cria 'u1' (dono ativo) com hash placeholder '!sem-senha-definida', que
  // não permite login — antes ele fazia esta checagem passar e o admin automático
  // nunca era criado, travando o primeiro login (gotcha do onboarding).
  const rows = await q("SELECT COUNT(*) c FROM usuarios WHERE estabelecimento_id=? AND papel IN ('dono','admin') AND ativo=1 AND senha_hash LIKE '$2%'", [EST]);
  if (Number(rows[0].c) > 0) return;
  const email = process.env.ADMIN_EMAIL || 'admin@navalha.local';
  const senha = process.env.ADMIN_SENHA || randomBytes(12).toString('base64url');
  await q("INSERT INTO usuarios (id, estabelecimento_id, nome, email, senha_hash, papel, nivel, ativo) VALUES (?,?,?,?,?,'dono','ceo',1)",
    [randomUUID(), EST, 'Administrador', email, await hashPassword(senha)]);
  console.log('────────────────────────────────────────────────────');
  console.log(' Nenhum admin ativo encontrado — usuário criado:');
  console.log('   e-mail:', email);
  console.log('   senha :', senha, process.env.ADMIN_SENHA ? '(via ADMIN_SENHA)' : '(gerada — anote agora)');
  console.log('────────────────────────────────────────────────────');
}

// Garante que alguém consiga gerenciar usuários: se não houver nenhuma conta
// master nem CEO ativa, promove a CEO o dono/admin ativo mais antigo com senha válida.
// (O master nunca é eleito automaticamente — ele é criado por api/criar-master.mjs.)
// No-op (com aviso) se a coluna ainda não existir — rode a migração de níveis.
async function ensureGestor() {
  const col = await q("SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='usuarios' AND column_name='nivel' LIMIT 1");
  if (!col.length) { console.warn('[RBAC] Coluna usuarios.nivel ausente — rode a migração de níveis (migracao-2026-10-19-niveis.sql).'); return; }
  const has = await q("SELECT COUNT(*) c FROM usuarios WHERE estabelecimento_id=? AND nivel IN ('master','ceo') AND ativo=1", [EST]);
  if (Number(has[0].c) > 0) return;
  const pick = await q("SELECT id, email FROM usuarios WHERE estabelecimento_id=? AND papel IN ('dono','admin') AND ativo=1 AND senha_hash LIKE '$2%' ORDER BY (papel='dono') DESC, criado_em ASC, id ASC LIMIT 1", [EST]);
  if (!pick.length) return;
  await q("UPDATE usuarios SET nivel='ceo' WHERE id=?", [pick[0].id]);
  await q('DELETE FROM usuario_permissoes WHERE usuario_id=?', [pick[0].id]);
  console.log('[RBAC] Nenhum master/CEO ativo — conta promovida a CEO:', pick[0].email);
}

app.listen(PORT, async () => {
  console.log(`API rodando em http://localhost:${PORT}`);
  try { await ensureAdmin(); } catch (e) { console.error('ensureAdmin:', e.message); }
  try { await ensureGestor(); } catch (e) { console.error('ensureGestor:', e.message); }
});
