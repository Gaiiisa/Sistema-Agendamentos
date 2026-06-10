/* Tela: Agendamentos — gestão em lista, filtros, ações em massa */
(function () {
  const { useState } = React;
  const Icon = window.Icon;
  const D = window.DATA;
  const { Avatar, StatusPill, Menu } = window;

  const TABS = [
    { id: 'todos', label: 'Todos' },
    { id: 'proximos', label: 'Próximos' },
    { id: 'faltas', label: 'Faltas & Cancelamentos' },
  ];

  function Agendamentos({ onOpenCliente }) {
    const [tab, setTab] = useState('todos');
    const [q, setQ] = useState('');
    const [profF, setProfF] = useState('todos');
    const [statusF, setStatusF] = useState('todos');
    const [sel, setSel] = useState([]);

    let rows = [...D.agendamentos].sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora));
    if (tab === 'faltas') rows = rows.filter(r => r.status === 'faltou' || r.status === 'cancelado');
    if (tab === 'proximos') rows = rows.filter(r => r.data >= '2026-06-09' && !['faltou','cancelado','concluido'].includes(r.status));
    if (profF !== 'todos') rows = rows.filter(r => r.prof === profF);
    if (statusF !== 'todos') rows = rows.filter(r => r.status === statusF);
    if (q) rows = rows.filter(r => D.cli(r.cli).nome.toLowerCase().includes(q.toLowerCase()));

    const allSel = rows.length > 0 && rows.every(r => sel.includes(r.id));
    const toggleAll = () => setSel(allSel ? [] : rows.map(r => r.id));
    const toggle = (id) => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

    // resumo faltas
    const totalFaltas = D.agendamentos.filter(r => r.status === 'faltou').length;
    const totalCancel = D.agendamentos.filter(r => r.status === 'cancelado').length;
    const custoFaltas = D.agendamentos.filter(r => r.status === 'faltou').reduce((s, r) => s + r.valor, 0);

    return React.createElement('div', { className: 'page' },
      React.createElement('div', { className: 'seg', style: { marginBottom: 16 } },
        TABS.map(t => React.createElement('button', { key: t.id, className: tab === t.id ? 'on' : '', onClick: () => { setTab(t.id); setSel([]); } }, t.label))
      ),

      tab === 'faltas' && React.createElement('div', { className: 'stat-grid', style: { gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 16 } },
        React.createElement(MiniStat, { label: 'Faltas (no-show)', value: totalFaltas, color: 'var(--st-faltou)', bg: 'var(--st-faltou-bg)', icon: 'alert' }),
        React.createElement(MiniStat, { label: 'Cancelamentos', value: totalCancel, color: 'var(--st-cancelado)', bg: 'var(--st-cancelado-bg)', icon: 'x' }),
        React.createElement(MiniStat, { label: 'Receita perdida c/ faltas', value: D.money(custoFaltas), color: 'var(--st-pendente)', bg: 'var(--st-pendente-bg)', icon: 'money' })
      ),

      React.createElement('div', { className: 'card' },
        // toolbar
        React.createElement('div', { className: 'filter-bar', style: { padding: 14, borderBottom: '1px solid var(--border)' } },
          React.createElement('div', { className: 'search-inp' },
            React.createElement(Icon, { name: 'search', size: 16 }),
            React.createElement('input', { placeholder: 'Buscar cliente…', value: q, onChange: e => setQ(e.target.value) })
          ),
          React.createElement('select', { className: 'select', style: { width: 'auto' }, value: profF, onChange: e => setProfF(e.target.value) },
            React.createElement('option', { value: 'todos' }, 'Profissional'),
            D.staff.map(p => React.createElement('option', { key: p.id, value: p.id }, p.apelido))
          ),
          React.createElement('select', { className: 'select', style: { width: 'auto' }, value: statusF, onChange: e => setStatusF(e.target.value) },
            React.createElement('option', { value: 'todos' }, 'Status'),
            D.status.map(s => React.createElement('option', { key: s, value: s }, D.statusLabels[s]))
          ),
          React.createElement('button', { className: 'btn btn-ghost btn-sm', style: { marginLeft: 'auto' } },
            React.createElement(Icon, { name: 'download', size: 15 }), 'Exportar')
        ),

        // barra de ações em massa
        sel.length > 0 && React.createElement('div', { className: 'row', style: { padding: '10px 16px', background: 'var(--accent-soft)', borderBottom: '1px solid var(--accent-soft-2)', gap: 10 } },
          React.createElement('div', { style: { fontWeight: 600, fontSize: 13.5, color: 'var(--accent-text)' } }, sel.length + ' selecionado(s)'),
          React.createElement('button', { className: 'btn btn-sm', style: { background: 'var(--surface)', color: 'var(--accent-text)', marginLeft: 'auto' } },
            React.createElement(Icon, { name: 'check', size: 14 }), 'Confirmar'),
          React.createElement('button', { className: 'btn btn-sm', style: { background: 'var(--surface)', color: 'var(--text)' } },
            React.createElement(Icon, { name: 'whatsapp', size: 14 }), 'Lembrar'),
          React.createElement('button', { className: 'btn btn-sm', style: { background: 'var(--surface)', color: 'var(--st-faltou)' } },
            React.createElement(Icon, { name: 'x', size: 14 }), 'Cancelar'),
          React.createElement('button', { className: 'icon-btn', style: { width: 30, height: 30 }, onClick: () => setSel([]) }, React.createElement(Icon, { name: 'x', size: 16 }))
        ),

        // tabela
        React.createElement('div', { style: { overflowX: 'auto' } },
          React.createElement('table', { className: 'tbl' },
            React.createElement('thead', null,
              React.createElement('tr', null,
                React.createElement('th', { style: { width: 36 } },
                  React.createElement('div', { className: 'checkbox' + (allSel ? ' on' : ''), onClick: toggleAll },
                    allSel && React.createElement(Icon, { name: 'check', size: 13, stroke: 3 }))),
                React.createElement('th', null, 'Cliente'),
                React.createElement('th', null, 'Serviço'),
                React.createElement('th', null, 'Profissional'),
                React.createElement('th', null, 'Data / Hora'),
                React.createElement('th', null, 'Valor'),
                React.createElement('th', null, 'Status'),
                React.createElement('th', { style: { width: 44 } })
              )
            ),
            React.createElement('tbody', null,
              rows.map(r => {
                const c = D.cli(r.cli), s = D.srv(r.srv), p = D.prof(r.prof);
                const on = sel.includes(r.id);
                return React.createElement('tr', { key: r.id, style: on ? { background: 'var(--accent-soft)' } : null },
                  React.createElement('td', null,
                    React.createElement('div', { className: 'checkbox' + (on ? ' on' : ''), onClick: () => toggle(r.id) },
                      on && React.createElement(Icon, { name: 'check', size: 13, stroke: 3 }))),
                  React.createElement('td', null,
                    React.createElement('div', { className: 'row', style: { gap: 10, cursor: 'pointer' }, onClick: () => onOpenCliente(c.id) },
                      React.createElement(Avatar, { nome: c.nome, cor: p.cor, size: 32 }),
                      React.createElement('span', { style: { fontWeight: 600 } }, c.nome))),
                  React.createElement('td', null, React.createElement('span', { className: 'row', style: { gap: 7 } },
                    React.createElement('span', { style: { width: 8, height: 8, borderRadius: 3, background: s.cor } }), s.nome)),
                  React.createElement('td', { className: 'muted' }, p.apelido),
                  React.createElement('td', { className: 'tnum' }, D.fmtData(r.data) + ' · ' + r.hora),
                  React.createElement('td', { className: 'tnum', style: { fontWeight: 600 } }, D.money(r.valor)),
                  React.createElement('td', null, React.createElement(StatusPill, { status: r.status })),
                  React.createElement('td', null, React.createElement(Menu, {
                    items: [
                      { label: 'Confirmar', icon: 'check' },
                      { label: 'Reagendar', icon: 'calendar' },
                      { label: 'Enviar lembrete', icon: 'whatsapp' },
                      { divider: true },
                      { label: 'Cancelar', icon: 'x', danger: true },
                    ]
                  }))
                );
              })
            )
          ),
          rows.length === 0 && React.createElement('div', { className: 'empty' }, 'Nenhum agendamento encontrado com esses filtros.')
        ),
        React.createElement('div', { className: 'row', style: { padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--text-3)' } },
          rows.length + ' agendamento(s)',
          React.createElement('div', { className: 'row', style: { marginLeft: 'auto', gap: 4 } },
            React.createElement('button', { className: 'btn btn-subtle btn-sm' }, 'Anterior'),
            React.createElement('button', { className: 'btn btn-subtle btn-sm' }, 'Próxima'))
        )
      )
    );
  }

  function MiniStat({ label, value, color, bg, icon }) {
    return React.createElement('div', { className: 'stat', style: { flexDirection: 'row', alignItems: 'center', gap: 14 } },
      React.createElement('div', { className: 'stat-ico', style: { background: bg, width: 42, height: 42 } },
        React.createElement(Icon, { name: icon, size: 20, style: { color } })),
      React.createElement('div', { className: 'col' },
        React.createElement('div', { className: 'stat-val tnum', style: { fontSize: 24 } }, value),
        React.createElement('div', { className: 'stat-label' }, label))
    );
  }

  window.Agendamentos = Agendamentos;
})();
