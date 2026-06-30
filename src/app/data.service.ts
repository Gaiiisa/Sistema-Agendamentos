/* ============================================================
   Dados mock — Barbearia (SaaS de agendamento)
   Estabelecimento: "Navalha & Cia"  ·  Perfil: Dono/Admin
   Porte do data.js original para um serviço Angular.
   ============================================================ */
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';

export interface Staff {
  id: string; nome: string; apelido: string; cor: string; especialidades: string[];
  comissao: number; contato: string; bio: string; meta: number; vendido: number;
  folga: string[]; inicio: string; fim: string;
}
export interface Servico {
  id: string; nome: string; cat: string; dur: number; preco: number; custo: number;
  desc: string; cor: string; exec: string[]; combo?: boolean; sinal?: boolean;
}
export interface Cliente {
  id: string; nome: string; wpp: string; email: string; nasc: string; tags: string[];
  visitas: number; ticket: number; total: number; ultima: string; freq: number;
  obs: string; fav: string | null;
}
export interface Appt {
  id: string; cli: string; srv: string; prof: string; ini: string; status: string;
  sinal: boolean; _dur?: number;
}
export interface Agendamento {
  id: string; cli: string; srv: string; prof: string; data: string; hora: string;
  status: string; valor: number;
}
export interface HistItem { data: string; srv: string; prof: string; valor: number; }
export interface Produto {
  id: string; nome: string; cat: string; qtd: number; min: number; custo: number;
  preco: number | null; fornecedor: string; consumo: string | null;
}
export interface MovEstoque { id: string; prod: string; tipo: string; qtd: number; motivo: string; data: string; hora: string; }
export interface Lancamento { id: string; tipo: string; cat: string; desc: string; valor: number; forma: string; data: string; hora: string; prof?: string; }
export interface AReceberItem { id: string; cli: string; desc: string; valor: number; venc: string; dias: number; }
export interface FluxoItem { dia: string; rec: number; desp: number; }
export interface CatItem { cat: string; valor: number; qtd: number; }
export interface FormaItem { forma: string; label: string; valor: number; }
export interface ProfReceita { prof: string; valor: number; qtd: number; }
export interface Financeiro {
  hoje: string;
  fluxo: FluxoItem[];
  receitaCategoria: CatItem[];
  despesaCategoria: CatItem[];
  receitaForma: FormaItem[];
  porProfissional: ProfReceita[];
  mes: { receita: number; despesa: number; resultado: number; ticketMedio: number; atendimentos: number };
  mesAnterior: { receita: number; despesa: number; resultado: number };
}
export interface ComissaoItem { data: string; cli: string; srv: string; valor: number; }
export interface Comissao { status: string; itens: ComissaoItem[]; }
export interface Campanha { id: string; nome: string; tipo: string; alvo: string; publico: number; enviadas: number; retorno: number; taxa: number; status: string; cor: string; }
export interface Modelo { id: string; nome: string; desc: string; cat: string; gatilho: string; canal: string; assunto: string; texto: string; status: string; }
export interface HistoricoComissaoPagamento {
  id: string; profId: string; periodo: string; dataInicio: string; dataFim: string;
  atendimentos: number; bruto: number; comissao: number;
  status: 'pago' | 'aberto'; dataPagamento?: string; formaPagamento?: string;
}

@Injectable({ providedIn: 'root' })
export class DataService {
  readonly estabelecimento = {
    nome: 'Navalha & Cia', plano: 'Profissional', cidade: 'São Paulo · SP', slug: '',
    documento: '', tipo_negocio: 'Barbearia', cep: '', telefone: '', endereco: '',
    descricao: '', instagram: '', site: '', google_perfil: '',
  };
  readonly usuario = { nome: 'Carlos Menezes', papel: 'Dono / Admin', cor: '#0e9f6e' };

  // ---------- Horário de funcionamento / expediente (Configurações › Horários) ----------
  expediente: { diaSemana: number; dia: string; abrev: string; aberto: boolean; inicio: string; fim: string; pausaInicio: string | null; pausaFim: string | null }[] = [];

  // ---------- Equipe / Profissionais ----------
  readonly staff: Staff[] = [
    { id: 'p1', nome: 'Rafael Moura',   apelido: 'Rafa',   cor: '#0e9f6e', especialidades: ['Corte', 'Barba', 'Degradê'], comissao: 50, contato: '(11) 98812-4471', bio: 'Barbeiro-chefe. 8 anos de navalha.', meta: 9000, vendido: 7320, folga: ['dom'], inicio: '09:00', fim: '20:00' },
    { id: 'p2', nome: 'Diego Santos',   apelido: 'Diego',  cor: '#2563eb', especialidades: ['Degradê', 'Navalhado', 'Freestyle'], comissao: 45, contato: '(11) 99645-2210', bio: 'Especialista em fade e desenhos.', meta: 7000, vendido: 6140, folga: ['dom','seg'], inicio: '10:00', fim: '20:00' },
    { id: 'p3', nome: 'Lucas Ferreira', apelido: 'Lucas',  cor: '#9333ea', especialidades: ['Barba', 'Pigmentação', 'Hidratação'], comissao: 45, contato: '(11) 98123-9087', bio: 'Mestre da barba terapia.', meta: 6500, vendido: 5980, folga: ['ter'], inicio: '09:00', fim: '19:00' },
    { id: 'p4', nome: 'Bruno Alves',    apelido: 'Bruno',  cor: '#ea580c', especialidades: ['Corte', 'Infantil', 'Tesoura'], comissao: 40, contato: '(11) 99012-5534', bio: 'Paciência de monge com a criançada.', meta: 5500, vendido: 4210, folga: ['dom'], inicio: '09:00', fim: '18:00' },
  ];

