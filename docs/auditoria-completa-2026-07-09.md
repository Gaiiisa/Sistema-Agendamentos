# Auditoria Técnica Completa — Sistema de Agendamento (Navalha & Cia)

**Data da análise:** 09/07/2026
**Escopo:** Frontend (Angular 17), Backend (Express/Node), Banco (MySQL), APIs, regras de negócio, integrações e desempenho.
**Natureza:** Investigação somente-leitura. **Nenhum código foi alterado.** Este documento é a base para as correções futuras.

> ⚠️ **Como ler os níveis de prioridade**
> - 🔴 **Crítico** — quebra confiança nos dados, segurança, ou impede uso real.
> - 🟠 **Alto** — funcionalidade central não funciona / usuário é enganado.
> - 🟡 **Médio** — bug perceptível, performance ou inconsistência.
> - 🟢 **Baixo** — cosmético, código morto, melhoria.

---

## 1. Resumo Geral da Análise

### Estado atual do sistema
O sistema é um **protótipo/MVP visualmente muito polido e bem arquitetado na camada de apresentação**, com um backend REST enxuto e um schema de banco de dados robusto e bem modelado. A base técnica é sólida: componentes Angular *standalone*, design system consistente, gráficos próprios (donut, heatmap, sparkline, gauge), exportação real de PDF/CSV/XLSX e autenticação JWT com bcrypt.

**Porém, há uma lacuna estrutural grave entre "o que a interface aparenta fazer" e "o que realmente é persistido".** Muitas telas são, na prática, **read-only com botões decorativos**: o usuário clica, vê um toast de sucesso ("Salvo!"), mas nada é gravado no banco. Isso ocorre porque:

1. Vários botões só emitem uma notificação visual, sem chamar a API.
2. **Todas** as chamadas de escrita engolem erros silenciosamente (`.subscribe({ error: () => {} })`), então mesmo quando a API existe e falha, o usuário vê "sucesso".
3. Faltam endpoints no backend para operações inteiras (caixa, lançamentos, pagamento de comissão, usuários, exclusões).

### Principais problemas encontrados
- **Persistência fantasma**: erros de gravação são ocultados; várias telas não salvam de verdade.
- **Sem autorização por papel no backend**: qualquer usuário logado lê e escreve tudo. Os "cadeados" de relatório sensível são só visuais.
- **Módulos incompletos**: Financeiro (caixa/lançamentos), Comissões (pagamento), Configurações (conta, senha, políticas, usuários), Fidelidade (regra), Notificações — todos com UI pronta mas **sem gravar**.
- **`/bootstrap` carrega o banco inteiro** numa única requisição, sem paginação — gargalo que piora com o tempo.
- **Datas fixas no código** ("hoje" = 2026-06-09 em vários pontos) geram números errados/defasados.
- **Código morto**: duas telas inteiras (`agendamentos`, `relatorios`) não são usadas; `api/node_modules` versionado no git.

### Áreas mais críticas (por ordem de risco)
1. **Confiabilidade da escrita/persistência** (transversal — afeta quase todas as telas).
2. **Segurança/Autorização** (backend sem checagem de papel; dados sensíveis expostos).
3. **Financeiro & Comissões** (operações que envolvem dinheiro não persistem).
4. **Configurações** (troca de senha e políticas não funcionam).
5. **Performance do bootstrap** (escala ruim).

### Prioridade geral de correção
> **Antes de qualquer coisa**, resolver o padrão de "erro silencioso" e completar os endpoints faltantes — sem isso, qualquer correção de tela é ilusória. Depois: autorização no backend, módulo financeiro real, e o CRUD de usuários. Performance e limpeza de código morto podem vir por último.

---

## 2. Bugs e Erros Encontrados

