# Análise da Tela de Fidelidades — Erros e Pontos de Melhoria

> **Arquivos analisados:**
> - Tela: `src/app/screens/fidelidade.component.ts`
> - Dados: `src/app/data.service.ts`
>
> **Data da análise:** 2026-06-28

---

## Visão geral

A tela tem 3 abas:

| Aba | Estado atual |
|---|---|
| **Programa de fidelidade** | Configura a regra (pontos/cashback) + 4 cards de métrica + lista "Quase lá". **~70% dos dados são fictícios/hardcoded.** |
| **Campanhas** | Cards de campanha WhatsApp. **Ponto forte — funcional e real.** |
| **Modelos de mensagem** | Templates com variáveis. **Funcional.** |

**Diagnóstico de uma linha:** a aba *Campanhas* é boa e real; a aba *Programa* é hoje majoritariamente decorativa e com bugs — mas a base de dados já tem tudo que precisa, e o `DataService` já expõe métodos prontos (`clientesEmRisco()`, `taxaRetorno()`) que **não estão sendo usados** nesta tela.

---

## 🔴 ERROS (precisam ser resolvidos)

### E1 — Métricas fictícias, desconectadas dos clientes reais
**Onde:** `data.service.ts:297-300` / `fidelidade.component.ts:127-153`

```ts
readonly fidelidade = {
  tipo: 'pontos', meta: 10, recompensa: '1 corte grátis', cashbackPct: 5,
  ativos: 84, resgatados: 23, pontosEmitidos: 1240,   // ← números fixos, inventados
};
```

A base real (`clientes`) tem **12 clientes**, mas o card exibe **"84 clientes no programa"**. `resgatados` e `pontosEmitidos` também são constantes que não reagem a nenhum dado.

**Impacto:** a tela mente para o usuário. Nenhum dos números orienta uma decisão real.
**Correção:** recalcular a partir do array `clientes` (ex.: ativos = clientes com ≥1 visita).

---

### E2 — Card "Próx. do prêmio" com valor hardcoded
**Onde:** `fidelidade.component.ts:161`

```html
<div class="stat-val tnum">7</div>   <!-- valor cravado no template -->
```

Não é variável — é o número `7` escrito no HTML.
**Correção:** contar clientes com `visitas % meta >= limiar`.

---

### E3 — Barra de progresso da "Quase lá" travada em meta = 10
**Onde:** `fidelidade.component.ts:171-174`

```html
<span [style.width]="(+item[1] * 10) + '%'"></span>   <!-- assume meta=10 -->
...
<span ...>{{ item[1] }}/10</span>                     <!-- rótulo fixo "/10" -->
```

O getter `quaseLa` usa **meta dinâmica** (`data.service`/`fidelidade.component.ts:439-446`), mas a renderização assume meta = 10. O usuário pode alterar a meta pelos botões `+/-` na própria tela (`fidelidade.component.ts:81-87`), e aí:
- a largura da barra fica errada (ex.: meta 8 → 8 pontos exibiriam 80%, mas deveriam ser 100%);
- o rótulo continua mostrando "/10".

**Correção:** usar `meta` dinâmica tanto na largura (`item[1] / meta * 100`) quanto no rótulo (`{{ item[1] }}/{{ meta }}`).

---

### E4 — Incoerência lógica: cliente "sumido" aparece como "Quase lá"
**Onde:** getter `quaseLa` em `fidelidade.component.ts:439-446`

O cliente **Gustavo Rocha (c5)** tem tag `sumido` (não volta desde fev/2026, 3+ meses) e mesmo assim aparece em **"Quase lá — perto de uma recompensa"**, porque `7 visitas % 10 = 7`.

**Impacto:** você oferece um brinde a quem já abandonou — exatamente o cliente que precisa de **reativação**, não de selo. Conflito direto com o objetivo da tela.
**Correção:** excluir do `quaseLa` clientes com tag `sumido` (ou `diasDesde(ultima)` acima do limite de risco).

---

### E5 — Lógica pronta no service ignorada pela tela
**Onde:** `data.service.ts:522` e `data.service.ts:533`

```ts
taxaRetorno()      // recorrentes / (novos + recorrentes)  → KPI-âncora
clientesEmRisco()  // tags 'sumido' OU diasDesde(ultima) > 60
```

Ambos já existem e funcionam, mas **não são usados na tela de fidelidade**. É lógica de retenção desperdiçada.
**Correção:** consumir esses métodos na aba Programa.

---

## 🟡 PONTOS DE MELHORIA

### Experiência / fluxo
- **M1 — Sem filtro de período** (7d / 30d / 90d). A métrica "Pontos emitidos (mês)" sugere recorte temporal que não existe.
- **M2 — Sem drill-down:** não dá para clicar num indicador e ver *quem* são os clientes por trás dele. Sem isso, nenhum número é acionável.
- **M3 — Abas isoladas:** "Programa" e "Campanhas" não se conversam. Detectar um cliente em risco deveria levar a uma ação de campanha em 1 clique.
- **M4 — Mobile:** a lista "Quase lá" usa barra de largura fixa (90px) + nome com `flex:1`; em telas estreitas o nome pode esmagar. (As campanhas já usam `minmax(min(100%,330px),1fr)` e se comportam bem.)

