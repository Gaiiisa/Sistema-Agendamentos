-- ============================================================
-- Seed — dados de exemplo (Navalha & Cia)
-- Reproduz o mock de src/app/data.service.ts no banco.
-- IDs literais do mock (e1, p1, s1, c1...) preservam os relacionamentos.
-- Idempotente: limpa tudo antes de inserir.
-- ============================================================
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE agendamento_servicos;
TRUNCATE TABLE bloqueios_agenda;
TRUNCATE TABLE recorrencias;
TRUNCATE TABLE projeto_imagens;
TRUNCATE TABLE projetos;
TRUNCATE TABLE movimentacoes_estoque;
TRUNCATE TABLE servico_consumo;
TRUNCATE TABLE contas_receber;
TRUNCATE TABLE lancamentos;
TRUNCATE TABLE caixas;
TRUNCATE TABLE fechamentos_comissao;
TRUNCATE TABLE fidelidade_movimentos;
TRUNCATE TABLE config_fidelidade;
TRUNCATE TABLE campanha_envios;
TRUNCATE TABLE campanhas;
TRUNCATE TABLE modelos_mensagem;
TRUNCATE TABLE agendamentos;
TRUNCATE TABLE produtos;
TRUNCATE TABLE fornecedores;
TRUNCATE TABLE cliente_tags;
TRUNCATE TABLE clientes;
TRUNCATE TABLE servico_profissionais;
TRUNCATE TABLE servicos;
TRUNCATE TABLE usuarios;
TRUNCATE TABLE profissional_especialidades;
TRUNCATE TABLE profissional_ferias;
TRUNCATE TABLE profissional_folgas;
TRUNCATE TABLE profissionais;
TRUNCATE TABLE integracoes;
TRUNCATE TABLE estabelecimentos;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------- Estabelecimento ----------
INSERT INTO estabelecimentos (id, nome, plano, slug, cidade, cor_primaria) VALUES
('e1', 'Navalha & Cia', 'Profissional', 'navalha-e-cia', 'São Paulo · SP', '#0e9f6e');

-- ---------- Profissionais ----------
INSERT INTO profissionais (id, estabelecimento_id, nome, apelido, cor, comissao_pct, contato, bio, meta_mensal, hora_inicio, hora_fim) VALUES
('p1','e1','Rafael Moura','Rafa','#0e9f6e',50,'(11) 98812-4471','Barbeiro-chefe. 8 anos de navalha.',9000,'09:00','20:00'),
('p2','e1','Diego Santos','Diego','#2563eb',45,'(11) 99645-2210','Especialista em fade e desenhos.',7000,'10:00','20:00'),
('p3','e1','Lucas Ferreira','Lucas','#9333ea',45,'(11) 98123-9087','Mestre da barba terapia.',6500,'09:00','19:00'),
('p4','e1','Bruno Alves','Bruno','#ea580c',40,'(11) 99012-5534','Paciência de monge com a criançada.',5500,'09:00','18:00');

-- folgas (0=dom,1=seg,2=ter,3=qua,4=qui,5=sex,6=sab)
INSERT INTO profissional_folgas (profissional_id, dia_semana) VALUES
('p1',0),('p2',0),('p2',1),('p3',2),('p4',0);

INSERT INTO profissional_especialidades (profissional_id, especialidade) VALUES
('p1','Corte'),('p1','Barba'),('p1','Degradê'),
('p2','Degradê'),('p2','Navalhado'),('p2','Freestyle'),
('p3','Barba'),('p3','Pigmentação'),('p3','Hidratação'),
('p4','Corte'),('p4','Infantil'),('p4','Tesoura');

-- ---------- Usuário (dono) ----------
INSERT INTO usuarios (id, estabelecimento_id, nome, email, senha_hash, papel, cor, profissional_id) VALUES
('u1','e1','Carlos Menezes','carlos@navalhaecia.com','$2b$10$exemploHashTrocarEmProducao0000000000000000000000','dono','#0e9f6e',NULL);

