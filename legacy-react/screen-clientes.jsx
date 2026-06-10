/* Tela: Clientes (CRM) — lista + ficha detalhada (drawer) */
(function () {
  const { useState, useEffect } = React;
  const Icon = window.Icon;
  const D = window.DATA;
  const { Avatar, Tag } = window;

  function Clientes({ openId, onOpen, onClose }) {
    const [q, setQ] = useState('');
    const [tag, setTag] = useState('todos');

    let list = D.clientes;
    if (tag === 'vip') list = list.filter(c => c.tags.includes('vip'));
    else if (tag === 'novo') list = list.filter(c => c.tags.includes('novo'));
    else if (tag === 'sumido') list = list.filter(c => c.tags.includes('sumido'));
    if (q) list = list.filter(c => c.nome.toLowerCase().includes(q.toLowerCase()) || c.wpp.includes(q));

    const sumidos = D.clientes.filter(c => c.tags.includes('sumido')).length;

    const FILTERS = [
      { id: 'todos', label: 'Todos', n: D.clientes.length },
      { id: 'vip', label: 'VIP', n: D.clientes.filter(c => c.tags.includes('vip')).length },
      { id: 'novo', label: 'Novos', n: D.clientes.filter(c => c.tags.includes('novo')).length },
      { id: 'sumido', label: 'Sumidos', n: sumidos },
    ];

    return React.createElement('div', { className: 'page' },
      React.createElement('div', { className: 'row', style: { marginBottom: 16, flexWrap: 'wrap', gap: 10 } },
        React.createElement('div', { className: 'search-inp', style: { minWidth: 300 } },
          React.createElement(Icon, { name: 'search', size: 16 }),
          React.createElement('input', { placeholder: 'Buscar por nome ou WhatsApp…', value: q, onChange: e => setQ(e.target.value) })
        ),
        React.createElement('div', { className: 'seg' },
          FILTERS.map(f => React.createElement('button', { key: f.id, className: tag === f.id ? 'on' : '', onClick: () => setTag(f.id) },
            f.label, React.createElement('span', { style: { marginLeft: 6, opacity: 0.6 } }, f.n)))
        ),
        React.createElement('button', { className: 'btn btn-primary', style: { marginLeft: 'auto' } },
          React.createElement(Icon, { name: 'plus', size: 16 }), 'Novo cliente')
      ),

      sumidos > 0 && tag !== 'sumido' && React.createElement('div', { className: 'card card-pad', style: { marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, borderLeft: '3px solid var(--st-faltou)' } },
        React.createElement('div', { className: 'alert-ico', style: { background: 'var(--st-faltou-bg)' } },
          React.createElement(Icon, { name: 'alert', size: 17, style: { color: 'var(--st-faltou)' } })),
        React.createElement('div', { className: 'col', style: { flex: 1 } },
          React.createElement('div', { style: { fontWeight: 600 } }, sumidos + ' clientes sumiram'),
          React.createElement('div', { className: 'muted', style: { fontSize: 13 } }, 'Não voltam há mais de 60 dias — bons candidatos a uma campanha de retorno.')),
        React.createElement('button', { className: 'btn btn-ghost btn-sm', onClick: () => setTag('sumido') }, 'Ver lista'),
        React.createElement('button', { className: 'btn btn-primary btn-sm' },
          React.createElement(Icon, { name: 'whatsapp', size: 14 }), 'Campanha de retorno')
      ),

      React.createElement('div', { className: 'card' },
        React.createElement('div', { style: { overflowX: 'auto' } },
          React.createElement('table', { className: 'tbl' },
            React.createElement('thead', null,
              React.createElement('tr', null,
                React.createElement('th', null, 'Cliente'),
                React.createElement('th', null, 'WhatsApp'),
                React.createElement('th', null, 'Última visita'),
                React.createElement('th', null, 'Visitas'),
                React.createElement('th', null, 'Ticket médio'),
                React.createElement('th', null, 'Total gasto'),
                React.createElement('th', null, 'Tags')
              )
            ),
            React.createElement('tbody', null,
              list.map(c => {
                const dias = D.diasDesde(c.ultima);
                return React.createElement('tr', { key: c.id, className: 'tbl-row-click', onClick: () => onOpen(c.id) },
                  React.createElement('td', null,
                    React.createElement('div', { className: 'row', style: { gap: 11 } },
                      React.createElement(Avatar, { nome: c.nome, cor: c.tags.includes('vip') ? '#0e9f6e' : c.tags.includes('sumido') ? '#9ca3af' : '#2563eb', size: 36 }),
                      React.createElement('div', { className: 'col', style: { lineHeight: 1.25 } },
                        React.createElement('span', { style: { fontWeight: 600 } }, c.nome),
                        React.createElement('span', { className: 'muted', style: { fontSize: 12.5 } }, c.email)))),
                  React.createElement('td', { className: 'mono muted', style: { fontSize: 13 } }, c.wpp),
                  React.createElement('td', null,
                    React.createElement('span', { style: { color: dias > 60 ? 'var(--st-faltou)' : 'var(--text)' } },
                      dias === 0 ? 'Hoje' : 'há ' + dias + ' dias')),
                  React.createElement('td', { className: 'tnum' }, c.visitas),
                  React.createElement('td', { className: 'tnum' }, D.money(c.ticket)),
                  React.createElement('td', { className: 'tnum', style: { fontWeight: 600 } }, D.money(c.total)),
                  React.createElement('td', null,
                    React.createElement('div', { className: 'row', style: { gap: 5 } },
                      c.tags.map(t => React.createElement(Tag, { key: t, kind: t }))))
                );
              })
            )
          ),
          list.length === 0 && React.createElement('div', { className: 'empty' }, 'Nenhum cliente encontrado.')
        )
      ),

      openId && React.createElement(FichaCliente, { id: openId, onClose })
    );
  }

  // ---------- Ficha do cliente (drawer) ----------
  function FichaCliente({ id, onClose }) {
    const c = D.cli(id);
    const hist = D.historico[id] || [];
    const dias = D.diasDesde(c.ultima);
    const fav = c.fav ? D.prof(c.fav) : null;
    useEffect(() => {
      function esc(e) { if (e.key === 'Escape') onClose(); }
      document.addEventListener('keydown', esc);
      return () => document.removeEventListener('keydown', esc);
    }, []);

    return React.createElement('div', null,
      React.createElement('div', { className: 'drawer-overlay', onClick: onClose }),
      React.createElement('div', { className: 'drawer' },
        // header
        React.createElement('div', { style: { padding: '20px 22px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' } },
          React.createElement('div', { className: 'row', style: { marginBottom: 14 } },
            React.createElement('div', { style: { fontWeight: 700, fontSize: 13, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Ficha do cliente'),
            React.createElement('button', { className: 'icon-btn', style: { marginLeft: 'auto', width: 32, height: 32 }, onClick: onClose },
              React.createElement(Icon, { name: 'x', size: 18 }))
          ),
          React.createElement('div', { className: 'row', style: { gap: 14 } },
            React.createElement(Avatar, { nome: c.nome, cor: c.tags.includes('vip') ? '#0e9f6e' : '#2563eb', size: 58 }),
            React.createElement('div', { className: 'col', style: { gap: 5, flex: 1 } },
              React.createElement('div', { style: { fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' } }, c.nome),
              React.createElement('div', { className: 'row', style: { gap: 6 } }, c.tags.map(t => React.createElement(Tag, { key: t, kind: t })))
            )
          ),
          React.createElement('div', { className: 'row', style: { gap: 8, marginTop: 16 } },
            React.createElement('button', { className: 'btn btn-primary btn-sm', style: { flex: 1 } },
              React.createElement(Icon, { name: 'calendar', size: 15 }), 'Agendar'),
            React.createElement('button', { className: 'btn btn-ghost btn-sm', style: { flex: 1 } },
              React.createElement(Icon, { name: 'whatsapp', size: 15 }), 'WhatsApp'),
            React.createElement('button', { className: 'btn btn-ghost btn-sm btn-icon-only' }, React.createElement(Icon, { name: 'edit', size: 15 }))
          )
        ),

        React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: 22, display: 'flex', flexDirection: 'column', gap: 18 } },
          // métricas
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
            React.createElement(Metric, { label: 'Total gasto', value: D.money(c.total) }),
            React.createElement(Metric, { label: 'Ticket médio', value: D.money(c.ticket) }),
            React.createElement(Metric, { label: 'Visitas', value: c.visitas }),
            React.createElement(Metric, { label: 'Frequência', value: 'a cada ' + c.freq + 'd' })
          ),

          // último atendimento + cashback
          React.createElement('div', { className: 'card card-pad', style: { display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: dias > 60 ? 'var(--st-faltou-bg)' : 'var(--accent-soft)', border: 'none' } },
            React.createElement(Icon, { name: dias > 60 ? 'alert' : 'history', size: 18, style: { color: dias > 60 ? 'var(--st-faltou)' : 'var(--accent)' } }),
            React.createElement('div', { className: 'col', style: { lineHeight: 1.3 } },
              React.createElement('span', { style: { fontWeight: 600, fontSize: 13.5, color: dias > 60 ? 'var(--st-faltou)' : 'var(--accent-text)' } }, dias === 0 ? 'Esteve aqui hoje' : 'Última visita há ' + dias + ' dias'),
              React.createElement('span', { style: { fontSize: 12.5, color: dias > 60 ? 'var(--st-faltou)' : 'var(--accent-text)', opacity: 0.85 } }, dias > 60 ? 'Cliente sumido — vale uma mensagem' : 'Cliente ativo'))
          ),

          // contato
          React.createElement(Section, { title: 'Contato' },
            React.createElement(InfoRow, { icon: 'whatsapp', label: 'WhatsApp', value: c.wpp }),
            React.createElement(InfoRow, { icon: 'mail', label: 'E-mail', value: c.email }),
            React.createElement(InfoRow, { icon: 'cake', label: 'Nascimento', value: c.nasc.split('-').reverse().join('/') }),
            fav && React.createElement(InfoRow, { icon: 'star', label: 'Profissional favorito', value: fav.nome })
          ),

          // fidelidade
          React.createElement(Section, { title: 'Fidelidade' },
            React.createElement('div', { className: 'card card-pad', style: { display: 'flex', alignItems: 'center', gap: 12, padding: 14 } },
              React.createElement('div', { style: { width: 40, height: 40, borderRadius: 10, background: 'oklch(0.96 0.05 82)', display: 'grid', placeItems: 'center' } },
                React.createElement(Icon, { name: 'coins', size: 19, style: { color: 'oklch(0.5 0.12 75)' } })),
              React.createElement('div', { className: 'col', style: { flex: 1, lineHeight: 1.3 } },
                React.createElement('span', { style: { fontWeight: 700, fontSize: 15 } }, (c.visitas % 10) + ' / 10 cortes'),
                React.createElement('span', { className: 'muted', style: { fontSize: 12.5 } }, 'Faltam ' + (10 - c.visitas % 10) + ' para um corte grátis')),
              React.createElement('div', { className: 'progress', style: { width: 70 } },
                React.createElement('span', { style: { width: (c.visitas % 10) * 10 + '%' } })))
          ),

          // observações
          c.obs && React.createElement(Section, { title: 'Observações' },
            React.createElement('div', { style: { fontSize: 13.5, color: 'var(--text-2)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 12, lineHeight: 1.5 } }, c.obs)),

          // histórico
          React.createElement(Section, { title: 'Histórico de atendimentos' },
            hist.length === 0
              ? React.createElement('div', { className: 'muted', style: { fontSize: 13 } }, 'Sem atendimentos registrados.')
              : React.createElement('div', { className: 'col', style: { gap: 0 } },
                  hist.map((h, i) => {
                    const s = D.srv(h.srv), p = D.prof(h.prof);
                    return React.createElement('div', { key: i, className: 'row', style: { gap: 11, padding: '11px 0', borderBottom: i < hist.length - 1 ? '1px solid var(--border)' : 'none' } },
                      React.createElement('div', { style: { width: 3, alignSelf: 'stretch', borderRadius: 99, background: s.cor } }),
                      React.createElement('div', { className: 'col', style: { flex: 1, lineHeight: 1.3 } },
                        React.createElement('span', { style: { fontWeight: 600, fontSize: 13.5 } }, s.nome),
                        React.createElement('span', { className: 'muted', style: { fontSize: 12.5 } }, p.apelido + ' · ' + h.data.split('-').reverse().slice(0,2).join('/'))),
                      React.createElement('span', { className: 'tnum', style: { fontWeight: 600, fontSize: 13.5 } }, D.money(h.valor)));
                  })
                )
          )
        )
      )
    );
  }

  function Metric({ label, value }) {
    return React.createElement('div', { className: 'card', style: { padding: '12px 14px' } },
      React.createElement('div', { className: 'stat-val tnum', style: { fontSize: 21 } }, value),
      React.createElement('div', { className: 'stat-label', style: { fontSize: 12 } }, label));
  }
  function Section({ title, children }) {
    return React.createElement('div', { className: 'col', style: { gap: 10 } },
      React.createElement('div', { style: { fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-3)' } }, title),
      children);
  }
  function InfoRow({ icon, label, value }) {
    return React.createElement('div', { className: 'row', style: { gap: 11, padding: '4px 0' } },
      React.createElement('div', { style: { width: 30, height: 30, borderRadius: 8, background: 'var(--surface-2)', display: 'grid', placeItems: 'center' } },
        React.createElement(Icon, { name: icon, size: 15, style: { color: 'var(--text-2)' } })),
      React.createElement('div', { className: 'col', style: { lineHeight: 1.3 } },
        React.createElement('span', { className: 'muted', style: { fontSize: 12 } }, label),
        React.createElement('span', { style: { fontWeight: 600, fontSize: 13.5 } }, value)));
  }

  window.Clientes = Clientes;
})();
