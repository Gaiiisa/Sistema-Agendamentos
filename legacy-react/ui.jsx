/* UI base compartilhada */
(function () {
  const { useState, useEffect, useRef } = React;
  const Icon = window.Icon;
  const D = window.DATA;

  // ---------- Avatar ----------
  function Avatar({ nome, cor, size = 36, foto }) {
    const fs = Math.round(size * 0.38);
    return React.createElement('div', {
      className: 'avatar',
      style: { width: size, height: size, fontSize: fs, background: cor || '#0e9f6e' },
    }, D.initials(nome));
  }

  // ---------- Status pill ----------
  function StatusPill({ status }) {
    return React.createElement('span', { className: `pill pill-${status}` },
      React.createElement('span', { className: 'pdot' }),
      D.statusLabels[status]
    );
  }

  // ---------- Tag ----------
  function Tag({ kind, children }) {
    const cls = kind === 'vip' ? 'tag tag-vip' : kind === 'novo' ? 'tag tag-novo' : kind === 'sumido' ? 'tag tag-sumido' : 'tag';
    const label = children || (kind === 'vip' ? 'VIP' : kind === 'novo' ? 'Novo' : kind === 'sumido' ? 'Sumido' : kind);
    return React.createElement('span', { className: cls },
      kind === 'vip' && React.createElement(Icon, { name: 'star', size: 11, fill: true }),
      label
    );
  }

  // ---------- Sidebar ----------
  const NAV = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'agenda', label: 'Agenda', icon: 'calendar', badge: '15' },
    { id: 'agendamentos', label: 'Agendamentos', icon: 'list' },
    { id: 'clientes', label: 'Clientes', icon: 'users' },
    { id: 'servicos', label: 'Serviços', icon: 'scissors' },
    { id: 'equipe', label: 'Equipe', icon: 'team' },
  ];
  const NAV_FIN = [
    { id: 'financeiro', label: 'Financeiro', icon: 'money' },
    { id: 'comissoes', label: 'Comissões', icon: 'coins' },
    { id: 'estoque', label: 'Estoque', icon: 'box' },
  ];
  const NAV_SOON = [
    { id: 'fidelidade', label: 'Fidelidade', icon: 'gift' },
    { id: 'relatorios', label: 'Relatórios', icon: 'chart' },
  ];

  function Sidebar({ active, onNav }) {
    return React.createElement('aside', { className: 'sidebar' },
      React.createElement('div', { className: 'sb-brand' },
        React.createElement('div', { className: 'sb-logo' },
          React.createElement(Icon, { name: 'scissors', size: 19, style: { color: '#fff' } })
        ),
        React.createElement('div', { className: 'col' },
          React.createElement('div', { className: 'sb-brand-name' }, D.estabelecimento.nome),
          React.createElement('div', { className: 'sb-brand-sub' }, 'Plano ' + D.estabelecimento.plano)
        )
      ),
      React.createElement('div', { className: 'sb-search' },
        React.createElement(Icon, { name: 'search', size: 15 }),
        'Buscar…',
        React.createElement('kbd', null, '⌘K')
      ),
      React.createElement('nav', { className: 'sb-nav' },
        NAV.map(item =>
          React.createElement('button', {
            key: item.id,
            className: 'sb-item' + (active === item.id ? ' active' : ''),
            onClick: () => onNav(item.id),
          },
            React.createElement(Icon, { name: item.icon, size: 18 }),
            item.label,
            item.badge && React.createElement('span', { className: 'sb-badge' + (active === item.id ? '' : ' muted') }, item.badge)
          )
        ),
        React.createElement('div', { className: 'sb-section' }, 'Financeiro · Fase 2'),
        NAV_FIN.map(item =>
          React.createElement('button', {
            key: item.id,
            className: 'sb-item' + (active === item.id ? ' active' : ''),
            onClick: () => onNav(item.id),
          },
            React.createElement(Icon, { name: item.icon, size: 18 }),
            item.label
          )
        ),
        React.createElement('div', { className: 'sb-section' }, 'Marketing & BI · Fase 3'),
        NAV_SOON.map(item =>
          React.createElement('button', {
            key: item.id,
            className: 'sb-item' + (active === item.id ? ' active' : ''),
            onClick: () => onNav(item.id),
          },
            React.createElement(Icon, { name: item.icon, size: 18 }),
            item.label
          )
        )
      ),
      React.createElement('div', { className: 'sb-foot' },
        React.createElement('button', { className: 'sb-item', onClick: () => onNav('config') },
          React.createElement(Icon, { name: 'settings', size: 18 }), 'Configurações'
        ),
        React.createElement('div', { className: 'sb-user' },
          React.createElement(Avatar, { nome: D.usuario.nome, cor: D.usuario.cor, size: 34 }),
          React.createElement('div', { className: 'col', style: { lineHeight: 1.25 } },
            React.createElement('div', { className: 'sb-user-name' }, D.usuario.nome),
            React.createElement('div', { className: 'sb-user-role' }, D.usuario.papel)
          ),
          React.createElement(Icon, { name: 'chevD', size: 15, style: { marginLeft: 'auto', color: 'var(--text-3)' } })
        )
      )
    );
  }

  // ---------- Topbar ----------
  function Topbar({ title, sub, onNew }) {
    return React.createElement('header', { className: 'topbar' },
      React.createElement('div', { className: 'col', style: { lineHeight: 1.2 } },
        React.createElement('div', { className: 'tb-title' }, title),
        sub && React.createElement('div', { className: 'tb-sub' }, sub)
      ),
      React.createElement('div', { className: 'tb-right' },
        React.createElement('button', { className: 'icon-btn' },
          React.createElement(Icon, { name: 'search', size: 18 })
        ),
        React.createElement('button', { className: 'icon-btn' },
          React.createElement('span', { className: 'dot' }),
          React.createElement(Icon, { name: 'bell', size: 18 })
        ),
        React.createElement('button', { className: 'btn btn-primary', onClick: onNew },
          React.createElement(Icon, { name: 'plus', size: 17 }), 'Novo agendamento'
        )
      )
    );
  }

  // ---------- Dropdown menu (ações) ----------
  function Menu({ items, children }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
      function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
      document.addEventListener('mousedown', h);
      return () => document.removeEventListener('mousedown', h);
    }, []);
    return React.createElement('div', { ref, style: { position: 'relative' } },
      React.createElement('button', { className: 'icon-btn', style: { width: 32, height: 32 }, onClick: () => setOpen(o => !o) },
        children || React.createElement(Icon, { name: 'dots', size: 18 })
      ),
      open && React.createElement('div', {
        style: {
          position: 'absolute', right: 0, top: '110%', zIndex: 30,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)', boxShadow: 'var(--sh-pop)', padding: 5, minWidth: 168,
        }
      },
        items.map((it, i) =>
          it.divider
            ? React.createElement('div', { key: i, className: 'divider', style: { margin: '5px 0' } })
            : React.createElement('button', {
                key: i,
                onClick: () => { setOpen(false); it.onClick && it.onClick(); },
                style: {
                  display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left',
                  padding: '8px 10px', borderRadius: 7, fontSize: 13.5, fontWeight: 500,
                  color: it.danger ? 'var(--st-faltou)' : 'var(--text)',
                },
                onMouseEnter: e => e.currentTarget.style.background = 'var(--surface-2)',
                onMouseLeave: e => e.currentTarget.style.background = 'transparent',
              },
                it.icon && React.createElement(Icon, { name: it.icon, size: 15 }),
                it.label
              )
        )
      )
    );
  }

  // ---------- Modal genérico ----------
  function Modal({ title, onClose, children, foot, wide }) {
    useEffect(() => {
      function esc(e) { if (e.key === 'Escape') onClose(); }
      document.addEventListener('keydown', esc);
      return () => document.removeEventListener('keydown', esc);
    }, []);
    return React.createElement('div', { className: 'overlay', onMouseDown: onClose },
      React.createElement('div', {
        className: 'modal', style: wide ? { maxWidth: 720 } : null,
        onMouseDown: e => e.stopPropagation(),
      },
        React.createElement('div', { className: 'modal-head' },
          React.createElement('div', { className: 'modal-title' }, title),
          React.createElement('button', { className: 'icon-btn', style: { marginLeft: 'auto', width: 32, height: 32 }, onClick: onClose },
            React.createElement(Icon, { name: 'x', size: 18 })
          )
        ),
        React.createElement('div', { className: 'modal-body' }, children),
        foot && React.createElement('div', { className: 'modal-foot' }, foot)
      )
    );
  }

  // ---------- Empty / soon ----------
  function ComingSoon({ title }) {
    return React.createElement('div', { className: 'page' },
      React.createElement('div', { className: 'card', style: { padding: 48, textAlign: 'center', maxWidth: 460, margin: '40px auto' } },
        React.createElement('div', { style: { width: 56, height: 56, borderRadius: 14, background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' } },
          React.createElement(Icon, { name: 'sparkle', size: 26, style: { color: 'var(--accent)' } })
        ),
        React.createElement('div', { style: { fontSize: 18, fontWeight: 700, marginBottom: 6 } }, title || 'Em breve'),
        React.createElement('div', { className: 'muted', style: { fontSize: 14 } }, 'Este módulo faz parte da Fase 2 do roadmap. O MVP foca em Agenda, Clientes, Serviços e Equipe.')
      )
    );
  }

  Object.assign(window, { Avatar, StatusPill, Tag, Sidebar, Topbar, Menu, Modal, ComingSoon });
})();
