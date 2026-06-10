/* Tela: Equipe / Profissionais */
(function () {
  const Icon = window.Icon;
  const D = window.DATA;
  const { Avatar, Menu } = window;

  const DIAS = [['seg','S'],['ter','T'],['qua','Q'],['qui','Q'],['sex','S'],['sab','S'],['dom','D']];

  function Equipe() {
    return React.createElement('div', { className: 'page' },
      React.createElement('div', { className: 'row', style: { marginBottom: 16 } },
        React.createElement('div', { className: 'col', style: { lineHeight: 1.3 } },
          React.createElement('div', { style: { fontWeight: 700, fontSize: 16 } }, D.staff.length + ' profissionais ativos'),
          React.createElement('div', { className: 'muted', style: { fontSize: 13 } }, 'Horários, especialidades, comissão e metas alimentam a disponibilidade da agenda.')),
        React.createElement('button', { className: 'btn btn-primary', style: { marginLeft: 'auto' } },
          React.createElement(Icon, { name: 'plus', size: 16 }), 'Adicionar profissional')
      ),

      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 } },
        D.staff.map(p => {
          const pct = Math.round(p.vendido / p.meta * 100);
          const atendeHoje = D.hoje.filter(a => a.prof === p.id).length;
          const comissaoMes = Math.round(p.vendido * p.comissao / 100);
          return React.createElement('div', { key: p.id, className: 'card', style: { padding: 18, display: 'flex', flexDirection: 'column', gap: 15 } },
            // topo
            React.createElement('div', { className: 'row', style: { gap: 13, alignItems: 'flex-start' } },
              React.createElement(Avatar, { nome: p.nome, cor: p.cor, size: 52 }),
              React.createElement('div', { className: 'col', style: { flex: 1, lineHeight: 1.3 } },
                React.createElement('div', { style: { fontWeight: 700, fontSize: 16.5, letterSpacing: '-0.01em' } }, p.nome),
                React.createElement('div', { className: 'muted', style: { fontSize: 13 } }, p.bio)),
              React.createElement(Menu, { items: [{ label: 'Editar perfil', icon: 'edit' }, { label: 'Ver agenda', icon: 'calendar' }, { label: 'Definir folga', icon: 'clock' }, { divider: true }, { label: 'Desativar', icon: 'x', danger: true }] })
            ),

            // especialidades
            React.createElement('div', { className: 'row', style: { gap: 6, flexWrap: 'wrap' } },
              p.especialidades.map(e => React.createElement('span', { key: e, className: 'tag' }, e))),

            React.createElement('div', { className: 'divider' }),

            // meta
            React.createElement('div', { className: 'col', style: { gap: 7 } },
              React.createElement('div', { className: 'row', style: { fontSize: 13 } },
                React.createElement(Icon, { name: 'target', size: 14, style: { color: 'var(--text-3)', marginRight: 6 } }),
                React.createElement('span', { style: { fontWeight: 600 } }, 'Meta do mês'),
                React.createElement('span', { className: 'tnum', style: { marginLeft: 'auto', fontWeight: 700, color: pct >= 100 ? 'var(--accent-text)' : 'var(--text)' } }, D.money(p.vendido) + ' / ' + D.money(p.meta))),
              React.createElement('div', { className: 'progress' }, React.createElement('span', { style: { width: Math.min(pct, 100) + '%', background: pct >= 100 ? 'var(--accent)' : p.cor } })),
              React.createElement('div', { className: 'muted', style: { fontSize: 12 } }, pct + '% da meta')
            ),

            // horário (dias da semana)
            React.createElement('div', { className: 'col', style: { gap: 8 } },
              React.createElement('div', { className: 'row', style: { fontSize: 13 } },
                React.createElement(Icon, { name: 'clock', size: 14, style: { color: 'var(--text-3)', marginRight: 6 } }),
                React.createElement('span', { style: { fontWeight: 600 } }, 'Jornada'),
                React.createElement('span', { className: 'mono muted', style: { marginLeft: 'auto', fontSize: 12.5 } }, p.inicio + '–' + p.fim)),
              React.createElement('div', { className: 'row', style: { gap: 5 } },
                DIAS.map(([d, l], i) => {
                  const folga = p.folga.includes(d);
                  return React.createElement('div', { key: i, title: folga ? 'Folga' : 'Trabalha', style: { flex: 1, textAlign: 'center', padding: '5px 0', borderRadius: 6, fontSize: 11.5, fontWeight: 700, background: folga ? 'var(--surface-2)' : 'var(--accent-soft)', color: folga ? 'var(--text-3)' : 'var(--accent-text)', textDecoration: folga ? 'line-through' : 'none' } }, l);
                }))
            ),

            // rodapé: comissão + atendimentos hoje
            React.createElement('div', { className: 'row', style: { gap: 10, paddingTop: 4 } },
              React.createElement('div', { className: 'col', style: { flex: 1, background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: '9px 12px' } },
                React.createElement('span', { className: 'tnum', style: { fontWeight: 700, fontSize: 15 } }, p.comissao + '%'),
                React.createElement('span', { className: 'muted', style: { fontSize: 11.5 } }, 'comissão · ' + D.money(comissaoMes) + ' no mês')),
              React.createElement('div', { className: 'col', style: { flex: 1, background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: '9px 12px' } },
                React.createElement('span', { className: 'tnum', style: { fontWeight: 700, fontSize: 15 } }, atendeHoje),
                React.createElement('span', { className: 'muted', style: { fontSize: 11.5 } }, 'atendimentos hoje'))
            )
          );
        })
      )
    );
  }

  window.Equipe = Equipe;
})();
