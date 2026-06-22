// ============================================================
// API REST — Sistema de Agendamento
// Lê do MySQL e devolve os dados no formato que o front (DataService) espera.
// ============================================================
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { pool, q } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const EST = process.env.EST_ID || 'e1';   // estabelecimento atual (single-tenant por enquanto)

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const PAPEL_LABEL = { dono: 'Dono / Admin', admin: 'Admin', gerente: 'Gerente', profissional: 'Profissional', recepcao: 'Recepção' };
const hhmm = (t) => (t ? String(t).slice(0, 5) : t);          // 'HH:MM:SS' -> 'HH:MM'
const diaTxt = (n) => DIAS[n];
const diaNum = (s) => DIAS.indexOf(s);

// erro -> 500 json
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(e);
  res.status(500).json({ error: e.message });
});

// ============================================================
// GET /api/bootstrap — tudo de uma vez
// ============================================================
app.get('/api/bootstrap', wrap(async (_req, res) => {
  const [
    dbDate, estab, usuario, profs, esps, folgas, vend,
    servicos, exec, clientes, tags, stats,
    ags, produtos, mov, caixaRow, lanc, receber,
    comItens, fechamentos, fid, camps, envios, modelos, kpiRows,
    fluxoRows, recCatRows, despCatRows, recFormaRows, recProfRows, mesRow, mesAntRow,
  ] = await Promise.all([
    q('SELECT CURRENT_DATE() AS hoje'),
    q('SELECT nome, plano, cidade FROM estabelecimentos WHERE id=?', [EST]),
    q("SELECT nome, papel, cor FROM usuarios WHERE estabelecimento_id=? ORDER BY (papel='dono') DESC LIMIT 1", [EST]),
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
    combo: !!s.combo, sinal: !!s.exige_sinal,
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
  const modelos2 = modelos.map((m) => ({ id: m.id, nome: m.nome, gatilho: m.gatilho, texto: m.texto }));

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

  res.json({
    estabelecimento: estab[0] || {}, usuario: usuario[0] ? { ...usuario[0], papel: PAPEL_LABEL[usuario[0].papel] || usuario[0].papel } : {},
    staff, servicos: servicos2, clientes: clientes2, hoje, agendamentos, historico,
    produtos: produtos2, movEstoque, caixa, lancamentos, aReceber,
    comissoes, fidelidade, campanhas, modelos: modelos2, kpis, financeiro,
  });
}));

// ============================================================
// Escrita — agendamentos, serviços, profissionais, produtos, campanhas, movimentações
// (ids vêm do cliente; CHAR(36) aceita 'sn123', 'p1' etc.)
// ============================================================

// criar agendamento
app.post('/api/agendamentos', wrap(async (req, res) => {
  const b = req.body;
  const id = b.id || randomUUID();
  const dur = b._dur || b.duracao_min || 30;
  await q(
    `INSERT INTO agendamentos (id, estabelecimento_id, cliente_id, servico_id, profissional_id, data, hora_inicio, duracao_min, valor, status, sinal_pago)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [id, EST, b.cli, b.srv, b.prof, b.data || new Date().toISOString().slice(0, 10), b.ini || b.hora, dur, b.valor || 0, b.status || 'confirmado', !!b.sinal],
  );
  res.json({ id });
}));

// atualizar status / campos do agendamento
app.put('/api/agendamentos/:id', wrap(async (req, res) => {
  const map = { status: 'status', sinal: 'sinal_pago', valor: 'valor', ini: 'hora_inicio', hora: 'hora_inicio', data: 'data', prof: 'profissional_id' };
  await updateRow('agendamentos', map, req.params.id, req.body);
  res.json({ ok: true });
}));

// serviços
const SERVICO_MAP = { nome: 'nome', cat: 'categoria', dur: 'duracao_min', preco: 'preco', custo: 'custo', desc: 'descricao', cor: 'cor', combo: 'combo', sinal: 'exige_sinal' };
app.post('/api/servicos', wrap(async (req, res) => {
  const b = req.body, id = b.id || randomUUID();
  await q('INSERT INTO servicos (id, estabelecimento_id, nome, categoria, duracao_min, preco, custo, descricao, cor, combo, exige_sinal) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [id, EST, b.nome, b.cat, b.dur, b.preco, b.custo || 0, b.desc || '', b.cor || null, !!b.combo, !!b.sinal]);
  await setExec(id, b.exec);
  res.json({ id });
}));
app.put('/api/servicos/:id', wrap(async (req, res) => {
  await updateRow('servicos', SERVICO_MAP, req.params.id, req.body);
  if (req.body.exec) await setExec(req.params.id, req.body.exec);
  res.json({ ok: true });
}));

// profissionais
const PROF_MAP = { nome: 'nome', apelido: 'apelido', cor: 'cor', comissao: 'comissao_pct', contato: 'contato', bio: 'bio', meta: 'meta_mensal', inicio: 'hora_inicio', fim: 'hora_fim' };
app.post('/api/profissionais', wrap(async (req, res) => {
  const b = req.body, id = b.id || randomUUID();
  await q('INSERT INTO profissionais (id, estabelecimento_id, nome, apelido, cor, comissao_pct, contato, bio, meta_mensal, hora_inicio, hora_fim) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [id, EST, b.nome, b.apelido || null, b.cor || null, b.comissao || 0, b.contato || null, b.bio || null, b.meta || null, b.inicio || '09:00', b.fim || '19:00']);
  await setEsp(id, b.especialidades);
  await setFolga(id, b.folga);
  res.json({ id });
}));
app.put('/api/profissionais/:id', wrap(async (req, res) => {
  await updateRow('profissionais', PROF_MAP, req.params.id, req.body);
  if (req.body.especialidades) await setEsp(req.params.id, req.body.especialidades);
  if (req.body.folga) await setFolga(req.params.id, req.body.folga);
  res.json({ ok: true });
}));

// produtos
const PROD_MAP = { nome: 'nome', cat: 'categoria', qtd: 'quantidade', min: 'quantidade_minima', custo: 'custo', preco: 'preco_venda' };
app.post('/api/produtos', wrap(async (req, res) => {
  const b = req.body, id = b.id || randomUUID();
  const fid = await fornecedorId(b.fornecedor);
  await q('INSERT INTO produtos (id, estabelecimento_id, nome, categoria, quantidade, quantidade_minima, custo, preco_venda, fornecedor_id) VALUES (?,?,?,?,?,?,?,?,?)',
    [id, EST, b.nome, b.cat, b.qtd || 0, b.min || 0, b.custo || 0, b.preco ?? null, fid]);
  res.json({ id });
}));
app.put('/api/produtos/:id', wrap(async (req, res) => {
  await updateRow('produtos', PROD_MAP, req.params.id, req.body);
  if (req.body.fornecedor !== undefined) {
    const fid = await fornecedorId(req.body.fornecedor);
    await q('UPDATE produtos SET fornecedor_id=? WHERE id=?', [fid, req.params.id]);
  }
  res.json({ ok: true });
}));

// campanhas
const CAMP_MAP = { nome: 'nome', tipo: 'tipo', alvo: 'alvo', cor: 'cor', status: 'status' };
app.post('/api/campanhas', wrap(async (req, res) => {
  const b = req.body, id = b.id || randomUUID();
  await q('INSERT INTO campanhas (id, estabelecimento_id, nome, tipo, alvo, cor, status) VALUES (?,?,?,?,?,?,?)',
    [id, EST, b.nome, b.tipo, b.alvo, b.cor || null, b.status || 'rascunho']);
  res.json({ id });
}));
app.put('/api/campanhas/:id', wrap(async (req, res) => {
  await updateRow('campanhas', CAMP_MAP, req.params.id, req.body);
  res.json({ ok: true });
}));

// movimentação de estoque (+ ajusta quantidade do produto)
app.post('/api/movimentacoes', wrap(async (req, res) => {
  const b = req.body, id = b.id || randomUUID();
  await q('INSERT INTO movimentacoes_estoque (id, produto_id, tipo, quantidade, motivo) VALUES (?,?,?,?,?)',
    [id, b.prod, b.tipo, b.qtd, b.motivo || null]);
  const delta = b.tipo === 'entrada' ? b.qtd : -b.qtd;
  await q('UPDATE produtos SET quantidade = GREATEST(0, quantidade + ?) WHERE id=?', [delta, b.prod]);
  res.json({ id });
}));

// ---------- helpers de escrita ----------
async function updateRow(table, map, id, body) {
  const sets = [], vals = [];
  for (const [k, col] of Object.entries(map)) {
    if (body[k] === undefined) continue;
    let v = body[k];
    if (['combo', 'exige_sinal', 'sinal_pago'].includes(col)) v = v ? 1 : 0;
    sets.push(`${col}=?`); vals.push(v);
  }
  if (!sets.length) return;
  vals.push(id);
  await q(`UPDATE ${table} SET ${sets.join(', ')} WHERE id=?`, vals);
}
async function setExec(servicoId, execs) {
  if (!Array.isArray(execs)) return;
  await q('DELETE FROM servico_profissionais WHERE servico_id=?', [servicoId]);
  for (const pid of execs) await q('INSERT INTO servico_profissionais (servico_id, profissional_id) VALUES (?,?)', [servicoId, pid]);
}
async function setEsp(profId, esps) {
  if (!Array.isArray(esps)) return;
  await q('DELETE FROM profissional_especialidades WHERE profissional_id=?', [profId]);
  for (const e of esps) await q('INSERT INTO profissional_especialidades (profissional_id, especialidade) VALUES (?,?)', [profId, e]);
}
async function setFolga(profId, folgas) {
  if (!Array.isArray(folgas)) return;
  await q('DELETE FROM profissional_folgas WHERE profissional_id=?', [profId]);
  for (const f of folgas) {
    const n = diaNum(f);
    if (n >= 0) await q('INSERT INTO profissional_folgas (profissional_id, dia_semana) VALUES (?,?)', [profId, n]);
  }
}
async function fornecedorId(nome) {
  if (!nome) return null;
  const rows = await q('SELECT id FROM fornecedores WHERE estabelecimento_id=? AND nome=? LIMIT 1', [EST, nome]);
  if (rows.length) return rows[0].id;
  const id = randomUUID();
  await q('INSERT INTO fornecedores (id, estabelecimento_id, nome) VALUES (?,?,?)', [id, EST, nome]);
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

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`API rodando em http://localhost:${PORT}`));
