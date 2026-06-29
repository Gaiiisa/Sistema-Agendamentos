# Análise da Tela de Campanhas (módulo Fidelidade) — Erros e Pontos de Melhoria

> **Arquivos analisados:**
> - Tela: `src/app/screens/fidelidade.component.ts` (aba Campanhas — template `184-253` e modal `315-390`; classe `393-499`)
> - Dados: `src/app/data.service.ts` (interface `Campanha` linha `56`; array `campanhas` `301-306`; `addCampanha`/`updateCampanha` `430-440`)
>
> **Data da análise:** 2026-06-28

---

## Visão geral

Modelo de dados atual (`data.service.ts:56`):

```ts
interface Campanha {
  id; nome; tipo; alvo; publico; enviadas; retorno; taxa; status; cor;
}
```

Fluxo atual: 3 tipos (`retorno` / `aniversario` / `promo`), 3 status (`rascunho` / `agendada` / `ativa`), público-alvo é **texto livre** com sugestões (`datalist`), estimativa de público é **número digitado à mão**, e os cards mostram Enviadas / Retornos / Conversão.

**Veredito honesto:** hoje a tela é um **cadastro de cartões decorativos de campanha**, não um motor de campanhas. Ela registra um nome e um status; **não segmenta, não dispara, não mede e não decide**. Falta fechar o ciclo `planejar → segmentar → disparar → medir → otimizar`.

---

## 🔴 ERROS (precisam ser resolvidos)

### E1 — Impossível criar campanha pela interface (recurso morto)
**Onde:** `fidelidade.component.ts` — método `openNovaCampanha()` definido, mas **nenhum botão no template o chama**.

A aba Campanhas só permite **editar** as campanhas que já existem no mock (botão de editar em `fidelidade.component.ts:243`). O cabeçalho da aba (`187-192`) é só texto, sem botão de ação.

**Impacto:** a funcionalidade central da tela — criar campanha — não existe na prática.
**Correção:** adicionar botão "Nova campanha" chamando `openNovaCampanha()`.

---

### E2 — Botão "Disparar" é falso
**Onde:** `fidelidade.component.ts:233`

```html
<button ... (click)="notify.emit('Campanha ... disparada')">Disparar</button>
```

O clique **apenas emite uma notificação**. Não muda o status, não incrementa `enviadas`, não dispara nada. Um rascunho "disparado" continua rascunho para sempre.

**Correção:** a ação deve transicionar o status (`rascunho → ativa/agendada`) e registrar o envio.

---

### E3 — Conversão (`taxa`) é estática, não calculada
**Onde:** `data.service.ts:56` (campo) e `:438` (`addCampanha` grava `taxa: 0`)

A conversão é um valor **armazenado**, não derivado de `retorno / enviadas`. Campanha nova nasce com `taxa: 0` cravado e nunca atualiza sozinha.

**Correção:** calcular `conversao = retorno / enviadas` em tempo de exibição.

---

### E4 — Estimativa de público é digitada, não apurada
**Onde:** modal `fidelidade.component.ts:358-361` (`publico` = input numérico)

O número de clientes (`publico`) é **digitado manualmente**. Não há nenhuma query que conte os `clientes` pelo `alvo`. "Tag: Sumido = 14" é um número escrito à mão, não medido.

**Correção:** calcular `publicoEstimado` a partir da regra de segmentação aplicada ao array `clientes`.

---

### E5 — Público-alvo não segmenta de verdade
**Onde:** `data.service.ts:56` (`alvo: string`) e `datalist` em `fidelidade.component.ts:352-357`

`alvo` é uma **string livre**. O `datalist` ("Tag: VIP", "Sem visita há 60 dias" etc.) é puramente cosmético — o sistema não filtra clientes por esses critérios.

**Correção:** trocar `alvo: string` por um objeto de regra de segmento que filtra `clientes` (RFM).

---

### E6 — Nenhuma validação ao salvar
**Onde:** `salvarCampanha()` em `fidelidade.component.ts`

A campanha é salva direto, sem validar público, período, benefício, canal ou datas.

