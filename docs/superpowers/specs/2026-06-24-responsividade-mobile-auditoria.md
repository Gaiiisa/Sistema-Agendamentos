# Auditoria de Responsividade Mobile — Erros e Pontos a Melhorar

**Data:** 2026-06-24
**Sistema:** Lâmina — Sistema de Agendamento (Angular)
**Escopo:** Levantamento (somente diagnóstico — nenhuma alteração de código) de tudo que
ainda quebra ou degrada a experiência em telas de celular (≤ 768px, foco em ~375px).

> Documento complementar ao plano [2026-06-24-responsividade-mobile-plano.md](2026-06-24-responsividade-mobile-plano.md).

---

## 1. Estado atual — o que JÁ está implementado

Boa parte da fundação mobile já existe e funciona. Não precisa ser refeita:

- **Navegação mobile completa** ([sidebar.component.ts](../../../src/app/shared/sidebar.component.ts)):
  pílula compacta no topo (`tn-hide-mobile` esconde ícones secundários), **bottom tab bar**
  fixa (`.tn-bottom-bar`) com 4 itens (`Início, Agenda, Clientes, Financeiro`) + botão **"Mais"**
  abrindo um **sheet** (`.tn-sheet`) com os 7 itens restantes. Fecha em resize > 768px.
- **Topbar adaptada** ([topbar.component.ts](../../../src/app/shared/topbar.component.ts)):
  grid de 2 colunas no mobile, subtítulo oculto, texto do botão "Novo" oculto via `.btn-text`
  (fica só o ícone `+`).
- **CSS base mobile** ([styles.css:747-1002](../../../src/styles.css)): `100dvh`, `.page`
  com padding reduzido (`16px`/`12px`), modais viram **bottom-sheet** (`slide-up`), drawer
  vira `100vw`, alvos de toque (`icon-btn` 44px), e o padrão **tabela→card** (`.tbl-card`
  com `data-label`, `card-header`, `card-actions`).
- **Tabelas já convertidas para card:** Financeiro (Lançamentos e A receber) e parcialmente
  Clientes.

**Conclusão:** o problema **não é** a estrutura do app-shell — é um conjunto de defeitos
**dentro das telas** que escapam das regras globais (principalmente estilos inline que
vencem as media queries) e tabelas/grids que não receberam o tratamento mobile.

---

## 2. Breakpoints em uso

```
1180px  → grids do dashboard colapsam (legado)
768px   → ponto principal mobile (nav, tabelas-card, grids 1 coluna, bottom-sheet)
400px   → ajustes finos (stat-grid 1 coluna, paddings menores)
```

---

## 3. ERROS (bugs de layout)

### 3.1 — Críticos: estouram a largura da tela ou desfiguram

| # | Tela · arquivo:linha | Sintoma | Causa raiz |
|---|---|---|---|
| **E1** | **Estoque** · [estoque.component.ts:19](../../../src/app/screens/estoque.component.ts) | KPIs renderizam em **4 colunas** no celular; números/labels espremem e vazam | `style="grid-template-columns:repeat(4,1fr)"` **inline** — estilo inline tem prioridade sobre a media query `.stat-grid { repeat(2,1fr) }` (que não usa `!important`) |
| **E2** | **Agendamentos** · [agendamentos.component.ts:32](../../../src/app/screens/agendamentos.component.ts) | Mini-stats de "Faltas" em **3 colunas** apertadas | `repeat(3,1fr)` inline vence a media query |
| **E3** | **Comissões** · [comissoes.component.ts:29](../../../src/app/screens/comissoes.component.ts) | 3 stat-cards em 3 colunas apertadas | idem `repeat(3,1fr)` inline |
| **E4** | **Financeiro** (aba Lançamentos) · [financeiro.component.ts:380](../../../src/app/screens/financeiro.component.ts) | Resumo em 3 colunas apertadas | idem `repeat(3,1fr)` inline |
| **E5** | **Fidelidade** (aba Programa) · [fidelidade.component.ts:126](../../../src/app/screens/fidelidade.component.ts) | grid de métricas fixo em `1fr 1fr` inline | idem |
| **E6** | **Equipe** · [equipe.component.ts:26](../../../src/app/screens/equipe.component.ts) | Cards **mais largos que a tela** → barra de rolagem horizontal na página inteira | `repeat(auto-fill, minmax(360px,1fr))`: a faixa mínima de **360px** é maior que o conteúdo disponível (~343px em 375px de viewport) → força overflow |
| **E7** | **Estoque** (aba Histórico) · [estoque.component.ts:177](../../../src/app/screens/estoque.component.ts) | Tabela de 5 colunas **estoura a página** (sem rolagem contida) | `<div class="card"><table class="tbl">` **sem** wrapper `overflow-x:auto` (diferente da aba Produtos, que tem) |

