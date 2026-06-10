/* Tela: Comissões — cálculo automático por profissional, fechamento, recibo */
(function () {
  const { useState } = React;
  const Icon = window.Icon;
  const D = window.DATA;
  const { Avatar, Modal } = window;

  function calc(profId) {
    const p = D.prof(profId);
    const c = D.comissoes[profId];
    const bruto = c.itens.reduce((s, i) => s + i.valor, 0);
    const comissao = Math.round(bruto * p.comissao / 100);
    return { p, c, bruto, comissao, qtd: c.itens.length };
  }

  function Comissoes({ notify }) {
    const [recibo, setRecibo] = useState(null);
    const [periodo, setPeriodo] = useState('quinzena');
    const dados = D.staff.map(p => calc(p.id));
    const totalComissao = dados.reduce((s, d) => s + d.comissao, 0);
    const aPagar = dados.filter(d => d.c.status === 'aberto').reduce((s, d) => s + d.comissao, 0);
    const pago = dados.filter(d => d.c.status === 'pago').reduce((s, d) => s + d.comissao, 0);

    return React.createElement('div', { className: 'page' },
      React.createElement('div', { className: 'row', style: { marginBottom: 16, flexWrap: 'wrap', gap: 10 } },
        React.createElement('div', { className: 'col', style: { lineHeight: 1.3 } },
          React.createElement('div', { style: { fontWeight: 700, fontSize: 16 } }, 'Período: ' + D.periodoComissao),
          React.createElement('div', { className: 'muted', style: { fontSize: 13 } }, 'Cálculo automático sobre atendimentos concluídos.')),
        React.createElement('div', { className: 'seg', style: { marginLeft: 'auto' } },
          [['semana', 'Semana'], ['quinzena', 'Quinzena'], ['mes', 'Mês']].map(([id, l]) =>
            React.createElement('button', { key: id, className: periodo === id ? 'on' : '', onClick: () => setPeriodo(id) }, l)))
      ),

      React.createElement('div', { className: 'stat-grid', style: { gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 16 } },
        React.createElement(CStat, { label: 'Total em comissões', value: D.money(totalComissao), icon: 'coins', cor: 'var(--accent)', bg: 'var(--accent-soft)' }),
        React.createElement(CStat, { label: 'A pagar', value: D.money(aPagar), icon: 'clock', cor: 'var(--st-pendente)', bg: 'var(--st-pendente-bg)' }),
        React.createElement(CStat, { label: 'Já pago', value: D.money(pago), icon: 'check', cor: 'var(--st-atendimento)', bg: 'var(--st-atendimento-bg)' })),

      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px,1fr))', gap: 16 } },
        dados.map(d =>
          React.createElement('div', { key: d.p.id, className: 'card', style: { padding: 18, display: 'flex', flexDirection: 'column', gap: 14 } },
            React.createElement('div', { className: 'row', style: { gap: 12 } },
              React.createElement(Avatar, { nome: d.p.nome, cor: d.p.cor, size: 44 }),
              React.createElement('div', { className: 'col', style: { flex: 1, lineHeight: 1.3 } },
                React.createElement('div', { style: { fontWeight: 700, fontSize: 15.5 } }, d.p.nome),
                React.createElement('div', { className: 'muted', style: { fontSize: 12.5 } }, d.p.comissao + '% · ' + d.qtd + ' atendimentos')),
              d.c.status === 'pago'
                ? React.createElement('span', { className: 'pill pill-confirmado' }, React.createElement(Icon, { name: 'check', size: 12 }), 'Pago')
                : React.createElement('span', { className: 'pill pill-pendente' }, React.createElement('span', { className: 'pdot' }), 'A pagar')),

            React.createElement('div', { className: 'row', style: { gap: 10 } },
              React.createElement('div', { className: 'col', style: { flex: 1, background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: '10px 13px' } },
                React.createElement('span', { className: 'muted', style: { fontSize: 11.5 } }, 'Faturou'),
                React.createElement('span', { className: 'tnum', style: { fontWeight: 700, fontSize: 16 } }, D.money(d.bruto))),
              React.createElement('div', { className: 'col', style: { flex: 1, background: 'var(--accent-soft)', borderRadius: 'var(--r-md)', padding: '10px 13px' } },
                React.createElement('span', { style: { fontSize: 11.5, color: 'var(--accent-text)' } }, 'Comissão'),
                React.createElement('span', { className: 'tnum', style: { fontWeight: 800, fontSize: 16, color: 'var(--accent-text)' } }, D.money(d.comissao)))),

            // detalhamento serviço a serviço
            React.createElement('div', { className: 'col', style: { gap: 0, border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' } },
              d.c.itens.slice(0, 3).map((it, i) => {
                const s = D.srv(it.srv), c = D.cli(it.cli);
                return React.createElement('div', { key: i, className: 'row', style: { gap: 9, padding: '8px 11px', borderBottom: i < Math.min(3, d.c.itens.length) - 1 || d.c.itens.length > 3 ? '1px solid var(--border)' : 'none', fontSize: 12.5 } },
                  React.createElement('span', { style: { width: 7, height: 7, borderRadius: 2, background: s.cor, flexShrink: 0 } }),
                  React.createElement('span', { style: { fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 } }, s.nome),
                  React.createElement('span', { className: 'muted', style: { fontSize: 11.5 } }, D.fmtData(it.data)),
                  React.createElement('span', { className: 'tnum', style: { fontWeight: 600 } }, D.money(it.valor)));
              }),
              d.c.itens.length > 3 && React.createElement('div', { style: { padding: '7px 11px', fontSize: 12, color: 'var(--text-3)', fontWeight: 600 } }, '+ ' + (d.c.itens.length - 3) + ' atendimentos')),

            React.createElement('div', { className: 'row', style: { gap: 8 } },
              React.createElement('button', { className: 'btn btn-ghost btn-sm', style: { flex: 1 }, onClick: () => setRecibo(d) },
                React.createElement(Icon, { name: 'download', size: 14 }), 'Recibo'),
              d.c.status === 'aberto'
                ? React.createElement('button', { className: 'btn btn-primary btn-sm', style: { flex: 1 }, onClick: () => notify('Comissão de ' + d.p.apelido + ' marcada como paga') },
                    React.createElement(Icon, { name: 'check', size: 14 }), 'Pagar ' + D.money(d.comissao))
                : React.createElement('button', { className: 'btn btn-subtle btn-sm', style: { flex: 1 }, disabled: true }, 'Quitado'))
          ))
      ),

      recibo && React.createElement(Recibo, { d: recibo, onClose: () => setRecibo(null), notify })
    );
  }

  function CStat({ label, value, icon, cor, bg }) {
    return React.createElement('div', { className: 'stat', style: { flexDirection: 'row', alignItems: 'center', gap: 14 } },
      React.createElement('div', { className: 'stat-ico', style: { background: bg, width: 44, height: 44 } },
        React.createElement(Icon, { name: icon, size: 21, style: { color: cor } })),
      React.createElement('div', { className: 'col' },
        React.createElement('div', { className: 'stat-val tnum', style: { fontSize: 23 } }, value),
        React.createElement('div', { className: 'stat-label' }, label)));
  }

  // ---- Recibo (modal) ----
  function Recibo({ d, onClose, notify }) {
    return React.createElement(Modal, { title: 'Recibo de comissão', onClose,
      foot: React.createElement(React.Fragment, null,
        React.createElement('button', { className: 'btn btn-ghost', onClick: onClose }, 'Fechar'),
        React.createElement('button', { className: 'btn btn-primary', onClick: () => { onClose(); notify('Recibo gerado em PDF'); } },
          React.createElement(Icon, { name: 'download', size: 15 }), 'Baixar PDF'))
    },
      React.createElement('div', { style: { textAlign: 'center', paddingBottom: 6 } },
        React.createElement('div', { style: { fontWeight: 800, fontSize: 17, letterSpacing: '-0.01em' } }, D.estabelecimento.nome),
        React.createElement('div', { className: 'muted', style: { fontSize: 13 } }, 'Recibo de comissão · ' + D.periodoComissao)),
      React.createElement('div', { className: 'divider' }),
      React.createElement('div', { className: 'row', style: { gap: 12 } },
        React.createElement(Avatar, { nome: d.p.nome, cor: d.p.cor, size: 42 }),
        React.createElement('div', { className: 'col', style: { lineHeight: 1.3 } },
          React.createElement('span', { style: { fontWeight: 700, fontSize: 15 } }, d.p.nome),
          React.createElement('span', { className: 'muted', style: { fontSize: 12.5 } }, 'Comissão de ' + d.p.comissao + '% · ' + d.qtd + ' atendimentos'))),
      React.createElement('table', { className: 'tbl', style: { border: '1px solid var(--border)', borderRadius: 'var(--r-md)' } },
        React.createElement('thead', null, React.createElement('tr', null,
          ['Data', 'Cliente', 'Serviço', 'Valor', 'Comissão'].map((h, i) => React.createElement('th', { key: i }, h)))),
        React.createElement('tbody', null,
          d.c.itens.map((it, i) => {
            const s = D.srv(it.srv), c = D.cli(it.cli);
            return React.createElement('tr', { key: i },
              React.createElement('td', { className: 'mono', style: { fontSize: 12.5 } }, D.fmtData(it.data)),
              React.createElement('td', null, c.nome.split(' ')[0]),
              React.createElement('td', null, s.nome),
              React.createElement('td', { className: 'tnum' }, D.money(it.valor)),
              React.createElement('td', { className: 'tnum', style: { fontWeight: 600 } }, D.money(Math.round(it.valor * d.p.comissao / 100))));
          }))),
      React.createElement('div', { className: 'row', style: { padding: '12px 14px', background: 'var(--accent-soft)', borderRadius: 'var(--r-md)' } },
        React.createElement('span', { style: { fontWeight: 700, color: 'var(--accent-text)' } }, 'Total a receber'),
        React.createElement('span', { className: 'tnum', style: { marginLeft: 'auto', fontWeight: 800, fontSize: 18, color: 'var(--accent-text)' } }, D.money(d.comissao)))
    );
  }

  window.Comissoes = Comissoes;
})();
