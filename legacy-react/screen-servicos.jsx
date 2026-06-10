/* Tela: Serviços */
(function () {
  const { useState } = React;
  const Icon = window.Icon;
  const D = window.DATA;
  const { Avatar, Menu } = window;

  function Servicos() {
    const [cat, setCat] = useState('todas');
    const cats = ['todas', ...Array.from(new Set(D.servicos.map(s => s.cat)))];
    const list = cat === 'todas' ? D.servicos : D.servicos.filter(s => s.cat === cat);

    return React.createElement('div', { className: 'page' },
      React.createElement('div', { className: 'row', style: { marginBottom: 16, flexWrap: 'wrap', gap: 10 } },
        React.createElement('div', { className: 'seg' },
          cats.map(cval => React.createElement('button', { key: cval, className: cat === cval ? 'on' : '', onClick: () => setCat(cval) }, cval === 'todas' ? 'Todas' : cval))
        ),
        React.createElement('button', { className: 'btn btn-primary', style: { marginLeft: 'auto' } },
          React.createElement(Icon, { name: 'plus', size: 16 }), 'Novo serviço')
      ),

      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 14 } },
        list.map(s => {
          const execs = s.exec.map(D.prof);
          const margem = Math.round((s.preco - s.custo) / s.preco * 100);
          return React.createElement('div', { key: s.id, className: 'card', style: { overflow: 'hidden', display: 'flex', flexDirection: 'column' } },
            // faixa de cor / "foto"
            React.createElement('div', { style: { height: 96, background: `linear-gradient(135deg, color-mix(in oklch, ${s.cor} 16%, white), color-mix(in oklch, ${s.cor} 6%, white))`, position: 'relative', display: 'grid', placeItems: 'center' } },
              React.createElement('div', { style: { width: 48, height: 48, borderRadius: 12, background: 'var(--surface)', display: 'grid', placeItems: 'center', boxShadow: 'var(--sh-sm)' } },
                React.createElement(Icon, { name: s.cat === 'Barba' ? 'user' : s.cat === 'Estética' ? 'sparkle' : 'scissors', size: 22, style: { color: s.cor } })),
              s.combo && React.createElement('span', { className: 'tag', style: { position: 'absolute', top: 10, left: 10, background: 'var(--surface)' } }, 'Combo'),
              s.sinal && React.createElement('span', { className: 'tag tag-novo', style: { position: 'absolute', top: 10, right: 10 } }, 'Exige sinal'),
              React.createElement('div', { style: { position: 'absolute', bottom: 10, right: 12, fontSize: 11.5, fontWeight: 600, color: s.cor } }, s.cat)
            ),
            React.createElement('div', { style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 } },
              React.createElement('div', { className: 'row', style: { alignItems: 'flex-start' } },
                React.createElement('div', { className: 'col', style: { flex: 1, lineHeight: 1.3 } },
                  React.createElement('div', { style: { fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' } }, s.nome),
                  React.createElement('div', { className: 'muted', style: { fontSize: 12.5 } }, s.desc)),
                React.createElement(Menu, { items: [{ label: 'Editar', icon: 'edit' }, { label: 'Duplicar', icon: 'list' }, { divider: true }, { label: 'Desativar', icon: 'x', danger: true }] })
              ),
              React.createElement('div', { className: 'row', style: { gap: 16, paddingTop: 4 } },
                React.createElement('div', { className: 'col' },
                  React.createElement('span', { className: 'tnum', style: { fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' } }, D.money(s.preco)),
                  React.createElement('span', { className: 'muted', style: { fontSize: 11.5 } }, 'preço')),
                React.createElement('div', { className: 'col' },
                  React.createElement('span', { className: 'row tnum', style: { fontSize: 15, fontWeight: 700, gap: 4 } }, React.createElement(Icon, { name: 'clock', size: 14, style: { color: 'var(--text-3)' } }), s.dur + 'min'),
                  React.createElement('span', { className: 'muted', style: { fontSize: 11.5 } }, 'duração')),
                React.createElement('div', { className: 'col', style: { marginLeft: 'auto', alignItems: 'flex-end' } },
                  React.createElement('span', { className: 'tnum', style: { fontSize: 15, fontWeight: 700, color: 'var(--accent-text)' } }, margem + '%'),
                  React.createElement('span', { className: 'muted', style: { fontSize: 11.5 } }, 'margem'))
              ),
              React.createElement('div', { className: 'divider' }),
              React.createElement('div', { className: 'row', style: { gap: 8 } },
                React.createElement('div', { style: { display: 'flex' } },
                  execs.slice(0, 4).map((p, i) => React.createElement('div', { key: p.id, style: { marginLeft: i ? -8 : 0, border: '2px solid var(--surface)', borderRadius: 99 } },
                    React.createElement(Avatar, { nome: p.nome, cor: p.cor, size: 26 })))),
                React.createElement('span', { className: 'muted', style: { fontSize: 12.5 } }, execs.length + ' profissionais executam'))
            )
          );
        })
      )
    );
  }

  window.Servicos = Servicos;
})();