  // ---------- Serviços ----------
  readonly servicos: Servico[] = [
    { id: 's1', nome: 'Corte Masculino',     cat: 'Cabelo',  dur: 30, preco: 45, custo: 3,  desc: 'Corte na tesoura ou máquina, finalização com pomada.', cor: '#0e9f6e', exec: ['p1','p2','p4'] },
    { id: 's2', nome: 'Corte + Barba',       cat: 'Combo',   dur: 50, preco: 70, custo: 6,  desc: 'O combo clássico. Corte completo + barba na navalha.', cor: '#0e9f6e', exec: ['p1','p2','p3'], combo: true },
    { id: 's3', nome: 'Barba Completa',      cat: 'Barba',   dur: 25, preco: 35, custo: 4,  desc: 'Toalha quente, navalha e óleo finalizador.', cor: '#9333ea', exec: ['p1','p3'] },
    { id: 's4', nome: 'Degradê (Fade)',      cat: 'Cabelo',  dur: 40, preco: 55, custo: 3,  desc: 'Degradê navalhado, do zero ao topo.', cor: '#2563eb', exec: ['p1','p2'] },
    { id: 's5', nome: 'Pezinho / Acabamento',cat: 'Cabelo',  dur: 15, preco: 20, custo: 1,  desc: 'Retoque rápido de contorno e pescoço.', cor: '#0e9f6e', exec: ['p1','p2','p4'] },
    { id: 's6', nome: 'Pigmentação de Barba',cat: 'Barba',   dur: 45, preco: 60, custo: 9,  desc: 'Disfarça falhas e dá densidade à barba.', cor: '#9333ea', exec: ['p3'] },
    { id: 's7', nome: 'Sobrancelha',         cat: 'Estética',dur: 10, preco: 15, custo: 1,  desc: 'Alinhamento na navalha.', cor: '#db2777', exec: ['p1','p2','p3','p4'] },
    { id: 's8', nome: 'Corte Infantil',      cat: 'Cabelo',  dur: 25, preco: 40, custo: 2,  desc: 'Corte para os pequenos, com paciência extra.', cor: '#ea580c', exec: ['p4'] },
    { id: 's9', nome: 'Hidratação Capilar',  cat: 'Cabelo',  dur: 20, preco: 30, custo: 7,  desc: 'Tratamento de reconstrução e brilho.', cor: '#2563eb', exec: ['p3'] },
    { id: 's10',nome: 'Platinado / Global',  cat: 'Química', dur: 90, preco: 150,custo: 38, desc: 'Descoloração global. Exige sinal.', cor: '#0891b2', exec: ['p1'], sinal: true },
  ];

  // ---------- Clientes ----------
  readonly clientes: Cliente[] = [
    { id: 'c1',  nome: 'Thiago Nascimento', wpp: '(11) 99876-1122', email: 'thiago.n@email.com', nasc: '1990-06-12', tags: ['vip'],   visitas: 28, ticket: 68, total: 1904, ultima: '2026-06-02', freq: 18, obs: 'Sempre pede degradê médio + barba. Prefere o Rafa.', fav: 'p1' },
    { id: 'c2',  nome: 'Marcos Pereira',    wpp: '(11) 98765-4433', email: 'marcos.p@email.com', nasc: '1985-11-23', tags: [],      visitas: 12, ticket: 55, total: 660,  ultima: '2026-05-28', freq: 24, obs: 'Alérgico a alguns pós-barba. Usar linha neutra.', fav: 'p3' },
    { id: 'c3',  nome: 'Felipe Cardoso',    wpp: '(11) 99123-7788', email: 'felipe.c@email.com', nasc: '1998-09-09', tags: ['novo'], visitas: 2,  ticket: 70, total: 140,  ultima: '2026-06-05', freq: 30, obs: 'Veio por indicação do Thiago.', fav: null },
    { id: 'c4',  nome: 'André Lima',        wpp: '(11) 98234-5566', email: 'andre.l@email.com',  nasc: '1992-03-15', tags: ['vip'],   visitas: 41, ticket: 72, total: 2952, ultima: '2026-06-06', freq: 14, obs: 'Cliente desde a inauguração. Café sem açúcar.', fav: 'p1' },
    { id: 'c5',  nome: 'Gustavo Rocha',     wpp: '(11) 99988-1234', email: 'gustavo.r@email.com',nasc: '2001-12-30', tags: ['sumido'],visitas: 7,  ticket: 50, total: 350,  ultima: '2026-02-18', freq: 22, obs: 'Não volta há mais de 3 meses.', fav: 'p2' },
    { id: 'c6',  nome: 'Rodrigo Teixeira',  wpp: '(11) 98567-9900', email: 'rodrigo.t@email.com',nasc: '1988-07-04', tags: [],      visitas: 15, ticket: 45, total: 675,  ultima: '2026-05-30', freq: 28, obs: '', fav: 'p4' },
    { id: 'c7',  nome: 'Vinícius Barros',   wpp: '(11) 99334-2211', email: 'vinicius.b@email.com',nasc: '1995-01-19',tags: [],      visitas: 9,  ticket: 60, total: 540,  ultima: '2026-06-01', freq: 26, obs: 'Gosta de conversar sobre futebol.', fav: 'p2' },
    { id: 'c8',  nome: 'Eduardo Martins',   wpp: '(11) 98445-7766', email: 'eduardo.m@email.com',nasc: '1979-10-08', tags: ['vip'],   visitas: 53, ticket: 65, total: 3445, ultima: '2026-06-04', freq: 15, obs: 'Pai do pequeno Theo (corte infantil).', fav: 'p1' },
    { id: 'c9',  nome: 'Pedro Henrique',    wpp: '(11) 99776-3322', email: 'pedro.h@email.com',  nasc: '2003-05-21', tags: ['novo'], visitas: 1,  ticket: 45, total: 45,   ultima: '2026-06-07', freq: 0,  obs: 'Primeira vez. Achou pelo Instagram.', fav: null },
    { id: 'c10', nome: 'Caio Fernandes',    wpp: '(11) 98112-9988', email: 'caio.f@email.com',   nasc: '1993-08-27', tags: ['sumido'],visitas: 6, ticket: 55, total: 330,  ultima: '2026-03-05', freq: 35, obs: '', fav: 'p1' },
    { id: 'c11', nome: 'Leonardo Souza',    wpp: '(11) 99001-4455', email: 'leo.s@email.com',    nasc: '1987-02-14', tags: [],      visitas: 19, ticket: 58, total: 1102, ultima: '2026-05-25', freq: 21, obs: 'Barba grande, leva tempo.', fav: 'p3' },
    { id: 'c12', nome: 'Matheus Ribeiro',   wpp: '(11) 98990-7711', email: 'matheus.r@email.com',nasc: '1999-11-02', tags: [],      visitas: 11, ticket: 52, total: 572,  ultima: '2026-06-03', freq: 25, obs: '', fav: 'p2' },
  ];

