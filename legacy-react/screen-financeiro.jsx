/* Tela: Financeiro / Caixa — abertura/fechamento, lançamentos, a receber, fluxo */
(function () {
  const { useState } = React;
  const Icon = window.Icon;
  const D = window.DATA;
  const { Avatar, Menu } = window;

  const FORMA = {
    dinheiro: { label: 'Dinheiro', cor: 'var(--accent)', bg: 'var(--accent-soft)', icon: 'money' },
    pix:      { label: 'Pix', cor: 'var(--st-atendimento)', bg: 'var(--st-atendimento-bg)', icon: 'sparkle' },
    cartao:   { label: 'Cartão', cor: 'oklch(0.5 0.12 300)', bg: 'oklch(0.96 0.04 300)', icon: 'coins' },
  };

  function Financeiro({ notify }) {
    const [tab, setTab] = useState('caixa');
    const receitas = D.lancamentos.filter(l => l.tipo === 'receita');
    const despesas = D.lancamentos.filter(l => l.tipo === 'despesa');
    const totRec = receitas.reduce((s, l) => s + l.valor, 0);
    const totDesp = despesas.reduce((s, l) => s + l.valor, 0);
    const saldo = D.caixa.valorAbertura + totRec - totDesp;

    // por forma de pagamento (só receitas em dinheiro/pix/cartão)
    const porForma = {};
    receitas.forEach(l => porForma[l.forma] = (porForma[l.forma] || 0) + l.valor);

    return React.createElement('div', { className: 'page' },
      React.createElement('div', { className: 'row', style: { marginBottom: 16, flexWrap: 'wrap', gap: 10 } },
        React.createElement('div', { className: 'seg' },
          [['caixa', 'Caixa do dia'], ['lancamentos', 'Lançamentos'], ['receber', 'A receber'], ['fluxo', 'Fluxo de caixa']].map(([id, lbl]) =>
            React.createElement('button', { key: id, className: tab === id ? 'on' : '', onClick: () => setTab(id) }, lbl))
        ),
        React.createElement('div', { className: 'row', style: { marginLeft: 'auto', gap: 8 } },
          React.createElement('button', { className: 'btn btn-ghost btn-sm', onClick: () => notify('Lançamento adicionado') },
            React.createElement(Icon, { name: 'plus', size: 15 }), 'Lançamento'),
          React.createElement('button', { className: 'btn btn-primary btn-sm', onClick: () => notify('Caixa fechado — conferência registrada') },
            React.createElement(Icon, { name: 'lock', size: 14 }), 'Fechar caixa'))
      ),

      tab === 'caixa' && React.createElement(CaixaDia, { saldo, totRec, totDesp, porForma, receitas, despesas }),
      tab === 'lancamentos' && React.createElement(Lancamentos, { lancs: D.lancamentos }),
      tab === 'receber' && React.createElement(AReceber, { notify }),
      tab === 'fluxo' && React.createElement(Fluxo, null)
    );
  }

  // ---- Caixa do dia ----
  function CaixaDia({ saldo, totRec, totDesp, porForma, receitas, despesas }) {
    return React.createElement('div', { className: 'col', style: { gap: 16 } },
      // status do caixa
      React.createElement('div', { className: 'card card-pad', style: { display: 'flex', alignItems: 'center', gap: 14, borderLeft: '3px solid var(--accent)' } },
        React.createElement('div', { style: { width: 42, height: 42, borderRadius: 11, background: 'var(--accent-soft)', display: 'grid', placeItems: 'center' } },
          React.createElement(Icon, { name: 'money', size: 20, style: { color: 'var(--accent)' } })),
        React.createElement('div', { className: 'col', style: { lineHeight: 1.35 } },
          React.createElement('span', { style: { fontWeight: 700, fontSize: 15 } }, 'Caixa aberto desde ' + D.caixa.abertura),
          React.createElement('span', { className: 'muted', style: { fontSize: 13 } }, 'Operador: ' + D.caixa.operador + ' · abertura ' + D.money(D.caixa.valorAbertura))),
        React.createElement('span', { className: 'pill pill-confirmado', style: { marginLeft: 'auto' } },
          React.createElement('span', { className: 'pdot' }), 'Aberto')
      ),

      // KPIs do caixa
      React.createElement('div', { className: 'stat-grid' },
        React.createElement(FinStat, { label: 'Saldo em caixa', value: D.money(saldo), icon: 'money', cor: 'var(--accent)', bg: 'var(--accent-soft)' }),
        React.createElement(FinStat, { label: 'Receitas do dia', value: D.money(totRec), icon: 'trend', cor: 'var(--accent)', bg: 'var(--accent-soft)' }),
        React.createElement(FinStat, { label: 'Despesas do dia', value: D.money(totDesp), icon: 'trendD', cor: 'var(--st-faltou)', bg: 'var(--st-faltou-bg)' }),
        React.createElement(FinStat, { label: 'Resultado líquido', value: D.money(totRec - totDesp), icon: 'chart', cor: 'var(--st-atendimento)', bg: 'var(--st-atendimento-bg)' })
      ),

      React.createElement('div', { className: 'grid-2', style: { alignItems: 'start' } },
        // conferência por forma de pagamento
        React.createElement('div', { className: 'card' },
          React.createElement('div', { className: 'card-head' },
            React.createElement(Icon, { name: 'coins', size: 17, style: { color: 'var(--text-2)' } }),
            React.createElement('div', { className: 'card-title' }, 'Conferência por forma de pagamento')),
          React.createElement('div', { style: { padding: 18, display: 'flex', flexDirection: 'column', gap: 14 } },
            Object.keys(FORMA).map(f => {
              const val = porForma[f] || 0; const pct = totRec ? Math.round(val / totRec * 100) : 0;
              const fm = FORMA[f];
              return React.createElement('div', { key: f, className: 'col', style: { gap: 7 } },
                React.createElement('div', { className: 'row', style: { gap: 9 } },
                  React.createElement('div', { style: { width: 28, height: 28, borderRadius: 8, background: fm.bg, display: 'grid', placeItems: 'center' } },
                    React.createElement(Icon, { name: fm.icon, size: 15, style: { color: fm.cor } })),
                  React.createElement('span', { style: { fontWeight: 600, fontSize: 14 } }, fm.label),
                  React.createElement('span', { className: 'tnum', style: { marginLeft: 'auto', fontWeight: 700 } }, D.money(val)),
                  React.createElement('span', { className: 'muted tnum', style: { fontSize: 12.5, width: 38, textAlign: 'right' } }, pct + '%')),
                React.createElement('div', { className: 'progress' }, React.createElement('span', { style: { width: pct + '%', background: fm.cor } })));
            })
          )
        ),
        // resumo lançamentos
        React.createElement('div', { className: 'card' },
          React.createElement('div', { className: 'card-head' },
            React.createElement(Icon, { name: 'list', size: 17, style: { color: 'var(--text-2)' } }),
            React.createElement('div', { className: 'card-title' }, 'Movimentações de hoje'),
            React.createElement('span', { className: 'muted', style: { marginLeft: 'auto', fontSize: 13 } }, (receitas.length + despesas.length) + ' lançamentos')),
          React.createElement('div', { style: { maxHeight: 320, overflowY: 'auto' } },
            [...receitas, ...despesas].sort((a, b) => b.hora.localeCompare(a.hora)).map((l, i, arr) =>
              React.createElement(LancRow, { key: l.id, l, last: i === arr.length - 1 })))
        )
      )
    );
  }

  function FinStat({ label, value, icon, cor, bg }) {
    return React.createElement('div', { className: 'stat' },
      React.createElement('div', { className: 'stat-top' },
        React.createElement('div', { className: 'stat-label' }, label),
        React.createElement('div', { className: 'stat-ico', style: { background: bg } },
          React.createElement(Icon, { name: icon, size: 17, style: { color: cor } }))),
      React.createElement('div', { className: 'stat-val tnum' }, value));
  }

  function LancRow({ l, last }) {
    const fm = FORMA[l.forma];
    const isRec = l.tipo === 'receita';
    return React.createElement('div', { className: 'row', style: { gap: 11, padding: '12px 18px', borderBottom: last ? 'none' : '1px solid var(--border)' } },
      React.createElement('div', { style: { width: 30, height: 30, borderRadius: 8, background: isRec ? 'var(--accent-soft)' : 'var(--st-faltou-bg)', display: 'grid', placeItems: 'center' } },
        React.createElement(Icon, { name: isRec ? 'trend' : 'trendD', size: 15, style: { color: isRec ? 'var(--accent)' : 'var(--st-faltou)' } })),
      React.createElement('div', { className: 'col', style: { flex: 1, lineHeight: 1.3, minWidth: 0 } },
        React.createElement('span', { style: { fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, l.desc),
        React.createElement('span', { className: 'muted', style: { fontSize: 12 } }, l.cat + ' · ' + fm.label + ' · ' + l.hora)),
      React.createElement('span', { className: 'tnum', style: { fontWeight: 700, fontSize: 14, color: isRec ? 'var(--accent-text)' : 'var(--st-faltou)' } },
        (isRec ? '+' : '−') + D.money(l.valor).replace('R$ ', 'R$ ')));
  }

  // ---- Lançamentos (tabela completa) ----
  function Lancamentos({ lancs }) {
    const [filtro, setFiltro] = useState('todos');
    let rows = [...lancs].sort((a, b) => b.hora.localeCompare(a.hora));
    if (filtro !== 'todos') rows = rows.filter(r => r.tipo === filtro);
    return React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'filter-bar', style: { padding: 14, borderBottom: '1px solid var(--border)' } },
        React.createElement('div', { className: 'seg' },
          [['todos', 'Todos'], ['receita', 'Receitas'], ['despesa', 'Despesas']].map(([id, l]) =>
            React.createElement('button', { key: id, className: filtro === id ? 'on' : '', onClick: () => setFiltro(id) }, l))),
        React.createElement('button', { className: 'btn btn-ghost btn-sm', style: { marginLeft: 'auto' } },
          React.createElement(Icon, { name: 'download', size: 15 }), 'Exportar')),
      React.createElement('table', { className: 'tbl' },
        React.createElement('thead', null, React.createElement('tr', null,
          ['Hora', 'Descrição', 'Categoria', 'Forma', 'Tipo', 'Valor', ''].map((h, i) => React.createElement('th', { key: i }, h)))),
        React.createElement('tbody', null,
          rows.map(l => {
            const isRec = l.tipo === 'receita'; const fm = FORMA[l.forma];
            return React.createElement('tr', { key: l.id },
              React.createElement('td', { className: 'mono muted', style: { fontSize: 13 } }, l.hora),
              React.createElement('td', { style: { fontWeight: 600 } }, l.desc),
              React.createElement('td', { className: 'muted' }, l.cat),
              React.createElement('td', null, React.createElement('span', { className: 'tag', style: { background: fm.bg, color: fm.cor, borderColor: 'transparent' } }, fm.label)),
              React.createElement('td', null, React.createElement('span', { className: isRec ? 'pill pill-confirmado' : 'pill pill-faltou' }, React.createElement('span', { className: 'pdot' }), isRec ? 'Receita' : 'Despesa')),
              React.createElement('td', { className: 'tnum', style: { fontWeight: 700, color: isRec ? 'var(--accent-text)' : 'var(--st-faltou)' } }, (isRec ? '+' : '−') + D.money(l.valor)),
              React.createElement('td', null, React.createElement(Menu, { items: [{ label: 'Editar', icon: 'edit' }, { label: 'Excluir', icon: 'trash', danger: true }] })));
          }))
      )
    );
  }

  // ---- A receber ----
  function AReceber({ notify }) {
    const total = D.aReceber.reduce((s, r) => s + r.valor, 0);
    const vencidas = D.aReceber.filter(r => r.dias < 0);
    return React.createElement('div', { className: 'col', style: { gap: 16 } },
      React.createElement('div', { className: 'stat-grid', style: { gridTemplateColumns: 'repeat(3,1fr)' } },
        React.createElement(FinStat, { label: 'Total a receber', value: D.money(total), icon: 'money', cor: 'var(--st-pendente)', bg: 'var(--st-pendente-bg)' }),
        React.createElement(FinStat, { label: 'Pendências', value: D.aReceber.length, icon: 'clock', cor: 'var(--st-atendimento)', bg: 'var(--st-atendimento-bg)' }),
        React.createElement(FinStat, { label: 'Vencidas', value: vencidas.length, icon: 'alert', cor: 'var(--st-faltou)', bg: 'var(--st-faltou-bg)' })),
      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-head' }, React.createElement('div', { className: 'card-title' }, 'Contas a receber')),
        React.createElement('table', { className: 'tbl' },
          React.createElement('thead', null, React.createElement('tr', null,
            ['Cliente', 'Descrição', 'Vencimento', 'Valor', ''].map((h, i) => React.createElement('th', { key: i }, h)))),
          React.createElement('tbody', null,
            D.aReceber.map(r => {
              const c = D.cli(r.cli); const venc = r.dias < 0;
              return React.createElement('tr', { key: r.id },
                React.createElement('td', null, React.createElement('div', { className: 'row', style: { gap: 10 } },
                  React.createElement(Avatar, { nome: c.nome, cor: '#2563eb', size: 30 }),
                  React.createElement('span', { style: { fontWeight: 600 } }, c.nome))),
                React.createElement('td', { className: 'muted' }, r.desc),
                React.createElement('td', null, React.createElement('span', { style: { color: venc ? 'var(--st-faltou)' : 'var(--text)', fontWeight: venc ? 600 : 400 } },
                  venc ? 'Vencida há ' + Math.abs(r.dias) + 'd' : 'em ' + r.dias + 'd')),
                React.createElement('td', { className: 'tnum', style: { fontWeight: 700 } }, D.money(r.valor)),
                React.createElement('td', null, React.createElement('div', { className: 'row', style: { gap: 6 } },
                  React.createElement('button', { className: 'btn btn-subtle btn-sm', onClick: () => notify('Lembrete de pagamento enviado') }, React.createElement(Icon, { name: 'whatsapp', size: 14 }), 'Cobrar'),
                  React.createElement('button', { className: 'btn btn-primary btn-sm', onClick: () => notify('Pagamento registrado') }, 'Receber'))));
            }))
        ))
    );
  }

  // ---- Fluxo de caixa ----
  function Fluxo() {
    const max = Math.max(...D.fluxo.map(f => Math.max(f.rec, f.desp)));
    const totRec = D.fluxo.reduce((s, f) => s + f.rec, 0);
    const totDesp = D.fluxo.reduce((s, f) => s + f.desp, 0);
    return React.createElement('div', { className: 'col', style: { gap: 16 } },
      React.createElement('div', { className: 'stat-grid', style: { gridTemplateColumns: 'repeat(3,1fr)' } },
        React.createElement(FinStat, { label: 'Receita (7 dias)', value: D.money(totRec), icon: 'trend', cor: 'var(--accent)', bg: 'var(--accent-soft)' }),
        React.createElement(FinStat, { label: 'Despesa (7 dias)', value: D.money(totDesp), icon: 'trendD', cor: 'var(--st-faltou)', bg: 'var(--st-faltou-bg)' }),
        React.createElement(FinStat, { label: 'Resultado', value: D.money(totRec - totDesp), icon: 'chart', cor: 'var(--st-atendimento)', bg: 'var(--st-atendimento-bg)' })),
      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-head' },
          React.createElement('div', { className: 'card-title' }, 'Fluxo dos últimos 7 dias'),
          React.createElement('div', { className: 'row', style: { marginLeft: 'auto', gap: 14, fontSize: 12.5 } },
            React.createElement('span', { className: 'row', style: { gap: 6 } }, React.createElement('span', { style: { width: 10, height: 10, borderRadius: 3, background: 'var(--accent)' } }), 'Receita'),
            React.createElement('span', { className: 'row', style: { gap: 6 } }, React.createElement('span', { style: { width: 10, height: 10, borderRadius: 3, background: 'var(--st-faltou)' } }), 'Despesa'))),
        React.createElement('div', { style: { padding: '28px 18px 18px', display: 'flex', gap: 14, alignItems: 'flex-end', height: 280 } },
          D.fluxo.map(f =>
            React.createElement('div', { key: f.dia, className: 'col', style: { flex: 1, alignItems: 'center', gap: 8, height: '100%', justifyContent: 'flex-end' } },
              React.createElement('div', { className: 'row', style: { gap: 4, alignItems: 'flex-end', height: '100%', width: '100%', justifyContent: 'center' } },
                React.createElement('div', { title: D.money(f.rec), style: { width: '38%', maxWidth: 26, height: (f.rec / max * 100 || 0.5) + '%', background: 'var(--accent)', borderRadius: '5px 5px 0 0', transition: 'height .3s' } }),
                React.createElement('div', { title: D.money(f.desp), style: { width: '38%', maxWidth: 26, height: (f.desp / max * 100 || 0.5) + '%', background: 'var(--st-faltou)', borderRadius: '5px 5px 0 0', opacity: 0.85, transition: 'height .3s' } })),
              React.createElement('span', { className: 'muted', style: { fontSize: 12, fontWeight: 600 } }, f.dia)))
        ))
    );
  }

  window.Financeiro = Financeiro;
})();
