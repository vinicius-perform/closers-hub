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
    setFormData((prev) => ({ ...prev, [name]: value }));
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

      const doc = new jsPDF();

      const primaryColor = [10, 10, 10]; // #0A0A0A
      const accentColor = [0, 0, 0]; // Black

      // Header Background
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 40, 'F');

      // Logo FA
      doc.setFillColor(255, 255, 255);
      doc.rect(14, 18, 12, 12, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('FA', 16.5, 26);

      // Header Titles
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório Comercial Consolidado', 32, 26);

      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text('CLOSER HUB REPORT', 158, 24);

      // Metadata (Block 1)
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMAÇÕES DA OPERAÇÃO', 14, 55);

      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.line(14, 58, 196, 58);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Cliente / Operação:', 14, 68);
      doc.setFont('helvetica', 'normal');
      doc.text(formData.operacao, 55, 68);

      doc.setFont('helvetica', 'bold');
      doc.text('Período das Métricas:', 14, 76);
      doc.setFont('helvetica', 'normal');
      doc.text(formatPeriod(), 55, 76);

      doc.setFont('helvetica', 'bold');
      doc.text('Closer Responsável:', 14, 84);
      doc.setFont('helvetica', 'normal');
      doc.text(formData.closer, 55, 84);

      // --- VISUAL SALES FUNNEL (IMPACTFUL BLOCK) ---
      const funnelYStart = 98;
      doc.setFillColor(252, 252, 252);
      doc.roundedRect(14, funnelYStart, 182, 65, 3, 3, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.roundedRect(14, funnelYStart, 182, 65, 3, 3, 'D');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text('FUNIL DE VENDAS CONSOLIDADO', 20, funnelYStart + 8);

      // Funnel Shapes
      const fXCenter = 85;
      const fYStart = funnelYStart + 15;

      doc.setFillColor(15, 15, 15);
      doc.polygon([[fXCenter - 35, fYStart], [fXCenter + 35, fYStart], [fXCenter + 28, fYStart + 15], [fXCenter - 28, fYStart + 15]], 'F');

      doc.setFillColor(60, 60, 60);
      doc.polygon([[fXCenter - 28, fYStart + 17], [fXCenter + 28, fYStart + 17], [fXCenter + 18, fYStart + 32], [fXCenter - 18, fYStart + 32]], 'F');

      doc.setFillColor(110, 110, 110);
      doc.polygon([[fXCenter - 18, fYStart + 34], [fXCenter + 18, fYStart + 34], [fXCenter, fYStart + 50]], 'F');

      // Funnel Metrics Labels
      const tOpp = (parseInt(formData.orcamentosNovos) || 0) + (parseInt(formData.qtdFollow) || 0);
      const tClosed = (parseInt(formData.qtdFechadoNovas) || 0) + (parseInt(formData.qtdFechadoCadencia) || 0);
      const cR = tOpp > 0 ? ((tClosed / tOpp) * 100).toFixed(1) : '0';

      doc.setFontSize(8);
      doc.setTextColor(110, 110, 110);
      doc.text('OPORTUNIDADES', 130, fYStart + 8);
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`${tOpp} Leads Totais`, 130, fYStart + 13);

      doc.setFontSize(8);
      doc.setTextColor(110, 110, 110);
      doc.text('FECHAMENTOS', 130, fYStart + 25);
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`${tClosed} Contratos`, 130, fYStart + 30);

      doc.setFontSize(8);
      doc.setTextColor(110, 110, 110);
      doc.text('TAXA DE CONVERSÃO', 130, fYStart + 42);
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(`${cR}%`, 130, fYStart + 49);

      // Helper function for table headers
      const drawTableHeader = (title: string, yPos: number) => {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.text(title, 14, yPos);

        const tableY = yPos + 6;
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(14, tableY, 182, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('MÉTRICA', 18, tableY + 6.5);
        doc.text('VALOR', 120, tableY + 6.5);

        return tableY + 17; // return starting Y for rows
      };

      // Helper function for row drawing
      let currentY = 0;
      const drawRow = (label: string, value: string, isAlternate: boolean) => {
        if (isAlternate) {
          doc.setFillColor(245, 245, 245);
          doc.rect(14, currentY - 6, 182, 10, 'F');
        }
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(label, 18, currentY);
        doc.text(value, 120, currentY);
        currentY += 10;
      };

      // Table 1: Oportunidades Novas
      currentY = drawTableHeader('MÉTRICAS DE OPORTUNIDADES NOVAS', 178);
      drawRow('Orçamentos Novos', formData.orcamentosNovos, false);
      drawRow('Valor dos Orçamentos Novos', formData.valorOrcamentosNovos, true);
      drawRow('Quantidade de Orçamentos Fechados', formData.qtdFechadoNovas, false);
      drawRow('Valor do Contrato', formData.valorContratoNovas, true);
      drawRow('Valor Recebido (Cash Coletado)', formData.valorRecebidoNovas, false);

      // Table 2: Cadência de Follow
      currentY = drawTableHeader('MÉTRICAS DE CADÊNCIA DE FOLLOW', currentY + 12);
      drawRow('Quantidade de Follows Realizados', formData.qtdFollow, false);
      drawRow('Valor Ofertado em Follow', formData.valorFollow, true);
      drawRow('Quantidade de Orçamentos Fechados', formData.qtdFechadoCadencia, false);
      drawRow('Valor do Contrato', formData.valorContratoCadencia, true);
      drawRow('Valor Recebido (Cash Coletado)', formData.valorRecebidoCadencia, false);

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Gerado automaticamente pelo sistema FA Closer Hub | Documento Corporativo Interno', 14, 280);

      const cleanOpName = formData.operacao.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const periodoStr = getPdfSafePeriodString();
      doc.save(`Relatorio_Consolidado-${cleanOpName}-${periodoStr}.pdf`);

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
                        <option value="Bodyplastia">Bodyplastia</option>
                        <option value="Dr. Marcelo">Dr. Marcelo</option>
                        <option value="Dra. Marcela">Dra. Marcela</option>
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