  // ---------- Agendamentos de HOJE (timeline) ----------
  readonly status = ['pendente','confirmado','atendimento','concluido','faltou','cancelado'];
  readonly hoje: Appt[] = [
    { id: 'a1',  cli: 'c4',  srv: 's2',  prof: 'p1', ini: '09:00', status: 'concluido', sinal: false },
    { id: 'a2',  cli: 'c1',  srv: 's4',  prof: 'p1', ini: '10:00', status: 'concluido', sinal: false },
    { id: 'a3',  cli: 'c8',  srv: 's2',  prof: 'p1', ini: '11:00', status: 'atendimento', sinal: false },
    { id: 'a4',  cli: 'c11', srv: 's3',  prof: 'p1', ini: '14:00', status: 'confirmado', sinal: false },
    { id: 'a5',  cli: 'c7',  srv: 's10', prof: 'p1', ini: '15:30', status: 'confirmado', sinal: true },
    { id: 'a6',  cli: 'c2',  srv: 's6',  prof: 'p3', ini: '09:30', status: 'concluido', sinal: false },
    { id: 'a7',  cli: 'c11', srv: 's3',  prof: 'p3', ini: '11:00', status: 'pendente', sinal: false },
    { id: 'a8',  cli: 'c5',  srv: 's2',  prof: 'p3', ini: '14:30', status: 'pendente', sinal: false },
    { id: 'a9',  cli: 'c12', srv: 's4',  prof: 'p2', ini: '10:30', status: 'concluido', sinal: false },
    { id: 'a10', cli: 'c7',  srv: 's4',  prof: 'p2', ini: '13:00', status: 'confirmado', sinal: false },
    { id: 'a11', cli: 'c3',  srv: 's2',  prof: 'p2', ini: '16:00', status: 'confirmado', sinal: false },
    { id: 'a12', cli: 'c6',  srv: 's1',  prof: 'p4', ini: '09:00', status: 'faltou', sinal: false },
    { id: 'a13', cli: 'c9',  srv: 's8',  prof: 'p4', ini: '11:00', status: 'concluido', sinal: false },
    { id: 'a14', cli: 'c6',  srv: 's1',  prof: 'p4', ini: '15:00', status: 'confirmado', sinal: false },
    { id: 'a15', cli: 'c10', srv: 's1',  prof: 'p2', ini: '17:00', status: 'pendente', sinal: false },
  ];

  // ---------- Lista de agendamentos (período maior) ----------
  readonly agendamentos: Agendamento[] = [
    { id: 'g1', cli: 'c4',  srv: 's2',  prof: 'p1', data: '2026-06-09', hora: '14:00', status: 'confirmado', valor: 70 },
    { id: 'g2', cli: 'c1',  srv: 's4',  prof: 'p1', data: '2026-06-09', hora: '15:30', status: 'confirmado', valor: 55 },
    { id: 'g3', cli: 'c8',  srv: 's2',  prof: 'p1', data: '2026-06-09', hora: '11:00', status: 'atendimento', valor: 70 },
    { id: 'g4', cli: 'c5',  srv: 's2',  prof: 'p3', data: '2026-06-09', hora: '14:30', status: 'pendente', valor: 70 },
    { id: 'g5', cli: 'c6',  srv: 's1',  prof: 'p4', data: '2026-06-09', hora: '09:00', status: 'faltou', valor: 45 },
    { id: 'g6', cli: 'c3',  srv: 's2',  prof: 'p2', data: '2026-06-09', hora: '16:00', status: 'confirmado', valor: 70 },
    { id: 'g7', cli: 'c10', srv: 's1',  prof: 'p2', data: '2026-06-09', hora: '17:00', status: 'pendente', valor: 45 },
    { id: 'g8', cli: 'c2',  srv: 's6',  prof: 'p3', data: '2026-06-10', hora: '09:30', status: 'confirmado', valor: 60 },
    { id: 'g9', cli: 'c7',  srv: 's10', prof: 'p1', data: '2026-06-10', hora: '15:30', status: 'confirmado', valor: 150 },
    { id: 'g10',cli: 'c11', srv: 's3',  prof: 'p3', data: '2026-06-10', hora: '11:00', status: 'pendente', valor: 35 },
    { id: 'g11',cli: 'c12', srv: 's4',  prof: 'p2', data: '2026-06-11', hora: '10:30', status: 'confirmado', valor: 55 },
    { id: 'g12',cli: 'c9',  srv: 's8',  prof: 'p4', data: '2026-06-08', hora: '11:00', status: 'concluido', valor: 40 },
    { id: 'g13',cli: 'c4',  srv: 's2',  prof: 'p1', data: '2026-06-08', hora: '09:00', status: 'concluido', valor: 70 },
    { id: 'g14',cli: 'c6',  srv: 's1',  prof: 'p4', data: '2026-06-08', hora: '15:00', status: 'cancelado', valor: 45 },
    { id: 'g15',cli: 'c1',  srv: 's2',  prof: 'p1', data: '2026-06-07', hora: '16:00', status: 'concluido', valor: 70 },
    { id: 'g16',cli: 'c8',  srv: 's4',  prof: 'p2', data: '2026-06-07', hora: '10:00', status: 'concluido', valor: 55 },
    { id: 'g17',cli: 'c5',  srv: 's1',  prof: 'p1', data: '2026-06-07', hora: '13:00', status: 'faltou',   valor: 45 },
    { id: 'g18',cli: 'c12', srv: 's3',  prof: 'p3', data: '2026-06-11', hora: '14:00', status: 'pendente', valor: 35 },
    // Junho 3 (Qua)
    { id: 'g27',cli: 'c1',  srv: 's4',  prof: 'p2', data: '2026-06-03', hora: '09:30', status: 'concluido', valor: 55 },
    { id: 'g28',cli: 'c8',  srv: 's2',  prof: 'p1', data: '2026-06-03', hora: '11:00', status: 'concluido', valor: 70 },
    { id: 'g29',cli: 'c12', srv: 's1',  prof: 'p4', data: '2026-06-03', hora: '14:00', status: 'concluido', valor: 45 },
    { id: 'g30',cli: 'c6',  srv: 's7',  prof: 'p3', data: '2026-06-03', hora: '16:00', status: 'faltou',   valor: 15 },
    // Junho 4 (Qui)
    { id: 'g31',cli: 'c4',  srv: 's2',  prof: 'p1', data: '2026-06-04', hora: '09:00', status: 'concluido', valor: 70 },
    { id: 'g32',cli: 'c2',  srv: 's6',  prof: 'p3', data: '2026-06-04', hora: '10:00', status: 'concluido', valor: 60 },
    { id: 'g33',cli: 'c7',  srv: 's4',  prof: 'p2', data: '2026-06-04', hora: '12:00', status: 'concluido', valor: 55 },
    { id: 'g34',cli: 'c11', srv: 's3',  prof: 'p3', data: '2026-06-04', hora: '14:00', status: 'concluido', valor: 35 },
    { id: 'g35',cli: 'c9',  srv: 's1',  prof: 'p4', data: '2026-06-04', hora: '16:00', status: 'concluido', valor: 45 },
    { id: 'g36',cli: 'c5',  srv: 's2',  prof: 'p1', data: '2026-06-04', hora: '17:00', status: 'cancelado', valor: 70 },
    // Junho 6 (Sáb)
    { id: 'g40',cli: 'c12', srv: 's2',  prof: 'p1', data: '2026-06-06', hora: '09:00', status: 'concluido', valor: 70 },
    { id: 'g41',cli: 'c6',  srv: 's4',  prof: 'p2', data: '2026-06-06', hora: '11:00', status: 'concluido', valor: 55 },
    { id: 'g42',cli: 'c2',  srv: 's3',  prof: 'p3', data: '2026-06-06', hora: '14:00', status: 'concluido', valor: 35 },
    { id: 'g43',cli: 'c7',  srv: 's1',  prof: 'p1', data: '2026-06-06', hora: '16:00', status: 'cancelado', valor: 45 },
  ];

