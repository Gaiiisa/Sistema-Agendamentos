/* Tela: Relatórios / BI — faturamento, ocupação, no-show, rankings, novos×recorrentes */
(function () {
  const { useState } = React;
  const Icon = window.Icon;
  const D = window.DATA;
  const { Avatar } = window;

  const FORMA_COR = { 'Pix': 'var(--st-atendimento)', 'Cartão': 'oklch(0.5 0.12 300)', 'Dinheiro': 'var(--accent)' };

  function Relatorios({ notify }) {
    const [periodo, setPeriodo] = useState('mes');
    const r = D.relatorio;
    const delta = Math.round((r.faturamento - r.faturamentoAnt) / r.faturamentoAnt * 100);
    const totalClientes = r.novos + r.recorrentes;

    return React.createElement('div', { className: 'page' },
      React.createElement('div', { className: 'row', style: { marginBottom: 16, gap: 10, flexWrap: 'wrap' } },
        React.createElement('div', { className: 'col', style: { lineHeight: 1.3 } },
          React.createElement('div', { style: { fontWeight: 700, fontSize: 16 } }, 'Visão geral · ' + r.periodo),
          React.createElement('div', { className: 'muted', style: { fontSize: 13 } }, 'Indicadores-chave de eficiência do negócio.')),
        React.createElement('div', { className: 'seg', style: { marginLeft: 'auto' } },
          [['semana', 'Semana'], ['mes', 'Mês'], ['ano', 'Ano']].map(([id, l]) =>
            React.createElement('button', { key: id, className: periodo === id ? 'on' : '', onClick: () => setPeriodo(id) }, l))),
        React.createElement('button', { className: 'btn btn-ghost btn-sm', onClick: () => notify('Relatório exportado em PDF') },
          React.createElement(Icon, { name: 'download', size: 15 }), 'Exportar')),

      // KPIs principais
      React.createElement('div', { className: 'stat-grid', style: { marginBottom: 16 } },
        React.createElement(RStat, { label: 'Faturamento', value: D.money(r.faturamento), icon: 'money', cor: 'var(--accent)', bg: 'var(--accent-soft)', trend: (delta >= 0 ? '+' : '') + delta + '%', up: delta >= 0, sub: 'vs. período anterior' }),
        React.createElement(RStat, { label: 'Ticket médio', value: D.money(r.ticketMedio), icon: 'coins', cor: 'var(--st-atendimento)', bg: 'var(--st-atendimento-bg)', sub: r.atendimentos + ' atendimentos' }),
        React.createElement(RStat, { label: 'Taxa de ocupação', value: r.ocupacao + '%', icon: 'target', cor: 'var(--accent)', bg: 'var(--accent-soft)', sub: 'horas vendidas / disponíveis' }),
        React.createElement(RStat, { label: 'Taxa de no-show', value: r.noShowTaxa + '%', icon: 'alert', cor: 'var(--st-faltou)', bg: 'var(--st-faltou-bg)', sub: r.noShowQtd + ' faltas · ' + D.money(r.noShowCusto) + ' perdidos' })),

      React.createElement('div', { className: 'grid-2', style: { alignItems: 'start', marginBottom: 16 } },
        // ranking de serviços
        React.createElement('div', { className: 'card' },
          React.createElement('div', { className: 'card-head' },
            React.createElement(Icon, { name: 'scissors', size: 16, style: { color: 'var(--text-2)' } }),
            React.createElement('div', { className: 'card-title' }, 'Ranking de serviços'),
            React.createElement('span', { className: 'muted', style: { marginLeft: 'auto', fontSize: 12.5 } }, 'por receita')),
          React.createElement('div', { style: { padding: 18, display: 'flex', flexDirection: 'column', gap: 15 } },
            (() => { const max = Math.max(...r.rankingServicos.map(x => x.receita)); return r.rankingServicos.map((x, i) => {
              const s = D.srv(x.srv);
              return React.createElement('div', { key: x.srv, className: 'col', style: { gap: 7 } },
                React.createElement('div', { className: 'row', style: { gap: 9 } },
                  React.createElement('span', { style: { width: 8, height: 8, borderRadius: 3, background: s.cor, flexShrink: 0 } }),
                  React.createElement('span', { style: { fontWeight: 600, fontSize: 13.5, flex: 1 } }, s.nome),
                  React.createElement('span', { className: 'muted tnum', style: { fontSize: 12.5 } }, x.qtd + 'x'),
                  React.createElement('span', { className: 'tnum', style: { fontWeight: 700, fontSize: 13.5 } }, D.money(x.receita))),
                React.createElement('div', { className: 'progress' }, React.createElement('span', { style: { width: (x.receita / max * 100) + '%', background: s.cor } })));
            }); })())
        ),
        // ranking de profissionais
        React.createElement('div', { className: 'card' },
          React.createElement('div', { className: 'card-head' },
            React.createElement(Icon, { name: 'team', size: 16, style: { color: 'var(--text-2)' } }),
            React.createElement('div', { className: 'card-title' }, 'Ranking de profissionais'),
            React.createElement('span', { className: 'muted', style: { marginLeft: 'auto', fontSize: 12.5 } }, 'faturamento')),
          React.createElement('div', { style: { padding: '8px 0' } },
            (() => { const ord = [...D.staff].sort((a, b) => b.vendido - a.vendido); const max = ord[0].vendido; return ord.map((p, i) =>
              React.createElement('div', { key: p.id, className: 'row', style: { gap: 12, padding: '11px 18px' } },
                React.createElement('span', { className: 'tnum', style: { fontWeight: 800, color: i === 0 ? 'var(--accent)' : 'var(--text-3)', width: 20 } }, '#' + (i + 1)),
                React.createElement(Avatar, { nome: p.nome, cor: p.cor, size: 34 }),
                React.createElement('div', { className: 'col', style: { flex: 1, lineHeight: 1.25, gap: 4 } },
                  React.createElement('span', { style: { fontWeight: 600, fontSize: 13.5 } }, p.nome),
                  React.createElement('div', { className: 'progress' }, React.createElement('span', { style: { width: (p.vendido / max * 100) + '%', background: p.cor } }))),
                React.createElement('span', { className: 'tnum', style: { fontWeight: 700 } }, D.money(p.vendido)))); })())
        )
      ),

      React.createElement('div', { className: 'grid-dash', style: { alignItems: 'start' } },
        // ocupação por dia da semana
        React.createElement('div', { className: 'card' },
          React.createElement('div', { className: 'card-head' },
            React.createElement(Icon, { name: 'calendar', size: 16, style: { color: 'var(--text-2)' } }),
            React.createElement('div', { className: 'card-title' }, 'Ocupação da agenda por dia')),
          React.createElement('div', { style: { padding: '28px 18px 16px', display: 'flex', gap: 12, alignItems: 'flex-end', height: 230 } },
            D.relatorio.ocupacaoSemana.map(d =>
              React.createElement('div', { key: d.dia, className: 'col', style: { flex: 1, alignItems: 'center', gap: 8, height: '100%', justifyContent: 'flex-end' } },
                React.createElement('span', { className: 'tnum', style: { fontSize: 12, fontWeight: 700, color: d.pct >= 90 ? 'var(--accent-text)' : 'var(--text-3)' } }, d.pct + '%'),
                React.createElement('div', { style: { width: '60%', maxWidth: 38, height: (d.pct || 1) + '%', background: d.pct >= 90 ? 'var(--accent)' : d.pct >= 70 ? 'color-mix(in oklch, var(--accent) 65%, white)' : 'var(--surface-3)', borderRadius: '6px 6px 0 0', transition: 'height .3s' } }),
                React.createElement('span', { className: 'muted', style: { fontSize: 12, fontWeight: 600 } }, d.dia)))
          )
        ),
        React.createElement('div', { className: 'col', style: { gap: 16 } },
          // por forma de pagamento
          React.createElement('div', { className: 'card card-pad' },
            React.createElement('div', { style: { fontWeight: 700, fontSize: 14.5, marginBottom: 14 } }, 'Faturamento por forma'),
            React.createElement('div', { className: 'col', style: { gap: 12 } },
              r.porForma.map(f =>
                React.createElement('div', { key: f.forma, className: 'col', style: { gap: 6 } },
                  React.createElement('div', { className: 'row', style: { gap: 8 } },
                    React.createElement('span', { style: { width: 9, height: 9, borderRadius: 3, background: FORMA_COR[f.forma] } }),
                    React.createElement('span', { style: { fontWeight: 600, fontSize: 13.5, flex: 1 } }, f.forma),
                    React.createElement('span', { className: 'tnum', style: { fontWeight: 700, fontSize: 13.5 } }, D.money(f.valor))),
                  React.createElement('div', { className: 'progress' }, React.createElement('span', { style: { width: f.pct + '%', background: FORMA_COR[f.forma] } }))))
            )
          ),
          // novos x recorrentes
          React.createElement('div', { className: 'card card-pad' },
            React.createElement('div', { style: { fontWeight: 700, fontSize: 14.5, marginBottom: 14 } }, 'Novos × recorrentes'),
            React.createElement('div', { className: 'row', style: { height: 14, borderRadius: 99, overflow: 'hidden', marginBottom: 14 } },
              React.createElement('div', { style: { width: (r.novos / totalClientes * 100) + '%', background: 'var(--st-atendimento)' } }),
              React.createElement('div', { style: { width: (r.recorrentes / totalClientes * 100) + '%', background: 'var(--accent)' } })),
            React.createElement('div', { className: 'row', style: { gap: 16 } },
              React.createElement('div', { className: 'row', style: { gap: 8, flex: 1 } },
                React.createElement('span', { style: { width: 10, height: 10, borderRadius: 3, background: 'var(--st-atendimento)' } }),
                React.createElement('div', { className: 'col', style: { lineHeight: 1.2 } },
                  React.createElement('span', { className: 'tnum', style: { fontWeight: 800, fontSize: 18 } }, r.novos),
                  React.createElement('span', { className: 'muted', style: { fontSize: 12 } }, 'novos'))),
              React.createElement('div', { className: 'row', style: { gap: 8, flex: 1 } },
                React.createElement('span', { style: { width: 10, height: 10, borderRadius: 3, background: 'var(--accent)' } }),
                React.createElement('div', { className: 'col', style: { lineHeight: 1.2 } },
                  React.createElement('span', { className: 'tnum', style: { fontWeight: 800, fontSize: 18 } }, r.recorrentes),
                  React.createElement('span', { className: 'muted', style: { fontSize: 12 } }, 'recorrentes'))))
          )
        )
      )
    );
  }

  function RStat({ label, value, icon, cor, bg, trend, up, sub }) {
    return React.createElement('div', { className: 'stat' },
      React.createElement('div', { className: 'stat-top' },
        React.createElement('div', { className: 'stat-label' }, label),
        React.createElement('div', { className: 'stat-ico', style: { background: bg } },
          React.createElement(Icon, { name: icon, size: 17, style: { color: cor } }))),
      React.createElement('div', { className: 'stat-val tnum' }, value),
      React.createElement('div', { className: 'stat-meta' },
        trend && React.createElement('span', { className: up ? 'trend-up' : 'trend-down' },
          React.createElement(Icon, { name: up ? 'trend' : 'trendD', size: 13, style: { display: 'inline', verticalAlign: '-2px', marginRight: 3 } }), trend),
        sub));
  }

  window.Relatorios = Relatorios;
})();