-- ---------- Serviços ----------
INSERT INTO servicos (id, estabelecimento_id, nome, categoria, duracao_min, preco, custo, descricao, cor, combo, exige_sinal) VALUES
('s1','e1','Corte Masculino','Cabelo',30,45,3,'Corte na tesoura ou máquina, finalização com pomada.','#0e9f6e',FALSE,FALSE),
('s2','e1','Corte + Barba','Combo',50,70,6,'O combo clássico. Corte completo + barba na navalha.','#0e9f6e',TRUE,FALSE),
('s3','e1','Barba Completa','Barba',25,35,4,'Toalha quente, navalha e óleo finalizador.','#9333ea',FALSE,FALSE),
('s4','e1','Degradê (Fade)','Cabelo',40,55,3,'Degradê navalhado, do zero ao topo.','#2563eb',FALSE,FALSE),
('s5','e1','Pezinho / Acabamento','Cabelo',15,20,1,'Retoque rápido de contorno e pescoço.','#0e9f6e',FALSE,FALSE),
('s6','e1','Pigmentação de Barba','Barba',45,60,9,'Disfarça falhas e dá densidade à barba.','#9333ea',FALSE,FALSE),
('s7','e1','Sobrancelha','Estética',10,15,1,'Alinhamento na navalha.','#db2777',FALSE,FALSE),
('s8','e1','Corte Infantil','Cabelo',25,40,2,'Corte para os pequenos, com paciência extra.','#ea580c',FALSE,FALSE),
('s9','e1','Hidratação Capilar','Cabelo',20,30,7,'Tratamento de reconstrução e brilho.','#2563eb',FALSE,FALSE),
('s10','e1','Platinado / Global','Química',90,150,38,'Descoloração global. Exige sinal.','#0891b2',FALSE,TRUE);

INSERT INTO servico_profissionais (servico_id, profissional_id) VALUES
('s1','p1'),('s1','p2'),('s1','p4'),
('s2','p1'),('s2','p2'),('s2','p3'),
('s3','p1'),('s3','p3'),
('s4','p1'),('s4','p2'),
('s5','p1'),('s5','p2'),('s5','p4'),
('s6','p3'),
('s7','p1'),('s7','p2'),('s7','p3'),('s7','p4'),
('s8','p4'),
('s9','p3'),
('s10','p1');

-- ---------- Clientes ----------
INSERT INTO clientes (id, estabelecimento_id, nome, whatsapp, email, nascimento, observacoes, profissional_favorito_id) VALUES
('c1','e1','Thiago Nascimento','(11) 99876-1122','thiago.n@email.com','1990-06-12','Sempre pede degradê médio + barba. Prefere o Rafa.','p1'),
('c2','e1','Marcos Pereira','(11) 98765-4433','marcos.p@email.com','1985-11-23','Alérgico a alguns pós-barba. Usar linha neutra.','p3'),
('c3','e1','Felipe Cardoso','(11) 99123-7788','felipe.c@email.com','1998-09-09','Veio por indicação do Thiago.',NULL),
('c4','e1','André Lima','(11) 98234-5566','andre.l@email.com','1992-03-15','Cliente desde a inauguração. Café sem açúcar.','p1'),
('c5','e1','Gustavo Rocha','(11) 99988-1234','gustavo.r@email.com','2001-12-30','Não volta há mais de 3 meses.','p2'),
('c6','e1','Rodrigo Teixeira','(11) 98567-9900','rodrigo.t@email.com','1988-07-04','','p4'),
('c7','e1','Vinícius Barros','(11) 99334-2211','vinicius.b@email.com','1995-01-19','Gosta de conversar sobre futebol.','p2'),
('c8','e1','Eduardo Martins','(11) 98445-7766','eduardo.m@email.com','1979-10-08','Pai do pequeno Theo (corte infantil).','p1'),
('c9','e1','Pedro Henrique','(11) 99776-3322','pedro.h@email.com','2003-05-21','Primeira vez. Achou pelo Instagram.',NULL),
('c10','e1','Caio Fernandes','(11) 98112-9988','caio.f@email.com','1993-08-27','','p1'),
('c11','e1','Leonardo Souza','(11) 99001-4455','leo.s@email.com','1987-02-14','Barba grande, leva tempo.','p3'),
('c12','e1','Matheus Ribeiro','(11) 98990-7711','matheus.r@email.com','1999-11-02','','p2');

INSERT INTO cliente_tags (cliente_id, tag) VALUES
('c1','vip'),('c3','novo'),('c4','vip'),('c5','sumido'),('c8','vip'),('c9','novo'),('c10','sumido');

