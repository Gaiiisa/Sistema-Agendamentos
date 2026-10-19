# Controle de Acesso e Permissões (RBAC) — 2026-07-13

Documentação da estrutura de controle de acesso implementada, com administrador
principal e a tela **Configurações → Usuários e Permissões**.

---

## 1. Visão geral

- **Administrador principal**: uma única conta (`usuarios.admin_principal = 1`) com **acesso total**. É a única que enxerga e usa a tela de permissões e a única que altera o acesso das demais contas.
- **Demais contas**: acesso definido por **permissões granulares** por `(módulo, ação)`, guardadas na tabela `usuario_permissoes`. A presença da linha = permissão concedida.
- **Autorização centralizada**: um único catálogo (`api/permissions.js`) e um único ponto de checagem no backend (middleware `requirePerm`) e no frontend (`AuthService.can`). Nada de regras espalhadas.
- **Criação de usuários pela interface**: **não existe** (proposital). Contas são criadas por processo externo (CLI/SQL).

---

## 2. Banco de dados

### Migração (segura, idempotente, preserva contas)
`database/migracao-2026-07-13-permissoes.sql`:
- `usuarios.admin_principal BOOLEAN DEFAULT FALSE` — marca a conta administradora principal.
- `usuarios.ultimo_acesso DATETIME NULL` — atualizado a cada login.
- `usuario_permissoes(usuario_id, modulo, acao)` — permissões concedidas (PK composta; FK `ON DELETE CASCADE`).
- Designa o admin principal **se ainda não houver**: escolhe o `dono/admin` ativo mais antigo **com senha bcrypt válida**.

`database/schema.sql` também foi atualizado (bancos novos já nascem com as colunas/tabela).

### Como definir/trocar o administrador principal (manual, via SQL)
```sql
UPDATE usuarios SET admin_principal = 0;                       -- zera todos
UPDATE usuarios SET admin_principal = 1 WHERE email = 'admin@navalha.local';
```
Deve existir **sempre exatamente um** usuário com `admin_principal = 1`. No startup, se não houver nenhum, o servidor elege automaticamente o `dono/admin` ativo mais antigo com senha válida (`ensurePrincipal()`).

---

## 3. Catálogo de módulos e ações (o que realmente existe)

Definido em `api/permissions.js` (fonte única, servida ao front via `GET /api/permissoes/catalogo`):

| Módulo | Ações |
|--------|-------|
| dashboard | ver |
| agenda | ver, criar, editar, excluir |
| clientes | ver, criar, editar |
| servicos | ver, criar, editar |
| equipe | ver, criar, editar |
| estoque | ver, criar, editar |
| financeiro | ver, criar, exportar |
| comissoes | ver, exportar |
| fidelidade | ver, criar, editar |
| relatorios | ver, exportar |
| config | ver, editar |

> Ações “Aprovar/validar” e “Ações administrativas” do enunciado **não** foram inventadas: não há fluxo de aprovação no sistema, e “ações administrativas” = ser o administrador principal. “Acessar configurações” = `config:ver`.

Regras da matriz: qualquer ação marcada implica `ver`; desmarcar `ver` limpa as demais ações do módulo.

---

## 4. Backend — enforcement (arquivos)

- **`api/permissions.js`** (novo): catálogo, `PERMISSOES_VALIDAS`, `sanitizePermissoes()`.
- **`api/server.js`**:
  - Middleware global `loadAuthz` (após `authRequired`): carrega `req.authz = { isPrincipal, perms:Set }` uma vez por requisição.
  - `requirePerm(modulo, acao)`, `requireAnyPerm(...)`, `principalOnly` — o admin principal sempre passa.
  - Todos os endpoints de escrita passaram a exigir a permissão correspondente (serviços, clientes, equipe, estoque, produtos, campanhas, modelos, categorias, agendamentos, bloqueios, movimentações, lançamentos, e todas as rotas de config). O antigo gate por papel (`gestao`/`authRole`) foi **removido** e substituído pelo modelo granular.
  - `login`/`me`/`bootstrap` retornam `adminPrincipal` + `permissoes`; `login` grava `ultimo_acesso`.
  - **Endpoints da tela (todos `principalOnly`):**
    - `GET /api/permissoes/catalogo`
    - `GET /api/usuarios` — lista contas
    - `GET /api/usuarios/:id/permissoes`
    - `PUT /api/usuarios/:id/permissoes` — grava permissões e status (`ativo`)
  - **Não existe** `POST /api/usuarios` (criação de conta).

### Proteções (backend)
- `PUT /api/usuarios/:id/permissoes` recusa (403) se o alvo for o **admin principal** ou for **a própria conta** do solicitante.
- Nenhum endpoint altera `papel` ou `admin_principal` → usuário comum **não pode virar admin** nem obter privilégios manipulando requisições.
- `sanitizePermissoes()` descarta qualquer permissão fora do catálogo.
- Permissões só mudam pela tela autorizada (endpoints `principalOnly`).

