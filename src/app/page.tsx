'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import {
  FileText,
  Calendar as CalendarIcon,
  User,
  DollarSign,
  Building2,
  Hash,
  Download,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  PieChart,
  ChevronDown,
  LayoutDashboard
} from 'lucide-react';

import { DayPicker, DateRange } from 'react-day-picker';
import 'react-day-picker/style.css';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const OPERACAO_CLOSER_MAP: Record<string, string> = {
  'Dr. Leonardo Silvestrini': 'Sara Lívia',
  'Dra. Luciana': 'Sara Lívia',
  'Dr Cris': 'Sara Lívia',
  'Dr. Eduardo Brusiquesi': 'Sara Lívia',
  'Dra. Paola Teles': 'Sara Lívia',
  'Bodyplastia': 'José',
  'Dr. Marcelo': 'José',
  'Dra. Marcela': 'José',
  'Dr. Fernando': 'Vitória',
  'Dr. Rodrigo Coelho': 'Josy',
  'Dr. Jair Dacás': 'Bárbara'
};

export default function FACloserHub() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date Range State
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date()
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Form State
  const [formData, setFormData] = useState({
    operacao: '',
    closer: '',

    // Oportunidades Novas
    orcamentosNovos: '',
    valorOrcamentosNovos: '',
    qtdFechadoNovas: '',
    valorContratoNovas: '',
    valorRecebidoNovas: '',

    // Cadência
    qtdFollow: '',
    valorFollow: '',
    qtdFechadoCadencia: '',
    valorContratoCadencia: '',
    valorRecebidoCadencia: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'operacao' && OPERACAO_CLOSER_MAP[value]) {
        updated.closer = OPERACAO_CLOSER_MAP[value];
      }
      return updated;
    });

    setError(null);
    setPdfGenerated(false);
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) {
      setFormData((prev) => ({ ...prev, [name]: '' }));
      return;
    }
    const amount = parseInt(numericValue, 10) / 100;
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);

    setFormData((prev) => ({ ...prev, [name]: formatted }));
    setError(null);
    setPdfGenerated(false);
  };

  const validateForm = () => {
    if (!formData.operacao || formData.operacao === '') return 'Selecione uma operação válida.';
    if (!dateRange?.from || !dateRange?.to) return 'Selecione o período inicial e final das métricas.';
    if (!formData.closer) return 'Preencha o nome do Closer responsável.';

    // Validação Oportunidades
    if (!formData.orcamentosNovos || !formData.valorOrcamentosNovos || !formData.qtdFechadoNovas || !formData.valorContratoNovas || !formData.valorRecebidoNovas) {
      return 'Preencha todos os campos métricos de Oportunidades Novas.';
    }

    // Validação Cadência
    if (!formData.qtdFollow || !formData.valorFollow || !formData.qtdFechadoCadencia || !formData.valorContratoCadencia || !formData.valorRecebidoCadencia) {
      return 'Preencha todos os campos métricos de Cadência de Follow.';
    }

    return null;
  };

  const formatPeriod = () => {
    if (!dateRange?.from) return "Selecionar Período";
    if (dateRange.from && !dateRange.to) {
      return format(dateRange.from, 'dd/MM/yyyy');
    }
    if (dateRange.from && dateRange.to) {
      if (dateRange.from.getTime() === dateRange.to.getTime()) {
        return format(dateRange.from, 'dd/MM/yyyy');
      }
      return `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`;
    }
    return "";
  };

  const getPdfSafePeriodString = () => {
    if (!dateRange?.from || !dateRange?.to) return '';
    const fromStr = format(dateRange.from, 'dd-MM-yyyy');
    const toStr = format(dateRange.to, 'dd-MM-yyyy');
    return fromStr === toStr ? fromStr : `${fromStr}_a_${toStr}`;
  };

  const generatePDF = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const MARGIN = 14.1; // 40px equivalent
      const PAGE_WIDTH = 210;
      const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

      const doc = new jsPDF();
      let currentY = MARGIN;

      // --- HELPER: Divider ---
      const drawDivider = (y: number) => {
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.3);
        doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y);
      };

      // --- 1. HEADER PROFESSIONAL ---
      doc.setFillColor(15, 15, 15);
      doc.roundedRect(MARGIN, currentY, 12, 12, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('FA', MARGIN + 3.5, currentY + 8);

      doc.setTextColor(20, 20, 20);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('RELATÓRIO COMERCIAL CONSOLIDADO', MARGIN + 18, currentY + 8.5);

      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'normal');
      doc.text('INTELIGÊNCIA COMERCIAL', MARGIN + CONTENT_WIDTH - 38, currentY + 8.5);

      currentY += 16;
      drawDivider(currentY);
      currentY += 12;

      // --- 2. INFORMAÇÕES DA OPERAÇÃO (GRID) ---
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text('INFORMAÇÕES DA OPERAÇÃO', MARGIN, currentY);
      currentY += 8;

      const colWidth = CONTENT_WIDTH / 2;

      const drawInfoItem = (label: string, value: string, x: number, y: number) => {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 120, 120);
        doc.text(label, x, y);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 30, 30);
        doc.text(value, x, y + 5);
      };

      drawInfoItem('Cliente / Operação:', formData.operacao || '---', MARGIN, currentY);
      drawInfoItem('Período das Métricas:', formatPeriod(), MARGIN + colWidth, currentY);
      currentY += 15;
      drawInfoItem('Closer Responsável:', formData.closer || '---', MARGIN, currentY);

      currentY += 15;

      // --- 3. RESUMO VISUAL DO FUNIL (DYNAMICS) ---
      const cardY = currentY;
      const cardH = 65;
      doc.setFillColor(254, 254, 254);
      doc.setDrawColor(235, 235, 235);
      doc.roundedRect(MARGIN, cardY, CONTENT_WIDTH, cardH, 4, 4, 'FD');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text('RESUMO VISUAL DO FUNIL', MARGIN + 6, cardY + 8);

      // Calculations
      const qNew = parseInt(formData.orcamentosNovos) || 0;
      const qFollow = parseInt(formData.qtdFollow) || 0;
      const tOpp = qNew + qFollow;

      const qLeadNovas = parseInt(formData.orcamentosNovos) || 0; // Orçamentos are middle
      const tQuotes = (parseInt(formData.orcamentosNovos) || 0) + (parseInt(formData.qtdFollow) > 0 ? qFollow : 0); // Simplified for visual
      const tClosed = (parseInt(formData.qtdFechadoNovas) || 0) + (parseInt(formData.qtdFechadoCadencia) || 0);
      const cR = tOpp > 0 ? ((tClosed / tOpp) * 100).toFixed(1) : '0';

      // Funnel Drawing Area (Left side of card)
      const funnelX = MARGIN + 45;
      const funnelY = cardY + 15;
      const maxW = 70;
      const stepH = 12;
      const gap = 2;

      // Proportional widths
      const w1 = maxW;
      const w2 = tOpp > 0 ? Math.max((tQuotes / tOpp) * maxW, 30) : 45;
      const w3 = tOpp > 0 ? Math.max((tClosed / tOpp) * maxW, 15) : 25;

      // Level 1: Oportunidades
      doc.setFillColor(15, 15, 15);
      doc.roundedRect(funnelX - w1 / 2, funnelY, w1, stepH, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.text('OPORTUNIDADES', funnelX - 10, funnelY + 5);
      doc.setFontSize(8);
      doc.text(`${tOpp}`, funnelX - 2, funnelY + 9);

      // Level 2: Orçamentos
      doc.setFillColor(70, 70, 70);
      doc.triangle(funnelX - w1 / 2 + 5, funnelY + stepH + gap, funnelX + w1 / 2 - 5, funnelY + stepH + gap, funnelX + w2 / 2, funnelY + stepH * 2 + gap, 'F');
      doc.triangle(funnelX - w1 / 2 + 5, funnelY + stepH + gap, funnelX + w2 / 2, funnelY + stepH * 2 + gap, funnelX - w2 / 2, funnelY + stepH * 2 + gap, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('ORÇAMENTOS', funnelX - 9, funnelY + stepH + gap + 5);
      doc.text(`${tQuotes}`, funnelX - 2, funnelY + stepH + gap + 9);

      // Level 3: Contratos
      doc.setFillColor(130, 130, 130);
      doc.triangle(funnelX - w2 / 2 + 3, funnelY + stepH * 2 + gap * 2, funnelX + w2 / 2 - 3, funnelY + stepH * 2 + gap * 2, funnelX, funnelY + stepH * 3.5 + gap * 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('CONTRATOS', funnelX - 8, funnelY + stepH * 2 + gap * 2 + 5);
      doc.setFontSize(9);
      doc.text(`${tClosed}`, funnelX - 2, funnelY + stepH * 2 + gap * 2 + 10);

      // Indicator Area (Right side of card)
      const indX = MARGIN + CONTENT_WIDTH - 65;
      const drawIndicator = (label: string, value: string, y: number, isBig = false) => {
        doc.setFontSize(7);
        doc.setTextColor(140, 140, 140);
        doc.setFont('helvetica', 'normal');
        doc.text(label, indX, y);
        doc.setFontSize(isBig ? 16 : 10);
        doc.setTextColor(20, 20, 20);
        doc.setFont('helvetica', 'bold');
        doc.text(value, indX, y + 6);
      };

      drawIndicator('OPORTUNIDADES GERAIS', `${tOpp} Leads Totais`, funnelY + 2);
      drawIndicator('VENDAS CONCLUÍDAS', `${tClosed} Contratos`, funnelY + 16);
      drawIndicator('EFICIÊNCIA COMERCIAL', `${cR}%`, funnelY + 32, true);

      currentY = cardY + cardH + 15;

      // --- 4. DETAILED METRICS TABLES ---
      const drawSectionHeader = (title: string, y: number) => {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 100, 100);
        doc.text(title, MARGIN, y);

        const tableY = y + 4;
        doc.setFillColor(15, 15, 15);
        doc.rect(MARGIN, tableY, CONTENT_WIDTH, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7.5);
        doc.text('MÉTRICA ANALÍTICA', MARGIN + 4, tableY + 5.5);
        doc.text('VALOR', MARGIN + CONTENT_WIDTH - 40, tableY + 5.5);
        return tableY + 8;
      };

      const drawTableRow = (label: string, value: string, y: number, isAlt: boolean) => {
        if (isAlt) {
          doc.setFillColor(250, 250, 250);
          doc.rect(MARGIN, y, CONTENT_WIDTH, 8, 'F');
        }
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(label, MARGIN + 4, y + 5.5);
        doc.setFont('helvetica', 'bold');
        doc.text(value, MARGIN + CONTENT_WIDTH - 40, y + 5.5);
        return y + 8;
      };

      // Metrics 1
      currentY = drawSectionHeader('MÉTRICAS DE OPORTUNIDADES NOVAS', currentY);
      currentY = drawTableRow('Novas Oportunidades Geradas', formData.orcamentosNovos || '0', currentY, false);
      currentY = drawTableRow('Volume Bruto Ofertado (R$)', formData.valorOrcamentosNovos || 'R$ 0,00', currentY, true);
      currentY = drawTableRow('Conversão Direta (Contratos)', formData.qtdFechadoNovas || '0', currentY, false);
      currentY = drawTableRow('Ticket Médio / Contrato', formData.valorContratoNovas || 'R$ 0,00', currentY, true);
      currentY = drawTableRow('Cash Coletado (Receita Líquida)', formData.valorRecebidoNovas || 'R$ 0,00', currentY, false);

      currentY += 12;

      // Metrics 2
      currentY = drawSectionHeader('MÉTRICAS DE CADÊNCIA E FOLLOW-UP', currentY);
      currentY = drawTableRow('Ações de Follow-up Realizadas', formData.qtdFollow || '0', currentY, false);
      currentY = drawTableRow('Volume em Negociação Ativa', formData.valorFollow || 'R$ 0,00', currentY, true);
      currentY = drawTableRow('Recuperação de Vendas (Contratos)', formData.qtdFechadoCadencia || '0', currentY, false);
      currentY = drawTableRow('Ticket Médio em Cadência', formData.valorContratoCadencia || 'R$ 0,00', currentY, true);
      currentY = drawTableRow('Receita Recuperada (Cash Coletado)', formData.valorRecebidoCadencia || 'R$ 0,00', currentY, false);

      // --- 5. FOOTER ---
      doc.setFontSize(7);
      doc.setTextColor(180, 180, 180);
      doc.setFont('helvetica', 'normal');
      const footerText = `FA Closer Hub | Documento Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')} | Confidencial`;
      doc.text(footerText, MARGIN, 285);

      const cleanOpName = formData.operacao.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const periodoStr = getPdfSafePeriodString();
      doc.save(`Relatorio_FA_Closer-${cleanOpName}-${periodoStr}.pdf`);

      setPdfGenerated(true);
    } catch (err) {
      console.error(err);
      setError('Ocorreu um erro ao gerar o PDF. Verifique os dados fornecidos.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-gray-100 font-sans flex items-center justify-center p-4 relative overflow-hidden">

      {/* Subtle Premium Animated Background */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none fade-in-grid">
        <div className="absolute inset-0 bg-grid-pattern [mask-image:radial-gradient(ellipse_at_center,white,transparent_80%)] animate-grid-scroll"></div>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/[0.015] blur-[100px] rounded-full pointer-events-none z-0"></div>

      {/* Main Container */}
      <div className="w-full max-w-6xl flex flex-col md:flex-row relative z-10 bg-[#080808] border border-white/[0.08] shadow-2xl shadow-black rounded-[24px] overflow-hidden min-h-[750px] h-[92vh] max-h-[1200px]">

        {/* Sidebar Nova (Apenas Institucional) */}
        <aside className="w-full md:w-[280px] bg-[#0A0A0A] border-r border-white/[0.05] p-6 lg:p-8 flex flex-col shrink-0 flex-none">

          <div className="mb-12 flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded flex items-center justify-center text-black font-bold tracking-tighter text-lg shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              FA
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-white/90 leading-tight">
                Closer Hub
              </h1>
            </div>
          </div>

          <div className="space-y-3 flex-1">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-2 mb-4">Relatórios Corporativos</p>

            <div className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 bg-white/[0.05] border border-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.01)]">
              <LayoutDashboard size={18} className="text-white" />
              <span className="font-medium text-sm tracking-wide">Relatório Consolidado</span>
            </div>
          </div>

          {/* User Profile */}
          <div className="mt-8 pt-6 flex items-center gap-3 px-2 opacity-80 hover:opacity-100 transition-opacity cursor-default border-white/[0.05]">
            <div className="w-9 h-9 rounded-full bg-white/[0.05] flex items-center justify-center border border-white/[0.05]">
              <User size={15} className="text-white/60" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/90 tracking-tight">Sessão Ativa</p>
              <p className="text-[11px] text-white/40 tracking-wide uppercase">Pronto para Operar</p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto px-6 py-8 md:p-12 custom-scrollbar relative bg-[#050505]">
          <div className="w-full max-w-4xl mx-auto space-y-8 pb-10">

            <div className="mb-4">
              <h1 className="text-2xl font-semibold tracking-tight text-white">Preenchimento de Relatório</h1>
              <p className="text-white/40 text-sm mt-1">Preencha os três blocos abaixo para gerar o PDF corporativo consolidado.</p>
            </div>

            {/* BLOCK 1: Informações da Operação */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#0D0D0D] border border-white/[0.06] rounded-2xl p-6 md:p-8"
            >
              <h2 className="text-[15px] font-semibold mb-6 text-white/90 flex items-center gap-2 tracking-wide">
                <Building2 className="text-white/40" size={18} />
                Informações da Operação
              </h2>

              <div className="flex flex-col gap-6">

                <div className="flex flex-col lg:flex-row gap-6">

                  {/* Select Operação */}
                  <div className="w-full lg:w-5/12 space-y-2">
                    <label className="text-[13px] font-medium text-white/50 tracking-wide uppercase">Nome da Operação</label>
                    <div className="relative group">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/60 transition-colors" size={16} />
                      <select
                        name="operacao"
                        value={formData.operacao}
                        onChange={handleChange}
                        className="w-full bg-[#030303] border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-white/90 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/30 transition-all appearance-none cursor-pointer hover:border-white/20"
                      >
                        <option value="" disabled className="text-gray-500">Selecione uma operação</option>
                        {Object.keys(OPERACAO_CLOSER_MAP).sort().map((op) => (
                          <option key={op} value={op}>{op}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" size={16} />
                    </div>
                  </div>

                  {/* PREMIUM DATE RANGE PICKER */}
                  <div className="w-full lg:w-7/12 space-y-2 relative" ref={calendarRef}>
                    <label className="text-[13px] font-medium text-white/50 tracking-wide uppercase">Período das Métricas</label>
                    <button
                      onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                      className={`w-full flex items-center justify-between bg-[#030303] border rounded-xl py-3.5 px-3.5 text-sm transition-all focus:outline-none hover:border-white/20 ${isCalendarOpen ? 'border-white/30 ring-1 ring-white/20' : 'border-white/10'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <CalendarIcon size={16} className={`transition-colors ${isCalendarOpen ? 'text-white/80' : 'text-white/30'}`} />
                        <span className={dateRange?.from ? 'text-white/90' : 'text-white/30'}>
                          {formatPeriod()}
                        </span>
                      </div>
                      <ChevronDown size={16} className={`text-white/30 transition-transform ${isCalendarOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isCalendarOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 5, scale: 0.98 }}
                          transition={{ duration: 0.2 }}
                          className="absolute z-50 top-[76px] left-0 mt-2 p-4 bg-[#0A0A0A] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black"
                        >
                          <style dangerouslySetInnerHTML={{
                            __html: `
                            .rdp-root {
                              --rdp-accent-color: #ffffff;
                              --rdp-background-color: rgba(255, 255, 255, 0.08);
                              --rdp-day-height: 40px;
                              --rdp-day-width: 40px;
                              --rdp-day_button-border-radius: 8px;
                              --rdp-selected-color: #000;
                              --rdp-selected-font: bold;
                              --rdp-margin: 0;
                            }
                            .rdp-root {
                              color: rgba(255,255,255,0.85);
                            }
                            .rdp-caption_label {
                              text-transform: capitalize;
                              font-weight: 600;
                              font-size: 1rem;
                              color: #ffffff;
                            }
                            .rdp-weekday {
                              text-transform: uppercase;
                              font-size: 0.7rem;
                              color: rgba(255, 255, 255, 0.3);
                              letter-spacing: 0.05em;
                              font-weight: 600;
                            }
                            .rdp-nav_button {
                              color: rgba(255, 255, 255, 0.5);
                            }
                            .rdp-nav_button:hover {
                              background-color: rgba(255, 255, 255, 0.05);
                              color: #ffffff;
                            }
                            .rdp-day_button:hover:not([disabled]):not(.rdp-selected) {
                              background-color: rgba(255, 255, 255, 0.05);
                              color: #ffffff;
                            }
                            .rdp-selected {
                              background-color: transparent !important;
                            }
                            /* Range Start/End: White circle/square with black text */
                            .rdp-day_button.rdp-range_start, 
                            .rdp-day_button.rdp-range_end,
                            .rdp-range_start .rdp-day_button,
                            .rdp-range_end .rdp-day_button {
                              background-color: #ffffff !important;
                              color: #000000 !important;
                              font-weight: 400 !important;
                              border-radius: 8px !important;
                              opacity: 1 !important;
                            }
                            
                            /* Hover state for days */
                            .rdp-day_button:hover:not([disabled]):not(.rdp-selected) {
                              background-color: rgba(255, 255, 255, 0.05) !important;
                            }

                            /* Range Middle: Subtle transparent gray background */
                            .rdp-day_button.rdp-range_middle,
                            .rdp-range_middle .rdp-day_button {
                              background-color: rgba(255, 255, 255, 0.05) !important;
                              color: #ffffff !important;
                              border-radius: 0 !important;
                            }

                            .rdp-outside {
                              color: rgba(255, 255, 255, 0.15) !important;
                            }
                          `}} />
                          <DayPicker
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            locale={ptBR}
                            numberOfMonths={1}
                            className="bg-transparent"
                          />
                          <div className="mt-4 pt-4 border-t border-white/5 flex justify-end">
                            <button
                              onClick={() => setIsCalendarOpen(false)}
                              className="px-4 py-2 bg-white text-black text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              Aplicar Período
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Closer */}
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-white/50 tracking-wide uppercase">Closer Responsável</label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/60 transition-colors" size={16} />
                    <input
                      type="text"
                      name="closer"
                      placeholder="Ex: João Silva"
                      value={formData.closer}
                      onChange={handleChange}
                      className="w-full bg-[#030303] border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-white/90 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/30 transition-all placeholder:text-white/20 hover:border-white/20"
                    />
                  </div>
                </div>

              </div>
            </motion.div>

            {/* BLOCK 2: Oportunidades Novas */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              className="bg-[#0D0D0D] border border-white/[0.06] rounded-2xl p-6 md:p-8"
            >
              <h2 className="text-[15px] font-semibold mb-6 text-white/90 flex items-center gap-2 tracking-wide">
                <PieChart className="text-white/40" size={18} />
                Métricas de Oportunidades Novas
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-7">
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-white/50 tracking-wide uppercase">Orçamentos Novos</label>
                  <div className="relative group">
                    <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/60 transition-colors" size={16} />
                    <input
                      type="number"
                      name="orcamentosNovos"
                      placeholder="0"
                      value={formData.orcamentosNovos}
                      onChange={handleChange}
                      className="w-full bg-[#030303] border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-white/90 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/30 transition-all placeholder:text-white/20 hover:border-white/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-white/50 tracking-wide uppercase">Valor dos Orçamentos</label>
                  <div className="relative group">
                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/60 transition-colors" size={16} />
                    <input
                      type="text"
                      name="valorOrcamentosNovos"
                      placeholder="R$ 0,00"
                      value={formData.valorOrcamentosNovos}
                      onChange={handleCurrencyChange}
                      className="w-full bg-[#030303] border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-white/90 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/30 transition-all placeholder:text-white/20 font-mono hover:border-white/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-white/50 tracking-wide uppercase">Orçamentos Fechados (Qtd)</label>
                  <div className="relative group">
                    <CheckCircle2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/60 transition-colors" size={16} />
                    <input
                      type="number"
                      name="qtdFechadoNovas"
                      placeholder="0"
                      value={formData.qtdFechadoNovas}
                      onChange={handleChange}
                      className="w-full bg-[#030303] border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-white/90 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/30 transition-all placeholder:text-white/20 hover:border-white/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-white/50 tracking-wide uppercase">Valor do Contrato</label>
                  <div className="relative group">
                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/60 transition-colors" size={16} />
                    <input
                      type="text"
                      name="valorContratoNovas"
                      placeholder="R$ 0,00"
                      value={formData.valorContratoNovas}
                      onChange={handleCurrencyChange}
                      className="w-full bg-[#030303] border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-white/90 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/30 transition-all placeholder:text-white/20 font-mono hover:border-white/20"
                    />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-[13px] font-medium text-white/60 tracking-wide uppercase">Valor Recebido (Cash coletado)</label>
                  <div className="relative group">
                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-white/80 transition-colors" size={16} />
                    <input
                      type="text"
                      name="valorRecebidoNovas"
                      placeholder="R$ 0,00"
                      value={formData.valorRecebidoNovas}
                      onChange={handleCurrencyChange}
                      className="w-full bg-[#030303] border border-white/20 rounded-xl py-3.5 pl-10 pr-4 text-white focus:outline-none focus:ring-1 focus:ring-white/40 focus:border-white/50 transition-all placeholder:text-white/20 font-mono hover:border-white/30"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* BLOCK 3: Cadência de Follow */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              className="bg-[#0D0D0D] border border-white/[0.06] rounded-2xl p-6 md:p-8"
            >
              <h2 className="text-[15px] font-semibold mb-6 text-white/90 flex items-center gap-2 tracking-wide">
                <BarChart3 className="text-white/40" size={18} />
                Métricas de Cadência de Follow
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-7">
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-white/50 tracking-wide uppercase">Follows Realizados (Qtd)</label>
                  <div className="relative group">
                    <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/60 transition-colors" size={16} />
                    <input
                      type="number"
                      name="qtdFollow"
                      placeholder="0"
                      value={formData.qtdFollow}
                      onChange={handleChange}
                      className="w-full bg-[#030303] border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-white/90 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/30 transition-all placeholder:text-white/20 hover:border-white/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-white/50 tracking-wide uppercase">Valor Ofertado em Follow</label>
                  <div className="relative group">
                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/60 transition-colors" size={16} />
                    <input
                      type="text"
                      name="valorFollow"
                      placeholder="R$ 0,00"
                      value={formData.valorFollow}
                      onChange={handleCurrencyChange}
                      className="w-full bg-[#030303] border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-white/90 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/30 transition-all placeholder:text-white/20 font-mono hover:border-white/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-white/50 tracking-wide uppercase">Orçamentos Fechados (Qtd)</label>
                  <div className="relative group">
                    <CheckCircle2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/60 transition-colors" size={16} />
                    <input
                      type="number"
                      name="qtdFechadoCadencia"
                      placeholder="0"
                      value={formData.qtdFechadoCadencia}
                      onChange={handleChange}
                      className="w-full bg-[#030303] border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-white/90 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/30 transition-all placeholder:text-white/20 hover:border-white/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-white/50 tracking-wide uppercase">Valor do Contrato</label>
                  <div className="relative group">
                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/60 transition-colors" size={16} />
                    <input
                      type="text"
                      name="valorContratoCadencia"
                      placeholder="R$ 0,00"
                      value={formData.valorContratoCadencia}
                      onChange={handleCurrencyChange}
                      className="w-full bg-[#030303] border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-white/90 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/30 transition-all placeholder:text-white/20 font-mono hover:border-white/20"
                    />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-[13px] font-medium text-white/60 tracking-wide uppercase">Valor Recebido (Cash coletado)</label>
                  <div className="relative group">
                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-white/80 transition-colors" size={16} />
                    <input
                      type="text"
                      name="valorRecebidoCadencia"
                      placeholder="R$ 0,00"
                      value={formData.valorRecebidoCadencia}
                      onChange={handleCurrencyChange}
                      className="w-full bg-[#030303] border border-white/20 rounded-xl py-3.5 pl-10 pr-4 text-white focus:outline-none focus:ring-1 focus:ring-white/40 focus:border-white/50 transition-all placeholder:text-white/20 font-mono hover:border-white/30"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-red-950/40 border border-red-500/30 text-red-200 p-4 rounded-xl flex items-center gap-3"
                >
                  <AlertCircle size={18} className="text-red-400" />
                  <span className="text-sm font-medium">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Action Button */}
            <motion.div className="pt-2">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={generatePDF}
                disabled={isGenerating}
                className="w-full py-4.5 bg-white hover:bg-gray-100 text-black rounded-xl font-bold text-[15px] shadow-[0_4px_15px_rgba(255,255,255,0.08)] transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-wide"
              >
                {isGenerating ? (
                  <div className="w-5 h-5 border-[2px] border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <FileText size={18} className="text-black" />
                    Gerar Relatório Consolidado
                  </>
                )}
              </motion.button>
            </motion.div>

            {/* Success States */}
            <AnimatePresence>
              {pdfGenerated && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-2 text-center overflow-hidden pb-4"
                >
                  <p className="text-white/70 text-sm font-medium flex items-center justify-center gap-2 mb-3">
                    <CheckCircle2 size={16} className="text-white" />
                    Exportação Finalizada com Sucesso!
                  </p>
                  <button
                    onClick={generatePDF}
                    className="text-white/40 hover:text-white transition-colors text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 mx-auto"
                  >
                    <Download size={14} /> Baixar novamente
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </main>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .bg-grid-pattern {
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
          background-size: 50px 50px;
        }
        .animate-grid-scroll {
          animation: gridScroll 30s linear infinite;
        }
        @keyframes gridScroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(50px); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.08);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(255, 255, 255, 0.15);
        }
      `}} />
    </div>
  );
}