-- ---------- Agendamentos de HOJE (timeline) — data = hoje ----------
INSERT INTO agendamentos (id, estabelecimento_id, cliente_id, servico_id, profissional_id, data, hora_inicio, duracao_min, valor, status, sinal_pago) VALUES
('a1','e1','c4','s2','p1',CURRENT_DATE(),'09:00',50,70,'concluido',FALSE),
('a2','e1','c1','s4','p1',CURRENT_DATE(),'10:00',40,55,'concluido',FALSE),
('a3','e1','c8','s2','p1',CURRENT_DATE(),'11:00',50,70,'atendimento',FALSE),
('a4','e1','c11','s3','p1',CURRENT_DATE(),'14:00',25,35,'confirmado',FALSE),
('a5','e1','c7','s10','p1',CURRENT_DATE(),'15:30',90,150,'confirmado',TRUE),
('a6','e1','c2','s6','p3',CURRENT_DATE(),'09:30',45,60,'concluido',FALSE),
('a7','e1','c11','s3','p3',CURRENT_DATE(),'11:00',25,35,'pendente',FALSE),
('a8','e1','c5','s2','p3',CURRENT_DATE(),'14:30',50,70,'pendente',FALSE),
('a9','e1','c12','s4','p2',CURRENT_DATE(),'10:30',40,55,'concluido',FALSE),
('a10','e1','c7','s4','p2',CURRENT_DATE(),'13:00',40,55,'confirmado',FALSE),
('a11','e1','c3','s2','p2',CURRENT_DATE(),'16:00',50,70,'confirmado',FALSE),
('a12','e1','c6','s1','p4',CURRENT_DATE(),'09:00',30,45,'faltou',FALSE),
('a13','e1','c9','s8','p4',CURRENT_DATE(),'11:00',25,40,'concluido',FALSE),
('a14','e1','c6','s1','p4',CURRENT_DATE(),'15:00',30,45,'confirmado',FALSE),
('a15','e1','c10','s1','p2',CURRENT_DATE(),'17:00',30,45,'pendente',FALSE);

-- ---------- Agendamentos (período maior) — datas literais ----------
INSERT INTO agendamentos (id, estabelecimento_id, cliente_id, servico_id, profissional_id, data, hora_inicio, duracao_min, valor, status, sinal_pago) VALUES
('g1','e1','c4','s2','p1','2026-06-09','14:00',50,70,'confirmado',FALSE),
('g2','e1','c1','s4','p1','2026-06-09','15:30',40,55,'confirmado',FALSE),
('g3','e1','c8','s2','p1','2026-06-09','11:00',50,70,'atendimento',FALSE),
('g4','e1','c5','s2','p3','2026-06-09','14:30',50,70,'pendente',FALSE),
('g5','e1','c6','s1','p4','2026-06-09','09:00',30,45,'faltou',FALSE),
('g6','e1','c3','s2','p2','2026-06-09','16:00',50,70,'confirmado',FALSE),
('g7','e1','c10','s1','p2','2026-06-09','17:00',30,45,'pendente',FALSE),
('g8','e1','c2','s6','p3','2026-06-10','09:30',45,60,'confirmado',FALSE),
('g9','e1','c7','s10','p1','2026-06-10','15:30',90,150,'confirmado',FALSE),
('g10','e1','c11','s3','p3','2026-06-10','11:00',25,35,'pendente',FALSE),
('g11','e1','c12','s4','p2','2026-06-11','10:30',40,55,'confirmado',FALSE),
('g12','e1','c9','s8','p4','2026-06-08','11:00',25,40,'concluido',FALSE),
('g13','e1','c4','s2','p1','2026-06-08','09:00',50,70,'concluido',FALSE),
('g14','e1','c6','s1','p4','2026-06-08','15:00',30,45,'cancelado',FALSE),
('g15','e1','c1','s2','p1','2026-06-07','16:00',50,70,'concluido',FALSE),
('g16','e1','c8','s4','p2','2026-06-07','10:00',40,55,'concluido',FALSE),
('g17','e1','c5','s1','p1','2026-06-07','13:00',30,45,'faltou',FALSE),
('g18','e1','c12','s3','p3','2026-06-11','14:00',25,35,'pendente',FALSE),
('g27','e1','c1','s4','p2','2026-06-03','09:30',40,55,'concluido',FALSE),
('g28','e1','c8','s2','p1','2026-06-03','11:00',50,70,'concluido',FALSE),
('g29','e1','c12','s1','p4','2026-06-03','14:00',30,45,'concluido',FALSE),
('g30','e1','c6','s7','p3','2026-06-03','16:00',10,15,'faltou',FALSE),
('g31','e1','c4','s2','p1','2026-06-04','09:00',50,70,'concluido',FALSE),
('g32','e1','c2','s6','p3','2026-06-04','10:00',45,60,'concluido',FALSE),
('g33','e1','c7','s4','p2','2026-06-04','12:00',40,55,'concluido',FALSE),
('g34','e1','c11','s3','p3','2026-06-04','14:00',25,35,'concluido',FALSE),
('g35','e1','c9','s1','p4','2026-06-04','16:00',30,45,'concluido',FALSE),
('g36','e1','c5','s2','p1','2026-06-04','17:00',50,70,'cancelado',FALSE),
('g40','e1','c12','s2','p1','2026-06-06','09:00',50,70,'concluido',FALSE),
('g41','e1','c6','s4','p2','2026-06-06','11:00',40,55,'concluido',FALSE),
('g42','e1','c2','s3','p3','2026-06-06','14:00',25,35,'concluido',FALSE),
('g43','e1','c7','s1','p1','2026-06-06','16:00',30,45,'cancelado',FALSE);