### 🔴 BUG-01 — Erros de gravação são engolidos silenciosamente (transversal)
- **Onde:** [data.service.ts](../src/app/data.service.ts) — praticamente todos os métodos de escrita (`updateServico`, `addStaff`, `updateAppt`, `registrarMov`, `addCliente`, etc.).
- **Descrição:** Todas as chamadas usam `this.api.put(...).subscribe({ error: () => {} })`. Qualquer falha (rede, 401, 500, validação) é **ignorada**. O estado local já foi mutado, então a UI mostra sucesso mesmo quando o banco não gravou.
- **Como reproduzir:** Desligar a API (ou o MySQL) e editar um serviço/cliente. A UI atualiza e nenhum erro aparece. Ao recarregar (F5), a alteração some.
- **Causa:** Padrão de *optimistic update* sem rollback nem feedback de erro.
- **Impacto:** Usuário confia que salvou algo que se perdeu. **Perda silenciosa de dados** — o pior tipo de bug para um sistema de gestão.
- **Prioridade:** 🔴 Crítico.

### 🔴 BUG-02 — Fallback para dados mock mascara indisponibilidade
- **Onde:** [data.service.ts:445-447](../src/app/data.service.ts) (`load()` → `catch` que mantém dados mock).
- **Descrição:** Se `/bootstrap` falha, o app carrega **dados fictícios** (Rafael Moura, André Lima, etc.) sem avisar. O usuário pode operar sobre dados falsos achando que são reais.
- **Como reproduzir:** Subir o front sem a API → a tela enche de dados de exemplo.
- **Impacto:** Confusão grave; ações sobre dados mock não têm efeito real.
- **Prioridade:** 🔴 Crítico.

### 🟠 BUG-03 — Concluir atendimento não gera receita no financeiro
- **Onde:** [appt-detail.component.ts:166](../src/app/appt-detail.component.ts) → `data.setApptStatus(id,'concluido')`.
- **Descrição:** Marcar um agendamento como "concluído" muda o status e faz baixa de estoque, **mas não cria um `lançamento` de receita**. O módulo Financeiro é alimentado só por `lancamentos` (que hoje vêm apenas do seed). Ou seja, o dinheiro do atendimento nunca entra no caixa.
- **Impacto:** Faturamento do dia/mês não reflete os atendimentos reais concluídos na agenda. Regra de negócio central quebrada.
- **Prioridade:** 🟠 Alto.

### 🟠 BUG-04 — Overbooking: sem checagem de conflito entre agendamentos
- **Onde:** [novo-agendamento.component.ts:170](../src/app/novo-agendamento.component.ts) e backend [server.js:518](../api/server.js).
- **Descrição:** Ao criar agendamento, só se verifica conflito com **bloqueios** — nunca com **outros agendamentos** do mesmo profissional/horário. Nem o front nem o backend impedem dois clientes no mesmo slot.
- **Como reproduzir:** Criar dois agendamentos para o mesmo profissional às 14:00.
- **Impacto:** Dois clientes marcados ao mesmo tempo. Falha grave para uma agenda.
- **Prioridade:** 🟠 Alto.

### 🟡 BUG-05 — "Cálculo de dias" usa data fixa no código
- **Onde:** [data.service.ts:815](../src/app/data.service.ts) → `diasDesde = (iso) => Math.round((+new Date('2026-06-09') - +new Date(iso)) / 86400000)`.
- **Descrição:** "Há X dias sem visitar", "clientes em risco", etc. são calculados contra **09/06/2026 fixo**, não contra hoje. Hoje (09/07) todos os cálculos estão ~30 dias errados.
- **Impacto:** Métricas de CRM/retenção incorretas em Clientes, Dashboard e Fidelidade.
- **Prioridade:** 🟡 Médio.

### 🟡 BUG-06 — Aniversariantes com mês fixo
- **Onde:** [dashboard.component.ts:811](../src/app/screens/dashboard.component.ts) → `c.nasc.split('-')[1] === '06'`. Também [fidelidade.component.ts:924](../src/app/screens/fidelidade.component.ts) usa `data.hojeData` (mock '2026-06-09').
- **Descrição:** "Aniversariantes do mês" está fixo em **junho**. Em julho, mostra os aniversariantes errados.
- **Prioridade:** 🟡 Médio.

### 🟡 BUG-07 — Card "Caixa" mostra "Aberto" mesmo com caixa fechado
- **Onde:** [financeiro.component.ts:255-266](../src/app/screens/financeiro.component.ts).
- **Descrição:** O bloco exibe "Caixa aberto desde {{ data.caixa.abertura }}" e um selo verde "Aberto" **sem `@if (data.caixa.aberto)`**. Se o banco não tem caixa aberto, a API devolve `aberto:false, abertura:''`, e a tela mostra "Caixa aberto desde " (em branco) com selo verde.
- **Impacto:** Informação financeira enganosa.
- **Prioridade:** 🟡 Médio.

