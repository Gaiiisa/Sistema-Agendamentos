# Planejamento — Responsividade Mobile

**Data:** 2026-06-24
**Sistema:** Lâmina — Sistema de Agendamento (Angular)
**Objetivo:** Tornar o sistema utilizável e bonito em dispositivos móveis, reagrupando os elementos em telas pequenas sem perder a estética (tema glass, gradientes, design system).

---

## 0. Decisões travadas

| Tema | Decisão |
|---|---|
| **Navegação mobile** | Pílula glass compacta no topo + **bottom tab bar** fixa (4-5 itens) + botão **"Mais"** abrindo sheet com o restante. |
| **Tabelas** | **Clientes e Financeiro** viram cards empilhados; demais telas ficam com scroll horizontal + dica de arraste. |
| **Agenda (drag)** | No mobile o arraste é **desabilitado**; remarcação via tap → modal. |

---

## 1. Diagnóstico — o que quebra hoje no celular

O sistema foi desenhado 100% para desktop. Hoje só existe **um** breakpoint
(`@media (max-width: 1180px)` em `src/styles.css`) que troca os grids do dashboard
de 4→2 e 2→1 coluna. Abaixo de ~700px nada está preparado.

| Área | Arquivo | Problema em tela ~375px |
|---|---|---|
| **Topnav (pílula glass)** | `src/app/shared/sidebar.component.ts` | 11 itens + marca + 5 ícones numa pílula `width:max-content`. Vira scroll horizontal apertadíssimo; marca e ícones competem por espaço. **Item mais crítico.** |
| **Topbar** | `src/styles.css` (`.topbar`) | Grid `1fr auto 1fr` com título centralizado + botão "Novo". Estoura largura; título e botão colidem. |
| **Dashboard** | `src/app/screens/dashboard.component.ts` | `stat-grid` para em 2 colunas (KPIs `28px` ainda espremidos), `grid-dash 1fr 320px` e `grid-2` viram 1 coluna só a 1180px. |
| **Agenda** | `src/app/screens/agenda.component.ts` | Caso mais difícil: timeline com 1 coluna por profissional + **drag-and-drop por `pointer`**, e grids semana (`56px repeat(6,...)`) / mês (`repeat(7,1fr)`). Em mobile, inutilizável. |
| **Tabelas** (clientes, financeiro, estoque, etc.) | vários | 6-7 colunas. Já têm `overflow-x:auto` — "funciona", mas a UX de scrollar tabela larga no dedo é ruim. |
| **Modais/Drawers** | `src/styles.css` (`.modal`, `.drawer`) | Modal `max-width:520px` e drawer `width:480px` já têm `max-width:92vw` — quase ok; falta virar full-screen no celular. |

