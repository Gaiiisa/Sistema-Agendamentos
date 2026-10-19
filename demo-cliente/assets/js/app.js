/* ============================================================
   Lâmina — Demonstração estática
   Interatividade compartilhada por todas as páginas (sem backend).
   Convenções (data-attributes):

   TEMA
     [data-theme-toggle]                 → alterna claro/escuro (persiste em localStorage)

   ABAS (.seg, tabs internas de qualquer tela)
     [data-tab-group="g"][data-tab="k"]        → botão da aba
     [data-tab-panel-group="g"][data-tab-panel="k"] → painel correspondente

   MODAIS / DRAWERS / SHEETS (qualquer overlay de tela cheia)
     [data-modal-root][id="x"]           → contêiner raiz, começa com o atributo `hidden`
     [data-open-modal="x"]               → alterna (abre/fecha) o #x
     [data-modal-backdrop]               → fundo do overlay; clique DIRETO nele fecha o modal-root pai
     [data-close-modal]                  → botão explícito (X, Cancelar…) que fecha o modal-root pai
     Esc fecha o último modal-root visível.

   MENUS "···" (dropdown pequeno, ex.: ações de linha de tabela)
     .menu-root > [data-menu-toggle] + [data-menu-panel]

   SELECT CUSTOM (visual rico, com ícone/cor por opção)
     .sel-root > .sel-trigger (.sel-txt) + .sel-panel > .sel-opt (.sel-opt-lbl)

   CHECKBOX
     [data-checkbox] (a própria .checkbox) → alterna data-checked + classe .on

   TOAST
     [data-toast="Mensagem"] [data-toast-type="ok|error"] → dispara toast ao clicar
     window.showToast(msg, type)

   FILTRO DE TABELA (cosmético)
     [data-filter-table="idDaTabela"]     → input de busca que filtra as linhas do tbody
   ============================================================ */
(function () {
  'use strict';

  // ---------- Tema ----------
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('lamina-demo-theme', t); } catch (e) {}
  }
  (function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem('lamina-demo-theme'); } catch (e) {}
    applyTheme(saved === 'light' ? 'light' : 'dark');
  })();

  function closeSheetLike(root) {
    if (root) root.hidden = true;
  }

  document.addEventListener('DOMContentLoaded', function () {

    // ---------- Tema: toggle ----------
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cur = document.documentElement.getAttribute('data-theme');
        applyTheme(cur === 'dark' ? 'light' : 'dark');
      });
    });

    // ---------- Abas (.seg / tabs internas) ----------
    document.querySelectorAll('[data-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var group = btn.getAttribute('data-tab-group');
        var key = btn.getAttribute('data-tab');
        document.querySelectorAll('[data-tab-group="' + group + '"]').forEach(function (b) {
          b.classList.toggle('on', b === btn);
        });
        document.querySelectorAll('[data-tab-panel-group="' + group + '"]').forEach(function (p) {
          p.hidden = p.getAttribute('data-tab-panel') !== key;
        });
      });
    });

    // ---------- Abrir modal/drawer/sheet (toggle) ----------
    document.querySelectorAll('[data-open-modal]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-open-modal');
        var el = document.getElementById(id);
        if (el) el.hidden = !el.hidden;
      });
    });

    // ---------- Fechar modal/drawer/sheet ----------
    document.addEventListener('click', function (e) {
      // clique direto no backdrop (não em um filho)
      var backdrop = e.target.hasAttribute && e.target.hasAttribute('data-modal-backdrop') ? e.target : null;
      if (backdrop) {
        closeSheetLike(backdrop.closest('[data-modal-root]'));
        return;
      }
      // botão explícito de fechar (X, Cancelar…)
      var closer = e.target.closest('[data-close-modal]');
      if (closer) {
        closeSheetLike(closer.closest('[data-modal-root]'));
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var roots = document.querySelectorAll('[data-modal-root]:not([hidden])');
      if (roots.length) closeSheetLike(roots[roots.length - 1]);
    });

    // ---------- Menus "···" (dropdown de linha) ----------
    document.addEventListener('click', function (e) {
      var toggle = e.target.closest('[data-menu-toggle]');
      if (toggle) {
        var panel = toggle.parentElement.querySelector('[data-menu-panel]');
        var wasHidden = panel ? panel.hidden : true;
        document.querySelectorAll('[data-menu-panel]').forEach(function (p) { p.hidden = true; });
        if (panel) panel.hidden = !wasHidden;
        e.stopPropagation();
        return;
      }
      // clique fora de qualquer menu-panel fecha todos
      if (!e.target.closest('[data-menu-panel]')) {
        document.querySelectorAll('[data-menu-panel]').forEach(function (p) { p.hidden = true; });
      }
    });

    // ---------- Select custom (.sel-root) ----------
    document.addEventListener('click', function (e) {
      var trig = e.target.closest('.sel-trigger');
      if (trig) {
        var root = trig.closest('.sel-root');
        var wasOpen = root.classList.contains('open');
        document.querySelectorAll('.sel-root.open').forEach(function (r) { r.classList.remove('open'); });
        root.classList.toggle('open', !wasOpen);
        e.stopPropagation();
        return;
      }
      var opt = e.target.closest('.sel-opt');
      if (opt) {
        var root2 = opt.closest('.sel-root');
        var label = root2.querySelector('.sel-trigger .sel-txt');
        root2.querySelectorAll('.sel-opt').forEach(function (o) { o.classList.remove('on'); });
        opt.classList.add('on');
        if (label) {
          var lbl = opt.querySelector('.sel-opt-lbl');
          label.textContent = lbl ? lbl.textContent : opt.textContent.trim();
        }
        root2.classList.remove('open');
        return;
      }
      if (!e.target.closest('.sel-root')) {
        document.querySelectorAll('.sel-root.open').forEach(function (r) { r.classList.remove('open'); });
      }
    });

    // ---------- Checkbox ----------
    document.addEventListener('click', function (e) {
      var chk = e.target.closest('[data-checkbox]');
      if (!chk) return;
      var on = chk.getAttribute('data-checked') === 'true';
      chk.setAttribute('data-checked', on ? 'false' : 'true');
      chk.classList.toggle('on', !on);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var chk = document.activeElement && document.activeElement.closest && document.activeElement.closest('[data-checkbox]');
      if (!chk) return;
      e.preventDefault();
      chk.click();
    });

    // ---------- Toast ----------
    document.querySelectorAll('[data-toast]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.showToast(btn.getAttribute('data-toast'), btn.getAttribute('data-toast-type') || 'ok');
      });
    });

    // ---------- Filtro de tabela (cosmético) ----------
    document.querySelectorAll('[data-filter-table]').forEach(function (input) {
      input.addEventListener('input', function () {
        var table = document.getElementById(input.getAttribute('data-filter-table'));
        if (!table) return;
        var q = input.value.trim().toLowerCase();
        table.querySelectorAll('tbody tr').forEach(function (tr) {
          tr.style.display = (!q || tr.textContent.toLowerCase().indexOf(q) > -1) ? '' : 'none';
        });
      });
    });
  });

  // ---------- Toast (API global) ----------
  var toastTimer = null;
  window.showToast = function (msg, type) {
    var root = document.getElementById('toastRoot');
    if (!root) return;
    var isError = type === 'error';
    root.innerHTML =
      '<div class="demo-toast' + (isError ? ' demo-toast-error' : '') + '">' +
        '<span class="demo-toast-ico">' +
          (isError
            ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>'
            : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>') +
        '</span><span>' + msg + '</span>' +
      '</div>';
    root.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { root.hidden = true; }, isError ? 4000 : 2600);
  };
})();
