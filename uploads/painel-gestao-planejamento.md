# Painel de Gestão — Sistema de Agendamento

Planejamento de telas, campos e funções para o painel administrativo de um SaaS de agendamento voltado a **barbearias, salões de beleza e estúdios de tatuagem**.

> **Premissa de arquitetura:** SaaS multi-tenant — uma plataforma única que atende vários estabelecimentos, cada um com seus dados isolados.

---

## Níveis de acesso (papéis)

O painel atende perfis diferentes, e isso define o que cada um enxerga. Definir os papéis na base de dados desde o início evita retrabalho pesado depois.

| Papel | Acesso |
|---|---|
| **Dono / Admin** | Tudo |
| **Gerente** | Tudo, exceto assinatura/plano e exclusões críticas |
| **Recepção** | Agenda, clientes e caixa do dia. Sem comissão alheia nem relatórios sensíveis |
| **Profissional** | Apenas a própria agenda, próprios clientes e próprias comissões |

---

## 1. Dashboard inicial (visão do dia)

A primeira tela ao logar deve responder: *"como está meu negócio agora?"*

- **Cards do dia:** agendamentos de hoje, faturamento previsto x realizado, taxa de ocupação da agenda, faltas/cancelamentos.
- **Próximos atendimentos** em lista, com nome do cliente, serviço, profissional e status de confirmação.
- **Alertas:** clientes que ainda não confirmaram presença, produtos em estoque baixo, comissões a pagar, aniversariantes da semana.
- **Atalhos rápidos:** novo agendamento, abrir caixa, novo cliente.

---

## 2. Agenda (o coração do sistema)

Onde o dono passa o dia. Precisa ser rápida e visual.

- **Visualizações:** dia, semana, mês e timeline por profissional (colunas lado a lado) — essencial para equipe.
- **Card de cada agendamento exibe:** cliente, serviço, profissional, horário início/fim, status (pendente, confirmado, em atendimento, concluído, faltou, cancelado) e ícone indicando se há sinal pago.
- **Funções:** arrastar-e-soltar para remarcar, redimensionar para ajustar duração, encaixe manual, bloqueio de horário (almoço, folga, manutenção) e marcação recorrente ("toda quarta às 15h").
- **Campos ao criar agendamento:** cliente (busca ou cadastro rápido), serviço(s), profissional, data/hora (duração puxada automaticamente do serviço), observações, opção de exigir sinal.
- **Encaixe inteligente (salão):** permitir agendar outro cliente durante o tempo de pausa de uma química — aproveita a janela ociosa do profissional.
- Filtros por profissional e por status.

---

## 3. Agendamentos (gestão em lista)

Complementa a agenda com uma visão tabular para gerenciar volume.

- Lista filtrável por período, profissional, status e cliente.
- Ações em massa: confirmar, cancelar, exportar.
- Visão dedicada de **faltas e cancelamentos** para medir o problema e agir.

---

## 4. Clientes (CRM)

Organização do relacionamento — onde está o dinheiro recorrente.

- **Ficha do cliente:** nome, WhatsApp, e-mail, data de nascimento, foto, observações livres (alergias, preferência de profissional, cor de tinta usada).
- **Histórico completo:** todos os atendimentos, com data, serviço, profissional e valor pago.
- **Métricas automáticas:** frequência média, ticket médio, total gasto, data do último atendimento.
- **Sinalizador de cliente sumido:** marcar quem não volta há X dias — gatilho ideal para campanha de retorno.
- **Saldo de fidelidade/cashback** visível na ficha.
- Tags/segmentação (VIP, novo, inadimplente).

---

## 5. Serviços

- **Campos:** nome, categoria (cabelo, barba, unhas, tattoo...), duração, preço, custo de produto associado (para cálculo de margem), foto, descrição, profissionais que executam.
- Suporte a **pacotes/combos** (corte + barba) e a serviços de **múltiplas sessões** (importante para tatuagem: um projeto que dura vários encontros).
- Preço variável por profissional (sênior cobra mais que júnior).

---

## 6. Equipe / Profissionais

- **Cadastro:** nome, foto, bio, contato, especialidades.
- **Horário de trabalho** por dia da semana + folgas e férias (alimenta a disponibilidade da agenda).
- **Serviços que executa** e duração própria, se diferente do padrão.
- **Comissão:** percentual por serviço ou geral, ou modelo de aluguel de cadeira/parceria.
- **Metas** individuais (opcional) para acompanhar desempenho.

---

## 7. Financeiro / Caixa

Onde o negócio se organiza de verdade.

- **Caixa diário:** abertura e fechamento, com conferência de valores por forma de pagamento (dinheiro, Pix, cartão).
- **Lançamentos:** receitas (atendimentos + venda de produtos) e despesas (aluguel, insumos, salários) — para ter o resultado real, não só faturamento.
- **Contas a receber:** clientes que ficaram devendo, com aviso de pendência.
- **Relatório de fluxo de caixa** por período.

---

## 8. Comissões

Tela própria, porque é uma das maiores economias de tempo que se pode oferecer ao dono.

- Cálculo **automático** por profissional, baseado nos atendimentos concluídos no período.
- Fechamento por semana/quinzena/mês, com detalhamento serviço a serviço.
- Status de pago/a pagar e geração de recibo.

---

## 9. Estoque

- **Cadastro de produtos:** nome, categoria, quantidade, custo, fornecedor, estoque mínimo.
- **Baixa automática** quando um serviço consome produto (ex: cada coloração baixa X de tinta) — controle fracionado, importante para salões.
- **Alerta de reposição** ao atingir o mínimo.
- Histórico de entradas/saídas e relatório de produtos mais consumidos.

---

## 10. Fidelidade & Marketing

- Configurar regra de **cashback ou pontos** ("a cada 10 cortes, 1 grátis").
- **Campanhas via WhatsApp:** lembrete de retorno para cliente sumido, mensagem de aniversário, promoção segmentada por tag.
- Modelos de mensagem editáveis.

---

## 11. Relatórios / BI

- Faturamento por período, profissional, serviço e forma de pagamento.
- **Taxa de ocupação** da agenda (horas vendidas / horas disponíveis) — métrica-chave de eficiência.
- **Taxa de no-show** e quanto custou.
- Ranking de serviços e de profissionais.
- Novos clientes x recorrentes.

---

## 12. Configurações

- Dados do estabelecimento, identidade visual (logo, cores — que também alimentam a página pública).
- **Políticas:** antecedência mínima para agendar/cancelar, exigência de sinal, valor do sinal.
- Integração WhatsApp e modelos de notificação (confirmação imediata + lembrete na véspera — onde se mata o no-show).
- Gestão de usuários e papéis.
- Plano/assinatura do SaaS.

---

## Faseamento sugerido

| Fase | Entregas |
|---|---|
| **MVP** | Login/papéis · Agenda · Clientes · Serviços · Equipe · notificação de lembrete |
| **Fase 2** | Caixa · Comissões · Estoque |
| **Fase 3** | Fidelidade/Marketing · Relatórios avançados · Notas fiscais |

O MVP já entrega valor real cedo (agenda organizada + menos faltas), permitindo cobrar desde o início.

---

## Especificidades por vertical

- **Tatuagem:** sessões longas e multi-sessão, upload de imagens de referência, sinal obrigatório, termo de consentimento e verificação de idade.
- **Salão:** serviços com tempo de pausa (química) — permitir encaixe de outro cliente no intervalo.
- **Barbearia:** serviços curtos e alto volume, agendamento recorrente.

---

*Documento de planejamento — versão inicial.*