### 🟡 BUG-08 — Tela "Estoque › Mais consumidos" quebra com dados reais
- **Onde:** [estoque.component.ts:469-471](../src/app/screens/estoque.component.ts) → `rank = [{id:'pr1',n:38}, ...]` (IDs fixos do mock).
- **Descrição:** O ranking é **mock estático** com IDs `pr1..pr9`. Com dados reais do banco (UUIDs), `data.prod(id)` retorna `undefined` e o template acessa `.nome` → **TypeError, tela quebra**. O mesmo risco (asserção não-nula `!`) existe em qualquer referência pendente (`data.srv/cli/prof`).
- **Prioridade:** 🟡 Médio (🔴 se rodando contra o banco real com produtos diferentes).

### 🟡 BUG-09 — `enviadas` de campanha e `sinalPct`/`itens` de serviço não persistem
- **Onde:** backend `CAMP_MAP` [server.js:607](../api/server.js) e `SERVICO_MAP` [server.js:538](../api/server.js).
- **Descrição:** O front envia esses campos, mas o backend **não os mapeia**. Disparar campanha (mostra "enviadas") e combos (economia/sinal %) somem no reload.
- **Prioridade:** 🟡 Médio.

### 🟢 BUG-10 — Geração de ID de agendamento por tamanho de array (colisão)
- **Onde:** [app.component.ts:194](../src/app/app.component.ts) → `const id = 'a' + (this.appts.length + 100)`.
- **Descrição:** IDs baseados em `length` colidem se houver remoção+adição. Além disso, `this.appts` é uma **cópia** de `data.hoje` — novos agendamentos entram na cópia, não em `data.hoje`, causando dessincronização entre Agenda e Dashboard.
- **Prioridade:** 🟢 Baixo (mas indica dívida de arquitetura).

---

## 3. Problemas de Frontend

### Botões / ações sem efeito (apenas visuais)
Levantamento por tela — estes elementos **existem, são clicáveis, mas não fazem nada** (ou só mostram um toast):

| Tela | Elementos sem ação real |
|------|--------------------------|
| **Dashboard** | Alertas "Lembrar / Repor / Ver / Cobrar"; "Felicitar" (aniversariantes); "Abrir caixa" → navega para tela **"Em breve"** |
| **Agenda (Lista)** | "Exportar"; barra em massa "Confirmar / Lembrar / Cancelar"; menu de cada linha (Confirmar/Reagendar/Lembrete/Cancelar) — **todos sem handler** |
| **Financeiro** | "Lançamento", "Fechar caixa", "Exportar", menu Editar/Excluir do lançamento, "Cobrar", "Receber" |
| **Comissões** | "Pagar {valor}"; "Exportar PDF" (histórico) — só o Recibo PDF é real |
| **Clientes** | Drawer: "Agendar", "WhatsApp", editar (lápis); banner "Campanha de retorno" |
| **Serviços** | "Duplicar" (menu) |
| **Estoque** | "Gerar pedido de reposição"; "Remover" (menu) |
| **Equipe** | "Desativar" (menu) |
| **Fidelidade** | "Salvar regra" (fake), "Avisar" (quase lá) |
| **Novo agendamento** | Botão "Novo" (cadastrar cliente inline) |
| **Configurações** | "Alterar foto", "Enviar logo", "Fazer upgrade", "PDF" (fatura), "Conectar/Gerenciar", "Copiar/Revogar", toggles-mestre fixos em "on" |
| **Sidebar** | Ícone de busca; avatar do usuário (sem menu/logout) |