-- ---------- Estoque ----------
INSERT INTO fornecedores (id, estabelecimento_id, nome) VALUES
('f1','e1','Barba Brava Dist.'),('f2','e1','SupplyMax'),('f3','e1','Beauty Pro');

INSERT INTO produtos (id, estabelecimento_id, nome, categoria, quantidade, quantidade_minima, custo, preco_venda, fornecedor_id) VALUES
('pr1','e1','Pomada Modeladora','Finalização',3,8,18,35,'f1'),
('pr2','e1','Lâmina de Barbear (cx)','Insumo',2,5,25,NULL,'f2'),
('pr3','e1','Óleo para Barba','Barba',14,6,22,45,'f1'),
('pr4','e1','Shampoo Profissional 1L','Lavagem',9,4,35,60,'f3'),
('pr5','e1','Tinta Pigment. Barba','Química',6,3,40,NULL,'f3'),
('pr6','e1','Pó Mentolado','Finalização',11,5,12,25,'f1'),
('pr7','e1','Cera Capilar','Finalização',1,6,20,38,'f2'),
('pr8','e1','Toalhas Descart. (pct)','Insumo',22,10,15,NULL,'f2'),
('pr9','e1','Pó Descolorante','Química',4,2,48,NULL,'f3');

-- consumo de produto por serviço (baixa automática)
INSERT INTO servico_consumo (servico_id, produto_id, quantidade) VALUES
('s1','pr1',1),('s1','pr7',1),('s3','pr2',1),('s9','pr4',1),('s6','pr5',1),('s10','pr9',1);

INSERT INTO movimentacoes_estoque (id, produto_id, tipo, quantidade, motivo, criado_em) VALUES
('m1','pr1','saida',1,'Consumo — Corte Masculino','2026-06-09 11:42:00'),
('m2','pr2','saida',1,'Consumo — Barba Completa','2026-06-09 09:58:00'),
('m3','pr3','entrada',12,'Compra — Barba Brava Dist.','2026-06-08 14:10:00'),
('m4','pr7','saida',2,'Consumo — Corte Masculino','2026-06-08 16:30:00'),
('m5','pr4','entrada',6,'Compra — Beauty Pro','2026-06-07 10:05:00'),
('m6','pr5','saida',1,'Consumo — Pigmentação de Barba','2026-06-07 15:20:00');

-- ---------- Caixa / Financeiro ----------
INSERT INTO caixas (id, estabelecimento_id, operador_id, aberto_em, valor_abertura) VALUES
('cx1','e1','u1',CONCAT(CURRENT_DATE(),' 08:30:00'),200);

