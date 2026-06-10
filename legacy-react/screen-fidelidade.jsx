/* Tela: Fidelidade & Marketing — regra de pontos/cashback, campanhas WhatsApp, modelos */
(function () {
  const { useState } = React;
  const Icon = window.Icon;
  const D = window.DATA;
  const { Modal } = window;

  const STATUS_CAMP = {
    ativa:     { label: 'Ativa', cls: 'pill-confirmado' },
    agendada:  { label: 'Agendada', cls: 'pill-atendimento' },
    rascunho:  { label: 'Rascunho', cls: 'pill-concluido' },
  };

  function Fidelidade({ notify }) {
    const [tab, setTab] = useState('programa');
    return React.createElement('div', { className: 'page' },
      React.createElement('div', { className: 'row', style: { marginBottom: 16, gap: 10, flexWrap: 'wrap' } },
        React.createElement('div', { className: 'seg' },
          [['programa', 'Programa de fidelidade'], ['campanhas', 'Campanhas'], ['modelos', 'Modelos de mensagem']].map(([id, l]) =>
            React.createElement('button', { key: id, className: tab === id ? 'on' : '', onClick: () => setTab(id) }, l)))
      ),
      tab === 'programa' && React.createElement(Programa, { notify }),
      tab === 'campanhas' && React.createElement(Campanhas, { notify }),
      tab === 'modelos' && React.createElement(Modelos, { notify })
    );
  }

  // ---- Programa de fidelidade ----
  function Programa({ notify }) {
    const f = D.fidelidade;
    const [tipo, setTipo] = useState(f.tipo);
    const [meta, setMeta] = useState(f.meta);
    return React.createElement('div', { className: 'grid-2', style: { alignItems: 'start' } },
      // configuração da regra
      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-head' },
          React.createElement(Icon, { name: 'gift', size: 17, style: { color: 'var(--text-2)' } }),
          React.createElement('div', { className: 'card-title' }, 'Regra do programa')),
        React.createElement('div', { style: { padding: 18, display: 'flex', flexDirection: 'column', gap: 18 } },
          React.createElement('div', { className: 'field' },
            React.createElement('label', null, 'Tipo de recompensa'),
            React.createElement('div', { className: 'row', style: { gap: 10 } },
              [['pontos', 'Pontos / Selos', 'star'], ['cashback', 'Cashback', 'coins']].map(([id, l, ic]) =>
                React.createElement('button', { key: id, onClick: () => setTipo(id),
                  style: { flex: 1, display: 'flex', alignItems: 'center', gap: 9, padding: '12px 14px', borderRadius: 'var(--r-md)', border: '1px solid ' + (tipo === id ? 'var(--accent)' : 'var(--border-strong)'), background: tipo === id ? 'var(--accent-soft)' : 'var(--surface)' } },
                  React.createElement('div', { style: { width: 30, height: 30, borderRadius: 8, background: tipo === id ? 'var(--accent)' : 'var(--surface-2)', display: 'grid', placeItems: 'center' } },
                    React.createElement(Icon, { name: ic, size: 15, style: { color: tipo === id ? '#fff' : 'var(--text-2)' }, fill: id === 'pontos' && tipo === id })),
                  React.createElement('span', { style: { fontWeight: 600, fontSize: 14, color: tipo === id ? 'var(--accent-text)' : 'var(--text)' } }, l)))
            )),
          tipo === 'pontos'
            ? React.createElement('div', { className: 'row', style: { gap: 14, alignItems: 'flex-end' } },
                React.createElement('div', { className: 'field', style: { flex: 1 } },
                  React.createElement('label', null, 'A cada quantos cortes'),
                  React.createElement('div', { className: 'row', style: { gap: 8 } },
                    React.createElement('button', { className: 'btn btn-ghost btn-icon-only', onClick: () => setMeta(m => Math.max(1, m - 1)) }, React.createElement(Icon, { name: 'x', size: 14 })),
                    React.createElement('div', { className: 'tnum', style: { flex: 1, textAlign: 'center', fontWeight: 800, fontSize: 24 } }, meta),
                    React.createElement('button', { className: 'btn btn-ghost btn-icon-only', onClick: () => setMeta(m => m + 1) }, React.createElement(Icon, { name: 'plus', size: 14 })))),
                React.createElement('div', { style: { fontSize: 22, color: 'var(--text-3)', paddingBottom: 8 } }, '→'),
                React.createElement('div', { className: 'field', style: { flex: 1.4 } },
                  React.createElement('label', null, 'Recompensa'),
                  React.createElement('input', { className: 'input', defaultValue: f.recompensa })))
            : React.createElement('div', { className: 'field' },
                React.createElement('label', null, 'Percentual de cashback'),
                React.createElement('div', { className: 'row', style: { gap: 8 } },
                  React.createElement('input', { className: 'input', type: 'number', defaultValue: f.cashbackPct, style: { width: 90 } }),
                  React.createElement('span', { className: 'muted', style: { fontSize: 14 } }, '% do valor vira saldo para o próximo atendimento'))),
          React.createElement('div', { style: { background: 'var(--accent-soft)', borderRadius: 'var(--r-md)', padding: 14, display: 'flex', gap: 11, alignItems: 'center' } },
            React.createElement(Icon, { name: 'sparkle', size: 18, style: { color: 'var(--accent)' } }),
            React.createElement('span', { style: { fontSize: 13.5, color: 'var(--accent-text)', fontWeight: 500 } },
              tipo === 'pontos' ? `A cada ${meta} cortes pagos, o cliente ganha: ${f.recompensa}.` : `O cliente acumula ${f.cashbackPct}% de cada atendimento como saldo.`)),
          React.createElement('button', { className: 'btn btn-primary', onClick: () => notify('Regra do programa salva') },
            React.createElement(Icon, { name: 'check', size: 16 }), 'Salvar regra')
        )
      ),
      // métricas do programa
      React.createElement('div', { className: 'col', style: { gap: 14 } },
        React.createElement('div', { className: 'stat-grid', style: { gridTemplateColumns: '1fr 1fr' } },
          React.createElement(FStat, { label: 'Clientes no programa', value: f.ativos, icon: 'users', cor: 'var(--accent)', bg: 'var(--accent-soft)' }),
          React.createElement(FStat, { label: 'Recompensas resgatadas', value: f.resgatados, icon: 'gift', cor: 'var(--st-atendimento)', bg: 'var(--st-atendimento-bg)' }),
          React.createElement(FStat, { label: 'Pontos emitidos (mês)', value: f.pontosEmitidos.toLocaleString('pt-BR'), icon: 'star', cor: 'var(--st-pendente)', bg: 'var(--st-pendente-bg)' }),
          React.createElement(FStat, { label: 'Próx. do prêmio', value: '7', icon: 'target', cor: 'var(--accent)', bg: 'var(--accent-soft)' })),
        React.createElement('div', { className: 'card card-pad' },
          React.createElement('div', { style: { fontWeight: 700, fontSize: 14, marginBottom: 12 } }, 'Quase lá — clientes perto de uma recompensa'),
          [['c4', 9], ['c8', 8], ['c1', 8]].map(([id, n]) => {
            const c = D.cli(id);
            return React.createElement('div', { key: id, className: 'row', style: { gap: 11, padding: '8px 0' } },
              React.createElement(window.Avatar, { nome: c.nome, cor: '#0e9f6e', size: 30 }),
              React.createElement('span', { style: { fontWeight: 600, fontSize: 13.5, flex: 1 } }, c.nome),
              React.createElement('div', { className: 'progress', style: { width: 90 } }, React.createElement('span', { style: { width: (n * 10) + '%' } })),
              React.createElement('span', { className: 'mono', style: { fontSize: 12.5, fontWeight: 600, width: 38, textAlign: 'right' } }, n + '/10'));
          }))
      )
    );
  }

  function FStat({ label, value, icon, cor, bg }) {
    return React.createElement('div', { className: 'stat' },
      React.createElement('div', { className: 'stat-top' },
        React.createElement('div', { className: 'stat-label' }, label),
        React.createElement('div', { className: 'stat-ico', style: { background: bg } },
          React.createElement(Icon, { name: icon, size: 16, style: { color: cor }, fill: icon === 'star' }))),
      React.createElement('div', { className: 'stat-val tnum' }, value));
  }

  // ---- Campanhas ----
  function Campanhas({ notify }) {
    return React.createElement('div', { className: 'col', style: { gap: 16 } },
      React.createElement('div', { className: 'row' },
        React.createElement('div', { className: 'col', style: { lineHeight: 1.3 } },
          React.createElement('div', { style: { fontWeight: 700, fontSize: 15 } }, 'Campanhas via WhatsApp'),
          React.createElement('div', { className: 'muted', style: { fontSize: 13 } }, 'Dispare mensagens segmentadas por tag, retorno ou aniversário.')),
        React.createElement('button', { className: 'btn btn-primary', style: { marginLeft: 'auto' }, onClick: () => notify('Nova campanha criada') },
          React.createElement(Icon, { name: 'plus', size: 16 }), 'Nova campanha')),
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px,1fr))', gap: 14 } },
        D.campanhas.map(c => {
          const st = STATUS_CAMP[c.status];
          return React.createElement('div', { key: c.id, className: 'card', style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 13 } },
            React.createElement('div', { className: 'row', style: { gap: 11, alignItems: 'flex-start' } },
              React.createElement('div', { style: { width: 38, height: 38, borderRadius: 10, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', flexShrink: 0 } },
                React.createElement(Icon, { name: c.tipo === 'retorno' ? 'history' : c.tipo === 'aniversario' ? 'cake' : 'sparkle', size: 18, style: { color: c.cor } })),
              React.createElement('div', { className: 'col', style: { flex: 1, lineHeight: 1.3 } },
                React.createElement('span', { style: { fontWeight: 700, fontSize: 14.5 } }, c.nome),
                React.createElement('span', { className: 'muted', style: { fontSize: 12.5 } }, c.alvo + ' · ' + c.publico + ' clientes')),
              React.createElement('span', { className: 'pill ' + st.cls }, React.createElement('span', { className: 'pdot' }), st.label)),
            React.createElement('div', { className: 'row', style: { gap: 0, border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' } },
              React.createElement(MiniMetric, { label: 'Enviadas', value: c.enviadas }),
              React.createElement(MiniMetric, { label: 'Retornos', value: c.retorno, border: true }),
              React.createElement(MiniMetric, { label: 'Conversão', value: c.taxa + '%', border: true, accent: c.taxa > 0 })),
            React.createElement('div', { className: 'row', style: { gap: 8 } },
              c.status === 'rascunho'
                ? React.createElement('button', { className: 'btn btn-primary btn-sm', style: { flex: 1 }, onClick: () => notify('Campanha "' + c.nome + '" disparada') },
                    React.createElement(Icon, { name: 'whatsapp', size: 14 }), 'Disparar')
                : React.createElement('button', { className: 'btn btn-ghost btn-sm', style: { flex: 1 } },
                    React.createElement(Icon, { name: 'chart', size: 14 }), 'Ver resultados'),
              React.createElement('button', { className: 'btn btn-ghost btn-sm btn-icon-only' }, React.createElement(Icon, { name: 'edit', size: 15 }))));
        }))
    );
  }
  function MiniMetric({ label, value, border, accent }) {
    return React.createElement('div', { className: 'col', style: { flex: 1, padding: '9px 12px', borderLeft: border ? '1px solid var(--border)' : 'none', alignItems: 'center' } },
      React.createElement('span', { className: 'tnum', style: { fontWeight: 700, fontSize: 16, color: accent ? 'var(--accent-text)' : 'var(--text)' } }, value),
      React.createElement('span', { className: 'muted', style: { fontSize: 11 } }, label));
  }

  // ---- Modelos de mensagem ----
  function Modelos({ notify }) {
    const [edit, setEdit] = useState(null);
    return React.createElement('div', { className: 'col', style: { gap: 14 } },
      React.createElement('div', { className: 'row' },
        React.createElement('span', { className: 'muted', style: { fontSize: 13 } }, 'Use variáveis como {cliente}, {data}, {hora}, {profissional} — substituídas no envio.'),
        React.createElement('button', { className: 'btn btn-primary btn-sm', style: { marginLeft: 'auto' }, onClick: () => notify('Novo modelo criado') },
          React.createElement(Icon, { name: 'plus', size: 15 }), 'Novo modelo')),
      React.createElement('div', { className: 'grid-2' },
        D.modelos.map(m =>
          React.createElement('div', { key: m.id, className: 'card', style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 11 } },
            React.createElement('div', { className: 'row' },
              React.createElement('div', { className: 'col', style: { lineHeight: 1.3 } },
                React.createElement('span', { style: { fontWeight: 700, fontSize: 14.5 } }, m.nome),
                React.createElement('span', { className: 'muted', style: { fontSize: 12 } }, 'Gatilho: ' + m.gatilho)),
              React.createElement('button', { className: 'btn btn-subtle btn-sm', style: { marginLeft: 'auto' }, onClick: () => setEdit(m) },
                React.createElement(Icon, { name: 'edit', size: 14 }), 'Editar')),
            React.createElement('div', { style: { background: 'oklch(0.97 0.02 150)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', borderTopLeftRadius: 3, padding: '11px 13px', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 } }, m.texto))),
      ),
      edit && React.createElement(EditModelo, { m: edit, onClose: () => setEdit(null), notify })
    );
  }
  function EditModelo({ m, onClose, notify }) {
    return React.createElement(Modal, { title: 'Editar modelo · ' + m.nome, onClose,
      foot: React.createElement(React.Fragment, null,
        React.createElement('button', { className: 'btn btn-ghost', onClick: onClose }, 'Cancelar'),
        React.createElement('button', { className: 'btn btn-primary', onClick: () => { onClose(); notify('Modelo salvo'); } },
          React.createElement(Icon, { name: 'check', size: 15 }), 'Salvar'))
    },
      React.createElement('div', { className: 'field' },
        React.createElement('label', null, 'Gatilho de envio'),
        React.createElement('input', { className: 'input', defaultValue: m.gatilho })),
      React.createElement('div', { className: 'field' },
        React.createElement('label', null, 'Mensagem'),
        React.createElement('textarea', { className: 'input', defaultValue: m.texto, style: { minHeight: 120 } })),
      React.createElement('div', { className: 'row', style: { gap: 6, flexWrap: 'wrap' } },
        ['{cliente}', '{data}', '{hora}', '{profissional}', '{estabelecimento}'].map(v =>
          React.createElement('span', { key: v, className: 'tag', style: { fontFamily: 'Geist Mono, monospace' } }, v)))
    );
  }

  window.Fidelidade = Fidelidade;
})();