### Inconsistências visuais / layout / responsividade
- **Painel de notificações** ([notifications-panel.component.ts:178](../src/app/shared/notifications-panel.component.ts)) é **100% mock** e com dados de **salão** ("Coloração Louro 8.1", "Manicure", "Escova") — inconsistentes com a barbearia. Marcar como lida é só local.
- **Badge "15" fixo** na Agenda ([sidebar.component.ts:118,133](../src/app/shared/sidebar.component.ts)) e ponto de notificação sempre aceso — não refletem dados reais.
- **Timeline da agenda fixa em 08h–18h** ([agenda.component.ts:626-627](../src/app/screens/agenda.component.ts)), mas profissionais trabalham até 20h → agendamentos tardios extrapolam a grade. A visão **Semana esconde domingo** (só Seg–Sáb).
- **Tema inicial divergente**: login abre em **claro**, sidebar assume **escuro** por padrão (antes do primeiro toggle) — [login.component.ts:471](../src/app/login.component.ts) vs [sidebar.component.ts:113](../src/app/shared/sidebar.component.ts).
- **Sem Angular Router**: navegação é `@switch` sobre uma string (`route`). Não há deep-link, botão voltar/avançar do navegador, nem persistência de rota — **F5 sempre volta ao Dashboard**.
- **Rótulo divergente**: item de menu "Central" abre a tela cujo título é "Relatórios & Alertas".
- A auditoria de responsividade já documentada em [docs/superpowers/.../responsividade-mobile-auditoria.md](superpowers/specs/2026-06-24-responsividade-mobile-auditoria.md) aponta issues específicos (abas `.seg` sem overflow no mobile, mini-stats apertados, tabelas de 8 colunas) — vale revisitar após as correções funcionais.

---

## 4. Problemas de Backend e API

### 🔴 Sem autorização por papel (RBAC ausente)
- **Onde:** [auth.js:54](../api/auth.js) define `authRole(...)` mas **nunca é usado** em [server.js](../api/server.js). O gate é só `authRequired` (token válido).
- **Efeito:** Qualquer usuário autenticado — inclusive `recepcao` ou `profissional` — pode **ler tudo e escrever/alterar qualquer coisa** (comissões, preços, financeiro). Os "cadeados" de relatório sensível (Central/Dashboard) são **checagens client-side apenas** (`papelCod`), facilmente contornáveis chamando a API direto.
- **Agravante:** `/bootstrap` devolve **todos os dados sensíveis** (financeiro, comissões, custos) para qualquer papel.
- **Prioridade:** 🔴 Crítico.

### 🔴 Endpoints faltantes (features sem backend)
Cruzando o que o front chama vs. o que existe em `server.js`, faltam rotas para operações inteiras:
- **Financeiro:** criar/editar/excluir `lancamento`; abrir/fechar `caixa`; receber/quitar `contas_receber`.
- **Comissões:** registrar pagamento (`fechamentos_comissao`).
- **Usuários:** CRUD de `usuarios` (criar acesso, mudar papel, trocar senha, desativar).
- **Fidelidade:** salvar `config_fidelidade`; movimentos de pontos.
- **Exclusões (DELETE):** clientes, serviços, produtos, profissionais, campanhas, modelos, agendamentos — **nenhum tem DELETE** (só `categorias-servico` e `bloqueios`).
- **Configurações:** políticas de agenda, formas de pagamento, integrações (`integracoes`), notificações.
- **Prioridade:** 🔴 Crítico.

### 🟠 Escritas sem escopo de `estabelecimento_id`
- **Onde:** `updateRow()` [server.js:761](../api/server.js) e os PUT/DELETE em geral usam `WHERE id=?` apenas.
- **Efeito:** Isolamento multi-tenant quebrado. Hoje é single-tenant (`EST='e1'`), então o risco é latente — mas ao habilitar múltiplos estabelecimentos, um usuário poderá editar registros de outro.
- **Prioridade:** 🟠 Alto (latente).

### 🟠 Sem transações em escritas multi-passo
- **Onde:** `setExec`, `setEsp`, `setFolga`, `setTags` (DELETE + N INSERTs) e `POST /movimentacoes` (insere movimento **e** atualiza `produtos.quantidade`) — tudo sem `BEGIN/COMMIT`.
- **Efeito:** Falha no meio deixa estado parcial (ex.: especialidades apagadas mas não reinseridas; movimento gravado mas quantidade não ajustada, ou vice-versa).
- **Prioridade:** 🟠 Alto.

