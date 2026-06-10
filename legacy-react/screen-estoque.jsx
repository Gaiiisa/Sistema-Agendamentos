/* Tela: Estoque — produtos, baixa automática, alertas de reposição, histórico */
(function () {
  const { useState } = React;
  const Icon = window.Icon;
  const D = window.DATA;
  const { Menu } = window;

  function nivel(p) {
    if (p.qtd <= p.min * 0.5) return 'critico';
    if (p.qtd <= p.min) return 'baixo';
    return 'ok';
  }
  const NIVEL = {
    critico: { label: 'Crítico', cor: 'var(--st-faltou)', bg: 'var(--st-faltou-bg)' },
    baixo:   { label: 'Baixo', cor: 'var(--st-pendente)', bg: 'var(--st-pendente-bg)' },
    ok:      { label: 'OK', cor: 'var(--accent-text)', bg: 'var(--accent-soft)' },
  };

  function Estoque({ notify }) {
    const [tab, setTab] = useState('produtos');
    const [q, setQ] = useState('');
    const alerta = D.produtos.filter(p => nivel(p) !== 'ok');
    const valorEstoque = D.produtos.reduce((s, p) => s + p.qtd * p.custo, 0);
    const itensConsumo = D.produtos.filter(p => p.consumo).length;

    let list = D.produtos;
    if (q) list = list.filter(p => p.nome.toLowerCase().includes(q.toLowerCase()));

    return React.createElement('div', { className: 'page' },
      React.createElement('div', { className: 'stat-grid', style: { gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 16 } },
        React.createElement(EStat, { label: 'Produtos cadastrados', value: D.produtos.length, icon: 'box', cor: 'var(--text-2)', bg: 'var(--surface-3)' }),
        React.createElement(EStat, { label: 'Valor em estoque', value: D.money(valorEstoque), icon: 'money', cor: 'var(--accent)', bg: 'var(--accent-soft)' }),
        React.createElement(EStat, { label: 'Precisam repor', value: alerta.length, icon: 'alert', cor: 'var(--st-faltou)', bg: 'var(--st-faltou-bg)' }),
        React.createElement(EStat, { label: 'Com baixa automática', value: itensConsumo, icon: 'sparkle', cor: 'var(--st-atendimento)', bg: 'var(--st-atendimento-bg)' })),

      // alerta de reposição
      alerta.length > 0 && React.createElement('div', { className: 'card card-pad', style: { marginBottom: 16, borderLeft: '3px solid var(--st-faltou)' } },
        React.createElement('div', { className: 'row', style: { marginBottom: 10 } },
          React.createElement(Icon, { name: 'alert', size: 17, style: { color: 'var(--st-faltou)' } }),
          React.createElement('div', { style: { fontWeight: 700, fontSize: 14.5 } }, alerta.length + ' produtos no nível mínimo'),
          React.createElement('button', { className: 'btn btn-primary btn-sm', style: { marginLeft: 'auto' }, onClick: () => notify('Pedido de reposição gerado') },
            React.createElement(Icon, { name: 'pkg', size: 14 }), 'Gerar pedido de reposição')),
        React.createElement('div', { className: 'row', style: { gap: 8, flexWrap: 'wrap' } },
          alerta.map(p => React.createElement('span', { key: p.id, className: 'tag', style: { background: NIVEL[nivel(p)].bg, color: NIVEL[nivel(p)].cor, borderColor: 'transparent' } },
            React.createElement('span', { className: 'pdot', style: { width: 6, height: 6, borderRadius: 99, background: 'currentColor' } }),
            p.nome + ' · ' + p.qtd + '/' + p.min)))),

      React.createElement('div', { className: 'row', style: { marginBottom: 16, gap: 10, flexWrap: 'wrap' } },
        React.createElement('div', { className: 'seg' },
          [['produtos', 'Produtos'], ['historico', 'Histórico'], ['consumo', 'Mais consumidos']].map(([id, l]) =>
            React.createElement('button', { key: id, className: tab === id ? 'on' : '', onClick: () => setTab(id) }, l))),
        tab === 'produtos' && React.createElement('div', { className: 'search-inp' },
          React.createElement(Icon, { name: 'search', size: 16 }),
          React.createElement('input', { placeholder: 'Buscar produto…', value: q, onChange: e => setQ(e.target.value) })),
        React.createElement('button', { className: 'btn btn-primary btn-sm', style: { marginLeft: 'auto' }, onClick: () => notify('Novo produto cadastrado') },
          React.createElement(Icon, { name: 'plus', size: 15 }), 'Novo produto')),

      tab === 'produtos' && React.createElement(TabelaProdutos, { list, notify }),
      tab === 'historico' && React.createElement(Historico, null),
      tab === 'consumo' && React.createElement(MaisConsumidos, null)
    );
  }

  function EStat({ label, value, icon, cor, bg }) {
    return React.createElement('div', { className: 'stat' },
      React.createElement('div', { className: 'stat-top' },
        React.createElement('div', { className: 'stat-label' }, label),
        React.createElement('div', { className: 'stat-ico', style: { background: bg } },
          React.createElement(Icon, { name: icon, size: 17, style: { color: cor } }))),
      React.createElement('div', { className: 'stat-val tnum' }, value));
  }

  function TabelaProdutos({ list, notify }) {
    return React.createElement('div', { className: 'card' },
      React.createElement('div', { style: { overflowX: 'auto' } },
        React.createElement('table', { className: 'tbl' },
          React.createElement('thead', null, React.createElement('tr', null,
            ['Produto', 'Categoria', 'Em estoque', 'Mínimo', 'Custo unit.', 'Fornecedor', 'Baixa automática', 'Status', ''].map((h, i) => React.createElement('th', { key: i }, h)))),
          React.createElement('tbody', null,
            list.map(p => {
              const nv = nivel(p), n = NIVEL[nv];
              const pct = Math.min(p.qtd / (p.min * 2) * 100, 100);
              return React.createElement('tr', { key: p.id },
                React.createElement('td', null, React.createElement('div', { className: 'row', style: { gap: 10 } },
                  React.createElement('div', { style: { width: 30, height: 30, borderRadius: 8, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', flexShrink: 0 } },
                    React.createElement(Icon, { name: 'pkg', size: 15, style: { color: 'var(--text-2)' } })),
                  React.createElement('span', { style: { fontWeight: 600 } }, p.nome))),
                React.createElement('td', null, React.createElement('span', { className: 'tag' }, p.cat)),
                React.createElement('td', null, React.createElement('div', { className: 'col', style: { gap: 4, minWidth: 90 } },
                  React.createElement('span', { className: 'tnum', style: { fontWeight: 700, color: n.cor } }, p.qtd + ' un'),
                  React.createElement('div', { className: 'progress', style: { width: 70 } }, React.createElement('span', { style: { width: pct + '%', background: n.cor } })))),
                React.createElement('td', { className: 'tnum muted' }, p.min),
                React.createElement('td', { className: 'tnum' }, D.money(p.custo)),
                React.createElement('td', { className: 'muted', style: { fontSize: 13 } }, p.fornecedor),
                React.createElement('td', null, p.consumo
                  ? React.createElement('span', { className: 'row', style: { gap: 5, fontSize: 12.5, color: 'var(--st-atendimento)' } },
                      React.createElement(Icon, { name: 'sparkle', size: 13 }), p.consumo)
                  : React.createElement('span', { className: 'muted', style: { fontSize: 12.5 } }, '—')),
                React.createElement('td', null, React.createElement('span', { className: 'pill', style: { background: n.bg, color: n.cor } },
                  React.createElement('span', { className: 'pdot' }), n.label)),
                React.createElement('td', null, React.createElement(Menu, { items: [
                  { label: 'Registrar entrada', icon: 'plus', onClick: () => notify('Entrada registrada em ' + p.nome) },
                  { label: 'Registrar saída', icon: 'download' },
                  { label: 'Editar', icon: 'edit' },
                  { divider: true },
                  { label: 'Remover', icon: 'trash', danger: true },
                ] })));
            }))))
    );
  }

  function Historico() {
    return React.createElement('div', { className: 'card' },
      React.createElement('table', { className: 'tbl' },
        React.createElement('thead', null, React.createElement('tr', null,
          ['Data / Hora', 'Produto', 'Movimentação', 'Motivo', 'Qtd'].map((h, i) => React.createElement('th', { key: i }, h)))),
        React.createElement('tbody', null,
          [...D.movEstoque].sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora)).map(m => {
            const p = D.prod(m.prod); const ent = m.tipo === 'entrada';
            return React.createElement('tr', { key: m.id },
              React.createElement('td', { className: 'mono muted', style: { fontSize: 13 } }, D.fmtData(m.data) + ' · ' + m.hora),
              React.createElement('td', { style: { fontWeight: 600 } }, p.nome),
              React.createElement('td', null, React.createElement('span', { className: ent ? 'pill pill-confirmado' : 'pill pill-faltou' },
                React.createElement(Icon, { name: ent ? 'plus' : 'download', size: 12 }), ent ? 'Entrada' : 'Saída')),
              React.createElement('td', { className: 'muted' }, m.motivo),
              React.createElement('td', { className: 'tnum', style: { fontWeight: 700, color: ent ? 'var(--accent-text)' : 'var(--st-faltou)' } }, (ent ? '+' : '−') + m.qtd));
          })))
    );
  }

  function MaisConsumidos() {
    // ranking simulado por consumo
    const rank = [
      { id: 'pr1', n: 38 }, { id: 'pr2', n: 31 }, { id: 'pr7', n: 22 },
      { id: 'pr4', n: 17 }, { id: 'pr5', n: 12 }, { id: 'pr9', n: 6 },
    ];
    const max = rank[0].n;
    return React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'card-head' },
        React.createElement(Icon, { name: 'chart', size: 17, style: { color: 'var(--text-2)' } }),
        React.createElement('div', { className: 'card-title' }, 'Produtos mais consumidos · últimos 30 dias')),
      React.createElement('div', { style: { padding: 18, display: 'flex', flexDirection: 'column', gap: 16 } },
        rank.map((r, i) => {
          const p = D.prod(r.id);
          return React.createElement('div', { key: r.id, className: 'col', style: { gap: 7 } },
            React.createElement('div', { className: 'row', style: { gap: 10 } },
              React.createElement('span', { className: 'tnum', style: { fontWeight: 800, color: 'var(--text-3)', width: 22 } }, '#' + (i + 1)),
              React.createElement('span', { style: { fontWeight: 600, fontSize: 14, flex: 1 } }, p.nome),
              React.createElement('span', { className: 'tnum', style: { fontWeight: 700 } }, r.n + ' un'),
              React.createElement('span', { className: 'muted tnum', style: { fontSize: 12.5 } }, D.money(r.n * p.custo) + ' em custo')),
            React.createElement('div', { className: 'progress', style: { marginLeft: 32 } },
              React.createElement('span', { style: { width: (r.n / max * 100) + '%' } })));
        }))
    );
  }

  window.Estoque = Estoque;
})();