### Indicadores a adicionar (dados já existem na base: `visitas`, `ticket`, `total`, `ultima`, `freq`, `tags`)
Modelo recomendado: **RFM (Recência, Frequência, valor Monetário)** — padrão de mercado para fidelização.

| Indicador | Como calcular | Valor |
|---|---|---|
| **Clientes em risco de abandono** | usar `clientesEmRisco()` (já pronto) | O mais valioso — mostra nominalmente quem contatar hoje. |
| **Clientes mais fiéis (Top LTV)** | ordenar `clientes` por `total` desc | Quem proteger e premiar. |
| **Taxa de retenção** | usar `taxaRetorno()` (já pronto) | KPI-âncora. |
| **Ticket médio fidelizado vs avulso** | comparar `ticket` de VIPs vs novos/sumidos | Prova que fidelidade gera mais receita. |
| **Tempo médio entre visitas** | média de `freq` | Base para alerta de atraso. |
| **Recompensas disponíveis p/ resgate** | contar `visitas >= meta` | Clientes que você deve premiar agora. |
| **Impacto financeiro do programa** | soma de `total` dos fidelizados | Responde "o programa vale a pena?". |

### Gráficos a adicionar (a tela hoje não tem nenhum)
1. **Funil de fidelização** (barras): `Novos → Recorrentes → Fiéis → Em risco`. Mostra onde os clientes vazam.
2. **Distribuição por nível/tier** (donut): Bronze / Prata / Ouro por nº de visitas.
3. **Ranking de recorrência:** top 5 por `total` × bottom 5 em risco, lado a lado.
4. **Evolução mensal de recompra** (linha): *fase 2* — depende de acumular histórico temporal real.

### Funcionalidades
- **F1 — Ação rápida por cliente em risco:** botão "Enviar WhatsApp" / "Criar campanha de reativação" direto da lista (padrão "Client ReConnect" do Fresha).
- **F2 — Alerta automático** de cliente que reduziu frequência (cruza `ultima` × `freq`).
- **F3 — Histórico de relacionamento** ao abrir um cliente (já existe `historico` no service).
- **F4 — Resgate como evento persistido**, para "recompensas resgatadas" virar dado real.

---

## ✅ Plano de ação priorizado

### Prioridade 1 — maior impacto, menor esforço (dados já existem)
1. Corrigir **E1** e **E2** (KPIs reais no lugar dos números fixos).
2. Corrigir **E3** e **E4** (barra com meta dinâmica + filtrar `sumido`).
3. Exibir **lista "Clientes em risco"** via `clientesEmRisco()` com botão de ação (**E5 + F1**).
4. Exibir **Taxa de retenção** via `taxaRetorno()`.
5. Adicionar **Top clientes por LTV**.

### Prioridade 2 — médio esforço
6. Funil de fidelização.
7. Filtro de período (**M1**) + drill-down (**M2**).
8. Distribuição por níveis/tiers.

### Prioridade 3 — exige histórico real acumulado
9. Evolução mensal de recompra / curva de retenção.
10. Resgate persistido (**F4**).

### As 3 mudanças de maior impacto para o negócio
1. **Conectar a lista "em risco" a uma ação de 1 clique** — transforma painel passivo em ferramenta de retenção ativa.
2. **Trocar os 4 cards falsos por 4 KPIs reais** (ativos, retenção, em risco, impacto financeiro) — devolve credibilidade.
3. **Provar o valor financeiro** do programa (LTV fidelizados vs avulsos) — justifica manter/investir no programa.

---

## O que manter (não mexer)
- As 3 abas e a navegação.
- A aba **Campanhas** inteira (ponto forte).
- A aba **Modelos** inteira.
- A lista **"Quase lá"** (após corrigir E3 e E4).

---

## Referências de mercado (benchmarking)
- [Saras Analytics — Customer Retention Dashboard](https://www.sarasanalytics.com/blog/customer-retention-dashboard)
- [Saras Analytics — Customer Retention Analytics (RFM/churn)](https://www.sarasanalytics.com/blog/customer-retention-analytics)
- [Shopify — Loyalty Analytics](https://www.shopify.com/blog/loyalty-analytics)
- [Braze — Customer Retention Analytics](https://www.braze.com/resources/articles/customer-retention-analytics)
- [Fresha — Loyalty tools / Client ReConnect (barbershops)](https://www.fresha.com/for-business/barber/how-to-turn-barbershop-clients-into-regulars-using-loyalty-tools)
- [Booksy — Salon software features](https://biz.booksy.com/en-us/blog/how-to-find-the-best-salon-software-for-small-businesses-features-to-consider)
