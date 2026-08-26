'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import {
  FileText,
  Calendar as CalendarIcon,
  User,
  DollarSign,
  Hash,
  Download,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  PieChart,
  ChevronDown,
  UserCheck
} from 'lucide-react';

import { DayPicker, DateRange } from 'react-day-picker';
import 'react-day-picker/style.css';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type CloserName = 'José' | 'Thais';

interface CloserFormData {
  // Orçamentos Novos no Dia
  orcamentosNovos: string;
  vendasNovos: string;
  valorVendaNovos: string;

  // Trabalho na Base
  followRealizados: string;
  valorNegociacaoBase: string;
  vendasBase: string;
  valorVendasBase: string;
}

const INITIAL_CLOSER_STATE: CloserFormData = {
  orcamentosNovos: '',
  vendasNovos: '',
  valorVendaNovos: '',
  followRealizados: '',
  valorNegociacaoBase: '',
  vendasBase: '',
  valorVendasBase: ''
};

export default function FACloserHub() {
  const [selectedCloser, setSelectedCloser] = useState<CloserName>('José');
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store data independently for both closers
  const [closersData, setClosersData] = useState<Record<CloserName, CloserFormData>>({
    'José': { ...INITIAL_CLOSER_STATE },
    'Thais': { ...INITIAL_CLOSER_STATE }
  });

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
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentData = closersData[selectedCloser];

  // Helper to parse currency string into number
  const parseCurrency = (val: string): number => {
    if (!val) return 0;
    const clean = val.replace(/[^\d]/g, '');
    if (!clean) return 0;
    return parseInt(clean, 10) / 100;
  };

  const formatCurrency = (val: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  // Real-time calculated metrics for active closer
  const summary = useMemo(() => {
    const orcNovos = parseInt(currentData.orcamentosNovos, 10) || 0;
    const vNovos = parseInt(currentData.vendasNovos, 10) || 0;
    const valVendaNovos = parseCurrency(currentData.valorVendaNovos);

    const fRealizados = parseInt(currentData.followRealizados, 10) || 0;
    const valNegociacao = parseCurrency(currentData.valorNegociacaoBase);
    const vBase = parseInt(currentData.vendasBase, 10) || 0;
    const valVendasBase = parseCurrency(currentData.valorVendasBase);

    const totalVendas = vNovos + vBase;
    const totalFaturado = valVendaNovos + valVendasBase;
    const ticketMedio = totalVendas > 0 ? totalFaturado / totalVendas : 0;
    const taxaConversaoNovos = orcNovos > 0 ? (vNovos / orcNovos) * 100 : 0;
    const taxaConversaoBase = fRealizados > 0 ? (vBase / fRealizados) * 100 : 0;
    const totalInteracoes = orcNovos + fRealizados;
    const conversaoGeral = totalInteracoes > 0 ? (totalVendas / totalInteracoes) * 100 : 0;

    return {
      orcNovos,
      vNovos,
      valVendaNovos,
      fRealizados,
      valNegociacao,
      vBase,
      valVendasBase,
      totalVendas,
      totalFaturado,
      ticketMedio,
      taxaConversaoNovos,
      taxaConversaoBase,
      conversaoGeral
    };
  }, [currentData]);

  const handleChange = (field: keyof CloserFormData, value: string) => {
    setClosersData((prev) => ({
      ...prev,
      [selectedCloser]: {
        ...prev[selectedCloser],
        [field]: value
      }
    }));
    setError(null);
    setPdfGenerated(false);
  };

  const handleCurrencyInput = (field: keyof CloserFormData, rawValue: string) => {
    const numericValue = rawValue.replace(/\D/g, '');
    if (!numericValue) {
      handleChange(field, '');
      return;
    }
    const amount = parseInt(numericValue, 10) / 100;
    const formatted = formatCurrency(amount);
    handleChange(field, formatted);
  };

  const validateForm = (): string | null => {
    if (!dateRange?.from) return 'Selecione o período das métricas.';

    const d = closersData[selectedCloser];

    if (
      d.orcamentosNovos === '' &&
      d.vendasNovos === '' &&
      d.valorVendaNovos === '' &&
      d.followRealizados === '' &&
      d.valorNegociacaoBase === '' &&
      d.vendasBase === '' &&
      d.valorVendasBase === ''
    ) {
      return `Preencha pelo menos um campo para gerar o relatório de ${selectedCloser}.`;
    }

    return null;
  };

  const formatPeriod = () => {
    if (!dateRange?.from) return 'Selecionar Período';
    if (dateRange.from && !dateRange.to) {
      return format(dateRange.from, 'dd/MM/yyyy');
    }
    if (dateRange.from && dateRange.to) {
      if (dateRange.from.getTime() === dateRange.to.getTime()) {
        return format(dateRange.from, 'dd/MM/yyyy');
      }
      return `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`;
    }
    return '';
  };

  const getPdfSafePeriodString = () => {
    if (!dateRange?.from) return 'periodo';
    const fromStr = format(dateRange.from, 'dd-MM-yyyy');
    if (!dateRange.to) return fromStr;
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
      await new Promise((resolve) => setTimeout(resolve, 600));

      const MARGIN = 15;
      const PAGE_WIDTH = 210;
      const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

      const doc = new jsPDF();
      let currentY = MARGIN;

      const drawDivider = (y: number) => {
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.3);
        doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y);
      };

      // 1. HEADER
      let headerOffset = 18;
      try {
        const img = new Image();
        img.src = '/logo.png';
        await new Promise((resolve) => {
          if (img.complete) resolve(null);
          else {
            img.onload = () => resolve(null);
            img.onerror = () => resolve(null);
          }
        });
        doc.setFillColor(12, 12, 12);
        doc.roundedRect(MARGIN, currentY, 48, 12, 2, 2, 'F');
        doc.addImage(img, 'PNG', MARGIN + 2, currentY + 2, 44, 8);
        headerOffset = 54;
      } catch {
        doc.setFillColor(15, 15, 15);
        doc.roundedRect(MARGIN, currentY, 12, 12, 2.5, 2.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('FA', MARGIN + 3.2, currentY + 8);
      }

      doc.setTextColor(18, 18, 18);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(`RELATÓRIO INDIVIDUAL DE CLOSER`, MARGIN + headerOffset, currentY + 8.5);

      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.setFont('helvetica', 'normal');
      doc.text('INTELIGÊNCIA COMERCIAL', MARGIN + CONTENT_WIDTH - 38, currentY + 8.5);

      currentY += 16;
      drawDivider(currentY);
      currentY += 10;

      // 2. INFORMAÇÕES DO CLOSER
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(110, 110, 110);
      doc.text('INFORMAÇÕES GERAIS', MARGIN, currentY);
      currentY += 8;

      const colWidth = CONTENT_WIDTH / 2;
      const drawInfoItem = (label: string, value: string, x: number, y: number) => {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(130, 130, 130);
        doc.text(label, x, y);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(20, 20, 20);
        doc.text(value, x, y + 5.5);
      };

      drawInfoItem('Closer Responsável:', selectedCloser, MARGIN, currentY);
      drawInfoItem('Período de Análise:', formatPeriod(), MARGIN + colWidth, currentY);
      currentY += 16;

      // 3. CARDS DE RESUMO EXECUTIVO (4 Kpis)
      const kpiCardY = currentY;
      const kpiCardH = 26;
      const kpiW = (CONTENT_WIDTH - 9) / 4;

      const kpis = [
        { label: 'FATURAMENTO TOTAL', val: formatCurrency(summary.totalFaturado), highlight: true },
        { label: 'TOTAL DE VENDAS', val: `${summary.totalVendas} Vendas`, highlight: false },
        { label: 'EM NEGOCIAÇÃO', val: formatCurrency(summary.valNegociacao), highlight: false },
        { label: 'EFICIÊNCIA GERAL', val: `${summary.conversaoGeral.toFixed(1)}%`, highlight: false }
      ];

      kpis.forEach((kpi, idx) => {
        const x = MARGIN + idx * (kpiW + 3);
        doc.setFillColor(kpi.highlight ? 20 : 252, kpi.highlight ? 20 : 252, kpi.highlight ? 20 : 252);
        doc.setDrawColor(kpi.highlight ? 20 : 230, kpi.highlight ? 20 : 230, kpi.highlight ? 20 : 230);
        doc.roundedRect(x, kpiCardY, kpiW, kpiCardH, 2.5, 2.5, 'FD');

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(kpi.highlight ? 200 : 120, kpi.highlight ? 200 : 120, kpi.highlight ? 200 : 120);
        doc.text(kpi.label, x + 3.5, kpiCardY + 7);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(kpi.highlight ? 255 : 30, kpi.highlight ? 255 : 30, kpi.highlight ? 255 : 30);
        doc.text(kpi.val, x + 3.5, kpiCardY + 18);
      });

      currentY = kpiCardY + kpiCardH + 14;

      // 4. TABELAS DETALHADAS
      const drawSectionHeader = (title: string, y: number) => {
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(20, 20, 20);
        doc.text(title, MARGIN, y);

        const tableY = y + 4;
        doc.setFillColor(18, 18, 18);
        doc.rect(MARGIN, tableY, CONTENT_WIDTH, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text('MÉTRICA / INDICADOR', MARGIN + 4, tableY + 5.5);
        doc.text('RESULTADO', MARGIN + CONTENT_WIDTH - 45, tableY + 5.5);
        return tableY + 8;
      };

      const drawTableRow = (label: string, value: string, y: number, isAlt: boolean, isTotal = false) => {
        if (isTotal) {
          doc.setFillColor(240, 240, 240);
          doc.rect(MARGIN, y, CONTENT_WIDTH, 8.5, 'F');
          doc.setTextColor(15, 15, 15);
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'bold');
        } else {
          if (isAlt) {
            doc.setFillColor(250, 250, 250);
            doc.rect(MARGIN, y, CONTENT_WIDTH, 8, 'F');
          }
          doc.setTextColor(55, 55, 55);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
        }

        doc.text(label, MARGIN + 4, y + (isTotal ? 6 : 5.5));
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(isTotal ? 0 : 30, isTotal ? 0 : 30, isTotal ? 0 : 30);
        doc.text(value, MARGIN + CONTENT_WIDTH - 45, y + (isTotal ? 6 : 5.5));
        return y + (isTotal ? 8.5 : 8);
      };

      // SEÇÃO 1: ORÇAMENTOS NOVOS NO DIA
      currentY = drawSectionHeader('ORÇAMENTOS NOVOS NO DIA', currentY);
      currentY = drawTableRow('Quantos Orçamentos', currentData.orcamentosNovos || '0', currentY, false);
      currentY = drawTableRow('Quantas Vendas', currentData.vendasNovos || '0', currentY, true);
      currentY = drawTableRow('Valor de Venda', currentData.valorVendaNovos || 'R$ 0,00', currentY, false);
      currentY = drawTableRow('Taxa de Conversão (Novos)', `${summary.taxaConversaoNovos.toFixed(1)}%`, currentY, true);

      currentY += 12;

      // SEÇÃO 2: TRABALHO NA BASE
      currentY = drawSectionHeader('TRABALHO NA BASE', currentY);
      currentY = drawTableRow('Quantos Follow Realizados', currentData.followRealizados || '0', currentY, false);
      currentY = drawTableRow('Valor em Negociação', currentData.valorNegociacaoBase || 'R$ 0,00', currentY, true);
      currentY = drawTableRow('Quantas Vendas', currentData.vendasBase || '0', currentY, false);
      currentY = drawTableRow('Valor de Vendas', currentData.valorVendasBase || 'R$ 0,00', currentY, true);
      currentY = drawTableRow('Taxa de Conversão (Base)', `${summary.taxaConversaoBase.toFixed(1)}%`, currentY, false);

      currentY += 12;

      // SEÇÃO 3: TOTALIZADORES CONSOLIDADOS
      currentY = drawSectionHeader('SÍNTESE CONSOLIDADA DO DIA', currentY);
      currentY = drawTableRow('Total de Vendas Realizadas (Novos + Base)', `${summary.totalVendas} Vendas`, currentY, false);
      currentY = drawTableRow('Ticket Médio Geral por Venda', formatCurrency(summary.ticketMedio), currentY, true);
      currentY = drawTableRow('FATURAMENTO TOTAL REALIZADO', formatCurrency(summary.totalFaturado), currentY, false, true);

      // FOOTER
      doc.setFontSize(7);
      doc.setTextColor(170, 170, 170);
      doc.setFont('helvetica', 'normal');
      const footerText = `FA Closer Hub | Closer: ${selectedCloser} | Emitido em ${format(new Date(), 'dd/MM/yyyy HH:mm')} | Confidencial`;
      doc.text(footerText, MARGIN, 285);

      const cleanCloserName = selectedCloser.toLowerCase();
      const periodoStr = getPdfSafePeriodString();
      doc.save(`Relatorio_Closer_${cleanCloserName}_${periodoStr}.pdf`);

      setPdfGenerated(true);
    } catch (err) {
      console.error(err);
      setError('Ocorreu um erro ao gerar o PDF. Verifique os dados fornecidos.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] text-gray-100 font-sans flex items-center justify-center p-3 sm:p-6 relative overflow-hidden">
      {/* Subtle Premium Animated Background */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none fade-in-grid">
        <div className="absolute inset-0 bg-grid-pattern [mask-image:radial-gradient(ellipse_at_center,white,transparent_85%)] animate-grid-scroll"></div>
      </div>

      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-white/[0.02] blur-[120px] rounded-full pointer-events-none z-0"></div>

      {/* Main Container */}
      <div className="w-full max-w-6xl flex flex-col md:flex-row relative z-10 bg-[#0A0A0A] border border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.8)] rounded-[24px] overflow-hidden min-h-[750px] h-[92vh] max-h-[1200px]">
        {/* Sidebar Institucional & Closer Switcher */}
        <aside className="w-full md:w-[290px] bg-[#070707] border-r border-white/[0.06] p-6 lg:p-7 flex flex-col shrink-0 flex-none justify-between">
          <div className="space-y-8">
            {/* Logo */}
            <div className="space-y-1.5">
              <img
                src="/logo.png"
                alt="Logo"
                className="h-8 w-auto max-w-[210px] object-contain drop-shadow-[0_0_15px_rgba(200,255,0,0.12)]"
              />
              <p className="text-[10px] text-white/40 font-mono tracking-widest uppercase pl-0.5">
                Hub Closers • Gestão Comercial
              </p>
            </div>

            {/* SELEÇÃO DO CLOSER */}
            <div className="space-y-3">
              <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest px-1">
                Selecionar Closer
              </p>
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#121212] border border-white/[0.06] rounded-xl">
                {(['José', 'Thais'] as CloserName[]).map((closer) => {
                  const isSelected = selectedCloser === closer;
                  return (
                    <button
                      key={closer}
                      onClick={() => {
                        setSelectedCloser(closer);
                        setError(null);
                        setPdfGenerated(false);
                      }}
                      className={`relative py-2.5 px-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                        isSelected
                          ? 'bg-white text-black shadow-[0_2px_10px_rgba(255,255,255,0.2)]'
                          : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      <User size={14} className={isSelected ? 'text-black' : 'text-white/40'} />
                      {closer}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Resumo Rápido na Sidebar */}
            <div className="p-4 rounded-xl bg-[#111111] border border-white/[0.05] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">
                  Status de {selectedCloser}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Ativo
                </span>
              </div>

              <div className="pt-2 border-t border-white/[0.04] space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/50">Total Vendas:</span>
                  <span className="font-semibold text-white font-mono">{summary.totalVendas} un</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/50">Faturamento:</span>
                  <span className="font-semibold text-white font-mono">
                    {formatCurrency(summary.totalFaturado)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* User Session Info */}
          <div className="pt-6 border-t border-white/[0.06] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/70">
              <UserCheck size={16} />
            </div>
            <div>
              <p className="text-xs font-semibold text-white/90">Painel do Closer</p>
              <p className="text-[10px] text-white/40 tracking-wider uppercase">Ambiente Seguro</p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto px-5 py-7 md:p-10 custom-scrollbar relative bg-[#060606]">
          <div className="w-full max-w-3xl mx-auto space-y-7 pb-8">
            {/* Header & Date Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-md bg-white/[0.08] text-white/80 text-[11px] font-mono font-medium tracking-wide">
                    Closer: {selectedCloser}
                  </span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Preenchimento de Métricas
                </h1>
                <p className="text-white/40 text-xs mt-0.5">
                  Informe os orçamentos novos e o trabalho na base do dia.
                </p>
              </div>

              {/* DATE PICKER */}
              <div className="relative" ref={calendarRef}>
                <button
                  onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                  className={`flex items-center gap-2.5 bg-[#111111] border rounded-xl py-2.5 px-4 text-xs font-medium transition-all focus:outline-none hover:border-white/20 ${
                    isCalendarOpen
                      ? 'border-white/30 ring-1 ring-white/20 text-white'
                      : 'border-white/10 text-white/80'
                  }`}
                >
                  <CalendarIcon size={14} className="text-white/50" />
                  <span>{formatPeriod()}</span>
                  <ChevronDown
                    size={14}
                    className={`text-white/40 transition-transform ${
                      isCalendarOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {isCalendarOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 5, scale: 0.98 }}
                      transition={{ duration: 0.18 }}
                      className="absolute z-50 top-12 right-0 p-4 bg-[#0F0F0F] border border-white/[0.1] rounded-2xl shadow-2xl shadow-black"
                    >
                      <style
                        dangerouslySetInnerHTML={{
                          __html: `
                          .rdp-root {
                            --rdp-accent-color: #ffffff;
                            --rdp-background-color: rgba(255, 255, 255, 0.08);
                            --rdp-day-height: 38px;
                            --rdp-day-width: 38px;
                            --rdp-day_button-border-radius: 8px;
                            --rdp-selected-color: #000;
                            --rdp-selected-font: bold;
                            --rdp-margin: 0;
                            color: rgba(255,255,255,0.85);
                          }
                          .rdp-caption_label {
                            text-transform: capitalize;
                            font-weight: 600;
                            font-size: 0.95rem;
                            color: #ffffff;
                          }
                          .rdp-weekday {
                            text-transform: uppercase;
                            font-size: 0.68rem;
                            color: rgba(255, 255, 255, 0.35);
                            font-weight: 600;
                          }
                          .rdp-nav_button {
                            color: rgba(255, 255, 255, 0.5);
                          }
                          .rdp-nav_button:hover {
                            background-color: rgba(255, 255, 255, 0.08);
                            color: #ffffff;
                          }
                          .rdp-day_button:hover:not([disabled]):not(.rdp-selected) {
                            background-color: rgba(255, 255, 255, 0.08);
                            color: #ffffff;
                          }
                          .rdp-selected {
                            background-color: transparent !important;
                          }
                          .rdp-day_button.rdp-range_start, 
                          .rdp-day_button.rdp-range_end,
                          .rdp-range_start .rdp-day_button,
                          .rdp-range_end .rdp-day_button {
                            background-color: #ffffff !important;
                            color: #000000 !important;
                            font-weight: bold !important;
                            border-radius: 8px !important;
                          }
                          .rdp-day_button.rdp-range_middle,
                          .rdp-range_middle .rdp-day_button {
                            background-color: rgba(255, 255, 255, 0.08) !important;
                            color: #ffffff !important;
                            border-radius: 0 !important;
                          }
                          .rdp-outside {
                            color: rgba(255, 255, 255, 0.15) !important;
                          }
                        `
                        }}
                      />
                      <DayPicker
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        locale={ptBR}
                        numberOfMonths={1}
                        className="bg-transparent"
                      />
                      <div className="mt-3 pt-3 border-t border-white/[0.08] flex justify-end">
                        <button
                          onClick={() => setIsCalendarOpen(false)}
                          className="px-3.5 py-1.5 bg-white text-black text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Confirmar Período
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* LIVE KPI DASHBOARD STRIP */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#0E0E0E] border border-white/[0.06] rounded-xl p-3.5 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Total Vendas
                </span>
                <p className="text-xl font-bold text-white font-mono mt-1">
                  {summary.totalVendas}
                </p>
                <span className="text-[10px] text-white/40 mt-1">
                  {summary.vNovos} novos + {summary.vBase} base
                </span>
              </div>

              <div className="bg-[#0E0E0E] border border-white/[0.06] rounded-xl p-3.5 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Faturamento
                </span>
                <p className="text-xl font-bold text-white font-mono mt-1 truncate">
                  {formatCurrency(summary.totalFaturado)}
                </p>
                <span className="text-[10px] text-white/40 mt-1">Vendas consolidadas</span>
              </div>

              <div className="bg-[#0E0E0E] border border-white/[0.06] rounded-xl p-3.5 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Em Negociação
                </span>
                <p className="text-xl font-bold text-white/80 font-mono mt-1 truncate">
                  {formatCurrency(summary.valNegociacao)}
                </p>
                <span className="text-[10px] text-white/40 mt-1">Trabalho na base</span>
              </div>

              <div className="bg-[#0E0E0E] border border-white/[0.06] rounded-xl p-3.5 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Conversão Geral
                </span>
                <p className="text-xl font-bold text-emerald-400 font-mono mt-1">
                  {summary.conversaoGeral.toFixed(1)}%
                </p>
                <span className="text-[10px] text-emerald-400/60 mt-1">Eficiência global</span>
              </div>
            </div>

            {/* BLOCO 1: ORÇAMENTOS NOVOS NO DIA */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-[#0E0E0E] border border-white/[0.07] rounded-2xl p-6 sm:p-7 shadow-lg"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/70">
                    <PieChart size={16} />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold text-white tracking-wide">
                      ORÇAMENTOS NOVOS NO DIA
                    </h2>
                    <p className="text-[11px] text-white/40">
                      Métricas de primeiras abordagens e novos orçamentos
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Quantos Orçamentos */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">
                    Quantos Orçamentos
                  </label>
                  <div className="relative group">
                    <Hash
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/70 transition-colors"
                      size={15}
                    />
                    <input
                      type="number"
                      placeholder="0"
                      value={currentData.orcamentosNovos}
                      onChange={(e) => handleChange('orcamentosNovos', e.target.value)}
                      className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/40 transition-all placeholder:text-white/20 font-mono hover:border-white/20"
                    />
                  </div>
                </div>

                {/* Quantas Vendas */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">
                    Quantas Vendas
                  </label>
                  <div className="relative group">
                    <CheckCircle2
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/70 transition-colors"
                      size={15}
                    />
                    <input
                      type="number"
                      placeholder="0"
                      value={currentData.vendasNovos}
                      onChange={(e) => handleChange('vendasNovos', e.target.value)}
                      className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/40 transition-all placeholder:text-white/20 font-mono hover:border-white/20"
                    />
                  </div>
                </div>

                {/* Valor de Venda */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">
                    Valor de Venda
                  </label>
                  <div className="relative group">
                    <DollarSign
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/70 transition-colors"
                      size={15}
                    />
                    <input
                      type="text"
                      placeholder="R$ 0,00"
                      value={currentData.valorVendaNovos}
                      onChange={(e) => handleCurrencyInput('valorVendaNovos', e.target.value)}
                      className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/40 transition-all placeholder:text-white/20 font-mono hover:border-white/20"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* BLOCO 2: TRABALHO NA BASE */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.08 }}
              className="bg-[#0E0E0E] border border-white/[0.07] rounded-2xl p-6 sm:p-7 shadow-lg"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/70">
                    <BarChart3 size={16} />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold text-white tracking-wide">
                      TRABALHO NA BASE
                    </h2>
                    <p className="text-[11px] text-white/40">
                      Métricas de follow-up, negociação ativa e vendas recuperadas
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Quantos Follow Realizados */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">
                    Quantos Follow Realizados
                  </label>
                  <div className="relative group">
                    <Hash
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/70 transition-colors"
                      size={15}
                    />
                    <input
                      type="number"
                      placeholder="0"
                      value={currentData.followRealizados}
                      onChange={(e) => handleChange('followRealizados', e.target.value)}
                      className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/40 transition-all placeholder:text-white/20 font-mono hover:border-white/20"
                    />
                  </div>
                </div>

                {/* Valor em Negociação */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">
                    Valor em Negociação
                  </label>
                  <div className="relative group">
                    <DollarSign
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/70 transition-colors"
                      size={15}
                    />
                    <input
                      type="text"
                      placeholder="R$ 0,00"
                      value={currentData.valorNegociacaoBase}
                      onChange={(e) => handleCurrencyInput('valorNegociacaoBase', e.target.value)}
                      className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/40 transition-all placeholder:text-white/20 font-mono hover:border-white/20"
                    />
                  </div>
                </div>

                {/* Quantas Vendas */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">
                    Quantas Vendas
                  </label>
                  <div className="relative group">
                    <CheckCircle2
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/70 transition-colors"
                      size={15}
                    />
                    <input
                      type="number"
                      placeholder="0"
                      value={currentData.vendasBase}
                      onChange={(e) => handleChange('vendasBase', e.target.value)}
                      className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/40 transition-all placeholder:text-white/20 font-mono hover:border-white/20"
                    />
                  </div>
                </div>

                {/* Valor de Vendas */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">
                    Valor de Vendas
                  </label>
                  <div className="relative group">
                    <DollarSign
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/70 transition-colors"
                      size={15}
                    />
                    <input
                      type="text"
                      placeholder="R$ 0,00"
                      value={currentData.valorVendasBase}
                      onChange={(e) => handleCurrencyInput('valorVendasBase', e.target.value)}
                      className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/40 transition-all placeholder:text-white/20 font-mono hover:border-white/20"
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
                  <AlertCircle size={18} className="text-red-400 shrink-0" />
                  <span className="text-sm font-medium">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <motion.button
                whileHover={{ scale: 1.008 }}
                whileTap={{ scale: 0.985 }}
                onClick={generatePDF}
                disabled={isGenerating}
                className="w-full py-4 bg-white hover:bg-gray-100 text-black rounded-xl font-bold text-sm shadow-[0_4px_20px_rgba(255,255,255,0.1)] transition-all flex justify-center items-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed uppercase tracking-wider"
              >
                {isGenerating ? (
                  <div className="w-5 h-5 border-[2px] border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <FileText size={17} className="text-black" />
                    Gerar Relatório de {selectedCloser} (PDF)
                  </>
                )}
              </motion.button>
            </div>

            {/* Success States */}
            <AnimatePresence>
              {pdfGenerated && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-2 text-center overflow-hidden pb-2"
                >
                  <p className="text-white/80 text-sm font-medium flex items-center justify-center gap-2 mb-2">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    Relatório de {selectedCloser} gerado e baixado com sucesso!
                  </p>
                  <button
                    onClick={generatePDF}
                    className="text-white/40 hover:text-white transition-colors text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 mx-auto"
                  >
                    <Download size={13} /> Baixar novamente
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      <style
        dangerouslySetInnerHTML={{
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
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.08);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(255, 255, 255, 0.16);
        }
      `
        }}
      />
    </div>
  );
}