**Correção:** ver seção "Validações necessárias".

---

## 🟡 PONTOS DE MELHORIA

### M1 — Modelo de dados raso (campos faltando)
O `interface Campanha` tem 10 campos rasos. Faltam, em ordem de impacto:

| Campo faltante | Para quê |
|---|---|
| `inicio` / `fim` | Período e ciclo de vida da campanha. |
| `canais[]` | WhatsApp / e-mail / SMS / interno / cupom / link (hoje é WhatsApp implícito). |
| `beneficio` | `{ tipo: desconto/cashback/pontos/brinde, valor, validade }`. |
| `regras` | valorMinimo, limitePorCliente, limiteTotal, serviçosParticipantes, acumulaComOutras. |
| `objetivo` | reativar / reter / aumentar-ticket / aniversário / indicação. |
| `descricao` | Contexto da campanha. |
| `responsavel` | Quem é dono da campanha. |
| `orcamentoEstimado` / `resultadoEsperado` | Planejamento. |
| `segmento` | Regra de segmentação (substitui `alvo` string — ver E5). |
| `modeloMsgId` | Liga aos **Modelos de mensagem que já existem** no sistema. |
| Campos de resultado | `impactados`, `participaram`, `receitaGerada`, `custoReal`, `roi`, `beneficiosUsados`. |
| Auditoria | `criadoPor`, `criadoEm`, `editadoPor`, `editadoEm`, `historico[]`. |

### M2 — Segmentação inteligente (RFM)
Construir um seletor de segmento que filtra `clientes` de verdade usando dados que **já existem**: `visitas`, `ticket`, `total`, `ultima`, `freq`, `tags`, `nasc`.
- **Recência:** `diasDesde(ultima)` → ativo / em risco / inativo.
- **Frequência:** `freq`, `visitas`.
- **Monetário:** `ticket`, `total` (LTV).
- **Tags/nível:** `vip`, `novo`, `sumido`.
- **Potencial de recompra:** próximos da meta (`visitas % meta`).

Ganho prático: ao montar a campanha, mostrar **"42 clientes se encaixam"** atualizando ao vivo.
*Faltam na base: localização e gênero (fase 2). Idade pode ser derivada de `nasc`.*

### M3 — Mais tipos de campanha (todos calculáveis hoje)
Inativo/recuperação (`clientesEmRisco()` já pronto), aniversário (`nasc`), recorrente/VIP (`tags`/`total`), próximo de benefício (lógica do "Quase lá"), alto ticket (`ticket` acima da média), pontos em dobro/cashback (liga à regra do programa).
*Faltam dados para: indicação ("indicado por") e desconto progressivo (regra de faixas).*

### M4 — Automação e gatilhos (hoje tudo manual)
- Disparo por data (`inicio`); aniversário no dia do `nasc`.
- Disparo por comportamento (cliente cruza limite de inatividade → entra em reativação).
- Recorrência semanal/mensal/sazonal.
- Alerta de benefício a vencer; lembrete de não-retorno; cupom pós-atendimento.
- Referência de mercado: "Client ReConnect" (Fresha) detecta cliente lapsado e dispara rebooking sozinho.

### M5 — Acompanhamento focado em dinheiro
Hoje: Enviadas / Retornos / Conversão (estática). Adicionar:
- Clientes impactados × participaram;
- **Receita gerada** (cruzar participantes × `agendamentos`/`lancamentos`);
- Custo estimado × **ROI**;
- Benefícios utilizados; clientes recuperados (eram `sumido` e voltaram);
- Ticket médio durante vs fora da campanha;
- Comparação com período anterior; ranking de eficiência.

### M6 — Ciclo de vida completo de status
Hoje só 3 status, sem regra de transição. Ciclo proposto:

```
rascunho → agendada → ativa → (pausada ⇄ ativa) → encerrada
              ↘ cancelada            ↘ expirada (fim atingido)
```

