/* Tela: Dashboard inicial — visão do dia */
(function () {
  const Icon = window.Icon;
  const D = window.DATA;
  const { Avatar, StatusPill } = window;

  function Stat({ label, value, sub, icon, iconBg, iconColor, trend, trendDir, progress }) {
    return React.createElement('div', { className: 'stat' },
      React.createElement('div', { className: 'stat-top' },
        React.createElement('div', { className: 'stat-label' }, label),
        React.createElement('div', { className: 'stat-ico', style: { background: iconBg } },
          React.createElement(Icon, { name: icon, size: 17, style: { color: iconColor } })
        )
      ),
      React.createElement('div', { className: 'stat-val tnum' }, value),
      progress != null
        ? React.createElement('div', { className: 'col', style: { gap: 6 } },
            React.createElement('div', { className: 'progress' }, React.createElement('span', { style: { width: progress + '%' } })),
            React.createElement('div', { className: 'stat-meta' }, sub)
          )
        : React.createElement('div', { className: 'stat-meta' },
            trend && React.createElement('span', { className: trendDir === 'down' ? 'trend-down' : 'trend-up' },
              React.createElement(Icon, { name: trendDir === 'down' ? 'trendD' : 'trend', size: 13, style: { display: 'inline', verticalAlign: '-2px', marginRight: 3 } }),
              trend
            ),
            sub
          )
    );
  }

  function Dashboard({ onNew, onNav }) {
    const k = D.kpis;
    const proximos = D.hoje
      .filter(a => ['confirmado','pendente','atendimento'].includes(a.status))
      .sort((a, b) => D.toMin(a.ini) - D.toMin(b.ini))
      .slice(0, 6);

    const aniversariantes = D.clientes.filter(c => {
      const m = c.nasc.split('-')[1]; return m === '06';
    }).slice(0, 3);

    const naoConfirmados = D.hoje.filter(a => a.status === 'pendente');

    return React.createElement('div', { className: 'page' },
      // saudação
      React.createElement('div', { style: { marginBottom: 18 } },
        React.createElement('div', { style: { fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' } }, 'Bom dia, Carlos 👋'),
        React.createElement('div', { className: 'muted', style: { fontSize: 14 } }, 'Terça-feira, 9 de junho · Aqui está o resumo do seu dia.')
      ),

      // KPIs
      React.createElement('div', { className: 'stat-grid', style: { marginBottom: 16 } },
        React.createElement(Stat, { label: 'Agendamentos hoje', value: k.agendamentos, icon: 'calendar', iconBg: 'var(--accent-soft)', iconColor: 'var(--accent)', trend: '+3', sub: 'vs. ontem' }),
        React.createElement(Stat, { label: 'Faturamento previsto', value: D.money(k.faturaPrevisto), icon: 'money', iconBg: 'oklch(0.95 0.04 162)', iconColor: 'var(--accent)', sub: D.money(k.faturaRealizado) + ' já realizado', progress: Math.round(k.faturaRealizado / k.faturaPrevisto * 100) }),
        React.createElement(Stat, { label: 'Taxa de ocupação', value: k.ocupacao + '%', icon: 'target', iconBg: 'oklch(0.95 0.04 248)', iconColor: 'var(--st-atendimento)', sub: 'da agenda preenchida', progress: k.ocupacao }),
        React.createElement(Stat, { label: 'Faltas / Cancelam.', value: k.faltas + ' / ' + k.cancelamentos, icon: 'alert', iconBg: 'var(--st-faltou-bg)', iconColor: 'var(--st-faltou)', trend: '−2', trendDir: 'down', sub: 'melhor que a média' })
      ),

      // atalhos rápidos
      React.createElement('div', { className: 'row', style: { gap: 10, marginBottom: 18, flexWrap: 'wrap' } },
        React.createElement('button', { className: 'btn btn-primary', onClick: onNew },
          React.createElement(Icon, { name: 'plus', size: 17 }), 'Novo agendamento'),
        React.createElement('button', { className: 'btn btn-ghost', onClick: () => onNav('clientes') },
          React.createElement(Icon, { name: 'user', size: 16 }), 'Novo cliente'),
        React.createElement('button', { className: 'btn btn-ghost', onClick: () => onNav('soon') },
          React.createElement(Icon, { name: 'money', size: 16 }), 'Abrir caixa'),
        React.createElement('button', { className: 'btn btn-ghost', onClick: () => onNav('agenda') },
          React.createElement(Icon, { name: 'calendar', size: 16 }), 'Ver agenda')
      ),

      // grid principal
      React.createElement('div', { className: 'grid-dash' },
        // próximos atendimentos
        React.createElement('div', { className: 'card' },
          React.createElement('div', { className: 'card-head' },
            React.createElement(Icon, { name: 'clock', size: 18, style: { color: 'var(--text-2)' } }),
            React.createElement('div', { className: 'card-title' }, 'Próximos atendimentos'),
            React.createElement('button', { className: 'link', onClick: () => onNav('agenda') }, 'Ver agenda →')
          ),
          React.createElement('div', null,
            proximos.map((a, i) => {
              const c = D.cli(a.cli), s = D.srv(a.srv), p = D.prof(a.prof);
              return React.createElement('div', {
                key: a.id,
                className: 'row',
                style: { padding: '13px 18px', gap: 13, borderBottom: i < proximos.length - 1 ? '1px solid var(--border)' : 'none' },
              },
                React.createElement('div', { className: 'mono', style: { fontSize: 14, fontWeight: 600, width: 46, color: 'var(--text-2)' } }, a.ini),
                React.createElement('div', { style: { width: 3, alignSelf: 'stretch', borderRadius: 99, background: s.cor } }),
                React.createElement(Avatar, { nome: c.nome, cor: p.cor, size: 36 }),
                React.createElement('div', { className: 'col', style: { lineHeight: 1.3, minWidth: 0, flex: 1 } },
                  React.createElement('div', { style: { fontWeight: 600, fontSize: 14.5 } }, c.nome),
                  React.createElement('div', { className: 'muted', style: { fontSize: 13 } }, s.nome + ' · ' + p.apelido)
                ),
                a.sinal && React.createElement('span', { className: 'tag tag-novo', title: 'Sinal pago' },
                  React.createElement(Icon, { name: 'check', size: 11 }), 'Sinal'),
                React.createElement(StatusPill, { status: a.status })
              );
            })
          )
        ),

        // coluna lateral: alertas
        React.createElement('div', { className: 'col', style: { gap: 16 } },
          // alertas
          React.createElement('div', { className: 'card card-pad' },
            React.createElement('div', { className: 'row', style: { marginBottom: 6 } },
              React.createElement(Icon, { name: 'alert', size: 17, style: { color: 'var(--st-pendente)' } }),
              React.createElement('div', { className: 'card-title', style: { fontSize: 15 } }, 'Alertas')
            ),
            React.createElement(AlertRow, { icon: 'clock', bg: 'var(--st-pendente-bg)', color: 'var(--st-pendente)',
              title: naoConfirmados.length + ' clientes não confirmaram', sub: 'Enviar lembrete via WhatsApp', action: 'Lembrar' }),
            React.createElement(AlertRow, { icon: 'pkg', bg: 'var(--st-faltou-bg)', color: 'var(--st-faltou)',
              title: '2 produtos em estoque baixo', sub: 'Pomada modeladora, lâmina', action: 'Repor' }),
            React.createElement(AlertRow, { icon: 'coins', bg: 'var(--accent-soft)', color: 'var(--accent)',
              title: 'Comissões a pagar', sub: D.money(2840) + ' · fechamento sexta', action: 'Ver' })
          ),

          // aniversariantes
          React.createElement('div', { className: 'card card-pad' },
            React.createElement('div', { className: 'row', style: { marginBottom: 10 } },
              React.createElement(Icon, { name: 'cake', size: 17, style: { color: 'var(--st-atendimento)' } }),
              React.createElement('div', { className: 'card-title', style: { fontSize: 15 } }, 'Aniversariantes do mês')
            ),
            React.createElement('div', { className: 'col', style: { gap: 11 } },
              aniversariantes.map(c =>
                React.createElement('div', { key: c.id, className: 'row', style: { gap: 11 } },
                  React.createElement(Avatar, { nome: c.nome, cor: '#9333ea', size: 32 }),
                  React.createElement('div', { className: 'col', style: { lineHeight: 1.25, flex: 1 } },
                    React.createElement('div', { style: { fontWeight: 600, fontSize: 13.5 } }, c.nome),
                    React.createElement('div', { className: 'muted', style: { fontSize: 12.5 } }, 'Dia ' + c.nasc.split('-')[2])
                  ),
                  React.createElement('button', { className: 'btn btn-subtle btn-sm' },
                    React.createElement(Icon, { name: 'gift', size: 14 }), 'Felicitar')
                )
              )
            )
          )
        )
      )
    );
  }

  function AlertRow({ icon, bg, color, title, sub, action }) {
    return React.createElement('div', { className: 'alert-item' },
      React.createElement('div', { className: 'alert-ico', style: { background: bg } },
        React.createElement(Icon, { name: icon, size: 15, style: { color } })
      ),
      React.createElement('div', { className: 'col', style: { lineHeight: 1.3, flex: 1 } },
        React.createElement('div', { style: { fontWeight: 600, fontSize: 13.5 } }, title),
        React.createElement('div', { className: 'muted', style: { fontSize: 12.5 } }, sub)
      ),
      React.createElement('button', { className: 'link', style: { fontSize: 13 } }, action)
    );
  }

  window.Dashboard = Dashboard;
})();