INSERT INTO lancamentos (id, estabelecimento_id, caixa_id, tipo, categoria, descricao, valor, forma, profissional_id, criado_em) VALUES
('l1','e1','cx1','receita','Atendimento','Corte + Barba — André Lima',70,'pix','p1',CONCAT(CURRENT_DATE(),' 09:52:00')),
('l2','e1','cx1','receita','Atendimento','Pigmentação — Marcos Pereira',60,'cartao','p3',CONCAT(CURRENT_DATE(),' 10:18:00')),
('l3','e1','cx1','receita','Atendimento','Degradê — Matheus Ribeiro',55,'dinheiro','p2',CONCAT(CURRENT_DATE(),' 11:15:00')),
('l4','e1','cx1','receita','Produto','Óleo para Barba (venda)',45,'cartao','p1',CONCAT(CURRENT_DATE(),' 11:20:00')),
('l5','e1','cx1','receita','Atendimento','Corte + Barba — Eduardo Martins',70,'pix','p1',CONCAT(CURRENT_DATE(),' 11:48:00')),
('l6','e1','cx1','receita','Atendimento','Corte Infantil — Pedro H.',40,'dinheiro','p4',CONCAT(CURRENT_DATE(),' 11:55:00')),
('l7','e1','cx1','receita','Produto','Pomada Modeladora (venda)',35,'pix','p2',CONCAT(CURRENT_DATE(),' 12:05:00')),
('l8','e1','cx1','despesa','Insumos','Reposição lâminas (SupplyMax)',150,'pix',NULL,CONCAT(CURRENT_DATE(),' 08:40:00')),
('l9','e1','cx1','despesa','Operacional','Café e água — copa',48,'dinheiro',NULL,CONCAT(CURRENT_DATE(),' 09:10:00')),
('l10','e1','cx1','despesa','Marketing','Impulsionamento Instagram',80,'cartao',NULL,CONCAT(CURRENT_DATE(),' 10:30:00'));