  // ---------- Histórico (para ficha do cliente) ----------
  readonly historico: { [id: string]: HistItem[] } = {
    c1: [
      { data: '2026-06-02', srv: 's4', prof: 'p1', valor: 55 },
      { data: '2026-05-15', srv: 's2', prof: 'p1', valor: 70 },
      { data: '2026-04-28', srv: 's4', prof: 'p1', valor: 55 },
      { data: '2026-04-10', srv: 's2', prof: 'p1', valor: 70 },
      { data: '2026-03-22', srv: 's4', prof: 'p2', valor: 55 },
    ],
    c4: [
      { data: '2026-06-06', srv: 's2', prof: 'p1', valor: 70 },
      { data: '2026-05-23', srv: 's2', prof: 'p1', valor: 70 },
      { data: '2026-05-09', srv: 's4', prof: 'p1', valor: 55 },
      { data: '2026-04-25', srv: 's2', prof: 'p1', valor: 70 },
    ],
    c8: [
      { data: '2026-06-04', srv: 's2', prof: 'p1', valor: 70 },
      { data: '2026-05-20', srv: 's2', prof: 'p1', valor: 70 },
      { data: '2026-05-06', srv: 's3', prof: 'p3', valor: 35 },
    ],
  };

  // ---------- Métricas do dia (dashboard) ----------
  readonly kpis = {
    agendamentos: 15, confirmados: 6, pendentes: 3,
    faturaPrevisto: 850, faturaRealizado: 410, ocupacao: 72, faltas: 1, cancelamentos: 0,
  };

  // ---------- FASE 2 · Estoque ----------
  readonly produtos: Produto[] = [
    { id: 'pr1', nome: 'Pomada Modeladora',      cat: 'Finalização', qtd: 3,  min: 8,  custo: 18, preco: 35, fornecedor: 'Barba Brava Dist.', consumo: 'Corte Masculino' },
    { id: 'pr2', nome: 'Lâmina de Barbear (cx)', cat: 'Insumo',      qtd: 2,  min: 5,  custo: 25, preco: null, fornecedor: 'SupplyMax', consumo: 'Barba Completa' },
    { id: 'pr3', nome: 'Óleo para Barba',        cat: 'Barba',       qtd: 14, min: 6,  custo: 22, preco: 45, fornecedor: 'Barba Brava Dist.', consumo: null },
    { id: 'pr4', nome: 'Shampoo Profissional 1L',cat: 'Lavagem',     qtd: 9,  min: 4,  custo: 35, preco: 60, fornecedor: 'Beauty Pro', consumo: 'Hidratação Capilar' },
    { id: 'pr5', nome: 'Tinta Pigment. Barba',   cat: 'Química',     qtd: 6,  min: 3,  custo: 40, preco: null, fornecedor: 'Beauty Pro', consumo: 'Pigmentação de Barba' },
    { id: 'pr6', nome: 'Pó Mentolado',           cat: 'Finalização', qtd: 11, min: 5,  custo: 12, preco: 25, fornecedor: 'Barba Brava Dist.', consumo: null },
    { id: 'pr7', nome: 'Cera Capilar',           cat: 'Finalização', qtd: 1,  min: 6,  custo: 20, preco: 38, fornecedor: 'SupplyMax', consumo: 'Corte Masculino' },
    { id: 'pr8', nome: 'Toalhas Descart. (pct)', cat: 'Insumo',      qtd: 22, min: 10, custo: 15, preco: null, fornecedor: 'SupplyMax', consumo: null },
    { id: 'pr9', nome: 'Pó Descolorante',        cat: 'Química',     qtd: 4,  min: 2,  custo: 48, preco: null, fornecedor: 'Beauty Pro', consumo: 'Platinado / Global' },
  ];
  readonly movEstoque: MovEstoque[] = [
    { id: 'm1', prod: 'pr1', tipo: 'saida',   qtd: 1, motivo: 'Consumo — Corte Masculino', data: '2026-06-09', hora: '11:42' },
    { id: 'm2', prod: 'pr2', tipo: 'saida',   qtd: 1, motivo: 'Consumo — Barba Completa', data: '2026-06-09', hora: '09:58' },
    { id: 'm3', prod: 'pr3', tipo: 'entrada', qtd: 12,motivo: 'Compra — Barba Brava Dist.', data: '2026-06-08', hora: '14:10' },
    { id: 'm4', prod: 'pr7', tipo: 'saida',   qtd: 2, motivo: 'Consumo — Corte Masculino', data: '2026-06-08', hora: '16:30' },
    { id: 'm5', prod: 'pr4', tipo: 'entrada', qtd: 6, motivo: 'Compra — Beauty Pro', data: '2026-06-07', hora: '10:05' },
    { id: 'm6', prod: 'pr5', tipo: 'saida',   qtd: 1, motivo: 'Consumo — Pigmentação de Barba', data: '2026-06-07', hora: '15:20' },
  ];

  // ---------- FASE 2 · Caixa / Financeiro ----------
  readonly caixa = { aberto: true, abertura: '08:30', valorAbertura: 200, operador: 'Carlos Menezes' };
  readonly hojeData = '2026-06-09';
  readonly lancamentos: Lancamento[] = [
    { id: 'l1',  tipo: 'receita', cat: 'Atendimento', desc: 'Corte + Barba — André Lima', valor: 70, forma: 'pix',     data: '2026-06-09', hora: '09:52', prof: 'p1' },
    { id: 'l2',  tipo: 'receita', cat: 'Atendimento', desc: 'Pigmentação — Marcos Pereira', valor: 60, forma: 'cartao', data: '2026-06-09', hora: '10:18', prof: 'p3' },
    { id: 'l3',  tipo: 'receita', cat: 'Atendimento', desc: 'Degradê — Matheus Ribeiro', valor: 55, forma: 'dinheiro', data: '2026-06-09', hora: '11:15', prof: 'p2' },
    { id: 'l4',  tipo: 'receita', cat: 'Produto',     desc: 'Óleo para Barba (venda)', valor: 45, forma: 'cartao', data: '2026-06-09', hora: '11:20', prof: 'p1' },
    { id: 'l5',  tipo: 'receita', cat: 'Atendimento', desc: 'Corte + Barba — Eduardo Martins', valor: 70, forma: 'pix', data: '2026-06-09', hora: '11:48', prof: 'p1' },
    { id: 'l6',  tipo: 'receita', cat: 'Atendimento', desc: 'Corte Infantil — Pedro H.', valor: 40, forma: 'dinheiro', data: '2026-06-09', hora: '11:55', prof: 'p4' },
    { id: 'l7',  tipo: 'receita', cat: 'Produto',     desc: 'Pomada Modeladora (venda)', valor: 35, forma: 'pix', data: '2026-06-09', hora: '12:05', prof: 'p2' },
    { id: 'l8',  tipo: 'despesa', cat: 'Insumos',     desc: 'Reposição lâminas (SupplyMax)', valor: 150, forma: 'pix', data: '2026-06-09', hora: '08:40' },
    { id: 'l9',  tipo: 'despesa', cat: 'Operacional', desc: 'Café e água — copa', valor: 48, forma: 'dinheiro', data: '2026-06-09', hora: '09:10' },
    { id: 'l10', tipo: 'despesa', cat: 'Marketing',   desc: 'Impulsionamento Instagram', valor: 80, forma: 'cartao', data: '2026-06-09', hora: '10:30' },
  ];
  readonly aReceber: AReceberItem[] = [
    { id: 'r1', cli: 'c2',  desc: 'Corte + Barba (fiado)', valor: 70, venc: '2026-06-12', dias: 3 },
    { id: 'r2', cli: 'c11', desc: 'Barba — saldo restante', valor: 20, venc: '2026-06-08', dias: -1 },
    { id: 'r3', cli: 'c7',  desc: 'Sinal Platinado pendente', valor: 75, venc: '2026-06-10', dias: 1 },
  ];
  readonly fluxo: FluxoItem[] = [
    { dia: 'Qua 3', rec: 720, desp: 180 },
    { dia: 'Qui 4', rec: 890, desp: 95 },
    { dia: 'Sex 5', rec: 1240, desp: 210 },
    { dia: 'Sáb 6', rec: 1580, desp: 130 },
    { dia: 'Dom 7', rec: 0, desp: 0 },
    { dia: 'Seg 8', rec: 640, desp: 320 },
    { dia: 'Ter 9', rec: 375, desp: 278 },
  ];

