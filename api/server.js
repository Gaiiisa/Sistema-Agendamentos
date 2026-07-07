// ============================================================
// API REST — Sistema de Agendamento
// Lê do MySQL e devolve os dados no formato que o front (DataService) espera.
// ============================================================
import express from 'express';
import cors from 'cors';
import { randomUUID, randomBytes } from 'crypto';
import { pool, q } from './db.js';
import { hashPassword, verifyPassword, signToken, authRequired } from './auth.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const EST = process.env.EST_ID || 'e1';   // estabelecimento atual (single-tenant por enquanto)

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const PAPEL_LABEL = { dono: 'Dono / Admin', admin: 'Admin', gerente: 'Gerente', profissional: 'Profissional', recepcao: 'Recepção' };
const publicUser = (u) => ({
  id: u.id, nome: u.nome, email: u.email,
  papel: PAPEL_LABEL[u.papel] || u.papel, papelCod: u.papel, cor: u.cor || '#0e9f6e',
});
const hhmm = (t) => (t ? String(t).slice(0, 5) : t);          // 'HH:MM:SS' -> 'HH:MM'
const toMin = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };  // 'HH:MM' -> minutos
const diaTxt = (n) => DIAS[n];
const diaNum = (s) => DIAS.indexOf(s);
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MESES_ABR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// erro -> 500 json
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(e);
  res.status(500).json({ error: e.message });
});

// ============================================================
// Autenticação (rotas públicas) + gate para o restante da API
// ============================================================
// POST /api/login — valida e-mail + senha, devolve token JWT
app.post('/api/login', wrap(async (req, res) => {
  const { email, senha } = req.body || {};
  if (!email || !senha) return res.status(400).json({ error: 'Informe e-mail e senha.' });
  const rows = await q('SELECT * FROM usuarios WHERE estabelecimento_id=? AND LOWER(email)=LOWER(?) LIMIT 1', [EST, String(email).trim()]);
  const u = rows[0];
  // mesma mensagem para inexistente ou senha errada (não revela qual)
  if (!u || !(await verifyPassword(senha, u.senha_hash))) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  }
  if (!u.ativo) return res.status(403).json({ error: 'Usuário inativo. Procure o administrador.' });
  res.json({ token: signToken(u), usuario: publicUser(u) });
}));

// POST /api/logout — JWT é stateless; o cliente descarta o token. Mantido por padrão de API.
app.post('/api/logout', (_req, res) => res.json({ ok: true }));

// health público (antes do gate)
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ---- daqui em diante, TODA rota /api exige Bearer token válido ----
app.use('/api', authRequired);

