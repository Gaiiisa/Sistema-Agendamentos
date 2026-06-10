# Navalha & Cia — Sistema de Agendamento (Angular)

SaaS de agendamento para barbearia. Este projeto foi **convertido de React (UMD + Babel standalone) para Angular 17**, mantendo exatamente a mesma estrutura, identidade visual e funcionalidades.

## Stack

- **Angular 17** (standalone components, novo control flow `@if`/`@for`/`@switch`)
- TypeScript
- CSS puro (design system original em `src/styles.css`)

## Como rodar

```bash
npm install
npm start          # servidor de desenvolvimento em http://localhost:4200
npm run build      # build de produção em dist/
```

## Estrutura

```
src/
├── index.html
├── main.ts                       # bootstrap standalone
├── styles.css                    # design system (idêntico ao original)
└── app/
    ├── app.component.ts          # shell: navegação, modais, toast
    ├── data.service.ts           # dados mock + helpers (porte de data.js)
    ├── icon.component.ts         # ícones (porte de icons.jsx)
    ├── novo-agendamento.component.ts
    ├── appt-detail.component.ts
    ├── shared/                   # UI base (porte de ui.jsx)
    │   ├── avatar.component.ts
    │   ├── status-pill.component.ts
    │   ├── tag.component.ts
    │   ├── menu.component.ts
    │   ├── modal.component.ts
    │   ├── coming-soon.component.ts
    │   ├── sidebar.component.ts
    │   └── topbar.component.ts
    └── screens/                  # telas (porte dos screen-*.jsx)
        ├── dashboard.component.ts
        ├── agenda.component.ts        # timeline com drag-and-drop + resize
        ├── agendamentos.component.ts
        ├── clientes.component.ts
        ├── servicos.component.ts
        ├── equipe.component.ts
        ├── financeiro.component.ts
        ├── comissoes.component.ts
        ├── estoque.component.ts
        ├── fidelidade.component.ts
        └── relatorios.component.ts
```

## Funcionalidades

- **Dashboard** — KPIs do dia, próximos atendimentos, alertas e aniversariantes
- **Agenda** — timeline por profissional com arrastar para remarcar e redimensionar duração; visões dia/semana/mês
- **Agendamentos** — gestão em lista, filtros, seleção em massa
- **Clientes (CRM)** — lista + ficha detalhada (drawer), histórico, fidelidade
- **Serviços** — catálogo com preços, margens e profissionais
- **Equipe** — profissionais, metas, jornada e comissões
- **Financeiro** — caixa do dia, lançamentos, a receber e fluxo de caixa
- **Comissões** — cálculo automático por profissional + recibo
- **Estoque** — produtos, baixa automática, histórico e mais consumidos
- **Fidelidade & Marketing** — programa de pontos/cashback, campanhas e modelos
- **Relatórios / BI** — faturamento, ocupação, no-show e rankings

> O código React original foi preservado em `legacy-react/` para referência.