Regras:
- **rascunho:** edição livre, não dispara.
- **agendada:** aguarda `inicio`; editável.
- **ativa:** dispara; alterar regra crítica (benefício/segmento) exige confirmação.
- **pausada:** **não dispara** nada (status não existe hoje).
- **encerrada/expirada:** só leitura + análise.
- **cancelada:** congelada, com **motivo** registrado.

### M7 — Histórico e auditoria (hoje zero)
Registrar quem criou/editou, datas, alterações de regra, duplicações e motivo de pausa/cancelamento. O sistema já tem `usuario` (Carlos Menezes) para preencher autoria.

### M8 — Experiência do usuário
- Botão "Nova campanha" (E1);
- Filtros por status / período / tipo / público;
- Duplicar campanha e salvar como modelo;
- Detalhe da campanha com gráfico de evolução;
- Alertas: campanha perto do fim, sem resultado, sugestão de melhoria.

### M9 — Integrações com o resto do sistema
A tela vive isolada. Conectar a:
- **Clientes** → segmentação real (não string);
- **Histórico/Agendamentos** → medir receita e recuperação;
- **Financeiro** (`lancamentos`) → custo e ROI;
- **Serviços** → campanhas por serviço/categoria;
- **Modelos de mensagem** (já existem!) → `modeloMsgId` em vez de texto solto;
- **Programa de fidelidade** → benefício em pontos/cashback usa a regra do programa;
- **Relatórios** → campanhas entram no BI.

### M10 — Melhorias estratégicas
- Recomendação automática de público (a partir de `clientesEmRisco()`);
- Previsão de impacto (público × conversão histórica × ticket);
- Comparar campanhas e ranking de eficiência;
- Campanhas como modelo reutilizável;
- Alerta de baixa performance e análise de quem recebeu mas não converteu.

---

## ✅ Validações necessárias

A lógica deve impedir:
- campanha sem segmento/público;
- sem período (`inicio`/`fim`);
- benefício sem regra de uso;
- ativa sem canal de comunicação;
- `fim < inicio` (datas inválidas);
- conflito com outra campanha ativa no mesmo segmento (quando `acumulaComOutras = false`);
- envio duplicado ao mesmo cliente;
- campanha sem métrica de acompanhamento definida.

---

## 🎯 Priorização

### P1 — alto impacto, baixo esforço (dados já existem)
1. Corrigir **E1** — botão "Nova campanha".
2. **E5 + E4 + M2** — segmentação real sobre `clientes` com público calculado ao vivo.
3. **E3** — conversão calculada.
4. **E2** — "Disparar" que muda status e registra envio.
5. **M10** — recomendação de campanha a partir de `clientesEmRisco()`.

### P2 — médio esforço
6. **M1** — período + benefício + canais no modelo.
7. **E6** — validações (seção acima).
8. **M6** — status `pausada` / `encerrada` com regras de transição.
9. **M5** — receita/ROI cruzando `agendamentos`/`lancamentos`.

### P3 — exige mais lógica/histórico
10. **M4** — automação por gatilho e recorrência.
11. **M10** — previsão de impacto, ranking e modelos.
12. **M7** — auditoria completa.

---

## Como isso faz o usuário vender mais e reter

Ao ligar **segmentação real → ação → medição de receita**, a tela deixa de ser um cadastro e vira um **ciclo fechado de retenção**: o sistema aponta quem está sumindo, sugere a campanha, dispara, e mostra quantos reais voltaram — exatamente a decisão que o dono precisa tomar toda semana.

---

## Referências de mercado (benchmarking)
- [Fresha — Client ReConnect / loyalty tools (barbershops)](https://www.fresha.com/for-business/barber/how-to-turn-barbershop-clients-into-regulars-using-loyalty-tools)
- [Booksy — Salon software features (campanhas SMS/email + loyalty)](https://biz.booksy.com/en-us/blog/how-to-find-the-best-salon-software-for-small-businesses-features-to-consider)
- [Saras Analytics — Customer Retention Analytics (RFM / churn)](https://www.sarasanalytics.com/blog/customer-retention-analytics)
- [Shopify — Loyalty Analytics](https://www.shopify.com/blog/loyalty-analytics)