### 🟡 Vazamento de detalhes internos em erros
- **Onde:** `wrap()` [server.js:33-36](../api/server.js) → `res.status(500).json({ error: e.message })`.
- **Efeito:** Mensagens de erro do MySQL/stack chegam ao cliente. Deve-se logar internamente e devolver mensagem genérica.
- **Prioridade:** 🟡 Médio.

### 🟡 CORS totalmente aberto e sem rate-limiting no login
- **Onde:** `app.use(cors())` [server.js:12](../api/server.js) libera qualquer origem. `POST /api/login` não tem limitação de tentativas (brute-force).
- **Prioridade:** 🟡 Médio.

### 🟢 Sem validação de entrada
- Nenhum endpoint valida tipos/limites (ex.: `valor` negativo, `duracao` zero, e-mail malformado). As queries são **parametrizadas** (bom — sem risco de SQL injection), mas dados inconsistentes entram livremente.
- **Prioridade:** 🟢 Baixo/Médio.

---

## 5. Problemas com Banco de Dados

> O **schema em si é muito bom**: FKs corretas, índices multi-tenant, `CHECK` constraints, views derivadas, migrações idempotentes. Os problemas são de **integração/uso**, não de modelagem.

### 🟡 Dados defasados dependem de rodar o gerador
- **Onde:** [seed.sql](../database/seed.sql) vs [gerar-dados.mjs](../database/gerar-dados.mjs).
- **Descrição:** O `seed.sql` tem os agendamentos "de hoje" (`a1..a15`) e lançamentos com `CURRENT_DATE()` (dinâmicos ✅), **mas a lista maior `g1..g43` está em datas fixas de junho/2026**. Como hoje é julho, as visões de mês/lista mostram dados de junho (defasados) enquanto o Dashboard mensal filtra julho e fica quase vazio. O `gerar-dados.mjs` cria um dataset rico e relativo a hoje (−60/+90 dias) — **mas só se for executado manualmente**.
- **Impacto:** Sem rodar `gerar-dados.mjs`, os relatórios/agenda parecem vazios ou inconsistentes.
- **Prioridade:** 🟡 Médio.

### 🟠 Onboarding trava o login (gotcha do `ensureAdmin`)
- **Onde:** [seed.sql:80-81](../database/seed.sql) cria `u1` (Carlos, papel `dono`, **ativo**) com hash inválido `!sem-senha-definida`. [server.js:820](../api/server.js) `ensureAdmin()` só cria `admin@navalha.local` **se não houver admin ativo** — mas `u1` já é um dono ativo → a criação é pulada.
- **Efeito:** Depois de seed + start, **ninguém consegue logar** (senha do u1 é inválida e o admin automático não é criado). É preciso rodar `node api/criar-admin.mjs` manualmente.
- **Prioridade:** 🟠 Alto (bloqueia primeiro uso).

### 🟡 Descompasso de taxonomia de papéis
- **Onde:** Config [config.component.ts:1014-1018](../src/app/screens/config.component.ts) oferece papéis "Dono / Admin", "Gerente", "**Atendente**". O enum do banco é `dono, admin, gerente, profissional, recepcao`. "Atendente" **não existe** no schema; "profissional/recepcao" não aparecem na UI.
- **Impacto:** Inconsistência entre UI e modelo de dados; o dropdown é meramente cosmético (não persiste — ver seção 6).
- **Prioridade:** 🟡 Médio.

### 🟢 Tabelas/colunas modeladas mas não usadas pelo app
- `projetos`, `projeto_imagens`, `recorrencias`, `agendamento_servicos` (só em views), `profissional_ferias`, `integracoes`, `servico_consumo` (parcial). São "para o futuro" (multi-sessão, recorrência, WhatsApp) — não é bug, mas indica funcionalidades prometidas no schema e não entregues na UI.
- **Prioridade:** 🟢 Baixo.

### 🟡 Imagens de produto em base64 no banco
- **Onde:** `produtos.imagem MEDIUMTEXT` recebe `data:` URL base64 ([estoque.component.ts:582](../src/app/screens/estoque.component.ts)).
- **Impacto:** Cada imagem (até 2 MB) vai inteira no `/bootstrap` de todo carregamento → payload pesado. Melhor guardar arquivo em `/uploads` e referenciar URL.
- **Prioridade:** 🟡 Médio (performance).