### 3.2 — Médios: estouro condicional / degradação visível

| # | Tela · arquivo:linha | Sintoma | Causa raiz |
|---|---|---|---|
| **E8** | **Comissões** · [comissoes.component.ts:67](../../../src/app/screens/comissoes.component.ts) | Cards de comissão podem estourar em telas ≤ 360px | `minmax(340px,1fr)` sem teto de `100%` |
| **E9** | **Fidelidade** (Campanhas) · [fidelidade.component.ts:194](../../../src/app/screens/fidelidade.component.ts) | Cards de campanha idem | `minmax(330px,1fr)` |
| **E10** | **Serviços** · [servicos.component.ts:26](../../../src/app/screens/servicos.component.ts) | Risco em telas muito estreitas (≤ 300px) | `minmax(290px,1fr)` |
| **E11** | **Comissões** (modal Recibo) · [comissoes.component.ts:154](../../../src/app/screens/comissoes.component.ts) | Tabela de 5 colunas dentro do bottom-sheet estoura | sem wrapper de rolagem |
| **E12** | **`.seg` (abas segmentadas)** — ex.: Financeiro (4 abas: *Visão geral / Caixa do dia / Lançamentos / A receber*) [financeiro.component.ts:20](../../../src/app/screens/financeiro.component.ts); Agendamentos (aba *"Faltas & Cancelamentos"*) [agendamentos.component.ts:24](../../../src/app/screens/agendamentos.component.ts) | Conjunto de abas **mais largo que a tela**, sem rolagem | `.seg` é `inline-flex` sem `overflow-x` nem `flex-wrap` no mobile |
| **E13** | **Toast de notificação** · [app.component.ts:144](../../../src/app/app.component.ts) | No celular o toast (`bottom:24px`) aparece **atrás/encostado na bottom tab bar** (60px de altura) | posição fixa não considera a altura da bottom bar no mobile |

### 3.3 — Tabelas inconsistentes (degradação de UX, sem estouro)

Estas estão dentro de wrappers `overflow-x:auto`, então **não** quebram a página — mas
viram um scroll horizontal pouco usável, divergindo das tabelas que já viram card.

| # | Tela · arquivo:linha | Situação |
|---|---|---|
| **E14** | **Agendamentos** (tabela principal) · [agendamentos.component.ts:117](../../../src/app/screens/agendamentos.component.ts) | 8 colunas, `class="tbl"` (sem `tbl-card`). Vira scroll-X. Inconsistente com Clientes/Financeiro |
| **E15** | **Estoque** (aba Produtos) · [estoque.component.ts:108](../../../src/app/screens/estoque.component.ts) | 9 colunas, `class="tbl"` (sem `tbl-card`). Vira scroll-X |
| **E16** | **Clientes** (conversão card incompleta) · [clientes.component.ts:62](../../../src/app/screens/clientes.component.ts) | Já usa `tbl-card`, **mas**: a 1ª célula (avatar+nome) **não** tem a classe `card-header`, e a célula de WhatsApp [clientes.component.ts:88](../../../src/app/screens/clientes.component.ts) **não** tem `data-label` → no modo card o número aparece sem rótulo e o card fica sem cabeçalho destacado |

### 3.4 — Agenda (caso mais complexo)

| # | Tela · arquivo:linha | Situação |
|---|---|---|
| **E17** | **Agenda — visão Dia** · [agenda.component.ts:114](../../../src/app/screens/agenda.component.ts) e [:129](../../../src/app/screens/agenda.component.ts) | Timeline com `gridTemplateColumns = '64px repeat(n,1fr)'`. Com vários profissionais, cada coluna encolhe a ~70px → cartões ilegíveis. Não estoura a página (o `.card` tem `overflow:hidden`), mas fica inutilizável. **Decisão de produto pendente:** mostrar 1 profissional por vez (select obrigatório) ou rolagem horizontal com largura mínima por coluna |
| **E18** | **Agenda — visão Semana** · [agenda.component.ts:33](../../../src/app/screens/agenda.component.ts) | Grid `56px repeat(6, minmax(120px,1fr))` (~776px) dentro de `overflow-x:auto` → rola horizontalmente. Funcional, mas apertado |
| **E19** | **Agenda — visão Mês** · [agenda.component.ts:62](../../../src/app/screens/agenda.component.ts) | `repeat(7,1fr)` cabe. Porém a regra mobile `.mes-cell { min-height:64px }` ([styles.css:937](../../../src/styles.css)) está **morta**: o markup usa `[style.minHeight.px]="92"` inline ([agenda.component.ts:67](../../../src/app/screens/agenda.component.ts)) e não a classe `.mes-cell`. As células ficam altas demais no celular |