-- Lançamentos dos dias anteriores (histórico do mês) — alimentam o fluxo de caixa,
-- o faturamento mensal e as quebras por categoria / forma / profissional.
-- caixa_id NULL: caixas anteriores já fechados (não modelados nesta seed).
INSERT INTO lancamentos (id, estabelecimento_id, caixa_id, tipo, categoria, descricao, valor, forma, profissional_id, criado_em) VALUES
-- D-1 (ontem)
('l11','e1',NULL,'receita','Atendimento','Corte + Barba — Thiago N.',70,'pix','p1',CONCAT(DATE_SUB(CURRENT_DATE(),INTERVAL 1 DAY),' 09:40:00')),
('l12','e1',NULL,'receita','Atendimento','Degradê — Vinícius B.',55,'cartao','p2',CONCAT(DATE_SUB(CURRENT_DATE(),INTERVAL 1 DAY),' 10:30:00')),
('l13','e1',NULL,'receita','Atendimento','Barba Completa — Leonardo S.',35,'dinheiro','p3',CONCAT(DATE_SUB(CURRENT_DATE(),INTERVAL 1 DAY),' 11:15:00')),
('l14','e1',NULL,'receita','Atendimento','Corte Masculino — Rodrigo T.',45,'pix','p4',CONCAT(DATE_SUB(CURRENT_DATE(),INTERVAL 1 DAY),' 14:00:00')),
('l15','e1',NULL,'receita','Produto','Pomada Modeladora (venda)',35,'cartao','p1',CONCAT(DATE_SUB(CURRENT_DATE(),INTERVAL 1 DAY),' 15:10:00')),
('l16','e1',NULL,'receita','Atendimento','Corte + Barba — Eduardo M.',70,'pix','p1',CONCAT(DATE_SUB(CURRENT_DATE(),INTERVAL 1 DAY),' 16:20:00')),
('l17','e1',NULL,'despesa','Operacional','Conta de energia elétrica',180,'pix',NULL,CONCAT(DATE_SUB(CURRENT_DATE(),INTERVAL 1 DAY),' 18:00:00')),
-- D-2
('l18','e1',NULL,'receita','Atendimento','Platinado Global — Vinícius B.',150,'cartao','p1',CONCAT(DATE_SUB(CURRENT_DATE(),INTERVAL 2 DAY),' 09:30:00')),
('l19','e1',NULL,'receita','Atendimento','Pigmentação de Barba — Marcos P.',60,'pix','p3',CONCAT(DATE_SUB(CURRENT_DATE(),INTERVAL 2 DAY),' 11:00:00')),
('l20','e1',NULL,'receita','Atendimento','Corte + Barba — André L.',70,'dinheiro','p1',CONCAT(DATE_SUB(CURRENT_DATE(),INTERVAL 2 DAY),' 13:30:00')),
('l21','e1',NULL,'receita','Atendimento','Degradê — Matheus R.',55,'pix','p2',CONCAT(DATE_SUB(CURRENT_DATE(),INTERVAL 2 DAY),' 15:00:00')),
('l22','e1',NULL,'receita','Produto','Óleo para Barba (venda)',45,'cartao','p3',CONCAT(DATE_SUB(CURRENT_DATE(),INTERVAL 2 DAY),' 16:40:00')),
('l23','e1',NULL,'despesa','Insumos','Reposição de toalhas (SupplyMax)',120,'pix',NULL,CONCAT(DATE_SUB(CURRENT_DATE(),INTERVAL 2 DAY),' 08:50:00')),
-- D-3 (domingo / folga — sem movimento)
-- D-4
('l24','e1',NULL,'receita','Atendimento','Corte + Barba — Thiago N.',70,'pix','p1',CONCAT(DATE_SUB(CURRENT_DATE(),INTERVAL 4 DAY),' 09:20:00')),
('l25','e1',NULL,'receita','Atendimento','Corte Masculino — Caio F.',45,'dinheiro','p2',CONCAT(DATE_SUB(CURRENT_DATE(),INTERVAL 4 DAY),' 10:10:00')),
('l26','e1',NULL,'receita','Atendimento','Barba Completa — Leonardo S.',35,'cartao','p3',CONCAT(DATE_SUB(CURRENT_DATE(),INTERVAL 4 DAY),' 11:30:00')),
('l27','e1',NULL,'receita','Atendimento','Degradê — Felipe C.',55,'pix','p2',CONCAT(DATE_SUB(CURRENT_DATE(),INTERVAL 4 DAY),' 13:00:00')),
('l28','e1',NULL,'receita','Atendimento','Corte + Barba — Eduardo M.',70,'pix','p1',CONCAT(DATE_SUB(CURRENT_DATE(),INTERVAL 4 DAY),' 14:40:00')),
('l29','e1',NULL,'receita','Produto','Cera Capilar (venda)',38,'dinheiro','p1',CONCAT(DATE_SUB(CURRENT_DATE(),INTERVAL 4 DAY),' 16:00:00')),
('l30','e1',NULL,'despesa','Insumos','Compra óleo p/ barba (Barba Brava)',132,'pix',NULL,CONCAT(DATE_SUB(CURRENT_DATE(),INTERVAL 4 DAY),' 08:40:00')),
('l31','e1',NULL,'despesa','Operacional','Material de limpeza',58,'dinheiro',NULL,CONCAT(DATE_SUB(CURRENT_DATE(),INTERVAL 4 DAY),' 17:30:00')),
-- D-5
('l32','e1',NULL,'receita','Atendimento','Corte + Barba — André L.',70,'pix','p1',CONCAT(DATE_SUB(CURRENT_DATE(),INTERVAL 5 DAY),' 09:50:00')),
('l33','e1',NULL,'receita','Atendimento','Degradê — Vinícius B.',55,'cartao','p2',CONCAT(DATE_SUB(CURRENT_DATE(),INTERVAL 5 DAY),' 11:20:00')),
('l34','e1',NULL,'receita','Atendimento','Hidratação Capilar — Marcos P.',30,'pix','p3',CONCAT(DATE_SUB(CURRENT_DATE(),INTERVAL 5 DAY),' 13:10:00')),
('l35','e1',NULL,'receita','Atendimento','Corte Infantil — Pedro H.',40,'dinheiro','p4',CONCAT(DATE_SUB(CURRENT_DATE(),INTERVAL 5 DAY),' 15:30:00')),
('l36','e1',NULL,'receita','Atendimento','Corte + Barba — Eduardo M.',70,'cartao','p1',CONCAT(DATE_SUB(CURRENT_DATE(),INTERVAL 5 DAY),' 17:00:00')),
('l37','e1',NULL,'despesa','Marketing','Tráfego pago — Instagram',95,'cartao',NULL,CONCAT(DATE_SUB(CURRENT_DATE(),INTERVAL 5 DAY),' 19:00:00')),
-- D-6
('l38','e1',NULL,'receita','Atendimento','Platinado Global — Felipe C.',150,'pix','p1',CONCAT(DATE_SUB(CURRENT_DATE(),INTERVAL 6 DAY),' 10:00:00')),
('l39','e1',NULL,'receita','Atendimento','Corte + Barba — Thiago N.',70,'pix','p1',CONCAT(DATE_SUB(CURRENT_DATE(),INTERVAL 6 DAY),' 11:40:00')),
('l40','e1',NULL,'receita','Atendimento','Pigmentação de Barba — Leonardo S.',60,'cartao','p3',CONCAT(DATE_SUB(CURRENT_DATE(),INTERVAL 6 DAY),' 13:20:00')),
('l41','e1',NULL,'receita','Atendimento','Degradê — Matheus R.',55,'dinheiro','p2',CONCAT(DATE_SUB(CURRENT_DATE(),INTERVAL 6 DAY),' 15:00:00')),
('l42','e1',NULL,'receita','Produto','Shampoo Profissional (venda)',60,'cartao','p3',CONCAT(DATE_SUB(CURRENT_DATE(),INTERVAL 6 DAY),' 16:30:00')),
('l43','e1',NULL,'despesa','Insumos','Reposição de lâminas (SupplyMax)',150,'pix',NULL,CONCAT(DATE_SUB(CURRENT_DATE(),INTERVAL 6 DAY),' 08:30:00'));

