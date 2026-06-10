/* App shell — navegação + modal de novo agendamento */
(function () {
  const { useState } = React;
  const Icon = window.Icon;
  const D = window.DATA;
  const { Sidebar, Topbar, Modal, ComingSoon, Avatar, StatusPill, Dashboard, Agenda, Agendamentos, Clientes, Servicos, Equipe, Financeiro, Comissoes, Estoque, Fidelidade, Relatorios } = window;

  const TITLES = {
    dashboard: ['Dashboard', 'Visão geral do dia'],
    agenda: ['Agenda', 'Arraste para remarcar · clique para detalhes'],
    agendamentos: ['Agendamentos', 'Gestão em lista de todos os horários'],
    clientes: ['Clientes', 'CRM — onde está o dinheiro recorrente'],
    servicos: ['Serviços', 'Catálogo, preços e margens'],
    equipe: ['Equipe', 'Profissionais, jornada e comissões'],
    financeiro: ['Financeiro', 'Caixa, lançamentos e fluxo'],
    comissoes: ['Comissões', 'Cálculo automático por profissional'],
    estoque: ['Estoque', 'Produtos, baixa automática e reposição'],
    fidelidade: ['Fidelidade & Marketing', 'Programa de pontos, campanhas e mensagens'],
    relatorios: ['Relatórios / BI', 'Indicadores-chave do negócio'],
    config: ['Configurações', 'Estabelecimento, políticas e usuários'],
    soon: ['Em breve', 'Módulo da Fase 3'],
  };

  function App() {
    const [route, setRoute] = useState('dashboard');
    const [appts, setAppts] = useState(D.hoje.map(a => ({ ...a })));
    const [showNew, setShowNew] = useState(false);
    const [openAppt, setOpenAppt] = useState(null);
    const [clienteId, setClienteId] = useState(null);
    const [toast, setToast] = useState(null);

    function notify(msg) { setToast(msg); setTimeout(() => setToast(null), 2600); }

    function addAppt(data) {
      const id = 'a' + (appts.length + 100);
      setAppts(list => [...list, { id, ...data }]);
      setShowNew(false);
      notify('Agendamento criado para ' + D.cli(data.cli).nome);
      if (route !== 'agenda') setRoute('agenda');
    }

    function goCliente(id) { setClienteId(id); setRoute('clientes'); }

    let screen;
    if (route === 'dashboard') screen = React.createElement(Dashboard, { appts, onNew: () => setShowNew(true), onNav: setRoute });
    else if (route === 'agenda') screen = React.createElement(Agenda, { appts, setAppts, onOpen: setOpenAppt, onNew: () => setShowNew(true) });
    else if (route === 'agendamentos') screen = React.createElement(Agendamentos, { onOpenCliente: goCliente });
    else if (route === 'clientes') screen = React.createElement(Clientes, { openId: clienteId, onOpen: setClienteId, onClose: () => setClienteId(null) });
    else if (route === 'servicos') screen = React.createElement(Servicos);
    else if (route === 'equipe') screen = React.createElement(Equipe);
    else if (route === 'financeiro') screen = React.createElement(Financeiro, { notify });
    else if (route === 'comissoes') screen = React.createElement(Comissoes, { notify });
    else if (route === 'estoque') screen = React.createElement(Estoque, { notify });
    else if (route === 'fidelidade') screen = React.createElement(Fidelidade, { notify });
    else if (route === 'relatorios') screen = React.createElement(Relatorios, { notify });
    else screen = React.createElement(ComingSoon, { title: TITLES[route] ? TITLES[route][0] : 'Em breve' });

    const [title, sub] = TITLES[route] || ['', ''];

    return React.createElement('div', { className: 'app' },
      React.createElement(Sidebar, { active: route, onNav: setRoute }),
      React.createElement('div', { className: 'main' },
        React.createElement(Topbar, { title, sub, onNew: () => setShowNew(true) }),
        React.createElement('div', { className: 'content' }, screen)
      ),
      showNew && React.createElement(NovoAgendamento, { onClose: () => setShowNew(false), onSave: addAppt }),
      openAppt && React.createElement(ApptDetail, { a: openAppt, onClose: () => setOpenAppt(null), notify }),
      toast && React.createElement(Toast, { msg: toast })
    );
  }

  // ---------- Toast ----------
  function Toast({ msg }) {
    return React.createElement('div', {
      style: {
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        background: 'oklch(0.25 0.012 165)', color: '#fff', padding: '12px 18px',
        borderRadius: 'var(--r-md)', boxShadow: 'var(--sh-pop)', zIndex: 200,
        display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, fontSize: 14,
        animation: 'pop .2s ease',
      }
    },
      React.createElement('div', { style: { width: 20, height: 20, borderRadius: 99, background: 'var(--accent)', display: 'grid', placeItems: 'center' } },
        React.createElement(Icon, { name: 'check', size: 13, stroke: 3, style: { color: '#fff' } })),
      msg
    );
  }

  // ---------- Detalhe do agendamento ----------
  function ApptDetail({ a, onClose, notify }) {
    const c = D.cli(a.cli), s = D.srv(a.srv), p = D.prof(a.prof);
    const dur = a._dur || s.dur;
    function act(label) { onClose(); notify(label); }
    return React.createElement(Modal, { title: 'Agendamento', onClose,
      foot: React.createElement(React.Fragment, null,
        React.createElement('button', { className: 'btn btn-ghost', onClick: () => act('Lembrete enviado via WhatsApp') },
          React.createElement(Icon, { name: 'whatsapp', size: 15 }), 'Lembrar'),
        a.status === 'pendente'
          ? React.createElement('button', { className: 'btn btn-primary', onClick: () => act('Agendamento confirmado') },
              React.createElement(Icon, { name: 'check', size: 15 }), 'Confirmar')
          : React.createElement('button', { className: 'btn btn-primary', onClick: () => act('Atendimento iniciado') },
              React.createElement(Icon, { name: 'play', size: 14, fill: true }), 'Iniciar atendimento')
      )
    },
      React.createElement('div', { className: 'row', style: { gap: 13 } },
        React.createElement(Avatar, { nome: c.nome, cor: p.cor, size: 48 }),
        React.createElement('div', { className: 'col', style: { flex: 1, lineHeight: 1.3 } },
          React.createElement('div', { style: { fontWeight: 700, fontSize: 18 } }, c.nome),
          React.createElement('div', { className: 'mono muted', style: { fontSize: 13 } }, c.wpp)),
        React.createElement(StatusPill, { status: a.status })
      ),
      React.createElement('div', { className: 'divider' }),
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 } },
        React.createElement(DetailRow, { icon: 'scissors', label: 'Serviço', value: s.nome }),
        React.createElement(DetailRow, { icon: 'user', label: 'Profissional', value: p.nome }),
        React.createElement(DetailRow, { icon: 'clock', label: 'Horário', value: a.ini + '–' + D.fromMin(D.toMin(a.ini) + dur) + ' (' + dur + 'min)' }),
        React.createElement(DetailRow, { icon: 'money', label: 'Valor', value: D.money(s.preco) + (a.sinal ? ' · sinal pago' : '') })
      ),
      c.obs && React.createElement('div', { style: { background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: 12, fontSize: 13.5, color: 'var(--text-2)' } },
        React.createElement('strong', null, 'Obs.: '), c.obs)
    );
  }
  function DetailRow({ icon, label, value }) {
    return React.createElement('div', { className: 'row', style: { gap: 10 } },
      React.createElement('div', { style: { width: 32, height: 32, borderRadius: 8, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', flexShrink: 0 } },
        React.createElement(Icon, { name: icon, size: 15, style: { color: 'var(--text-2)' } })),
      React.createElement('div', { className: 'col', style: { lineHeight: 1.3, minWidth: 0 } },
        React.createElement('span', { className: 'muted', style: { fontSize: 12 } }, label),
        React.createElement('span', { style: { fontWeight: 600, fontSize: 14 } }, value)));
  }

  // ---------- Novo agendamento ----------
  function NovoAgendamento({ onClose, onSave }) {
    const [cli, setCli] = useState('');
    const [cliQ, setCliQ] = useState('');
    const [srv, setSrv] = useState('');
    const [prof, setProf] = useState('');
    const [hora, setHora] = useState('14:00');
    const [sinal, setSinal] = useState(false);
    const [obs, setObs] = useState('');

    const sObj = srv ? D.srv(srv) : null;
    const profsValidos = sObj ? D.staff.filter(p => sObj.exec.includes(p.id)) : D.staff;
    const cliMatch = cliQ ? D.clientes.filter(c => c.nome.toLowerCase().includes(cliQ.toLowerCase())).slice(0, 4) : [];
    const valid = cli && srv && prof && hora;

    function pick(s) {
      setSrv(s);
      const o = D.srv(s);
      if (o.sinal) setSinal(true);
      if (prof && !o.exec.includes(prof)) setProf('');
    }

    return React.createElement(Modal, { title: 'Novo agendamento', onClose,
      foot: React.createElement(React.Fragment, null,
        React.createElement('button', { className: 'btn btn-ghost', onClick: onClose }, 'Cancelar'),
        React.createElement('button', { className: 'btn btn-primary', disabled: !valid, style: !valid ? { opacity: 0.5, cursor: 'not-allowed' } : null,
          onClick: () => valid && onSave({ cli, srv, prof, ini: hora, status: 'confirmado', sinal }) },
          React.createElement(Icon, { name: 'check', size: 16 }), 'Criar agendamento')
      )
    },
      // cliente
      React.createElement('div', { className: 'field' },
        React.createElement('label', null, 'Cliente'),
        cli
          ? React.createElement('div', { className: 'row', style: { gap: 10, padding: '8px 12px', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-md)', background: 'var(--surface-2)' } },
              React.createElement(Avatar, { nome: D.cli(cli).nome, cor: '#0e9f6e', size: 30 }),
              React.createElement('span', { style: { fontWeight: 600, flex: 1 } }, D.cli(cli).nome),
              React.createElement('button', { className: 'icon-btn', style: { width: 28, height: 28 }, onClick: () => { setCli(''); setCliQ(''); } }, React.createElement(Icon, { name: 'x', size: 15 })))
          : React.createElement('div', { style: { position: 'relative' } },
              React.createElement('div', { className: 'search-inp', style: { minWidth: 0 } },
                React.createElement(Icon, { name: 'search', size: 16 }),
                React.createElement('input', { placeholder: 'Buscar cliente ou cadastrar…', value: cliQ, onChange: e => setCliQ(e.target.value) }),
                React.createElement('button', { className: 'btn btn-subtle btn-sm' }, React.createElement(Icon, { name: 'plus', size: 14 }), 'Novo')),
              cliMatch.length > 0 && React.createElement('div', { style: { position: 'absolute', top: '108%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', boxShadow: 'var(--sh-pop)', zIndex: 10, padding: 5 } },
                cliMatch.map(c => React.createElement('button', { key: c.id, onClick: () => { setCli(c.id); setCliQ(''); },
                  style: { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '7px 9px', borderRadius: 7, textAlign: 'left' },
                  onMouseEnter: e => e.currentTarget.style.background = 'var(--surface-2)', onMouseLeave: e => e.currentTarget.style.background = 'transparent' },
                  React.createElement(Avatar, { nome: c.nome, cor: '#2563eb', size: 28 }),
                  React.createElement('span', { style: { fontWeight: 600, fontSize: 14 } }, c.nome),
                  React.createElement('span', { className: 'mono muted', style: { fontSize: 12, marginLeft: 'auto' } }, c.wpp))))
            )
      ),
      // serviço
      React.createElement('div', { className: 'field' },
        React.createElement('label', null, 'Serviço'),
        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
          D.servicos.slice(0, 6).map(s => React.createElement('button', { key: s.id, onClick: () => pick(s.id),
            style: { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', borderRadius: 'var(--r-md)', border: '1px solid ' + (srv === s.id ? 'var(--accent)' : 'var(--border-strong)'), background: srv === s.id ? 'var(--accent-soft)' : 'var(--surface)', textAlign: 'left' } },
            React.createElement('span', { style: { width: 9, height: 9, borderRadius: 3, background: s.cor, flexShrink: 0 } }),
            React.createElement('div', { className: 'col', style: { lineHeight: 1.2, minWidth: 0 } },
              React.createElement('span', { style: { fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, s.nome),
              React.createElement('span', { className: 'mono', style: { fontSize: 11, color: 'var(--text-3)' } }, s.dur + 'min · ' + D.money(s.preco)))
          ))
        )
      ),
      // profissional + hora
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 } },
        React.createElement('div', { className: 'field' },
          React.createElement('label', null, 'Profissional'),
          React.createElement('select', { className: 'select', value: prof, onChange: e => setProf(e.target.value) },
            React.createElement('option', { value: '' }, 'Selecione…'),
            profsValidos.map(p => React.createElement('option', { key: p.id, value: p.id }, p.nome)))),
        React.createElement('div', { className: 'field' },
          React.createElement('label', null, 'Data e hora' + (sObj ? ' · termina ' + D.fromMin(D.toMin(hora) + sObj.dur) : '')),
          React.createElement('div', { className: 'row', style: { gap: 8 } },
            React.createElement('input', { className: 'input', value: 'Hoje, 09/06', readOnly: true, style: { flex: 1 } }),
            React.createElement('input', { className: 'input', type: 'time', value: hora, onChange: e => setHora(e.target.value), style: { width: 100 } })))
      ),
      // sinal
      React.createElement('button', { onClick: () => setSinal(v => !v),
        style: { display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: sinal ? 'var(--accent-soft)' : 'var(--surface-2)', textAlign: 'left' } },
        React.createElement('div', { className: 'checkbox' + (sinal ? ' on' : '') }, sinal && React.createElement(Icon, { name: 'check', size: 13, stroke: 3 })),
        React.createElement('div', { className: 'col', style: { lineHeight: 1.3 } },
          React.createElement('span', { style: { fontWeight: 600, fontSize: 13.5 } }, 'Exigir sinal'),
          React.createElement('span', { className: 'muted', style: { fontSize: 12 } }, 'Cobra antecipadamente para reduzir no-show')),
        sObj && sObj.sinal && React.createElement('span', { className: 'tag tag-novo', style: { marginLeft: 'auto' } }, 'Recomendado')
      ),
      // observações
      React.createElement('div', { className: 'field' },
        React.createElement('label', null, 'Observações'),
        React.createElement('textarea', { className: 'input', placeholder: 'Preferências, alergias, detalhes…', value: obs, onChange: e => setObs(e.target.value) }))
    );
  }

  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
})();