---

## 6. Funções Pendentes ou Incompletas

Telas com UI completa mas **lógica ausente ou que não persiste**:

### 🔴 Configurações — quase tudo é fake
- **`save('conta')`** ([config.component.ts:1208](../src/app/screens/config.component.ts)): nome, e-mail, WhatsApp e **troca de senha** só emitem toast. **A senha nunca é alterada** (não há endpoint). O botão "Salvar senha" mente.
- **Aba Agenda** (antecedência, cancelamento, sinal %, lembretes), **Pagamentos** (métodos, chave Pix, taxa), **Notificações**, **Plano**, **Integrações**: nenhuma persiste. O schema tem colunas para várias delas (`antecedencia_min_*`, `exige_sinal_padrao`, `sinal_tipo`, tabela `integracoes`), mas **nunca são gravadas**. Só **Estabelecimento** e **Horários** salvam de verdade.
- **CRUD de usuários inexistente** apesar do subtítulo "Estabelecimento, políticas **e usuários**". Não dá para criar acesso, mudar papel ou desativar ninguém.

### 🟠 Financeiro — módulo essencialmente read-only
- Adicionar lançamento, fechar caixa, exportar, editar/excluir lançamento, cobrar, receber: todos **fake** (seção 3). O módulo só **exibe** o que o seed/gerador colocou.

### 🟠 Comissões — pagamento não registra
- "Pagar {valor}" ([comissoes.component.ts:125](../src/app/screens/comissoes.component.ts)) só emite toast. Não grava `fechamentos_comissao`. Ao recarregar, volta a "A pagar".

### 🟠 Fidelidade — regra do programa não salva
- "Salvar regra" ([fidelidade.component.ts:122](../src/app/screens/fidelidade.component.ts)) é toast. Pior: os inputs de recompensa/cashback usam **binding one-way** (`[value]`) sem `(input)`, então **digitar neles nem altera o modelo**. Sem endpoint de `config_fidelidade`.
- **Excluir modelo** ([data.service.ts:545](../src/app/data.service.ts) `removeModelo`) só faz `splice` local — **não chama DELETE na API** → reaparece no reload.

### 🟠 Central — configuração de notificações não persiste
- `salvarNotifs()` ([central.component.ts:533](../src/app/screens/central.component.ts)) é toast. Todos os toggles de canal/prioridade/envio são locais. O histórico de exportação também é mock local.

### 🟡 Novo agendamento — só permite "hoje"
- [novo-agendamento.component.ts:79](../src/app/novo-agendamento.component.ts): o campo de data é **readonly "Hoje, DD/MM"**. Não há seletor de data — **não é possível agendar para o futuro** por este fluxo (só o "Remarcar" permite mudar data).

### ✅ O que **realmente funciona e persiste** (para referência)
- Login/logout/sessão (JWT).
- CRUD de **serviços, clientes, profissionais, produtos, campanhas, modelos** (criar/editar).
- Movimentação de estoque (entrada/saída + ajuste de quantidade).
- Mudança de status/remarcação de agendamento (drag-and-drop inclusive).
- **Bloqueios de agenda** e **folgas** (folga cria bloqueios diários reais).
- Categorias de serviço (criar/remover).
- Estabelecimento e Horários de funcionamento.
- **Exportação PDF/CSV/XLSX** (relatórios e recibo de comissão) — robusta e real.

---

## 7. Problemas de Desempenho

### 🟠 `/bootstrap` carrega o banco inteiro numa requisição
- **Onde:** [server.js:74-174](../api/server.js) — ~40 queries em paralelo trazendo **todos** os agendamentos, clientes, lançamentos, movimentações, itens de comissão, etc., **sem paginação nem recorte por data**.
- **Impacto:** Com o `gerar-dados.mjs` (150 dias × 4 profissionais × ~4 atendimentos ≈ milhares de linhas, + lançamentos + movimentações), o payload cresce sem limite. Toda abertura do app baixa tudo de novo.
- **Sugestão futura:** paginar/recortar por janela (ex.: agendamentos dos últimos/próximos 30 dias); lazy-load por módulo; endpoints específicos por tela.
- **Prioridade:** 🟠 Alto (escala).