  // Agregados financeiros (substituídos pela API; mock = fallback resiliente)
  readonly financeiro: Financeiro = {
    hoje: '2026-06-09',
    fluxo: this.fluxo,
    receitaCategoria: [
      { cat: 'Atendimento', valor: 4985, qtd: 79 },
      { cat: 'Produto', valor: 875, qtd: 18 },
    ],
    despesaCategoria: [
      { cat: 'Insumos', valor: 552, qtd: 4 },
      { cat: 'Marketing', valor: 255, qtd: 3 },
      { cat: 'Operacional', valor: 286, qtd: 4 },
    ],
    receitaForma: [
      { forma: 'pix', label: 'Pix', valor: 2640 },
      { forma: 'cartao', label: 'Cartão', valor: 2050 },
      { forma: 'dinheiro', label: 'Dinheiro', valor: 1170 },
    ],
    porProfissional: [
      { prof: 'p1', valor: 2380, qtd: 33 },
      { prof: 'p2', valor: 1485, qtd: 24 },
      { prof: 'p3', valor: 1240, qtd: 18 },
      { prof: 'p4', valor: 755, qtd: 12 },
    ],
    mes: { receita: 5860, despesa: 1093, resultado: 4767, ticketMedio: 61, atendimentos: 96 },
    mesAnterior: { receita: 5120, despesa: 1240, resultado: 3880 },
  };

  // ---------- FASE 2 · Comissões ----------
  periodoComissao = '01 – 15 de junho';
  readonly comissoes: { [id: string]: Comissao } = {
    p1: { status: 'aberto', itens: [
      { data: '2026-06-09', cli: 'c4', srv: 's2', valor: 70 },
      { data: '2026-06-08', cli: 'c4', srv: 's2', valor: 70 },
      { data: '2026-06-07', cli: 'c1', srv: 's2', valor: 70 },
      { data: '2026-06-05', cli: 'c8', srv: 's4', valor: 55 },
      { data: '2026-06-04', cli: 'c11',srv: 's3', valor: 35 },
      { data: '2026-06-03', cli: 'c1', srv: 's2', valor: 70 },
    ]},
    p2: { status: 'aberto', itens: [
      { data: '2026-06-09', cli: 'c12',srv: 's4', valor: 55 },
      { data: '2026-06-07', cli: 'c8', srv: 's4', valor: 55 },
      { data: '2026-06-05', cli: 'c3', srv: 's2', valor: 70 },
      { data: '2026-06-04', cli: 'c7', srv: 's4', valor: 55 },
    ]},
    p3: { status: 'aberto', itens: [
      { data: '2026-06-09', cli: 'c2', srv: 's6', valor: 60 },
      { data: '2026-06-06', cli: 'c11',srv: 's3', valor: 35 },
      { data: '2026-06-04', cli: 'c2', srv: 's6', valor: 60 },
    ]},
    p4: { status: 'pago', itens: [
      { data: '2026-06-08', cli: 'c9', srv: 's8', valor: 40 },
      { data: '2026-06-06', cli: 'c6', srv: 's1', valor: 45 },
    ]},
  };