// GET /api/me — usuário da sessão atual (validação de sessão no front)
app.get('/api/me', wrap(async (req, res) => {
  const rows = await q('SELECT * FROM usuarios WHERE id=? LIMIT 1', [req.auth.sub]);
  if (!rows[0] || !rows[0].ativo) return res.status(401).json({ error: 'Sessão inválida.' });
  res.json({ usuario: publicUser(rows[0]) });
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
              descricao, instagram, site, google_perfil
         FROM estabelecimentos WHERE id=?`, [EST]),
    q('SELECT nome, papel, cor FROM usuarios WHERE id=?', [req.auth.sub]),
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

  res.json({
    estabelecimento: estab[0] || {}, usuario: usuario[0] ? { ...usuario[0], papel: PAPEL_LABEL[usuario[0].papel] || usuario[0].papel } : {},
    staff, servicos: servicos2, clientes: clientes2, hoje, agendamentos, historico,
    produtos: produtos2, movEstoque, caixa, lancamentos, aReceber,
    comissoes, fidelidade, campanhas, modelos: modelos2, kpis, financeiro,
    relatorio, periodoComissao, historicoComissoes, horarios, bloqueios,
    categoriasServico: catServRows.map((r) => r.nome),
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
const SERVICO_MAP = { nome: 'nome', cat: 'categoria', dur: 'duracao_min', preco: 'preco', custo: 'custo', desc: 'descricao', cor: 'cor', combo: 'combo', sinal: 'exige_sinal', ativo: 'ativo' };
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

// categorias de serviço (avulsas)
app.post('/api/categorias-servico', wrap(async (req, res) => {
  const nome = String(req.body?.nome || '').trim();
  if (!nome) return res.status(400).json({ error: 'Nome obrigatório.' });
  await q('INSERT IGNORE INTO categorias_servico (id, estabelecimento_id, nome) VALUES (UUID(), ?, ?)', [EST, nome]);
  res.json({ ok: true, nome });
}));

app.delete('/api/categorias-servico/:nome', wrap(async (req, res) => {
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
const PROD_MAP = { nome: 'nome', cat: 'categoria', qtd: 'quantidade', min: 'quantidade_minima', custo: 'custo', preco: 'preco_venda', imagem: 'imagem' };
app.post('/api/produtos', wrap(async (req, res) => {
  const b = req.body, id = b.id || randomUUID();
  const fid = await fornecedorId(b.fornecedor);
  await q('INSERT INTO produtos (id, estabelecimento_id, nome, categoria, quantidade, quantidade_minima, custo, preco_venda, fornecedor_id, imagem) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [id, EST, b.nome, b.cat, b.qtd || 0, b.min || 0, b.custo || 0, b.preco ?? null, fid, b.imagem || null]);
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

// modelos de mensagem
const MODELO_MAP = { nome: 'nome', desc: 'descricao', cat: 'categoria', gatilho: 'gatilho', canal: 'canal', assunto: 'assunto', texto: 'texto', status: 'status' };
app.post('/api/modelos', wrap(async (req, res) => {
  const b = req.body, id = b.id || randomUUID();
  await q('INSERT INTO modelos_mensagem (id, estabelecimento_id, nome, descricao, categoria, gatilho, canal, assunto, texto, status) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [id, EST, b.nome, b.desc || null, b.cat || null, b.gatilho || '', b.canal || 'whatsapp', b.assunto || null, b.texto || '', b.status || 'ativo']);
  res.json({ id });
}));
app.put('/api/modelos/:id', wrap(async (req, res) => {
  await updateRow('modelos_mensagem', MODELO_MAP, req.params.id, req.body);
  res.json({ ok: true });
}));

// clientes
const CLIENTE_MAP = { nome: 'nome', wpp: 'whatsapp', email: 'email', nasc: 'nascimento', obs: 'observacoes', fav: 'profissional_favorito_id' };
app.post('/api/clientes', wrap(async (req, res) => {
  const b = req.body, id = b.id || randomUUID();
  await q('INSERT INTO clientes (id, estabelecimento_id, nome, whatsapp, email, nascimento, observacoes, profissional_favorito_id) VALUES (?,?,?,?,?,?,?,?)',
    [id, EST, b.nome, b.wpp || null, b.email || null, b.nasc || null, b.obs || null, b.fav || null]);
  await setTags(id, b.tags);
  res.json({ id });
}));
app.put('/api/clientes/:id', wrap(async (req, res) => {
  await updateRow('clientes', CLIENTE_MAP, req.params.id, req.body);
  if (req.body.tags) await setTags(req.params.id, req.body.tags);
  res.json({ ok: true });
}));

// estabelecimento (tela Configurações › Estabelecimento)
const ESTAB_MAP = { nome: 'nome', tipo: 'tipo_negocio', doc: 'documento', tel: 'telefone', end: 'endereco', cidade: 'cidade', cep: 'cep', desc: 'descricao', instagram: 'instagram', google: 'google_perfil', site: 'site' };
app.put('/api/estabelecimento', wrap(async (req, res) => {
  await updateRow('estabelecimentos', ESTAB_MAP, EST, req.body);
  res.json({ ok: true });
}));

// horários de funcionamento (tela Configurações › Horários)
app.put('/api/horarios', wrap(async (req, res) => {
  const dias = req.body.dias;
  if (!Array.isArray(dias)) return res.json({ ok: false });
  for (const d of dias) {
    await q(`INSERT INTO estabelecimento_horarios (estabelecimento_id, dia_semana, aberto, hora_inicio, hora_fim, pausa_inicio, pausa_fim)
             VALUES (?,?,?,?,?,?,?)
             ON DUPLICATE KEY UPDATE aberto=VALUES(aberto), hora_inicio=VALUES(hora_inicio),
               hora_fim=VALUES(hora_fim), pausa_inicio=VALUES(pausa_inicio), pausa_fim=VALUES(pausa_fim)`,
      [EST, d.diaSemana, d.aberto ? 1 : 0, d.inicio, d.fim, d.pausaInicio || null, d.pausaFim || null]);
  }
  res.json({ ok: true });
}));

// ------------------------------------------------------------
// Bloqueios de agenda (almoço, folga pontual, manutenção, etc.)
// ------------------------------------------------------------
// Verifica conflito com bloqueios existentes ou agendamentos ativos
// no mesmo profissional/dia. Retorna { ok: true } ou { ok: false, motivo }.
async function conflitoBloqueio({ id, prof, data, ini, fim }) {
  if (!data || !ini || !fim) return { ok: false, motivo: 'Período inválido.' };
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
app.post('/api/bloqueios', wrap(async (req, res) => {
  const b = req.body || {};
  const id = b.id || randomUUID();
  const check = await conflitoBloqueio({ id: null, prof: b.prof || null, data: b.data, ini: b.ini, fim: b.fim });
  if (!check.ok) return res.status(409).json({ error: check.motivo });
  await q(
    `INSERT INTO bloqueios_agenda (id, estabelecimento_id, profissional_id, data, hora_inicio, hora_fim, tipo, motivo)
     VALUES (?,?,?,?,?,?,?,?)`,
    [id, EST, b.prof || null, b.data, b.ini, b.fim, b.tipo || 'outro', b.motivo || null],
  );
  res.json({ id });
}));

// atualizar bloqueio
app.put('/api/bloqueios/:id', wrap(async (req, res) => {
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
  const check = await conflitoBloqueio({ id, prof: next.prof, data: next.data, ini: next.ini, fim: next.fim });
  if (!check.ok) return res.status(409).json({ error: check.motivo });
  await q(
    `UPDATE bloqueios_agenda SET profissional_id=?, data=?, hora_inicio=?, hora_fim=?, tipo=?, motivo=? WHERE id=?`,
    [next.prof, next.data, next.ini, next.fim, next.tipo, next.motivo, id],
  );
  res.json({ ok: true });
}));

// excluir bloqueio
app.delete('/api/bloqueios/:id', wrap(async (req, res) => {
  await q('DELETE FROM bloqueios_agenda WHERE id=? AND estabelecimento_id=?', [req.params.id, EST]);
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
async function setTags(clienteId, tags) {
  if (!Array.isArray(tags)) return;
  await q('DELETE FROM cliente_tags WHERE cliente_id=?', [clienteId]);
  for (const t of tags) if (t) await q('INSERT INTO cliente_tags (cliente_id, tag) VALUES (?,?)', [clienteId, t]);
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

// Cria um admin automaticamente se não houver nenhum ativo (DB recém-criado).
// Sem credenciais fixas: usa ADMIN_EMAIL/ADMIN_SENHA do ambiente ou gera senha
// aleatória e a imprime uma única vez. Para resetar depois: node api/criar-admin.mjs
async function ensureAdmin() {
  const rows = await q("SELECT COUNT(*) c FROM usuarios WHERE estabelecimento_id=? AND papel IN ('dono','admin') AND ativo=1", [EST]);
  if (Number(rows[0].c) > 0) return;
  const email = process.env.ADMIN_EMAIL || 'admin@navalha.local';
  const senha = process.env.ADMIN_SENHA || randomBytes(12).toString('base64url');
  await q("INSERT INTO usuarios (id, estabelecimento_id, nome, email, senha_hash, papel, ativo) VALUES (?,?,?,?,?,'dono',1)",
    [randomUUID(), EST, 'Administrador', email, await hashPassword(senha)]);
  console.log('────────────────────────────────────────────────────');
  console.log(' Nenhum admin ativo encontrado — usuário criado:');
  console.log('   e-mail:', email);
  console.log('   senha :', senha, process.env.ADMIN_SENHA ? '(via ADMIN_SENHA)' : '(gerada — anote agora)');
  console.log('────────────────────────────────────────────────────');
}

app.listen(PORT, async () => {
  console.log(`API rodando em http://localhost:${PORT}`);
  try { await ensureAdmin(); } catch (e) { console.error('ensureAdmin:', e.message); }
});
