/* Tela: Agenda — timeline por profissional, drag-and-drop + redimensionar */
(function () {
  const { useState, useRef, useEffect } = React;
  const Icon = window.Icon;
  const D = window.DATA;
  const { Avatar, StatusPill } = window;

  const DAY_START = 9 * 60;   // 09:00
  const DAY_END = 20 * 60;    // 20:00
  const PX_MIN = 1.30;        // px por minuto
  const SNAP = 15;            // minutos
  const colH = (DAY_END - DAY_START) * PX_MIN;

  const STATUS_FILTERS = [
    { id: 'todos', label: 'Todos' },
    { id: 'pendente', label: 'Pendentes' },
    { id: 'confirmado', label: 'Confirmados' },
    { id: 'atendimento', label: 'Em atendim.' },
  ];

  function Agenda({ appts, setAppts, onOpen, onNew }) {
    const [view, setView] = useState('dia');
    const [profFilter, setProfFilter] = useState('todos');
    const [statusFilter, setStatusFilter] = useState('todos');
    const [drag, setDrag] = useState(null);     // {id, mode:'move'|'resize', ...}
    const [ghost, setGhost] = useState(null);   // preview do card sendo arrastado
    const gridRef = useRef(null);
    const colRefs = useRef({});

    const profs = D.staff.filter(p => profFilter === 'todos' || p.id === profFilter);

    function visible(a) {
      if (statusFilter !== 'todos' && a.status !== statusFilter) return false;
      return true;
    }

    // ---- pointer drag ----
    useEffect(() => {
      if (!drag) return;
      function move(e) {
        const dy = e.clientY - drag.startY;
        if (drag.mode === 'move') {
          let newMin = drag.origMin + Math.round((dy / PX_MIN) / SNAP) * SNAP;
          newMin = Math.max(DAY_START, Math.min(DAY_END - drag.dur, newMin));
          // qual coluna está sob o cursor?
          let prof = drag.prof;
          for (const p of D.staff) {
            const el = colRefs.current[p.id];
            if (!el) continue;
            const r = el.getBoundingClientRect();
            if (e.clientX >= r.left && e.clientX <= r.right) { prof = p.id; break; }
          }
          setGhost({ id: drag.id, ini: D.fromMin(newMin), dur: drag.dur, prof });
        } else {
          let newDur = drag.origDur + Math.round((dy / PX_MIN) / SNAP) * SNAP;
          newDur = Math.max(SNAP, Math.min(DAY_END - drag.origMin, newDur));
          setGhost({ id: drag.id, ini: D.fromMin(drag.origMin), dur: newDur, prof: drag.prof });
        }
      }
      function up() {
        if (ghost) {
          setAppts(list => list.map(a => a.id === ghost.id
            ? { ...a, ini: ghost.ini, prof: ghost.prof, _dur: ghost.dur }
            : a));
        }
        setDrag(null); setGhost(null);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    }, [drag, ghost]);

    function startMove(e, a, dur) {
      if (e.button !== 0) return;
      e.preventDefault();
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
      setDrag({ id: a.id, mode: 'move', startY: e.clientY, origMin: D.toMin(a.ini), dur, prof: a.prof });
      setGhost({ id: a.id, ini: a.ini, dur, prof: a.prof });
    }
    function startResize(e, a, dur) {
      if (e.button !== 0) return;
      e.preventDefault(); e.stopPropagation();
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
      setDrag({ id: a.id, mode: 'resize', startY: e.clientY, origMin: D.toMin(a.ini), origDur: dur, prof: a.prof });
      setGhost({ id: a.id, ini: a.ini, dur, prof: a.prof });
    }

    const dur = (a) => a._dur || D.srv(a.srv).dur;
    const now = 13 * 60 + 20; // linha "agora" às 13:20

    if (view !== 'dia')
      return React.createElement('div', { className: 'page' },
        React.createElement(AgendaHeader, { view, setView, profFilter, setProfFilter, statusFilter, setStatusFilter, onNew }),
        React.createElement(OtherView, { view, appts, onOpen }));

    return React.createElement('div', { className: 'page', style: { paddingBottom: 24 } },
      React.createElement(AgendaHeader, { view, setView, profFilter, setProfFilter, statusFilter, setStatusFilter, onNew }),

      React.createElement('div', { className: 'card', style: { overflow: 'hidden' } },
        // cabeçalho de colunas (profissionais)
        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: `64px repeat(${profs.length}, 1fr)`, borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 5 } },
          React.createElement('div', null),
          profs.map(p =>
            React.createElement('div', { key: p.id, style: { padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, borderLeft: '1px solid var(--border)' } },
              React.createElement(Avatar, { nome: p.nome, cor: p.cor, size: 32 }),
              React.createElement('div', { className: 'col', style: { lineHeight: 1.25 } },
                React.createElement('div', { style: { fontWeight: 700, fontSize: 14 } }, p.apelido),
                React.createElement('div', { className: 'muted', style: { fontSize: 12 } },
                  appts.filter(a => a.prof === p.id && visible(a)).length + ' hoje')
              )
            )
          )
        ),

        // grade
        React.createElement('div', { ref: gridRef, style: { display: 'grid', gridTemplateColumns: `64px repeat(${profs.length}, 1fr)`, position: 'relative' } },
          // coluna de horas
          React.createElement('div', { style: { position: 'relative', height: colH } },
            D.horarios.map((h, i) =>
              React.createElement('div', { key: h, style: { position: 'absolute', top: i * 60 * PX_MIN - 8, right: 8, fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }, className: 'mono' }, h)
            )
          ),
          // colunas por profissional
          profs.map(p =>
            React.createElement('div', {
              key: p.id,
              ref: el => colRefs.current[p.id] = el,
              style: { position: 'relative', height: colH, borderLeft: '1px solid var(--border)' },
            },
              // linhas de hora
              D.horarios.map((h, i) =>
                React.createElement('div', { key: h, style: { position: 'absolute', top: i * 60 * PX_MIN, left: 0, right: 0, borderTop: '1px solid var(--border)' } })
              ),
              // meia-hora (tracejado)
              D.horarios.map((h, i) =>
                React.createElement('div', { key: 'h' + h, style: { position: 'absolute', top: i * 60 * PX_MIN + 30 * PX_MIN, left: 0, right: 0, borderTop: '1px dashed var(--border)', opacity: 0.5 } })
              ),
              // linha "agora"
              now >= DAY_START && now <= DAY_END && React.createElement('div', { style: { position: 'absolute', top: (now - DAY_START) * PX_MIN, left: 0, right: 0, height: 2, background: 'var(--st-faltou)', zIndex: 4 } },
                React.createElement('div', { style: { position: 'absolute', left: -4, top: -3, width: 8, height: 8, borderRadius: 99, background: 'var(--st-faltou)' } })
              ),
              // agendamentos
              appts.filter(a => a.prof === p.id && visible(a)).map(a => {
                const g = ghost && ghost.id === a.id ? ghost : null;
                const aMin = D.toMin(g ? g.ini : a.ini);
                const aDur = g ? g.dur : dur(a);
                const isDragging = drag && drag.id === a.id;
                return React.createElement(ApptCard, {
                  key: a.id, a, top: (aMin - DAY_START) * PX_MIN, height: aDur * PX_MIN - 3,
                  dur: aDur, dragging: isDragging,
                  onMove: e => startMove(e, a, aDur), onResize: e => startResize(e, a, aDur),
                  onClick: () => !isDragging && onOpen(a),
                });
              })
            )
          )
        )
      ),

      React.createElement('div', { className: 'row', style: { marginTop: 14, gap: 16, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--text-3)' } },
        React.createElement('span', { className: 'row', style: { gap: 6 } }, React.createElement(Icon, { name: 'grip', size: 14 }), 'Arraste para remarcar'),
        React.createElement('span', { className: 'row', style: { gap: 6 } }, '↕ Redimensione a borda inferior para ajustar a duração'),
        React.createElement('span', { className: 'row', style: { gap: 6 } }, 'Clique no card para ver detalhes')
      )
    );
  }

  // ---- card de agendamento ----
  function ApptCard({ a, top, height, dur, dragging, onMove, onResize, onClick }) {
    const c = D.cli(a.cli), s = D.srv(a.srv);
    const compact = height < 46;
    return React.createElement('div', {
      onPointerDown: onMove,
      onClick,
      style: {
        position: 'absolute', top, left: 4, right: 4, height: Math.max(height, 22),
        background: dragging ? 'var(--surface)' : `color-mix(in oklch, ${s.cor} 9%, white)`,
        borderLeft: `3px solid ${s.cor}`,
        border: `1px solid color-mix(in oklch, ${s.cor} 28%, var(--border))`,
        borderLeftWidth: 3, borderRadius: 8,
        padding: compact ? '3px 8px' : '6px 9px',
        cursor: dragging ? 'grabbing' : 'grab', overflow: 'hidden',
        boxShadow: dragging ? 'var(--sh-pop)' : 'none',
        opacity: a.status === 'cancelado' || a.status === 'faltou' ? 0.6 : 1,
        zIndex: dragging ? 50 : 2, transition: dragging ? 'none' : 'box-shadow .12s',
        userSelect: 'none',
      },
    },
      React.createElement('div', { className: 'row', style: { gap: 5, justifyContent: 'space-between' } },
        React.createElement('span', { className: 'mono', style: { fontSize: 11, fontWeight: 700, color: s.cor } },
          a.ini + (compact ? '' : '–' + D.fromMin(D.toMin(a.ini) + dur))),
        React.createElement('div', { className: 'row', style: { gap: 4 } },
          a.sinal && React.createElement(Icon, { name: 'check', size: 12, style: { color: 'var(--accent)' } }),
          React.createElement(StatusDot, { status: a.status })
        )
      ),
      !compact && React.createElement('div', { style: { fontWeight: 700, fontSize: 13, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, c.nome),
      compact
        ? React.createElement('span', { style: { fontSize: 11, fontWeight: 600, color: 'var(--text-2)' } }, ' ' + c.nome.split(' ')[0])
        : (height > 58 && React.createElement('div', { className: 'muted', style: { fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, s.nome)),
      // alça de resize
      React.createElement('div', {
        onPointerDown: onResize,
        style: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 8, cursor: 'ns-resize' },
      })
    );
  }

  function StatusDot({ status }) {
    const c = {
      pendente: 'var(--st-pendente)', confirmado: 'var(--accent)', atendimento: 'var(--st-atendimento)',
      concluido: 'var(--st-concluido)', faltou: 'var(--st-faltou)', cancelado: 'var(--st-cancelado)',
    }[status];
    return React.createElement('span', { style: { width: 8, height: 8, borderRadius: 99, background: c, flexShrink: 0 }, title: D.statusLabels[status] });
  }

  // ---- header ----
  function AgendaHeader({ view, setView, profFilter, setProfFilter, statusFilter, setStatusFilter, onNew }) {
    return React.createElement('div', { className: 'col', style: { gap: 14, marginBottom: 16 } },
      React.createElement('div', { className: 'row', style: { gap: 12, flexWrap: 'wrap' } },
        React.createElement('div', { className: 'row', style: { gap: 4 } },
          React.createElement('button', { className: 'icon-btn', style: { width: 36, height: 36 } }, React.createElement(Icon, { name: 'chevL', size: 18 })),
          React.createElement('button', { className: 'btn btn-ghost btn-sm' }, 'Hoje'),
          React.createElement('button', { className: 'icon-btn', style: { width: 36, height: 36 } }, React.createElement(Icon, { name: 'chevR', size: 18 }))
        ),
        React.createElement('div', { style: { fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em' } }, 'Terça, 9 de junho'),
        React.createElement('div', { className: 'seg', style: { marginLeft: 'auto' } },
          ['dia','semana','mes'].map(v =>
            React.createElement('button', { key: v, className: view === v ? 'on' : '', onClick: () => setView(v) },
              v === 'dia' ? 'Dia' : v === 'semana' ? 'Semana' : 'Mês')
          )
        )
      ),
      React.createElement('div', { className: 'filter-bar' },
        React.createElement('div', { className: 'seg' },
          STATUS_FILTERS.map(f =>
            React.createElement('button', { key: f.id, className: statusFilter === f.id ? 'on' : '', onClick: () => setStatusFilter(f.id) }, f.label))
        ),
        React.createElement('select', { className: 'select', style: { width: 'auto', minWidth: 180 }, value: profFilter, onChange: e => setProfFilter(e.target.value) },
          React.createElement('option', { value: 'todos' }, 'Todos os profissionais'),
          D.staff.map(p => React.createElement('option', { key: p.id, value: p.id }, p.nome))
        ),
        React.createElement('button', { className: 'btn btn-ghost btn-sm', style: { marginLeft: 'auto' } },
          React.createElement(Icon, { name: 'lock', size: 14 }), 'Bloquear horário')
      )
    );
  }

  // ---- semana / mês (visões simplificadas) ----
  function OtherView({ view, appts, onOpen }) {
    if (view === 'semana') {
      const dias = ['Seg 8','Ter 9','Qua 10','Qui 11','Sex 12','Sáb 13'];
      const hrs = D.horarios.filter((_, i) => i % 2 === 0);
      return React.createElement('div', { className: 'card', style: { padding: 16, overflowX: 'auto' } },
        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: `56px repeat(6, minmax(120px,1fr))`, gap: 1 } },
          React.createElement('div', null),
          dias.map((d, i) => React.createElement('div', { key: d, style: { textAlign: 'center', fontWeight: 700, fontSize: 13, padding: '6px 0', color: i === 1 ? 'var(--accent-text)' : 'var(--text)', background: i === 1 ? 'var(--accent-soft)' : 'transparent', borderRadius: 8 } }, d)),
          hrs.map(h => [
            React.createElement('div', { key: 'l' + h, className: 'mono', style: { fontSize: 11, color: 'var(--text-3)', padding: '14px 6px 0', textAlign: 'right' } }, h),
            ...dias.map((d, di) => {
              const has = (di === 1 && (h === '09:00' || h === '11:00' || h === '15:00')) || (di === 3 && h === '11:00') || (di === 0 && h === '13:00');
              return React.createElement('div', { key: h + di, style: { minHeight: 52, border: '1px solid var(--border)', borderRadius: 8, margin: 1, padding: 4, background: 'var(--surface)' } },
                has && React.createElement('div', { style: { background: 'var(--accent-soft)', borderLeft: '3px solid var(--accent)', borderRadius: 6, padding: '3px 6px', fontSize: 11, fontWeight: 600, color: 'var(--accent-text)' } }, 'Atendimento'));
            })
          ])
        )
      );
    }
    // mês
    const cells = [];
    const startDow = 0; // junho 2026 começa numa segunda (simplificado)
    for (let i = 0; i < 30; i++) cells.push(i + 1);
    return React.createElement('div', { className: 'card', style: { padding: 16 } },
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 } },
        ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(d => React.createElement('div', { key: d, style: { textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--text-3)', padding: '4px 0' } }, d)),
        cells.map(day => {
          const cnt = [9, 11, 12].includes(day) ? (day === 9 ? 15 : 8) : (day % 4 === 0 ? 6 : day % 3 === 0 ? 4 : day % 7 === 0 ? 9 : 0);
          const isToday = day === 9;
          return React.createElement('div', { key: day, style: { minHeight: 92, border: '1px solid ' + (isToday ? 'var(--accent)' : 'var(--border)'), borderRadius: 10, padding: 8, background: isToday ? 'var(--accent-soft)' : 'var(--surface)' } },
            React.createElement('div', { style: { fontWeight: 700, fontSize: 13, color: isToday ? 'var(--accent-text)' : 'var(--text)' } }, day),
            cnt > 0 && React.createElement('div', { style: { marginTop: 6, fontSize: 11.5, fontWeight: 600, color: 'var(--text-2)' } },
              React.createElement('span', { style: { display: 'inline-block', width: 7, height: 7, borderRadius: 99, background: 'var(--accent)', marginRight: 5 } }), cnt + ' agend.')
          );
        })
      )
    );
  }

  window.Agenda = Agenda;
})();