  // ---------- FASE 2 · Histórico de pagamentos de comissão ----------
  readonly historicoComissoes: HistoricoComissaoPagamento[] = [
    { id: 'hc1',  profId: 'p1', periodo: '16–30 de maio',  dataInicio: '2026-05-16', dataFim: '2026-05-30', atendimentos: 22, bruto: 1540, comissao: 770, status: 'pago', dataPagamento: '2026-05-31', formaPagamento: 'pix' },
    { id: 'hc2',  profId: 'p1', periodo: '01–15 de maio',  dataInicio: '2026-05-01', dataFim: '2026-05-15', atendimentos: 19, bruto: 1330, comissao: 665, status: 'pago', dataPagamento: '2026-05-16', formaPagamento: 'pix' },
    { id: 'hc3',  profId: 'p1', periodo: '16–30 de abril', dataInicio: '2026-04-16', dataFim: '2026-04-30', atendimentos: 18, bruto: 1260, comissao: 630, status: 'pago', dataPagamento: '2026-05-01', formaPagamento: 'dinheiro' },
    { id: 'hc4',  profId: 'p1', periodo: '01–15 de abril', dataInicio: '2026-04-01', dataFim: '2026-04-15', atendimentos: 20, bruto: 1400, comissao: 700, status: 'pago', dataPagamento: '2026-04-16', formaPagamento: 'pix' },
    { id: 'hc5',  profId: 'p2', periodo: '16–30 de maio',  dataInicio: '2026-05-16', dataFim: '2026-05-30', atendimentos: 16, bruto: 880,  comissao: 396, status: 'pago', dataPagamento: '2026-05-31', formaPagamento: 'pix' },
    { id: 'hc6',  profId: 'p2', periodo: '01–15 de maio',  dataInicio: '2026-05-01', dataFim: '2026-05-15', atendimentos: 14, bruto: 770,  comissao: 347, status: 'pago', dataPagamento: '2026-05-16', formaPagamento: 'dinheiro' },
    { id: 'hc7',  profId: 'p2', periodo: '16–30 de abril', dataInicio: '2026-04-16', dataFim: '2026-04-30', atendimentos: 15, bruto: 825,  comissao: 371, status: 'pago', dataPagamento: '2026-05-01', formaPagamento: 'pix' },
    { id: 'hc8',  profId: 'p2', periodo: '01–15 de abril', dataInicio: '2026-04-01', dataFim: '2026-04-15', atendimentos: 13, bruto: 715,  comissao: 322, status: 'pago', dataPagamento: '2026-04-16', formaPagamento: 'pix' },
    { id: 'hc9',  profId: 'p3', periodo: '16–30 de maio',  dataInicio: '2026-05-16', dataFim: '2026-05-30', atendimentos: 11, bruto: 660,  comissao: 297, status: 'pago', dataPagamento: '2026-05-31', formaPagamento: 'pix' },
    { id: 'hc10', profId: 'p3', periodo: '01–15 de maio',  dataInicio: '2026-05-01', dataFim: '2026-05-15', atendimentos: 10, bruto: 600,  comissao: 270, status: 'pago', dataPagamento: '2026-05-16', formaPagamento: 'dinheiro' },
    { id: 'hc11', profId: 'p3', periodo: '16–30 de abril', dataInicio: '2026-04-16', dataFim: '2026-04-30', atendimentos: 12, bruto: 720,  comissao: 324, status: 'pago', dataPagamento: '2026-05-01', formaPagamento: 'pix' },
    { id: 'hc12', profId: 'p3', periodo: '01–15 de abril', dataInicio: '2026-04-01', dataFim: '2026-04-15', atendimentos: 9,  bruto: 540,  comissao: 243, status: 'pago', dataPagamento: '2026-04-16', formaPagamento: 'pix' },
    { id: 'hc13', profId: 'p4', periodo: '16–30 de maio',  dataInicio: '2026-05-16', dataFim: '2026-05-30', atendimentos: 10, bruto: 450,  comissao: 180, status: 'pago', dataPagamento: '2026-05-31', formaPagamento: 'dinheiro' },
    { id: 'hc14', profId: 'p4', periodo: '01–15 de maio',  dataInicio: '2026-05-01', dataFim: '2026-05-15', atendimentos: 9,  bruto: 405,  comissao: 162, status: 'pago', dataPagamento: '2026-05-16', formaPagamento: 'pix' },
    { id: 'hc15', profId: 'p4', periodo: '16–30 de abril', dataInicio: '2026-04-16', dataFim: '2026-04-30', atendimentos: 8,  bruto: 360,  comissao: 144, status: 'pago', dataPagamento: '2026-05-01', formaPagamento: 'pix' },
    { id: 'hc16', profId: 'p4', periodo: '01–15 de abril', dataInicio: '2026-04-01', dataFim: '2026-04-15', atendimentos: 11, bruto: 495,  comissao: 198, status: 'pago', dataPagamento: '2026-04-16', formaPagamento: 'dinheiro' },
  ];

  // ---------- FASE 3 · Fidelidade & Marketing ----------
  readonly fidelidade = {
    tipo: 'pontos', meta: 10, recompensa: '1 corte grátis', cashbackPct: 5,
    ativos: 84, resgatados: 23, pontosEmitidos: 1240,
  };
  readonly campanhas: Campanha[] = [
    { id: 'cp1', nome: 'Cliente sumido — volta aí', tipo: 'retorno', alvo: 'Tag: Sumido', publico: 14, enviadas: 14, retorno: 5, taxa: 36, status: 'ativa', cor: 'var(--st-faltou)' },
    { id: 'cp2', nome: 'Feliz aniversário 🎂', tipo: 'aniversario', alvo: 'Aniversariantes do mês', publico: 9, enviadas: 9, retorno: 4, taxa: 44, status: 'ativa', cor: 'var(--st-atendimento)' },
    { id: 'cp3', nome: 'Combo Corte+Barba -20%', tipo: 'promo', alvo: 'Tag: VIP', publico: 32, enviadas: 32, retorno: 11, taxa: 34, status: 'agendada', cor: 'var(--accent)' },
    { id: 'cp4', nome: 'Terça do Degradê', tipo: 'promo', alvo: 'Todos', publico: 210, enviadas: 0, retorno: 0, taxa: 0, status: 'rascunho', cor: 'var(--text-3)' },
  ];
  readonly modelos: Modelo[] = [
    { id: 'md1', nome: 'Confirmação imediata',   desc: 'Confirmação automática ao criar o agendamento',  cat: 'Agendamento', gatilho: 'agendamento_criado',   canal: 'whatsapp', assunto: '', texto: 'Olá {nome_cliente}! Seu horário na {nome_empresa} está confirmado para {data_agendamento} às {hora_agendamento} com {profissional}. Qualquer coisa, é só responder aqui. 💈', status: 'ativo'    },
    { id: 'md2', nome: 'Lembrete véspera',        desc: 'Enviado 1 dia antes do atendimento',             cat: 'Agendamento', gatilho: 'lembrete_agendamento', canal: 'whatsapp', assunto: '', texto: 'Oi {nome_cliente}, passando pra lembrar do seu horário amanhã às {hora_agendamento}. Confirma pra mim? Responda SIM ou NÃO.',                                                            status: 'ativo'    },
    { id: 'md3', nome: 'Retorno (cliente sumido)', desc: 'Para clientes sem visita há 60+ dias',           cat: 'Retenção',   gatilho: 'cliente_inativo',     canal: 'whatsapp', assunto: '', texto: 'E aí {nome_cliente}, sentimos sua falta! Que tal dar um trato no visual? Tem horário essa semana. 😎',                                                                                   status: 'ativo'    },
    { id: 'md4', nome: 'Aniversário',             desc: 'Parabéns com oferta especial no aniversário',    cat: 'Fidelidade',  gatilho: 'aniversario',         canal: 'whatsapp', assunto: '', texto: 'Parabéns, {nome_cliente}! 🎉 Pra comemorar, você tem 20% off no próximo corte. Use o cupom {cupom} até {validade_cupom}. Vem!',                                                       status: 'ativo'    },
  ];