**Base já correta:** `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
existe em `src/index.html`.

---

## 2. Estratégia geral

**Abordagem:** CSS-first com 3 breakpoints, mexendo o mínimo no HTML/TS. A maior parte
se resolve em `styles.css` (que já centraliza tudo via classes utilitárias e variáveis).
Só a **navegação** e a **agenda** exigem mudança de markup/lógica.

```
Desktop      > 1024px   (layout atual, intocado)
Tablet       768–1024px (grids colapsam, nav ainda em pílula)
Mobile       < 768px    (1 coluna, nav vira tab bar, tabelas viram cards)
Mobile-S     < 400px    (ajustes finos de padding/fonte)
```

**Princípio:** não criar telas novas — reagrupar via CSS. Manter tema, variáveis e
estética glass. *A beleza vem do design system; preservá-lo é preservar a beleza.*

---

## 3. Navegação — o ponto mais crítico

A pílula glass horizontal é a assinatura visual e **não cabe** com 11 itens no celular.

- **Manter a pílula no topo**, mas no mobile mostrando só:
  `[logo] [marca] ........ [tema] [☰]`. Os 11 itens de navegação saem dela.
- **Os 11 itens viram uma bottom tab bar fixa** (padrão de app nativo) com os
  **4-5 principais** (Dashboard, Agenda, Clientes, Financeiro) + botão **"Mais"**
  que abre o restante num sheet.
- Mantém `backdrop-filter`, gradiente e sheen — muda só a **disposição**, não a
  aparência do material. A estética glass continua intacta, agora também na bottom bar.
- O indicador deslizante (que hoje segue `mouseenter`) passa a **seguir o item ativo**,
  pois não há hover no toque.

Esta é a única parte que mexe em `sidebar.component.ts` (markup + estado `menuOpen`).

---

## 4. Topbar

- Vira layout de 2 colunas: `[título à esquerda] ... [botão Novo]`, removendo o `1fr` central.
- Subtítulo (`tb-sub`) some abaixo de 768px (supérfluo no celular).
- Botão "Novo" vira **ícone-only** (`+`) abaixo de 480px para não estourar.

---

## 5. Dashboard

- `stat-grid`: novo breakpoint → **1 coluna** abaixo de 560px (hoje fica em 2 e os
  números `28px` espremem).
- `grid-2` e `grid-dash`: já colapsam a 1180px — só descer o padding do `.page` de
  `28px` para `16px` (mobile) / `12px` (mobile-S).
- Saudação `22px` → `18px`; botões de atalho já têm `flex-wrap`, ok.

---

## 6. Agenda — o trabalho pesado

Estratégia por visão:

- **Dia (timeline):** com 1 coluna por profissional não cabe. Mobile → **um
  profissional por vez** (o `select` de profissional vira obrigatório, default =
  primeiro/"meu"), uma coluna ocupando largura total; reduzir `PX_MIN`.
- **Drag-and-drop:** **desabilitado no mobile** (decisão travada). Remarcação via
  tap → modal. (Drag em timeline no celular é frágil e conflita com o scroll.)
- **Semana:** `56px repeat(6,...)` → scroll horizontal dentro do card (aceitável)
  ou reduzir para 3 dias visíveis.
- **Mês:** `repeat(7,1fr)` cabe; reduzir altura das células (`92px`→`64px`) e fontes.

---

## 7. Tabelas

Abaixo de 768px:

- **Clientes e Financeiro** → cada `<tr>` vira **card empilhado** via CSS
  (`display:block` nas células + `::before` com o label da coluna). Mantém a elegância,
  sem mexer no TS.
- **Demais telas** (estoque, equipe, serviços, etc.) → manter `overflow-x:auto`
  (já existe) + indicador visual de "arraste".

---

## 8. Modais e Drawers

- `.modal`: abaixo de 640px vira quase full-screen (`max-width:100%`, `border-radius`
  só no topo, ancorado embaixo como bottom-sheet).
- `.drawer`: `width:480px` → `width:100vw` no mobile.
- `.overlay`: padding `24px` → `0` no mobile.

---

## 9. Pontos de atenção na hora de mexer

1. **`touch-action`** nos elementos com `pointerdown` (cards da agenda) — senão o
   navegador "rouba" o gesto para o scroll. (Mesmo com drag desabilitado, garantir
   que o tap funcione.)
2. **Alvos de toque ≥ 44px** — vários `icon-btn` são `30-34px`; ícones da topnav idem.
   Aumentar no mobile.
3. **`100vh` no mobile** — a barra de endereço quebra a altura. Como `.app` usa
   `height:100%`, validar; se houver corte, migrar para `100dvh`.
4. **`backdrop-filter`** é caro em GPU mobile — testar performance da pílula + sheet
   abertos juntos.
5. **`hover` states** não existem no toque — o indicador deslizante da nav precisa de
   fallback (seguir o item ativo, não o hover).
6. **`overflow:hidden` no `.app`** + `overflow-y:auto` no `.content` — confirmar que
   o sticky header da agenda e a bottom bar coexistem sem cortar conteúdo.
7. **Não tocar nas variáveis de tema nem nos gradientes** — toda a beleza vive lá;
   responsividade é só layout/espaçamento.
8. **Testar nos dois temas** (claro/escuro) em cada breakpoint.

---

## 10. Ordem de execução

1. **Fundação CSS** — breakpoints, padding do `.page`, tipografia fluida, alvos de
   toque, `100dvh`. *(rápido, impacto amplo)*
2. **Navegação mobile** — pílula compacta + bottom bar + sheet "Mais". *(o coração)*
3. **Topbar** + **Dashboard** *(puro CSS)*.
4. **Tabelas** → cards empilhados (Clientes, Financeiro).
5. **Modais/Drawers** → bottom-sheets.
6. **Agenda** *(deixar por último — o mais complexo)*.

---

## 11. Arquivos impactados (resumo)

| Arquivo | Tipo de mudança |
|---|---|
| `src/styles.css` | Breakpoints, padding, tipografia, tabelas-card, modais bottom-sheet, alvos de toque. **Maior parte do trabalho.** |
| `src/app/shared/sidebar.component.ts` | Markup da nav + bottom bar + sheet + estado `menuOpen` + indicador seguindo ativo. |
| `src/app/shared/topbar.component.ts` | Ajuste de layout/ícone (mínimo; maior parte via CSS). |
| `src/app/screens/agenda.component.ts` | 1 profissional por vez no mobile, drag desabilitado, tap→modal. |
| `src/app/screens/dashboard.component.ts` | Mínimo — quase tudo via CSS. |
| Telas com tabela (clientes, financeiro) | Classes/atributos `data-label` para o modo card (se necessário). |