### 🟡 Imagens base64 no payload
- Já citado (seção 5) — mover para arquivos servidos por URL.

### 🟡 Getters pesados no template
- Muitos templates chamam `data.prof(id)`, `data.srv(id)`, `data.cli(id)` (que fazem `.find` O(n)) **múltiplas vezes por ciclo de change detection**. Em listas grandes, custa caro.
- **Mitigação já presente (bom):** Agenda e Dashboard usam **cache por chave** (`_rowsCache`, `_rCache`, `_dadosCache`) — padrão a replicar nas demais telas. Ideal: trocar `.find` por `Map` de lookup no `DataService`.
- **Prioridade:** 🟡 Médio.

### 🟢 Sem `trackBy` custom em algumas listas / sem virtual scroll
- Listas longas (agendamentos) renderizam tudo; a Agenda já pagina (50/pág — bom), mas outras telas não. Considerar `cdk-virtual-scroll` no futuro.
- **Prioridade:** 🟢 Baixo.

---

## 8. Código Desnecessário ou Mal Estruturado

### 🟢 Componentes/telas mortos
- **[agendamentos.component.ts](../src/app/screens/agendamentos.component.ts)** (260 linhas): **não é importado em lugar nenhum** do app. Morto.
- **[relatorios.component.ts](../src/app/screens/relatorios.component.ts)** (389 linhas): é **importado** em [app.component.ts:21,52](../src/app/app.component.ts) mas **nunca usado no template** (`app-relatorios` não aparece) — foi substituído por `central`. Import morto + componente órfão.
- **Recomendação:** remover ambos (≈650 linhas) após confirmar que nada os referencia.

### 🟢 `api/node_modules` versionado no Git
- **Onde:** [.gitignore](../.gitignore) ignora `/node_modules` (só raiz). **`api/node_modules` (1137 arquivos) está commitado.**
- **Correção:** trocar o padrão para `node_modules/` (sem barra inicial) para pegar todos os níveis, e `git rm -r --cached api/node_modules`.
- **Nota positiva:** `api/.auth-secret` **está corretamente ignorado** (não versionado).
- **Prioridade:** 🟢 Baixo (higiene).

### 🟢 Referências mortas / inconsistências menores
- `serviços › sinalPadrao` lê `(this.data as any).agenda?.sinalPct` ([servicos.component.ts:423](../src/app/screens/servicos.component.ts)) — **`DataService` não tem `agenda`**; sempre cai no fallback 30. Config e Serviços não conversam.
- `authRole` exportado e nunca usado; `pool` exportado só para o gerador.
- `uploads/painel-gestao-planejamento.md` versionado dentro de `uploads/`.
- Duplicação de lógica de "período" (semana/mês/quinzena) reimplementada em Dashboard, Comissões, Central e ExportService — candidata a um util compartilhado.

---

## 9. Lista de Prioridades para Correção Futura

> Ordem pensada para **não quebrar o sistema**: primeiro a fundação (feedback de erro + endpoints), depois segurança, depois módulos, por fim performance e limpeza.

### FASE 0 — Fundação da confiabilidade (fazer **antes de tudo**)
1. **Parar de engolir erros** (BUG-01): trocar `.subscribe({ error: () => {} })` por tratamento com toast de erro + rollback do estado local. *Sem isto, nenhuma correção de tela é verificável.*
2. **Sinalizar modo offline/mock** (BUG-02): banner claro quando a API cai, em vez de exibir dados falsos como reais.
   - *Por quê primeiro:* tornam todos os outros bugs **visíveis e testáveis**.

### FASE 1 — Segurança (baixo risco de quebrar, alto valor)
3. **Aplicar `authRole` nas rotas** sensíveis do backend (financeiro, comissões, config, exclusões).
4. **Recortar o `/bootstrap`** para não enviar dados sensíveis a papéis sem permissão.
5. Corrigir **CORS**, **vazamento de `e.message`** e adicionar **rate-limit no login**.
   - *Por quê aqui:* são mudanças aditivas no backend, com pouco acoplamento à UI.