  // ---------- FASE 3 · Relatórios / BI ----------
  readonly relatorio = {
    periodo: 'Junho · 1–9',
    faturamento: 5860, faturamentoAnt: 5120, atendimentos: 96, ticketMedio: 61,
    ocupacao: 72, noShowTaxa: 6.2, noShowQtd: 6, noShowCusto: 320, novos: 12, recorrentes: 84,
    porForma: [
      { forma: 'Pix', valor: 2640, pct: 45 },
      { forma: 'Cartão', valor: 2050, pct: 35 },
      { forma: 'Dinheiro', valor: 1170, pct: 20 },
    ],
    rankingServicos: [
      { srv: 's2', qtd: 31, receita: 2170 },
      { srv: 's1', qtd: 24, receita: 1080 },
      { srv: 's4', qtd: 18, receita: 990 },
      { srv: 's3', qtd: 12, receita: 420 },
      { srv: 's6', qtd: 7, receita: 420 },
    ],
    ocupacaoSemana: [
      { dia: 'Seg', pct: 64 }, { dia: 'Ter', pct: 72 }, { dia: 'Qua', pct: 81 },
      { dia: 'Qui', pct: 78 }, { dia: 'Sex', pct: 92 }, { dia: 'Sáb', pct: 96 }, { dia: 'Dom', pct: 0 },
    ],
    faturamentoSemanal: [4200, 4650, 5120, 4980, 5340, 5510, 5120, 5860],
    faturamentoSemanalLabels: ['Mai 5','Mai 12','Mai 19','Mai 26','Jun 2','Jun 9','Jun 16','Jun 23'],
    metaSemanal: 5000,
    heatmapDias:   ['Seg','Ter','Qua','Qui','Sex','Sáb'],
    heatmapFaixas: ['9h','11h','13h','15h','17h','19h'],
    heatmap: [
      [2, 3, 2, 3, 4, 3],
      [3, 4, 3, 4, 4, 3],
      [1, 2, 1, 2, 3, 2],
      [2, 3, 2, 4, 4, 3],
      [3, 4, 3, 4, 5, 4],
      [4, 5, 4, 5, 5, 3],
    ],
  };

  readonly horarios: string[] = (() => {
    const h: string[] = [];
    for (let i = 8; i <= 18; i++) h.push(`${String(i).padStart(2, '0')}:00`);
    return h;
  })();

  readonly statusLabels: { [k: string]: string } = {
    pendente: 'Pendente', confirmado: 'Confirmado', atendimento: 'Em atendimento',
    concluido: 'Concluído', faltou: 'Faltou', cancelado: 'Cancelado',
  };

  constructor(private api: ApiService) {}

  // ---------- Carga inicial (hidrata os arrays a partir do banco) ----------
  // Chamado por um APP_INITIALIZER em main.ts, antes da UI renderizar.
  // Se a API estiver fora do ar, mantém os dados mock (fallback resiliente).
  async load(): Promise<void> {
    try {
      const b: any = await firstValueFrom(this.api.bootstrap());
      Object.assign(this.estabelecimento, b.estabelecimento);
      Object.assign(this.usuario, b.usuario);
      this.fill(this.expediente, b.horarios);
      this.fill(this.staff, b.staff);
      this.fill(this.servicos, b.servicos);
      this.fill(this.clientes, b.clientes);
      this.fill(this.hoje, b.hoje);
      this.fill(this.agendamentos, b.agendamentos);
      this.refill(this.historico, b.historico);
      Object.assign(this.kpis, b.kpis);
      this.fill(this.produtos, b.produtos);
      this.fill(this.movEstoque, b.movEstoque);
      Object.assign(this.caixa, b.caixa);
      this.fill(this.lancamentos, b.lancamentos);
      this.fill(this.aReceber, b.aReceber);
      if (b.financeiro) Object.assign(this.financeiro, b.financeiro);
      this.refill(this.comissoes, b.comissoes);
      if (b.periodoComissao) this.periodoComissao = b.periodoComissao;
      this.fill(this.historicoComissoes, b.historicoComissoes);
      Object.assign(this.fidelidade, b.fidelidade);
      this.fill(this.campanhas, b.campanhas);
      this.fill(this.modelos, b.modelos);
      if (b.relatorio) Object.assign(this.relatorio, b.relatorio);
    } catch (e) {
      console.warn('[DataService] API indisponível — usando dados mock locais.', e);
    }
  }

  /** substitui o conteúdo de um array preservando a referência */
  private fill<T>(arr: T[], items: T[] | undefined) {
    if (!items) return;
    arr.length = 0;
    arr.push(...items);
  }
  /** substitui as chaves de um objeto-mapa preservando a referência */
  private refill(obj: any, src: any) {
    if (!src) return;
    for (const k of Object.keys(obj)) delete obj[k];
    Object.assign(obj, src);
  }

  /** persiste os dados do estabelecimento (Configurações › Estabelecimento) */
  updateEstabelecimento(changes: Record<string, any>) {
    Object.assign(this.estabelecimento, changes);
    this.api.put('/estabelecimento', changes).subscribe({ error: () => {} });
  }

  /** persiste o horário de funcionamento (Configurações › Horários) */
  updateHorarios(dias: { diaSemana: number; aberto: boolean; inicio: string; fim: string; pausaInicio: string | null; pausaFim: string | null }[]) {
    this.api.put('/horarios', { dias }).subscribe({ error: () => {} });
  }

  updateServico(id: string, changes: Partial<Servico>) {
    const s = this.servicos.find(s => s.id === id);
    if (s) Object.assign(s, changes);
    this.api.put('/servicos/' + id, changes).subscribe({ error: () => {} });
  }

  addServico(servico: Omit<Servico, 'id'>) {
    const novo = { ...servico, id: 'sn' + Date.now() } as Servico;
    this.servicos.push(novo);
    this.api.post('/servicos', novo).subscribe({ error: () => {} });
  }

  updateStaff(id: string, changes: Partial<Staff>) {
    const p = this.staff.find(p => p.id === id);
    if (p) Object.assign(p, changes);
    this.api.put('/profissionais/' + id, changes).subscribe({ error: () => {} });
  }

  addStaff(staff: Omit<Staff, 'id' | 'vendido'>) {
    const novo = { ...staff, id: 'pn' + Date.now(), vendido: 0 } as Staff;
    this.staff.push(novo);
    this.api.post('/profissionais', novo).subscribe({ error: () => {} });
  }

  updateCampanha(id: string, changes: Partial<Campanha>) {
    const c = this.campanhas.find(c => c.id === id);
    if (c) Object.assign(c, changes);
    this.api.put('/campanhas/' + id, changes).subscribe({ error: () => {} });
  }

  addModelo(m: Omit<Modelo, 'id'>) {
    const novo = { ...m, id: 'mdn' + Date.now() } as Modelo;
    this.modelos.push(novo);
    this.api.post('/modelos', novo).subscribe({ error: () => {} });
  }

  updateModelo(id: string, changes: Partial<Modelo>) {
    const m = this.modelos.find(m => m.id === id);
    if (m) Object.assign(m, changes);
    this.api.put('/modelos/' + id, changes).subscribe({ error: () => {} });
  }

  removeModelo(id: string) {
    const idx = this.modelos.findIndex(m => m.id === id);
    if (idx >= 0) this.modelos.splice(idx, 1);
  }

  addCampanha(c: Omit<Campanha, 'id' | 'enviadas' | 'retorno' | 'taxa'>) {
    const novo = { ...c, id: 'cpn' + Date.now(), enviadas: 0, retorno: 0, taxa: 0 } as Campanha;
    this.campanhas.push(novo);
    this.api.post('/campanhas', novo).subscribe({ error: () => {} });
  }

  updateProduto(id: string, changes: Partial<Produto>) {
    const p = this.produtos.find(p => p.id === id);
    if (p) Object.assign(p, changes);
    this.api.put('/produtos/' + id, changes).subscribe({ error: () => {} });
  }

