// ============================================================
// Gerador de dados de teste — ~5 meses (today-60 .. today+90)
// Cria agendamentos coerentes + financeiro + estoque + fidelidade + campanhas.
// Re-executável: todo registro gerado tem id com prefixo 'gx' (não-hex,
// nunca colide com UUID nem com os ids do seed). Limpa 'gx%' antes de gerar.
//
// Uso:  node database/gerar-dados.mjs
// ============================================================
import { randomBytes } from 'crypto';
import { pool, q } from '../api/db.js';

const EST = 'e1';
const DIAS_PASSADO = 60;
const DIAS_FUTURO = 90;

const mkId = () => 'gx' + randomBytes(17).toString('hex');          // 36 chars, começa com 'gx'
const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const chance = (p) => Math.random() < p;
function weighted(pairs) {                                          // [[valor, peso], ...]
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [v, w] of pairs) { if ((r -= w) < 0) return v; }
  return pairs[0][0];
}

async function main() {
  // ---------- data de "hoje" do banco (mesma fonte da app) ----------
  const [{ hoje }] = await q('SELECT CURRENT_DATE() AS hoje');
  const today = new Date(hoje + 'T00:00:00');

  // ---------- referências ----------
  const profs = await q('SELECT id, hora_inicio, hora_fim, comissao_pct FROM profissionais WHERE estabelecimento_id=?', [EST]);
  const folgas = await q('SELECT * FROM profissional_folgas');
  const servicos = await q('SELECT id, nome, duracao_min, preco FROM servicos WHERE estabelecimento_id=?', [EST]);
  const execs = await q('SELECT * FROM servico_profissionais');
  const clientes = await q('SELECT id FROM clientes WHERE estabelecimento_id=?', [EST]);
  const produtos = await q('SELECT id, nome, preco_venda FROM produtos WHERE estabelecimento_id=?', [EST]);
  const tags = await q('SELECT * FROM cliente_tags');

  const svById = Object.fromEntries(servicos.map((s) => [s.id, s]));
  const folgaByProf = {};
  for (const f of folgas) (folgaByProf[f.profissional_id] ||= new Set()).add(f.dia_semana);
  const svByProf = {};                                             // pro -> [servico_id]
  for (const e of execs) (svByProf[e.profissional_id] ||= []).push(e.servico_id);
  const cliIds = clientes.map((c) => c.id);
  const prodVenda = produtos.filter((p) => p.preco_venda != null);
  const cliByTag = {};
  for (const t of tags) (cliByTag[t.tag] ||= []).push(t.cliente_id);

  // ---------- limpa geração anterior (FK-safe: filhos antes) ----------
  for (const t of ['lancamentos', 'movimentacoes_estoque', 'contas_receber',
    'fidelidade_movimentos', 'campanha_envios', 'fechamentos_comissao', 'agendamentos']) {
    await q(`DELETE FROM ${t} WHERE id LIKE 'gx%'`);
  }

  const ag = [], lan = [], mov = [], cr = [], fid = [], env = [], fec = [];
  const FORMAS = ['pix', 'cartao', 'dinheiro'];

  // ---------- varre o intervalo de dias ----------
  let dayIdx = 0;
  for (let off = -DIAS_PASSADO; off <= DIAS_FUTURO; off++, dayIdx++) {
    const d = new Date(today); d.setDate(d.getDate() + off);
    const dataStr = fmt(d);
    const dow = d.getDay();                                         // 0=dom..6=sab
    const bucket = off < 0 ? 'passado' : off === 0 ? 'hoje' : 'futuro';

    for (const p of profs) {
      if (folgaByProf[p.id]?.has(dow)) continue;                   // folga do profissional
      const meus = svByProf[p.id] || [];
      if (!meus.length) continue;

      let t = toMin(p.hora_inicio);
      const fim = toMin(p.hora_fim);
      const nAppts = rand(3, 6);
      for (let k = 0; k < nAppts && t < fim - 20; k++) {
        const sv = svById[pick(meus)];
        if (t + sv.duracao_min > fim) break;
        const status = bucket === 'passado'
          ? weighted([['concluido', 78], ['faltou', 10], ['cancelado', 12]])
          : bucket === 'hoje'
            ? weighted([['concluido', 40], ['atendimento', 10], ['confirmado', 30], ['pendente', 20]])
            : weighted([['confirmado', 60], ['pendente', 40]]);
        const cli = pick(cliIds);
        const agId = mkId();
        const sinal = sv.preco >= 150 ? chance(0.7) : false;
        ag.push([agId, EST, cli, sv.id, p.id, dataStr, fromMin(t), sv.duracao_min,
          sv.preco, null, status, sinal ? 1 : 0]);

        // receita do atendimento concluído
        if (status === 'concluido') {
          lan.push([mkId(), EST, null, 'receita', 'Atendimento',
            `${sv.nome} — atend.`, sv.preco, pick(FORMAS), p.id, agId,
            `${dataStr} ${fromMin(t + sv.duracao_min)}:00`]);
          // venda de produto avulsa eventual
          if (prodVenda.length && chance(0.12)) {
            const pr = pick(prodVenda);
            lan.push([mkId(), EST, null, 'receita', 'Produto',
              `${pr.nome} (venda)`, Number(pr.preco_venda), pick(FORMAS), p.id, null,
              `${dataStr} ${fromMin(t + sv.duracao_min)}:00`]);
          }
          // pontos de fidelidade
          if (chance(0.6)) fid.push([mkId(), cli, 'acumulo', 1, agId, `${dataStr} 12:00:00`]);
          // consumo de estoque eventual
          if (produtos.length && chance(0.25)) {
            mov.push([mkId(), pick(produtos).id, 'saida', 1, `Consumo — ${sv.nome}`, agId, `${dataStr} ${fromMin(t)}:00`]);
          }
        }
        t += sv.duracao_min + rand(0, 25);
      }
    }

    // ---------- despesas (apenas passado/hoje) ----------
    if (off <= 0) {
      if (d.getDate() === 5) lan.push([mkId(), EST, null, 'despesa', 'Aluguel', 'Aluguel do ponto', 3500, 'pix', null, null, `${dataStr} 08:00:00`]);
      if (dow === 1) lan.push([mkId(), EST, null, 'despesa', 'Insumos', 'Reposição de insumos', rand(120, 420), pick(['pix', 'cartao']), null, null, `${dataStr} 08:40:00`]);
      if (dayIdx % 14 === 0) lan.push([mkId(), EST, null, 'despesa', 'Marketing', 'Tráfego pago / Instagram', rand(80, 220), 'cartao', null, null, `${dataStr} 10:00:00`]);
      if (chance(0.3)) lan.push([mkId(), EST, null, 'despesa', 'Operacional', pick(['Café e água', 'Limpeza', 'Manutenção', 'Descartáveis']), rand(20, 90), 'dinheiro', null, null, `${dataStr} 09:10:00`]);
    }

    // ---------- compras de estoque (entradas) toda semana ----------
    if (off <= 0 && dow === 3 && produtos.length) {
      const pr = pick(produtos);
      mov.push([mkId(), pr.id, 'entrada', rand(6, 18), `Compra — reposição`, null, `${dataStr} 14:00:00`]);
    }
  }

  // ---------- contas a receber (aging em torno de hoje) ----------
  for (let i = 0; i < 12; i++) {
    const venc = new Date(today); venc.setDate(venc.getDate() + rand(-12, 25));
    const pago = venc < today && chance(0.4);
    cr.push([mkId(), EST, pick(cliIds), pick(['Fiado — atendimento', 'Saldo de combo', 'Sinal pendente', 'Pacote em parcelas']),
      rand(20, 160), fmt(venc), null, pago ? `${fmt(venc)} 12:00:00` : null]);
  }

  // ---------- envios de campanha (popula métricas) ----------
  const campAlvo = { cp1: cliByTag['sumido'] || [], cp2: cliIds, cp3: cliByTag['vip'] || [] };
  for (const [campId, alvo] of Object.entries(campAlvo)) {
    const usados = new Set();
    const qtd = Math.min(alvo.length, campId === 'cp2' ? 8 : alvo.length);
    for (let i = 0; i < qtd; i++) {
      const cli = alvo[i % alvo.length];
      if (usados.has(cli)) continue; usados.add(cli);
      const env_d = new Date(today); env_d.setDate(env_d.getDate() - rand(2, 20));
      const ret = chance(0.4);
      env.push([mkId(), campId, cli, `${fmt(env_d)} 09:00:00`, ret ? `${fmt(env_d)} 15:00:00` : null]);
    }
  }

  // ---------- fechamentos de comissão (meses fechados anteriores) ----------
  for (let m = 1; m <= 2; m++) {
    const ref = new Date(today.getFullYear(), today.getMonth() - m, 1);
    const ini = fmt(ref);
    const fimMes = fmt(new Date(ref.getFullYear(), ref.getMonth() + 1, 0));
    for (const p of profs) {
      const bruto = rand(800, 3200);
      const comissao = Math.round(bruto * Number(p.comissao_pct) / 100);
      fec.push([mkId(), EST, p.id, ini, fimMes, 'pago', rand(8, 30), bruto, comissao, comissao, pick(FORMAS), `${fimMes} 18:00:00`]);
    }
  }

  // ---------- bulk insert ----------
  await bulk('agendamentos', '(id,estabelecimento_id,cliente_id,servico_id,profissional_id,data,hora_inicio,duracao_min,valor,comissao_pct,status,sinal_pago)', ag);
  await bulk('lancamentos', '(id,estabelecimento_id,caixa_id,tipo,categoria,descricao,valor,forma,profissional_id,agendamento_id,criado_em)', lan);
  await bulk('movimentacoes_estoque', '(id,produto_id,tipo,quantidade,motivo,agendamento_id,criado_em)', mov);
  await bulk('contas_receber', '(id,estabelecimento_id,cliente_id,descricao,valor,vencimento,agendamento_id,pago_em)', cr);
  await bulk('fidelidade_movimentos', '(id,cliente_id,tipo,pontos,agendamento_id,criado_em)', fid);
  await bulk('campanha_envios', '(id,campanha_id,cliente_id,enviado_em,retornou_em)', env);
  await bulk('fechamentos_comissao', '(id,estabelecimento_id,profissional_id,periodo_inicio,periodo_fim,status,qtd_atendimentos,valor_bruto,valor_comissao,valor_pago,forma_pagamento,pago_em)', fec);

  console.log('Gerado:');
  console.log(`  agendamentos        ${ag.length}`);
  console.log(`  lancamentos         ${lan.length}`);
  console.log(`  movimentacoes       ${mov.length}`);
  console.log(`  contas_receber      ${cr.length}`);
  console.log(`  fidelidade_movs     ${fid.length}`);
  console.log(`  campanha_envios     ${env.length}`);
  console.log(`  fechamentos         ${fec.length}`);
  await pool.end();
}

function toMin(hms) { const [h, m] = String(hms).split(':').map(Number); return h * 60 + m; }
function fromMin(min) { return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`; }
async function bulk(table, cols, rows) {
  if (!rows.length) return;
  // insere em lotes de 500 para não estourar o pacote
  for (let i = 0; i < rows.length; i += 500) {
    const slice = rows.slice(i, i + 500);
    await pool.query(`INSERT INTO ${table} ${cols} VALUES ?`, [slice]);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
