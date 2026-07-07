/* ============================================================
   Exportação de relatórios (PDF, CSV, XLSX)
   Gera arquivos client-side a partir dos dados hidratados no
   DataService (janela filtrada por período: semana/mes/ano).
   ============================================================ */
import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { DataService } from './data.service';

export type Periodo = 'semana' | 'mes' | 'ano';
export type Formato = 'pdf' | 'csv' | 'xlsx';
export type ColType = 'text' | 'money' | 'money2' | 'date' | 'time' | 'datetime' | 'number' | 'percent';

export interface ReciboInput {
  estabelecimento: string;
  profissional: { nome: string; comissao: number };
  periodo: string;
  status: 'pago' | 'aberto';
  itens: { data: string; cliente: string; servico: string; valor: number; comissao: number }[];
  totalBruto: number;
  totalComissao: number;
  usuarioNome: string;
}

export interface Coluna {
  header: string;
  key: string;
  type?: ColType;
  width?: number;       // largura sugerida (em caracteres)
  align?: 'left' | 'right' | 'center';
}

export interface Dataset {
  title: string;               // "Agendamentos"
  subtitle?: string;           // linha extra opcional
  periodo: string;             // rótulo "Semana · 29 jun – 5 jul"
  slug: string;                // usado no nome do arquivo
  columns: Coluna[];
  rows: any[];                 // objetos com as chaves das colunas
  summary?: { label: string; value: string }[];
  /** planilhas extras (XLSX) — opcional; por padrão gera uma só com `rows` */
  sheets?: { name: string; columns: Coluna[]; rows: any[] }[];
}

@Injectable({ providedIn: 'root' })
export class ExportService {
  constructor(private data: DataService) {}

  // ------------------------------------------------------------
  // Ponto de entrada
  // ------------------------------------------------------------
  async export(reportId: string, formato: Formato, periodo: Periodo, usuarioNome: string): Promise<{ arquivo: string; linhas: number }> {
    const ds = this.buildDataset(reportId, periodo);
    if (!ds.rows.length && !(ds.sheets && ds.sheets.some(s => s.rows.length))) {
      throw new Error('Sem dados no período selecionado — nada a exportar.');
    }
    const stamp = this.stamp();
    const arquivo = `${ds.slug}-${periodo}-${stamp}.${formato}`;
    switch (formato) {
      case 'pdf':  this.gerarPdf(ds, arquivo, usuarioNome); break;
      case 'csv':  this.gerarCsv(ds, arquivo); break;
      case 'xlsx': this.gerarXlsx(ds, arquivo); break;
    }
    return { arquivo, linhas: this.contarLinhas(ds) };
  }

  private contarLinhas(ds: Dataset): number {
    if (ds.sheets && ds.sheets.length) return ds.sheets.reduce((s, sh) => s + sh.rows.length, 0);
    return ds.rows.length;
  }

  // ------------------------------------------------------------
  // Datas / período — janela de filtro reutilizada por todos os
  // datasets que fazem sentido em janela temporal.
  // ------------------------------------------------------------
  periodRange(periodo: Periodo): { ini: string; fim: string; label: string } {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const y = t.getFullYear(), m = t.getMonth();
    if (periodo === 'semana') {
      const dow = t.getDay();
      const back = dow === 0 ? 6 : dow - 1;
      const ini = new Date(t); ini.setDate(t.getDate() - back);
      const fim = new Date(ini); fim.setDate(ini.getDate() + 6);
      return {
        ini: this.iso(ini), fim: this.iso(fim),
        label: `Semana · ${ini.getDate()} ${MES_ABR[ini.getMonth()]} – ${fim.getDate()} ${MES_ABR[fim.getMonth()]} ${fim.getFullYear()}`,
      };
    }
    if (periodo === 'ano') {
      return {
        ini: `${y}-01-01`, fim: `${y}-12-31`,
        label: `Ano · ${y}`,
      };
    }
    const ini = new Date(y, m, 1);
    const fim = new Date(y, m + 1, 0);
    return {
      ini: this.iso(ini), fim: this.iso(fim),
      label: `${cap(MES_FULL[m])} · ${y}`,
    };
  }