  addProduto(p: Omit<Produto, 'id'>) {
    const novo = { ...p, id: 'prn' + Date.now() } as Produto;
    this.produtos.push(novo);
    this.api.post('/produtos', novo).subscribe({ error: () => {} });
  }

  registrarMov(prod: string, tipo: 'entrada' | 'saida', qtd: number, motivo: string) {
    const now = new Date();
    const data = now.toISOString().slice(0, 10);
    const hora = now.toTimeString().slice(0, 5);
    const id = 'mn' + Date.now();
    this.movEstoque.push({ id, prod, tipo, qtd, motivo, data, hora });
    const p = this.produtos.find(p => p.id === prod);
    if (p) p.qtd = tipo === 'entrada' ? p.qtd + qtd : Math.max(0, p.qtd - qtd);
    this.api.post('/movimentacoes', { id, prod, tipo, qtd, motivo }).subscribe({ error: () => {} });
  }

  get produtosAlerta(): Produto[] {
    return this.produtos.filter(p => p.qtd <= p.min);
  }

  faturamentoSparkline(): number[] {
    return this.financeiro.fluxo.map(f => f.rec);
  }

  ticketMedioHoje(): number {
    const concluidos = this.hoje.filter(a => a.status === 'concluido');
    if (!concluidos.length) return 0;
    const receita = concluidos.reduce((s, a) => s + (this.srv(a.srv)?.preco ?? 0), 0);
    return Math.round(receita / concluidos.length);
  }

  agendamentosHojeBreakdown(): { feitos: number; aFazer: number; pendentes: number } {
    return {
      feitos: this.hoje.filter(a => a.status === 'concluido' || a.status === 'atendimento').length,
      aFazer: this.hoje.filter(a => a.status === 'confirmado').length,
      pendentes: this.hoje.filter(a => a.status === 'pendente').length,
    };
  }

  metaMes(): { vendido: number; meta: number; pct: number; projecao: number; bateu: boolean } {
    const vendido = this.financeiro.mes.receita;
    const meta = this.staff.reduce((s, p) => s + p.meta, 0);
    const pct = meta ? Math.round(vendido / meta * 100) : 0;
    const diaDoMes = 9;
    const diasNoMes = 30;
    const projecao = Math.round(vendido / diaDoMes * diasNoMes);
    return { vendido, meta, pct, projecao, bateu: projecao >= meta };
  }

  ocupacaoPorHora(): { hora: string; pct: number }[] {
    const profAtivos = this.staff.length;
    return this.horarios.map(hora => {
      const appts = this.hoje.filter(a =>
        a.ini === hora && ['confirmado', 'pendente', 'atendimento', 'concluido'].includes(a.status)
      );
      return { hora, pct: profAtivos ? Math.round(appts.length / profAtivos * 100) : 0 };
    });
  }

  desempenhoHoje(): { prof: Staff; atend: number; receita: number }[] {
    return this.staff.map(prof => {
      const appts = this.hoje.filter(a => a.prof === prof.id && ['concluido','atendimento'].includes(a.status));
      const receita = appts.reduce((s, a) => s + (this.srv(a.srv)?.preco ?? 0), 0);
      return { prof, atend: appts.length, receita };
    }).sort((a, b) => b.receita - a.receita);
  }

  projecaoMes(): number {
    const diaDoMes = 9;
    const diasNoMes = 30;
    return Math.round(this.financeiro.mes.receita / diaDoMes * diasNoMes);
  }

  taxaRetorno(): number {
    const total = this.relatorio.novos + this.relatorio.recorrentes;
    return total ? Math.round(this.relatorio.recorrentes / total * 100) : 0;
  }

  metasEquipe(): { prof: Staff; pct: number }[] {
    return this.staff
      .map(p => ({ prof: p, pct: p.meta ? Math.round(p.vendido / p.meta * 100) : 0 }))
      .sort((a, b) => b.pct - a.pct);
  }

  clientesEmRisco(): Cliente[] {
    return this.clientes
      .filter(c => c.tags.includes('sumido') || this.diasDesde(c.ultima) > 60)
      .sort((a, b) => b.total - a.total);
  }

  get comissoesAPagar(): number {
    return this.staff.reduce((total, s) => {
      const comissao = this.comissoes[s.id];
      if (!comissao || comissao.status === 'pago') return total;
      const base = comissao.itens.reduce((sum, i) => sum + i.valor, 0);
      return total + Math.round(base * s.comissao / 100);
    }, 0);
  }

  updateAppt(id: string, changes: { ini?: string; prof?: string }) {
    const a = this.hoje.find(a => a.id === id);
    if (a) Object.assign(a, changes);
    const ag = this.agendamentos.find(a => a.id === id);
    if (ag) {
      if (changes.ini) ag.hora = changes.ini;
      if (changes.prof) ag.prof = changes.prof;
    }
    this.api.put('/agendamentos/' + id, changes).subscribe({ error: () => {} });
  }

  /** muda o status de um agendamento (na timeline de hoje e na lista) e persiste */
  setApptStatus(id: string, status: string) {
    const a = this.hoje.find(a => a.id === id);
    if (a) a.status = status;
    const ag = this.agendamentos.find(a => a.id === id);
    if (ag) ag.status = status;
    this.api.put('/agendamentos/' + id, { status }).subscribe({ error: () => {} });
  }

  addCliente(c: Omit<Cliente, 'id'>) {
    const novo = { ...c, id: 'cn' + Date.now() } as Cliente;
    this.clientes.push(novo);
    this.api.post('/clientes', novo).subscribe({ error: () => {} });
  }

  /** persiste um novo agendamento criado pela UI */
  persistAppt(a: Partial<Appt> & { id: string }) {
    const s = a.srv ? this.servicos.find(x => x.id === a.srv) : null;
    this.api.post('/agendamentos', {
      id: a.id, cli: a.cli, srv: a.srv, prof: a.prof, ini: a.ini,
      status: a.status || 'confirmado', sinal: !!a.sinal,
      valor: s ? s.preco : 0, _dur: s ? s.dur : 30,
    }).subscribe({ error: () => {} });
  }

  // ---------- helpers ----------
  prod = (id: string) => this.produtos.find(p => p.id === id)!;
  srv = (id: string) => this.servicos.find(s => s.id === id)!;
  cli = (id: string) => this.clientes.find(c => c.id === id)!;
  prof = (id: string) => this.staff.find(p => p.id === id)!;
  money = (n: number) => 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 0 });
  money2 = (n: number) => 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  initials = (nome: string) => nome.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  fromMin = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  fmtData = (iso: string) => { const [, m, d] = iso.split('-'); return `${d}/${m}`; };
  fmtDataFull = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y.slice(2)}`; };
  diasDesde = (iso: string) => Math.round((+new Date('2026-06-09') - +new Date(iso)) / 86400000);
}