---

## 5. Frontend — aplicação (arquivos)

- **`src/app/auth.service.ts`**: `Usuario` ganhou `adminPrincipal` + `permissoes`; métodos `can(modulo, acao)`, `canView(modulo)`, `isPrincipal`. Fonte única no front (populada no login e no `/me` do refresh).
- **`src/app/shared/sidebar.component.ts`**: itens de menu filtrados por `canView` (desktop, bottom-bar e sheet “Mais”). `config` fica sempre visível (contém “Minha conta”, self-service).
- **`src/app/app.component.ts`**: guard de rota (`navegar`/`podeVerRota`/`rotaInicial`); conteúdo sem permissão mostra **“Acesso restrito”** em vez de tela quebrada; rota inicial é o primeiro módulo permitido.
- **`src/app/screens/config.component.ts`**: nova aba **Usuários e Permissões**, visível **apenas** ao admin principal (`tabsVisiveis` + guard `tab==='usuarios' && auth.isPrincipal`).

### Tela Configurações → Usuários e Permissões
- **Lista** todas as contas: Nome, E-mail, Perfil, Status, Data de cadastro, Último acesso; badge “Admin principal”.
- **Busca** por nome/e-mail/perfil.
- Ao **selecionar** uma conta: matriz de permissões (módulos × ações, checkboxes), toggle **Conta ativa**, indicador **“alterações não salvas”**, botões **Salvar/Cancelar**, toast de sucesso e de erro.
- O admin principal aparece na lista mas **não é editável** (acesso total).
- **Sem** botão/modal/formulário de criação de usuário.
- Persiste no banco; sobrevive a F5 e a nova sessão (permissões vêm do `/login` e `/me`).

---

## 6. Restrição de criação de usuários (auditoria)

- Não havia — e não foi criada — nenhuma **UI** de criação de usuário nem endpoint HTTP de criação.
- Únicas criações de conta no código (intencionais, fora da interface):
  - `api/criar-admin.mjs` — **CLI** (o “processo externo” usado por você).
  - `ensureAdmin()` em `api/server.js` — rede de segurança de **startup** (só cria admin se não existir nenhum ativo).
- O texto “Novo usuário / mudança de cargo” em `central.component.ts` é apenas o **rótulo de um modelo de notificação** (mock), não uma funcionalidade de criação.

---

## 7. Cenários de validação

Verificados por **revisão de código + build (AOT do frontend, `node --check` do backend)**. O ambiente atual não tem MySQL, então os fluxos de runtime devem ser reconfirmados ao subir o banco.

| # | Cenário | Como é garantido |
|---|---------|------------------|
| 1 | Admin vê “Usuários e Permissões” | `tabsVisiveis` inclui a aba só se `isPrincipal` |
| 2 | Usuário comum não vê a opção | idem (filtrado) |
| 3 | Admin vê todas as contas | `GET /api/usuarios` (principalOnly) |
| 4 | Sem opção de criar usuário | não há botão/endpoint |
| 5 | Admin edita permissões de uma conta | matriz + `PUT /usuarios/:id/permissoes` |
| 6 | Alterações persistem após F5 | gravadas em `usuario_permissoes`; `/me` recarrega |
| 7 | Comum acessa só módulos autorizados | menu + guard de rota por `canView` |
| 8 | Rotas protegidas | `navegar`/`podeVerRota` + tela “Acesso restrito” |
| 9 | Endpoints bloqueiam não autorizados | `requirePerm`/`principalOnly` (403) |
| 10 | Comum não altera as próprias permissões | endpoint `principalOnly` + bloqueio de auto-edição |
| 11 | Comum não acessa a tela por URL | não há rota por URL (SPA `@switch`); aba/section guardadas por `isPrincipal`; dados por `principalOnly` |
| 12 | Admin não remove o próprio acesso | permissões do principal não são editáveis nem armazenadas (bypass total) |
| 13 | Desktop/tablet/celular | tabelas com `overflow-x`; menu já responsivo; abas mobile existentes |
| 14 | Nada existente quebrou | build AOT sem erros; endpoints antigos preservados |

---

## 8. Pontos que ainda dependem de configuração/decisão manual

- **Rodar a migração** no banco existente: `mysql ... < database/migracao-2026-07-13-permissoes.sql`.
- **Criação de contas** é externa (CLI `criar-admin.mjs` ou SQL). Novas contas nascem **sem permissões** — o admin principal concede o acesso na tela.
- **Recorte do `/bootstrap` por módulo** (não enviar dados de módulos sem permissão de leitura) **não** foi implementado: hoje a proteção de leitura é por menu/rota no front + todas as escritas no backend. Filtrar o payload por módulo é um passo à parte (as telas têm dependências cruzadas de dados) e está registrado como item futuro.
- **Trocar o admin principal**: via SQL (seção 2).