-- Vencimentos relativos a CURRENT_DATE(): mistura de a vencer e vencidos (aging).
INSERT INTO contas_receber (id, estabelecimento_id, cliente_id, descricao, valor, vencimento) VALUES
('r1','e1','c2', 'Corte + Barba (fiado)',        70, DATE_ADD(CURRENT_DATE(), INTERVAL 3 DAY)),
('r2','e1','c11','Barba — saldo restante',       20, DATE_SUB(CURRENT_DATE(), INTERVAL 9 DAY)),
('r3','e1','c7', 'Sinal Platinado pendente',     75, DATE_ADD(CURRENT_DATE(), INTERVAL 1 DAY)),
('r4','e1','c5', 'Pacote mensal — 2ª parcela',  120, DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY)),
('r5','e1','c8', 'Combo fidelidade (a faturar)', 140, DATE_ADD(CURRENT_DATE(), INTERVAL 7 DAY)),
('r6','e1','c10','Corte + Barba (fiado)',        70, DATE_SUB(CURRENT_DATE(), INTERVAL 20 DAY));

-- ---------- Comissões (fechamento da quinzena) ----------
INSERT INTO fechamentos_comissao (id, estabelecimento_id, profissional_id, periodo_inicio, periodo_fim, status, valor_pago, pago_em) VALUES
('fc1','e1','p1','2026-06-01','2026-06-15','aberto',NULL,NULL),
('fc2','e1','p2','2026-06-01','2026-06-15','aberto',NULL,NULL),
('fc3','e1','p3','2026-06-01','2026-06-15','aberto',NULL,NULL),
('fc4','e1','p4','2026-06-01','2026-06-15','pago',34.00,CONCAT(CURRENT_DATE(),' 18:00:00'));

-- ---------- Fidelidade ----------
INSERT INTO config_fidelidade (estabelecimento_id, tipo, meta_pontos, recompensa, cashback_pct, ativo) VALUES
('e1','pontos',10,'1 corte grátis',5,TRUE);

-- ---------- Marketing ----------
INSERT INTO campanhas (id, estabelecimento_id, nome, tipo, alvo, cor, status) VALUES
('cp1','e1','Cliente sumido — volta aí','retorno','Tag: Sumido','var(--st-faltou)','ativa'),
('cp2','e1','Feliz aniversário 🎂','aniversario','Aniversariantes do mês','var(--st-atendimento)','ativa'),
('cp3','e1','Combo Corte+Barba -20%','promo','Tag: VIP','var(--accent)','agendada'),
('cp4','e1','Terça do Degradê','promo','Todos','var(--text-3)','rascunho');

INSERT INTO modelos_mensagem (id, estabelecimento_id, nome, gatilho, texto) VALUES
('md1','e1','Confirmação imediata','Ao agendar','Olá {cliente}! Seu horário na {estabelecimento} está confirmado para {data} às {hora} com {profissional}. Qualquer coisa, é só responder aqui. 💈'),
('md2','e1','Lembrete véspera','1 dia antes','Oi {cliente}, passando pra lembrar do seu horário amanhã às {hora}. Confirma pra mim? Responda SIM ou NÃO.'),
('md3','e1','Retorno (cliente sumido)','60 dias sem voltar','E aí {cliente}, sentimos sua falta! Que tal dar um trato no visual? Tem horário essa semana. 😎'),
('md4','e1','Aniversário','No aniversário','Parabéns, {cliente}! 🎉 Pra comemorar, você tem 20% off no seu próximo corte esse mês. Vem!');