### FASE 2 — Completar a persistência (o coração do problema)
6. **Endpoints faltantes** (na ordem de impacto no negócio):
   - a) **Lançamentos + Caixa** (abrir/fechar, criar/editar/excluir) → destrava o Financeiro.
   - b) **Concluir atendimento → gerar lançamento** (BUG-03) e checar **overbooking** (BUG-04).
   - c) **Pagamento de comissão** (`fechamentos_comissao`).
   - d) **CRUD de usuários** + **troca de senha** (e alinhar taxonomia de papéis).
   - e) **DELETE** para clientes/serviços/produtos/profissionais/campanhas/modelos.
   - f) **config_fidelidade**, políticas de agenda, notificações, integrações.
7. **Transações** nas escritas multi-passo (estoque, especialidades, folgas, tags).
8. Persistir `sinalPct`/`itens`/`enviadas` (BUG-09) e corrigir `removeModelo` (DELETE real).
   - *Por quê nesta ordem:* dinheiro (a,b,c) é o mais crítico; usuários (d) desbloqueia governança; o resto completa o CRUD.

### FASE 3 — Correção de bugs de dados e UX
9. Remover **datas fixas** (BUG-05, BUG-06): `diasDesde`, aniversariantes, `hojeData`.
10. Corrigir card **"Caixa aberto"** (BUG-07) e o crash de **"Mais consumidos"** (BUG-08).
11. Ligar os **botões decorativos** (seção 3) às ações reais agora que os endpoints existem — ou removê-los/desabilitá-los com rótulo "em breve" para não enganar.
12. Substituir o **painel de notificações mock** por eventos reais; corrigir badge "15" e o ponto fixo.
13. Permitir **agendar para datas futuras** no "Novo agendamento".

### FASE 4 — Performance
14. **Paginar/recortar o bootstrap** por janela temporal; lazy-load por módulo.
15. Mover **imagens** para arquivos servidos por URL (fora do payload).
16. Trocar `.find` por `Map` de lookup no `DataService`; estender o padrão de cache.

### FASE 5 — Limpeza e arquitetura (sem pressa)
17. Remover **código morto** (`agendamentos`, `relatorios`, imports órfãos).
18. Corrigir **`.gitignore`** e remover `api/node_modules` do versionamento.
19. Avaliar migração de `@switch` para **Angular Router** (deep-link, back/forward, F5).
20. Unificar utilitários de "período" duplicados; alinhar tema padrão login/sidebar.

---

## Apêndice A — Mapa rápido "o que salva" × "o que não salva"

| Módulo | Ação | Persiste? |
|--------|------|-----------|
| Auth | Login / sessão | ✅ |
| Agenda | Criar/remarcar/status/bloqueio/folga | ✅ |
| Agenda (lista) | Exportar / ações em massa / menu linha | ❌ (sem handler) |
| Clientes | Criar | ✅ · Editar/Excluir ❌ |
| Serviços | Criar/editar/ativar; categorias | ✅ · `sinalPct`/combo `itens` ❌ · Duplicar/Excluir ❌ |
| Equipe | Criar/editar | ✅ · Desativar ❌ |
| Estoque | Movimentação, criar/editar produto | ✅ · Excluir/Pedido reposição ❌ · "Mais consumidos" mock |
| Financeiro | Tudo (lançamento/caixa/receber/cobrar) | ❌ |
| Comissões | Recibo PDF | ✅ · Pagar / Exportar histórico ❌ |
| Fidelidade | Campanhas, modelos (criar/editar) | ✅ · Regra / excluir modelo / "avisar" ❌ |
| Central | Exportar relatórios | ✅ · Config de notificações / histórico ❌ |
| Config | Estabelecimento, Horários | ✅ · Conta/senha/agenda/pagamentos/notif/plano/integrações/usuários ❌ |

## Apêndice B — Arquivos-chave

- Backend: [api/server.js](../api/server.js), [api/auth.js](../api/auth.js), [api/db.js](../api/db.js)
- Estado do front: [src/app/data.service.ts](../src/app/data.service.ts), [src/app/api.service.ts](../src/app/api.service.ts)
- Banco: [database/schema.sql](../database/schema.sql), [database/seed.sql](../database/seed.sql), [database/gerar-dados.mjs](../database/gerar-dados.mjs)
- Onboarding do admin: [api/criar-admin.mjs](../api/criar-admin.mjs)