  private iso(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  private stamp(): string {
    const d = new Date();
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  }

  // ------------------------------------------------------------
  // Formatação de células — mesma para PDF/CSV/XLSX
  // ------------------------------------------------------------
  private fmt(v: any, type?: ColType): string {
    if (v === null || v === undefined || v === '') return '';
    switch (type) {
      case 'money':    return fmtMoney(Number(v));
      case 'money2':   return fmtMoney2(Number(v));
      case 'date':     return fmtDate(String(v));
      case 'time':     return fmtTime(String(v));
      case 'datetime': return fmtDate(String(v).slice(0, 10)) + ' ' + fmtTime(String(v).slice(11));
      case 'percent':  return `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%`;
      case 'number':   return Number(v).toLocaleString('pt-BR');
      default:         return String(v);
    }
  }

  // ------------------------------------------------------------
  // Recibo de comissão (portrait, formato próprio) — usado pela
  // tela de Comissões. Baixa direto e devolve o nome do arquivo.
  // ------------------------------------------------------------
  exportarRecibo(input: ReciboInput): string {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const margin = 40;

    // ---- cabeçalho ----
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, W, 70, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(input.estabelecimento || 'Recibo', margin, 32);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('Recibo de comissão', margin, 52);

    doc.setFontSize(9);
    const dataGer = fmtDateLong(new Date());
    doc.text(`Gerado ${dataGer}`, W - margin, 32, { align: 'right' });
    doc.text(`por ${input.usuarioNome}`, W - margin, 46, { align: 'right' });

    // ---- caixa do profissional ----
    let y = 96;
    doc.setFillColor(245, 245, 250);
    doc.roundedRect(margin, y, W - margin * 2, 60, 6, 6, 'F');
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(input.profissional.nome, margin + 16, y + 24);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(110, 110, 110);
    doc.text(
      `Comissão de ${input.profissional.comissao}%  ·  ${input.itens.length} atendimento${input.itens.length === 1 ? '' : 's'}  ·  ${input.periodo}`,
      margin + 16, y + 44,
    );

    // pill de status à direita
    const pago = input.status === 'pago';
    const statusTxt = pago ? 'PAGO' : 'EM ABERTO';
    const rgb = pago ? [22, 163, 74] : [217, 119, 6];
    const pillW = pago ? 60 : 82;
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.roundedRect(W - margin - pillW - 8, y + 18, pillW, 22, 11, 11, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(statusTxt, W - margin - 8 - pillW / 2, y + 33, { align: 'center' });

    y += 80;

    // ---- tabela de itens ----
    autoTable(doc, {
      startY: y,
      head: [['Data', 'Cliente', 'Serviço', 'Valor', 'Comissão']],
      body: input.itens.map(i => [
        fmtDate(i.data), i.cliente, i.servico, fmtMoney(i.valor), fmtMoney(i.comissao),
      ]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [246, 245, 242] },
      columnStyles: {
        0: { cellWidth: 62 },
        3: { halign: 'right' },
        4: { halign: 'right', fontStyle: 'bold' },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 20;

    // ---- caixa de total ----
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(margin, y, W - margin * 2, 56, 6, 6, 'F');
    doc.setTextColor(21, 128, 61);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Total a receber', margin + 16, y + 24);
    doc.setFontSize(18);
    doc.text(fmtMoney(input.totalComissao), W - margin - 16, y + 34, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Sobre ${fmtMoney(input.totalBruto)} em atendimentos`, margin + 16, y + 42);
    y += 90;

    // ---- assinaturas ----
    const sigW = (W - margin * 2 - 40) / 2;
    doc.setDrawColor(160, 160, 160);
    doc.line(margin, y, margin + sigW, y);
    doc.line(margin + sigW + 40, y, W - margin, y);
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    doc.text(`Recebido — ${input.profissional.nome}`, margin, y + 14);
    doc.text('Autorizado', margin + sigW + 40, y + 14);

    // ---- rodapé ----
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`${input.estabelecimento || ''} · Recibo gerado ${dataGer}`, W / 2, H - 20, { align: 'center' });

    const slug = (input.profissional.nome || 'profissional')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const arquivo = `recibo-${slug}-${this.stamp()}.pdf`;
    doc.save(arquivo);
    return arquivo;
  }

  // ------------------------------------------------------------
  // Geração PDF (jsPDF + autotable)
  // ------------------------------------------------------------
  private gerarPdf(ds: Dataset, arquivo: string, usuarioNome: string) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const margin = 32;

    // ---- cabeçalho ----
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, W, 60, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(this.data.estabelecimento.nome || 'Relatório', margin, 26);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(ds.title, margin, 44);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    const stampTxt = `Gerado ${fmtDateLong(new Date())} · ${usuarioNome}`;
    doc.text(stampTxt, W - margin, 26, { align: 'right' });
    doc.setFontSize(10);
    doc.text(ds.periodo, W - margin, 44, { align: 'right' });

    // ---- subtítulo ----
    let y = 80;
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(ds.title, margin, y);
    if (ds.subtitle) {
      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(110, 110, 110);
      doc.text(ds.subtitle, margin, y);
    }
    y += 12;

    // ---- summary (KPIs) ----
    if (ds.summary && ds.summary.length) {
      y += 6;
      const boxW = (W - margin * 2 - (ds.summary.length - 1) * 8) / ds.summary.length;
      ds.summary.forEach((kpi, i) => {
        const x = margin + i * (boxW + 8);
        doc.setFillColor(245, 245, 250);
        doc.roundedRect(x, y, boxW, 44, 4, 4, 'F');
        doc.setFontSize(9); doc.setTextColor(110, 110, 110); doc.setFont('helvetica', 'normal');
        doc.text(kpi.label, x + 10, y + 16);
        doc.setFontSize(13); doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'bold');
        doc.text(kpi.value, x + 10, y + 33);
      });
      y += 60;
    }

    // ---- planilhas (uma tabela por sheet, ou uma única) ----
    const sheets = ds.sheets && ds.sheets.length ? ds.sheets : [{ name: ds.title, columns: ds.columns, rows: ds.rows }];
    for (const sh of sheets) {
      if (sheets.length > 1) {
        doc.setFontSize(11); doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'bold');
        doc.text(sh.name, margin, y);
        y += 12;
      }
      autoTable(doc, {
        startY: y,
        head: [sh.columns.map(c => c.header)],
        body: sh.rows.map(r => sh.columns.map(c => this.fmt(r[c.key], c.type))),
        margin: { left: margin, right: margin },
        styles: { fontSize: 8.5, cellPadding: 4, overflow: 'linebreak' },
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [246, 245, 242] },
        columnStyles: sh.columns.reduce((acc: any, c, i) => {
          const money = c.type === 'money' || c.type === 'money2' || c.type === 'percent' || c.type === 'number';
          acc[i] = { halign: c.align || (money ? 'right' : 'left') };
          if (c.width) acc[i].cellWidth = c.width * 6;
          return acc;
        }, {}),
        didDrawPage: (d) => {
          const p = doc.internal.pages.length - 1;
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(`Página ${p}`, W - margin, doc.internal.pageSize.getHeight() - 12, { align: 'right' });
        },
      });
      y = (doc as any).lastAutoTable.finalY + 18;
    }

    doc.save(arquivo);
  }

  // ------------------------------------------------------------
  // Geração CSV
  // ------------------------------------------------------------
  private gerarCsv(ds: Dataset, arquivo: string) {
    const sep = ';';                       // Excel PT-BR abre corretamente
    const linhas: string[] = [];

    linhas.push([ds.title, ds.periodo].map(csvEscape).join(sep));
    linhas.push('');

    const sheets = ds.sheets && ds.sheets.length ? ds.sheets : [{ name: ds.title, columns: ds.columns, rows: ds.rows }];
    for (const sh of sheets) {
      if (sheets.length > 1) linhas.push(csvEscape(sh.name));
      linhas.push(sh.columns.map(c => csvEscape(c.header)).join(sep));
      for (const r of sh.rows) linhas.push(sh.columns.map(c => csvEscape(this.fmt(r[c.key], c.type))).join(sep));
      linhas.push('');
    }

    if (ds.summary && ds.summary.length) {
      linhas.push('Resumo');
      for (const s of ds.summary) linhas.push([csvEscape(s.label), csvEscape(s.value)].join(sep));
    }

    // BOM UTF-8 para o Excel reconhecer o encoding.
    const blob = new Blob(['﻿' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, arquivo);
  }

  // ------------------------------------------------------------
  // Geração XLSX (SheetJS)
  // ------------------------------------------------------------
  private gerarXlsx(ds: Dataset, arquivo: string) {
    const wb = XLSX.utils.book_new();
    const sheets = ds.sheets && ds.sheets.length ? ds.sheets : [{ name: ds.title, columns: ds.columns, rows: ds.rows }];

    sheets.forEach((sh, idx) => {
      const header = sh.columns.map(c => c.header);
      const body = sh.rows.map(r => sh.columns.map(c => xlsxCell(r[c.key], c.type)));
      // Cabeçalho contextual em cima
      const meta: any[][] = [
        [ds.title, '', '', ds.periodo],
        [`Gerado em ${fmtDateLong(new Date())}`, '', '', ''],
        [],
      ];
      const ws = XLSX.utils.aoa_to_sheet([...meta, header, ...body]);

      // Larguras de coluna
      ws['!cols'] = sh.columns.map(c => ({ wch: c.width || autoWidth(c, sh.rows) }));

      // Formatação numérica para colunas de dinheiro/percent
      const dataStartRow = meta.length + 1;                    // 0-based: linha do primeiro registro
      sh.columns.forEach((c, colIdx) => {
        const format = fmtCode(c.type);
        if (!format) return;
        for (let r = 0; r < body.length; r++) {
          const addr = XLSX.utils.encode_cell({ r: dataStartRow + r, c: colIdx });
          const cell = ws[addr];
          if (cell) cell.z = format;
        }
      });

      // Estilo simples: negrito no header (linha meta.length)
      const range = XLSX.utils.decode_range(ws['!ref']!);
      const headerRow = meta.length;
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r: headerRow, c });
        if (ws[addr]) ws[addr].s = { font: { bold: true } };
      }

      const nome = safeSheetName(sh.name || `Aba ${idx + 1}`);
      XLSX.utils.book_append_sheet(wb, ws, nome);
    });

    // Sheet de resumo (se houver)
    if (ds.summary && ds.summary.length) {
      const aoa: any[][] = [['Métrica', 'Valor'], ...ds.summary.map(s => [s.label, s.value])];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = [{ wch: 36 }, { wch: 22 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Resumo');
    }

    XLSX.writeFile(wb, arquivo);
  }

  // ============================================================
  // Datasets por relatório
  // ============================================================
  buildDataset(reportId: string, periodo: Periodo): Dataset {
    const { ini, fim, label } = this.periodRange(periodo);
    switch (reportId) {
      case 'r1':  return this.dsAgendamentos(ini, fim, label);
      case 'r2':  return this.dsCancelFaltas(ini, fim, label);
      case 'r3':  return this.dsOcupacao(ini, fim, label, periodo);
      case 'r4':  return this.dsClientes(label);
      case 'r5':  return this.dsClientesInativos(label);
      case 'r6':  return this.dsAniversariantes(ini, fim, label, periodo);
      case 'r7':  return this.dsFinanceiro(ini, fim, label);
      case 'r8':  return this.dsLancamentos(ini, fim, label);
      case 'r9':  return this.dsContasReceber(label);
      case 'r10': return this.dsFormasPagamento(ini, fim, label);
      case 'r11': return this.dsVendasProdutos(ini, fim, label);
      case 'r12': return this.dsRankingServicos(ini, fim, label);
      case 'r13': return this.dsEstoque(label);
      case 'r14': return this.dsMovEstoque(ini, fim, label);
      case 'r15': return this.dsDesempenhoProf(ini, fim, label);
      case 'r16': return this.dsComissoes(ini, fim, label);
      case 'r17': return this.dsEquipe(label);
      case 'r18': return this.dsCampanhas(label);
      case 'r19': return this.dsFidelidade(label);
      case 'r20': return this.dsGerencial(ini, fim, label);
      default: throw new Error(`Relatório desconhecido: ${reportId}`);
    }
  }

  // Helpers locais para ler nomes com fallback caso o cadastro tenha sumido.
  private nomeCli = (id: string) => this.data.clientes.find(c => c.id === id)?.nome || '—';
  private nomeSrv = (id: string) => this.data.servicos.find(s => s.id === id)?.nome || '—';
  private catSrv  = (id: string) => this.data.servicos.find(s => s.id === id)?.cat  || '';
  private nomeProf = (id: string) => this.data.staff.find(p => p.id === id)?.nome || '—';
  private profBy = (id: string) => this.data.staff.find(p => p.id === id);
  private inRange = (d: string, ini: string, fim: string) => d >= ini && d <= fim;

  // --- r1 ---
  private dsAgendamentos(ini: string, fim: string, label: string): Dataset {
    const rows = this.data.agendamentos
      .filter(a => this.inRange(a.data, ini, fim))
      .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))
      .map(a => ({
        data: a.data, hora: a.hora,
        cliente: this.nomeCli(a.cli),
        servico: this.nomeSrv(a.srv),
        profissional: this.nomeProf(a.prof),
        status: this.data.statusLabels[a.status] || a.status,
        valor: a.valor,
      }));
    const total = rows.reduce((s, r) => s + Number(r.valor), 0);
    return {
      title: 'Agendamentos', slug: 'agendamentos', periodo: label,
      columns: [
        { header: 'Data', key: 'data', type: 'date', width: 12 },
        { header: 'Hora', key: 'hora', type: 'time', width: 8 },
        { header: 'Cliente', key: 'cliente', width: 22 },
        { header: 'Serviço', key: 'servico', width: 22 },
        { header: 'Profissional', key: 'profissional', width: 16 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Valor', key: 'valor', type: 'money', width: 12 },
      ],
      rows,
      summary: [
        { label: 'Total de agendamentos', value: String(rows.length) },
        { label: 'Valor bruto no período', value: fmtMoney(total) },
      ],
    };
  }

  // --- r2 ---
  private dsCancelFaltas(ini: string, fim: string, label: string): Dataset {
    const rows = this.data.agendamentos
      .filter(a => this.inRange(a.data, ini, fim) && (a.status === 'cancelado' || a.status === 'faltou'))
      .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))
      .map(a => ({
        data: a.data, hora: a.hora,
        cliente: this.nomeCli(a.cli), servico: this.nomeSrv(a.srv),
        profissional: this.nomeProf(a.prof),
        motivo: this.data.statusLabels[a.status] || a.status,
        perda: a.valor,
      }));
    const perda = rows.reduce((s, r) => s + Number(r.perda), 0);
    const faltas = rows.filter(r => r.motivo === 'Faltou').length;
    const cancel = rows.filter(r => r.motivo === 'Cancelado').length;
    return {
      title: 'Cancelamentos & Faltas', slug: 'cancelamentos-faltas', periodo: label,
      columns: [
        { header: 'Data', key: 'data', type: 'date' },
        { header: 'Hora', key: 'hora', type: 'time' },
        { header: 'Cliente', key: 'cliente' },
        { header: 'Serviço', key: 'servico' },
        { header: 'Profissional', key: 'profissional' },
        { header: 'Motivo', key: 'motivo' },
        { header: 'Perda', key: 'perda', type: 'money' },
      ],
      rows,
      summary: [
        { label: 'Total de faltas', value: String(faltas) },
        { label: 'Total de cancelamentos', value: String(cancel) },
        { label: 'Receita perdida', value: fmtMoney(perda) },
      ],
    };
  }

  // --- r3 ---
  private dsOcupacao(ini: string, fim: string, label: string, periodo: Periodo): Dataset {
    const iniD = new Date(ini + 'T00:00:00'), fimD = new Date(fim + 'T00:00:00');
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const fimReal = fimD.getTime() > hoje.getTime() ? hoje : fimD;
    const rows: any[] = [];
    const ativos = new Set(['concluido', 'atendimento', 'confirmado', 'pendente']);
    for (let t = iniD.getTime(); t <= fimReal.getTime(); t += 86_400_000) {
      const d = new Date(t);
      const dow = d.getDay();
      const diaTxt = DIAS_TXT[dow];
      const iso = this.iso(d);
      let capMin = 0;
      for (const p of this.data.staff) {
        if (p.folga.includes(diaTxt)) continue;
        capMin += this.data.toMin(p.fim) - this.data.toMin(p.inicio);
      }
      const vendMin = this.data.agendamentos
        .filter(a => a.data === iso && ativos.has(a.status))
        .reduce((s, a) => s + (this.data.servicos.find(x => x.id === a.srv)?.dur || 30), 0);
      rows.push({
        data: iso, dia: DIAS_LBL[dow],
        capacidade: Math.round(capMin / 60 * 10) / 10,       // horas
        vendido: Math.round(vendMin / 60 * 10) / 10,
        ocupacao: capMin ? Math.round(vendMin / capMin * 100) : 0,
      });
    }
    const totalCap = rows.reduce((s, r) => s + r.capacidade, 0);
    const totalVen = rows.reduce((s, r) => s + r.vendido, 0);
    const ocMedia = totalCap ? Math.round(totalVen / totalCap * 100) : 0;
    return {
      title: 'Ocupação da Agenda', slug: 'ocupacao-agenda', periodo: label,
      subtitle: 'Horas vendidas × capacidade disponível',
      columns: [
        { header: 'Data', key: 'data', type: 'date' },
        { header: 'Dia', key: 'dia' },
        { header: 'Capacidade (h)', key: 'capacidade', type: 'number' },
        { header: 'Vendido (h)', key: 'vendido', type: 'number' },
        { header: 'Ocupação', key: 'ocupacao', type: 'percent' },
      ],
      rows,
      summary: [
        { label: 'Dias no período', value: String(rows.length) },
        { label: 'Capacidade total (h)', value: totalCap.toLocaleString('pt-BR') },
        { label: 'Horas vendidas', value: totalVen.toLocaleString('pt-BR') },
        { label: 'Ocupação média', value: `${ocMedia}%` },
      ],
    };
  }

  // --- r4 ---
  private dsClientes(label: string): Dataset {
    const rows = this.data.clientes.map(c => ({
      nome: c.nome, whatsapp: c.wpp, email: c.email,
      nascimento: c.nasc, tags: c.tags.join(', '),
      visitas: c.visitas, ticket: c.ticket, total: c.total,
      ultima: c.ultima, frequencia: c.freq,
    }));
    return {
      title: 'Base de clientes', slug: 'clientes', periodo: label,
      columns: [
        { header: 'Nome', key: 'nome', width: 24 },
        { header: 'WhatsApp', key: 'whatsapp', width: 16 },
        { header: 'E-mail', key: 'email', width: 24 },
        { header: 'Nascimento', key: 'nascimento', type: 'date' },
        { header: 'Tags', key: 'tags', width: 16 },
        { header: 'Visitas', key: 'visitas', type: 'number' },
        { header: 'Ticket médio', key: 'ticket', type: 'money' },
        { header: 'Total gasto', key: 'total', type: 'money' },
        { header: 'Última visita', key: 'ultima', type: 'date' },
        { header: 'Frequência (dias)', key: 'frequencia', type: 'number' },
      ],
      rows,
      summary: [
        { label: 'Total de clientes', value: String(rows.length) },
        { label: 'VIPs', value: String(this.data.clientes.filter(c => c.tags.includes('vip')).length) },
      ],
    };
  }

  // --- r5 ---
  private dsClientesInativos(label: string): Dataset {
    const rows = this.data.clientes
      .filter(c => c.tags.includes('sumido') || this.data.diasDesde(c.ultima) > 60)
      .sort((a, b) => b.total - a.total)
      .map(c => ({
        nome: c.nome, whatsapp: c.wpp,
        ultima: c.ultima,
        dias: this.data.diasDesde(c.ultima),
        total: c.total, visitas: c.visitas, tags: c.tags.join(', '),
      }));
    return {
      title: 'Clientes inativos', slug: 'clientes-inativos', periodo: label,
      subtitle: 'Base com +60 dias sem retorno',
      columns: [
        { header: 'Nome', key: 'nome', width: 24 },
        { header: 'WhatsApp', key: 'whatsapp' },
        { header: 'Última visita', key: 'ultima', type: 'date' },
        { header: 'Dias parado', key: 'dias', type: 'number' },
        { header: 'Total gasto', key: 'total', type: 'money' },
        { header: 'Visitas', key: 'visitas', type: 'number' },
        { header: 'Tags', key: 'tags' },
      ],
      rows,
      summary: [{ label: 'Clientes em risco', value: String(rows.length) }],
    };
  }

  // --- r6 ---
  private dsAniversariantes(ini: string, fim: string, label: string, periodo: Periodo): Dataset {
    // filtra por MM-DD dentro do intervalo (ignora ano do nascimento)
    const iniMD = ini.slice(5), fimMD = fim.slice(5);
    const between = (md: string) => periodo === 'ano' ? true : (md >= iniMD && md <= fimMD);
    const hoje = new Date();
    const rows = this.data.clientes
      .filter(c => c.nasc && between(c.nasc.slice(5)))
      .map(c => {
        const idade = c.nasc ? hoje.getFullYear() - Number(c.nasc.slice(0, 4)) : 0;
        return {
          nome: c.nome, nasc_md: c.nasc?.slice(5) ? `${c.nasc.slice(8, 10)}/${c.nasc.slice(5, 7)}` : '',
          idade, whatsapp: c.wpp,
          ultima: c.ultima, total: c.total,
        };
      })
      .sort((a, b) => a.nasc_md.localeCompare(b.nasc_md));
    return {
      title: 'Aniversariantes', slug: 'aniversariantes', periodo: label,
      columns: [
        { header: 'Nome', key: 'nome', width: 24 },
        { header: 'Aniversário', key: 'nasc_md', width: 12 },
        { header: 'Idade', key: 'idade', type: 'number' },
        { header: 'WhatsApp', key: 'whatsapp' },
        { header: 'Última visita', key: 'ultima', type: 'date' },
        { header: 'Total gasto', key: 'total', type: 'money' },
      ],
      rows,
      summary: [{ label: 'Aniversariantes no período', value: String(rows.length) }],
    };
  }

  // --- r7 ---
  private dsFinanceiro(ini: string, fim: string, label: string): Dataset {
    const lancs = this.data.lancamentos.filter(l => this.inRange(l.data, ini, fim));
    const catMap: Record<string, { categoria: string; tipo: string; valor: number; qtd: number }> = {};
    for (const l of lancs) {
      const k = `${l.tipo}|${l.cat}`;
      (catMap[k] ||= { categoria: l.cat, tipo: l.tipo === 'receita' ? 'Receita' : 'Despesa', valor: 0, qtd: 0 });
      catMap[k].valor += l.valor;
      catMap[k].qtd++;
    }
    const rows = Object.values(catMap)
      .sort((a, b) => (b.tipo === 'Receita' ? 1 : -1) - (a.tipo === 'Receita' ? 1 : -1) || b.valor - a.valor);
    const rec = lancs.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0);
    const desp = lancs.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0);
    return {
      title: 'Financeiro consolidado', slug: 'financeiro', periodo: label,
      subtitle: 'DRE simplificado',
      columns: [
        { header: 'Tipo', key: 'tipo' },
        { header: 'Categoria', key: 'categoria', width: 22 },
        { header: 'Qtd', key: 'qtd', type: 'number' },
        { header: 'Valor', key: 'valor', type: 'money2' },
      ],
      rows,
      summary: [
        { label: 'Receita', value: fmtMoney2(rec) },
        { label: 'Despesa', value: fmtMoney2(desp) },
        { label: 'Resultado', value: fmtMoney2(rec - desp) },
      ],
    };
  }

  // --- r8 ---
  private dsLancamentos(ini: string, fim: string, label: string): Dataset {
    const rows = this.data.lancamentos
      .filter(l => this.inRange(l.data, ini, fim))
      .sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora))
      .map(l => ({
        data: l.data, hora: l.hora,
        tipo: l.tipo === 'receita' ? 'Receita' : 'Despesa',
        categoria: l.cat, descricao: l.desc,
        forma: FORMA_LBL[l.forma] || l.forma,
        profissional: l.prof ? this.nomeProf(l.prof) : '',
        valor: l.valor,
      }));
    return {
      title: 'Pagamentos / Lançamentos', slug: 'lancamentos', periodo: label,
      columns: [
        { header: 'Data', key: 'data', type: 'date' },
        { header: 'Hora', key: 'hora', type: 'time' },
        { header: 'Tipo', key: 'tipo' },
        { header: 'Categoria', key: 'categoria' },
        { header: 'Descrição', key: 'descricao', width: 30 },
        { header: 'Forma', key: 'forma' },
        { header: 'Profissional', key: 'profissional' },
        { header: 'Valor', key: 'valor', type: 'money2' },
      ],
      rows,
    };
  }

  // --- r9 ---
  private dsContasReceber(label: string): Dataset {
    const rows = this.data.aReceber
      .sort((a, b) => a.venc.localeCompare(b.venc))
      .map(r => ({
        cliente: this.nomeCli(r.cli),
        descricao: r.desc,
        valor: r.valor,
        vencimento: r.venc,
        atraso: r.dias < 0 ? Math.abs(r.dias) : 0,
        situacao: r.dias < 0 ? 'Vencido' : r.dias === 0 ? 'Vence hoje' : 'A vencer',
      }));
    const vencido = rows.filter(r => r.situacao === 'Vencido').reduce((s, r) => s + r.valor, 0);
    return {
      title: 'Contas a receber', slug: 'contas-receber', periodo: label,
      columns: [
        { header: 'Cliente', key: 'cliente', width: 22 },
        { header: 'Descrição', key: 'descricao', width: 28 },
        { header: 'Valor', key: 'valor', type: 'money2' },
        { header: 'Vencimento', key: 'vencimento', type: 'date' },
        { header: 'Dias em atraso', key: 'atraso', type: 'number' },
        { header: 'Situação', key: 'situacao' },
      ],
      rows,
      summary: [
        { label: 'Total a receber', value: fmtMoney2(rows.reduce((s, r) => s + r.valor, 0)) },
        { label: 'Vencido', value: fmtMoney2(vencido) },
      ],
    };
  }

  // --- r10 ---
  private dsFormasPagamento(ini: string, fim: string, label: string): Dataset {
    const lancs = this.data.lancamentos.filter(l => l.tipo === 'receita' && this.inRange(l.data, ini, fim));
    const formaMap: Record<string, number> = {};
    for (const l of lancs) formaMap[l.forma] = (formaMap[l.forma] || 0) + l.valor;
    const total = Object.values(formaMap).reduce((s, v) => s + v, 0);
    const rows = Object.entries(formaMap)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => ({
        forma: FORMA_LBL[k] || k, valor: v,
        pct: total ? Math.round(v / total * 100) : 0,
      }));
    return {
      title: 'Formas de pagamento', slug: 'formas-pagamento', periodo: label,
      columns: [
        { header: 'Forma', key: 'forma' },
        { header: 'Valor', key: 'valor', type: 'money2' },
        { header: '% do total', key: 'pct', type: 'percent' },
      ],
      rows,
      summary: [{ label: 'Receita total', value: fmtMoney2(total) }],
    };
  }

  // --- r11 ---
  private dsVendasProdutos(ini: string, fim: string, label: string): Dataset {
    const rows = this.data.lancamentos
      .filter(l => this.inRange(l.data, ini, fim) && l.cat === 'Produto' && l.tipo === 'receita')
      .sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora))
      .map(l => ({
        data: l.data, hora: l.hora, descricao: l.desc,
        forma: FORMA_LBL[l.forma] || l.forma,
        profissional: l.prof ? this.nomeProf(l.prof) : '',
        valor: l.valor,
      }));
    return {
      title: 'Vendas de produtos', slug: 'vendas-produtos', periodo: label,
      columns: [
        { header: 'Data', key: 'data', type: 'date' },
        { header: 'Hora', key: 'hora', type: 'time' },
        { header: 'Descrição', key: 'descricao', width: 32 },
        { header: 'Forma', key: 'forma' },
        { header: 'Profissional', key: 'profissional' },
        { header: 'Valor', key: 'valor', type: 'money2' },
      ],
      rows,
      summary: [{ label: 'Total em vendas', value: fmtMoney2(rows.reduce((s, r) => s + r.valor, 0)) }],
    };
  }

  // --- r12 ---
  private dsRankingServicos(ini: string, fim: string, label: string): Dataset {
    const concluidos = this.data.agendamentos.filter(a =>
      this.inRange(a.data, ini, fim) && a.status === 'concluido');
    const map: Record<string, { srv: string; qtd: number; receita: number }> = {};
    for (const a of concluidos) {
      (map[a.srv] ||= { srv: a.srv, qtd: 0, receita: 0 });
      map[a.srv].qtd++;
      map[a.srv].receita += a.valor;
    }
    const rows = Object.values(map).sort((a, b) => b.receita - a.receita).map(x => {
      const s = this.data.servicos.find(y => y.id === x.srv);
      const precoMed = x.qtd ? x.receita / x.qtd : 0;
      const custoUnit = s?.custo || 0;
      return {
        servico: s?.nome || '—',
        categoria: s?.cat || '',
        qtd: x.qtd,
        receita: x.receita,
        preco_medio: Math.round(precoMed),
        margem: Math.round(precoMed - custoUnit),
        margem_pct: precoMed ? Math.round((precoMed - custoUnit) / precoMed * 100) : 0,
      };
    });
    return {
      title: 'Ranking de serviços', slug: 'ranking-servicos', periodo: label,
      columns: [
        { header: 'Serviço', key: 'servico', width: 24 },
        { header: 'Categoria', key: 'categoria' },
        { header: 'Qtd', key: 'qtd', type: 'number' },
        { header: 'Receita', key: 'receita', type: 'money' },
        { header: 'Preço médio', key: 'preco_medio', type: 'money' },
        { header: 'Margem/atend.', key: 'margem', type: 'money' },
        { header: 'Margem %', key: 'margem_pct', type: 'percent' },
      ],
      rows,
      summary: [
        { label: 'Atendimentos', value: String(concluidos.length) },
        { label: 'Receita total', value: fmtMoney(rows.reduce((s, r) => s + r.receita, 0)) },
      ],
    };
  }

  // --- r13 ---
  private dsEstoque(label: string): Dataset {
    const rows = this.data.produtos
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map(p => ({
        nome: p.nome, categoria: p.cat, qtd: p.qtd, min: p.min,
        status: p.qtd === 0 ? 'Zerado' : p.qtd <= p.min ? 'Baixo' : 'OK',
        custo: p.custo, preco: p.preco ?? 0,
        fornecedor: p.fornecedor,
      }));
    return {
      title: 'Estoque — posição atual', slug: 'estoque', periodo: label,
      columns: [
        { header: 'Produto', key: 'nome', width: 24 },
        { header: 'Categoria', key: 'categoria' },
        { header: 'Qtd atual', key: 'qtd', type: 'number' },
        { header: 'Mínimo', key: 'min', type: 'number' },
        { header: 'Status', key: 'status' },
        { header: 'Custo un.', key: 'custo', type: 'money2' },
        { header: 'Preço venda', key: 'preco', type: 'money2' },
        { header: 'Fornecedor', key: 'fornecedor', width: 20 },
      ],
      rows,
      summary: [
        { label: 'Itens cadastrados', value: String(rows.length) },
        { label: 'Em ruptura', value: String(rows.filter(r => r.status === 'Zerado').length) },
        { label: 'Abaixo do mínimo', value: String(rows.filter(r => r.status === 'Baixo').length) },
      ],
    };
  }

  // --- r14 ---
  private dsMovEstoque(ini: string, fim: string, label: string): Dataset {
    const rows = this.data.movEstoque
      .filter(m => this.inRange(m.data, ini, fim))
      .sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora))
      .map(m => ({
        data: m.data, hora: m.hora,
        produto: this.data.produtos.find(p => p.id === m.prod)?.nome || '—',
        tipo: m.tipo === 'entrada' ? 'Entrada' : 'Saída',
        qtd: m.qtd, motivo: m.motivo,
      }));
    return {
      title: 'Movimentações de estoque', slug: 'mov-estoque', periodo: label,
      columns: [
        { header: 'Data', key: 'data', type: 'date' },
        { header: 'Hora', key: 'hora', type: 'time' },
        { header: 'Produto', key: 'produto', width: 24 },
        { header: 'Tipo', key: 'tipo' },
        { header: 'Qtd', key: 'qtd', type: 'number' },
        { header: 'Motivo', key: 'motivo', width: 32 },
      ],
      rows,
    };
  }

  // --- r15 ---
  private dsDesempenhoProf(ini: string, fim: string, label: string): Dataset {
    const concluidos = this.data.agendamentos.filter(a =>
      this.inRange(a.data, ini, fim) && a.status === 'concluido');
    const rows = this.data.staff.map(p => {
      const dele = concluidos.filter(a => a.prof === p.id);
      const receita = dele.reduce((s, a) => s + a.valor, 0);
      return {
        profissional: p.nome, apelido: p.apelido,
        atendimentos: dele.length,
        receita, ticket_medio: dele.length ? Math.round(receita / dele.length) : 0,
        comissao_pct: p.comissao,
        comissao_valor: Math.round(receita * p.comissao / 100),
        meta: p.meta, atingido_pct: p.meta ? Math.round(receita / p.meta * 100) : 0,
      };
    }).sort((a, b) => b.receita - a.receita);
    return {
      title: 'Desempenho por profissional', slug: 'desempenho-prof', periodo: label,
      columns: [
        { header: 'Profissional', key: 'profissional', width: 22 },
        { header: 'Atendimentos', key: 'atendimentos', type: 'number' },
        { header: 'Receita', key: 'receita', type: 'money' },
        { header: 'Ticket médio', key: 'ticket_medio', type: 'money' },
        { header: 'Comissão %', key: 'comissao_pct', type: 'percent' },
        { header: 'Comissão R$', key: 'comissao_valor', type: 'money' },
        { header: 'Meta', key: 'meta', type: 'money' },
        { header: 'Atingido', key: 'atingido_pct', type: 'percent' },
      ],
      rows,
      summary: [
        { label: 'Atendimentos totais', value: String(rows.reduce((s, r) => s + r.atendimentos, 0)) },
        { label: 'Receita total', value: fmtMoney(rows.reduce((s, r) => s + r.receita, 0)) },
      ],
    };
  }

  // --- r16 ---
  private dsComissoes(ini: string, fim: string, label: string): Dataset {
    const sheets: Dataset['sheets'] = [];
    let totalBruto = 0, totalComissao = 0;
    const resumoRows: any[] = [];
    for (const p of this.data.staff) {
      const src = this.data.comissoes[p.id];
      if (!src) continue;
      const itens = src.itens.filter(i => this.inRange(i.data, ini, fim));
      const bruto = itens.reduce((s, i) => s + i.valor, 0);
      const comissao = Math.round(bruto * p.comissao / 100);
      totalBruto += bruto; totalComissao += comissao;
      resumoRows.push({
        profissional: p.nome, comissao_pct: p.comissao,
        atendimentos: itens.length, bruto, comissao,
        status: src.status === 'pago' ? 'Pago' : 'Aberto',
      });
      if (itens.length) {
        sheets.push({
          name: p.apelido || p.nome,
          columns: [
            { header: 'Data', key: 'data', type: 'date' },
            { header: 'Cliente', key: 'cliente', width: 22 },
            { header: 'Serviço', key: 'servico', width: 22 },
            { header: 'Valor', key: 'valor', type: 'money' },
            { header: 'Comissão', key: 'comissao_item', type: 'money' },
          ],
          rows: itens.map(i => ({
            data: i.data,
            cliente: this.nomeCli(i.cli),
            servico: this.nomeSrv(i.srv),
            valor: i.valor,
            comissao_item: Math.round(i.valor * p.comissao / 100),
          })),
        });
      }
    }
    // Primeira aba = resumo consolidado
    const resumo: NonNullable<Dataset['sheets']>[number] = {
      name: 'Resumo',
      columns: [
        { header: 'Profissional', key: 'profissional', width: 22 },
        { header: '% comissão', key: 'comissao_pct', type: 'percent' },
        { header: 'Atendimentos', key: 'atendimentos', type: 'number' },
        { header: 'Bruto', key: 'bruto', type: 'money' },
        { header: 'Comissão', key: 'comissao', type: 'money' },
        { header: 'Status', key: 'status' },
      ],
      rows: resumoRows,
    };
    sheets.unshift(resumo);
    return {
      title: 'Fechamento de comissões', slug: 'comissoes', periodo: label,
      columns: resumo.columns, rows: resumo.rows,          // usado no CSV/PDF quando não itera sheets
      sheets,
      summary: [
        { label: 'Bruto total', value: fmtMoney(totalBruto) },
        { label: 'Comissão total', value: fmtMoney(totalComissao) },
      ],
    };
  }

  // --- r17 ---
  private dsEquipe(label: string): Dataset {
    const rows = this.data.staff.map(p => ({
      nome: p.nome, apelido: p.apelido, contato: p.contato,
      especialidades: p.especialidades.join(', '),
      inicio: p.inicio, fim: p.fim,
      folga: p.folga.map(f => DIAS_LBL_CAP[DIAS_TXT.indexOf(f)] || f).join(', '),
      comissao_pct: p.comissao, meta: p.meta,
    }));
    return {
      title: 'Equipe — cadastro e jornada', slug: 'equipe', periodo: label,
      columns: [
        { header: 'Nome', key: 'nome', width: 22 },
        { header: 'Apelido', key: 'apelido' },
        { header: 'Contato', key: 'contato' },
        { header: 'Especialidades', key: 'especialidades', width: 26 },
        { header: 'Início', key: 'inicio', type: 'time' },
        { header: 'Fim', key: 'fim', type: 'time' },
        { header: 'Folga', key: 'folga' },
        { header: 'Comissão %', key: 'comissao_pct', type: 'percent' },
        { header: 'Meta mensal', key: 'meta', type: 'money' },
      ],
      rows,
    };
  }

  // --- r18 ---
  private dsCampanhas(label: string): Dataset {
    const rows = this.data.campanhas.map(c => ({
      nome: c.nome, tipo: cap(c.tipo), alvo: c.alvo,
      publico: c.publico, enviadas: c.enviadas, retorno: c.retorno,
      taxa: c.taxa, status: cap(c.status),
    }));
    return {
      title: 'Campanhas', slug: 'campanhas', periodo: label,
      columns: [
        { header: 'Campanha', key: 'nome', width: 26 },
        { header: 'Tipo', key: 'tipo' },
        { header: 'Alvo', key: 'alvo', width: 22 },
        { header: 'Público', key: 'publico', type: 'number' },
        { header: 'Enviadas', key: 'enviadas', type: 'number' },
        { header: 'Retorno', key: 'retorno', type: 'number' },
        { header: 'Taxa', key: 'taxa', type: 'percent' },
        { header: 'Status', key: 'status' },
      ],
      rows,
    };
  }

  // --- r19 ---
  private dsFidelidade(label: string): Dataset {
    const f = this.data.fidelidade as any;
    const rows = [
      { metrica: 'Tipo do programa',       valor: cap(f.tipo || '') },
      { metrica: 'Meta de pontos',         valor: String(f.meta ?? '') },
      { metrica: 'Recompensa',             valor: f.recompensa || '' },
      { metrica: 'Cashback (%)',           valor: `${f.cashbackPct ?? 0}%` },
      { metrica: 'Clientes ativos',        valor: String(f.ativos ?? 0) },
      { metrica: 'Recompensas resgatadas', valor: String(f.resgatados ?? 0) },
      { metrica: 'Pontos emitidos',        valor: String(f.pontosEmitidos ?? 0) },
    ];
    return {
      title: 'Programa de fidelidade', slug: 'fidelidade', periodo: label,
      columns: [
        { header: 'Métrica', key: 'metrica', width: 26 },
        { header: 'Valor', key: 'valor', width: 20 },
      ],
      rows,
    };
  }

  // --- r20 ---
  private dsGerencial(ini: string, fim: string, label: string): Dataset {
    // Reaproveita o rankingServicos e o desempenho por prof como abas.
    const rankSrv = this.dsRankingServicos(ini, fim, label);
    const desemp  = this.dsDesempenhoProf(ini, fim, label);
    const fin     = this.dsFinanceiro(ini, fim, label);
    // KPIs
    const ags = this.data.agendamentos.filter(a => this.inRange(a.data, ini, fim));
    const concl = ags.filter(a => a.status === 'concluido');
    const falt = ags.filter(a => a.status === 'faltou');
    const rec = this.data.lancamentos.filter(l => l.tipo === 'receita' && this.inRange(l.data, ini, fim)).reduce((s, l) => s + l.valor, 0);
    const desp = this.data.lancamentos.filter(l => l.tipo === 'despesa' && this.inRange(l.data, ini, fim)).reduce((s, l) => s + l.valor, 0);
    const kpiRows = [
      { indicador: 'Faturamento',                valor: fmtMoney2(rec) },
      { indicador: 'Despesa',                    valor: fmtMoney2(desp) },
      { indicador: 'Resultado',                  valor: fmtMoney2(rec - desp) },
      { indicador: 'Atendimentos concluídos',    valor: String(concl.length) },
      { indicador: 'Ticket médio',               valor: fmtMoney(concl.length ? Math.round(rec / concl.length) : 0) },
      { indicador: 'Faltas',                     valor: String(falt.length) },
      { indicador: 'Taxa de no-show',            valor: `${(concl.length + falt.length) ? Math.round(falt.length / (concl.length + falt.length) * 1000) / 10 : 0}%` },
      { indicador: 'Clientes atendidos',         valor: String(new Set(concl.map(a => a.cli)).size) },
    ];
    const sheets: Dataset['sheets'] = [
      { name: 'KPIs', columns: [
        { header: 'Indicador', key: 'indicador', width: 28 },
        { header: 'Valor', key: 'valor', width: 20 },
      ], rows: kpiRows },
      { name: 'Financeiro', columns: fin.columns, rows: fin.rows },
      { name: 'Ranking serviços', columns: rankSrv.columns, rows: rankSrv.rows },
      { name: 'Profissionais', columns: desemp.columns, rows: desemp.rows },
    ];
    return {
      title: 'Relatório gerencial', slug: 'gerencial', periodo: label,
      subtitle: 'KPIs consolidados do período',
      columns: sheets[0].columns, rows: sheets[0].rows,
      sheets,
    };
  }
}

// ============================================================
// Formatação — helpers puros
// ============================================================
const MES_ABR = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MES_FULL = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIAS_TXT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const DIAS_LBL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DIAS_LBL_CAP = DIAS_LBL;
const FORMA_LBL: Record<string, string> = { pix: 'Pix', cartao: 'Cartão', dinheiro: 'Dinheiro' };

function pad(n: number) { return String(n).padStart(2, '0'); }
function cap(s: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

function fmtMoney(n: number): string {
  return 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 });
}
function fmtMoney2(n: number): string {
  return 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(iso: string): string {
  if (!iso || iso.length < 10) return iso || '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}
function fmtTime(t: string): string {
  return (t || '').slice(0, 5);
}
function fmtDateLong(d: Date): string {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function csvEscape(v: any): string {
  const s = v === null || v === undefined ? '' : String(v);
  if (s.includes(';') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
/** Célula tipada para o Excel — dinheiro/percent/número vão como Number para
 * o Excel poder somar/formatar; datas ficam como texto no formato dd/mm/aaaa
 * (usar Date nativo criaria dependência de timezone). */
function xlsxCell(v: any, type?: ColType) {
  if (v === null || v === undefined || v === '') return '';
  switch (type) {
    case 'money': case 'money2': case 'number': case 'percent': return Number(v);
    case 'date':     return fmtDate(String(v));
    case 'time':     return fmtTime(String(v));
    case 'datetime': return fmtDate(String(v).slice(0, 10)) + ' ' + fmtTime(String(v).slice(11));
    default: return v;
  }
}
function fmtCode(type?: ColType): string | undefined {
  switch (type) {
    case 'money':  return '"R$" #,##0';
    case 'money2': return '"R$" #,##0.00';
    case 'percent': return '0"%"';
    case 'number': return '#,##0';
    default: return undefined;
  }
}
function autoWidth(col: Coluna, rows: any[]): number {
  const maxData = rows.reduce((m, r) => Math.max(m, String(r[col.key] ?? '').length), 0);
  return Math.min(48, Math.max(col.header.length, maxData) + 2);
}
function safeSheetName(n: string): string {
  return n.replace(/[\\\/\[\]\*\?:]/g, ' ').slice(0, 31) || 'Aba';
}
function downloadBlob(blob: Blob, arquivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = arquivo;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}