### 3.5 — A verificar (não auditados em detalhe)

| # | Arquivo | O que checar |
|---|---|---|
| **E20** | [novo-agendamento.component.ts](../../../src/app/novo-agendamento.component.ts) | Modal de novo agendamento — confirmar que o formulário se adapta ao bottom-sheet (campos lado a lado com `flex-wrap`, larguras mínimas) |
| **E21** | [appt-detail.component.ts](../../../src/app/appt-detail.component.ts) | Drawer/modal de detalhe do agendamento — confirmar largura e rolagem no mobile |

---

## 4. PONTOS A MELHORAR (não são bugs, mas elevam a qualidade)

1. **Padronizar grids de KPI/cards.** Hoje cada tela define `grid-template-columns` inline
   com valores diferentes (290/330/340/360/170, repeat(3)/repeat(4)/1fr 1fr). Centralizar em
   poucas classes utilitárias (ex.: `.stat-grid.g3`, `.stat-grid.g4`, `.cards-grid`) elimina a
   causa raiz de E1–E10 e evita reincidência.
2. **Teto de largura idiomático** para grids fluidos: `minmax(min(100%, 320px), 1fr)` em vez de
   `minmax(320px, 1fr)` — nunca estoura, sem precisar de media query.
3. **Rolagem horizontal elegante para `.seg`** no mobile (scroll com `scrollbar-width:none`),
   ou quebra em duas linhas, para abas longas.
4. **Toast acima da bottom bar** no mobile (`bottom: calc(60px + env(safe-area-inset-bottom) + 16px)`).
5. **Consistência de tabelas:** aplicar `tbl-card` + `data-label` em **todas** as tabelas de
   lista (Agendamentos, Estoque) para a mesma estética de Clientes/Financeiro.
6. **`badge: '15'` fixo** na Agenda ([sidebar.component.ts:117](../../../src/app/shared/sidebar.component.ts) e [:132](../../../src/app/shared/sidebar.component.ts)) — valor hardcoded; idealmente derivar da contagem real.
7. **Densidade de fonte/spacing** em cards de estatística no mobile-S (≤ 400px): revisar
   `stat-val` e paddings para leitura confortável.
8. **Safe-area (iPhone com notch):** a bottom bar já usa `env(safe-area-inset-bottom)`; conferir
   se o conteúdo rolável (`.page` padding-bottom: 80px) não esconde a última linha atrás da barra
   em todas as telas.
9. **Gesto de fechar o sheet "Mais"** (arrastar o handle para baixo) — hoje só fecha por toque
   no overlay/item; o handle é decorativo.

---

## 5. Severidade & ordem sugerida de correção

| Prioridade | Itens | Esforço | Observação |
|---|---|---|---|
| **P0 — estouro de tela** | E1, E6, E7 | Baixo | Maior impacto visual; E1 resolvível só com CSS (`!important` na media query) |
| **P0 — grids inline** | E2, E3, E4, E5 | Baixo | Mesma correção CSS de E1 |
| **P1 — estouro condicional** | E8, E9, E10, E11, E12, E13 | Baixo–Médio | CSS + 1–2 wrappers; E13 ajuste de posição |
| **P2 — consistência tabelas** | E14, E15, E16 | Médio | Markup `tbl-card`/`data-label` por tabela |
| **P3 — agenda** | E17, E18, E19 | Médio–Alto | E17 exige decisão de produto (1 prof vs scroll) |
| **P3 — verificações** | E20, E21 | Baixo | Confirmar modais grandes |

---

## 6. Checklist de correção (para a fase de implementação)

- [ ] E1–E5: KPIs em N colunas no mobile (estoque/agendamentos/comissões/financeiro/fidelidade)
- [ ] E6: cards de Equipe estourando a largura
- [ ] E7: tabela de Histórico do Estoque sem wrapper de rolagem
- [ ] E8–E10: `minmax()` sem teto de 100% (comissões/fidelidade/serviços)
- [ ] E11: tabela do recibo de comissão no modal
- [ ] E12: `.seg` longo estourando (financeiro/agendamentos)
- [ ] E13: toast colidindo com a bottom bar
- [ ] E14–E15: Agendamentos e Estoque → `tbl-card`
- [ ] E16: finalizar conversão card de Clientes (`card-header` + `data-label` no WhatsApp)
- [ ] E17–E19: Agenda (dia/semana/mês) no mobile
- [ ] E20–E21: validar modais Novo Agendamento e Detalhe do Agendamento
- [ ] Pontos a melhorar #1–#9 conforme prioridade
