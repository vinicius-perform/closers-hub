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
  UserCheck,
  LayoutDashboard,
  Wallet
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
  valorContratoNovos: string;
  cashColetadoNovos: string;

  // Trabalho na Base
  followRealizados: string;
  valorNegociacaoBase: string;
  vendasBase: string;
  valorContratoBase: string;
  cashColetadoBase: string;
}

const INITIAL_CLOSER_STATE: CloserFormData = {
  orcamentosNovos: '',
  vendasNovos: '',
  valorContratoNovos: '',
  cashColetadoNovos: '',
  followRealizados: '',
  valorNegociacaoBase: '',
  vendasBase: '',
  valorContratoBase: '',
  cashColetadoBase: ''
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
    const valContratoNovos = parseCurrency(currentData.valorContratoNovos);
    const cashNovos = parseCurrency(currentData.cashColetadoNovos);

    const fRealizados = parseInt(currentData.followRealizados, 10) || 0;
    const valNegociacao = parseCurrency(currentData.valorNegociacaoBase);
    const vBase = parseInt(currentData.vendasBase, 10) || 0;
    const valContratoBase = parseCurrency(currentData.valorContratoBase);
    const cashBase = parseCurrency(currentData.cashColetadoBase);

    const totalVendas = vNovos + vBase;
    const totalContratos = valContratoNovos + valContratoBase;
    const totalCashColetado = cashNovos + cashBase;
    const ticketMedio = totalVendas > 0 ? totalContratos / totalVendas : 0;
    const taxaConversaoNovos = orcNovos > 0 ? (vNovos / orcNovos) * 100 : 0;
    const taxaConversaoBase = fRealizados > 0 ? (vBase / fRealizados) * 100 : 0;
    const totalInteracoes = orcNovos + fRealizados;
    const conversaoGeral = totalInteracoes > 0 ? (totalVendas / totalInteracoes) * 100 : 0;

    return {
      orcNovos,
      vNovos,
      valContratoNovos,
      cashNovos,
      fRealizados,
      valNegociacao,
      vBase,
      valContratoBase,
      cashBase,
      totalVendas,
      totalContratos,
      totalCashColetado,
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
      d.valorContratoNovos === '' &&
      d.cashColetadoNovos === '' &&
      d.followRealizados === '' &&
      d.valorNegociacaoBase === '' &&
      d.vendasBase === '' &&
      d.valorContratoBase === '' &&
      d.cashColetadoBase === ''
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
        doc.setDrawColor(225, 230, 240);
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
        doc.setFillColor(11, 13, 19);
        doc.roundedRect(MARGIN, currentY, 48, 12, 2, 2, 'F');
        doc.addImage(img, 'PNG', MARGIN + 2, currentY + 2, 44, 8);
        headerOffset = 54;
      } catch {
        doc.setFillColor(198, 245, 0);
        doc.roundedRect(MARGIN, currentY, 12, 12, 2.5, 2.5, 'F');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('FA', MARGIN + 3.2, currentY + 8);
      }

      doc.setTextColor(11, 13, 19);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(`RELATÓRIO INDIVIDUAL DE CLOSER`, MARGIN + headerOffset, currentY + 8.5);

      doc.setFontSize(8);
      doc.setTextColor(110, 122, 145);
      doc.setFont('helvetica', 'normal');
      doc.text('INTELIGÊNCIA COMERCIAL', MARGIN + CONTENT_WIDTH - 38, currentY + 8.5);

      currentY += 16;
      drawDivider(currentY);
      currentY += 10;

      // 2. INFORMAÇÕES DO CLOSER
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(90, 105, 130);
      doc.text('INFORMAÇÕES GERAIS', MARGIN, currentY);
      currentY += 8;

      const colWidth = CONTENT_WIDTH / 2;
      const drawInfoItem = (label: string, value: string, x: number, y: number) => {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 135, 155);
        doc.text(label, x, y);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 20, 30);
        doc.text(value, x, y + 5.5);
      };

      drawInfoItem('Closer Responsável:', selectedCloser, MARGIN, currentY);
      drawInfoItem('Período de Análise:', formatPeriod(), MARGIN + colWidth, currentY);
      currentY += 16;

      // 3. CARDS DE RESUMO EXECUTIVO (4 KPIs)
      const kpiCardY = currentY;
      const kpiCardH = 26;
      const kpiW = (CONTENT_WIDTH - 9) / 4;

      const kpis = [
        { label: 'VALOR DE CONTRATO', val: formatCurrency(summary.totalContratos), highlight: true },
        { label: 'CASH COLETADO', val: formatCurrency(summary.totalCashColetado), highlight: true },
        { label: 'TOTAL DE VENDAS', val: `${summary.totalVendas} Vendas`, highlight: false },
        { label: 'EM NEGOCIAÇÃO', val: formatCurrency(summary.valNegociacao), highlight: false }
      ];

      kpis.forEach((kpi, idx) => {
        const x = MARGIN + idx * (kpiW + 3);
        if (kpi.highlight) {
          doc.setFillColor(11, 13, 19);
          doc.setDrawColor(11, 13, 19);
        } else {
          doc.setFillColor(248, 250, 253);
          doc.setDrawColor(220, 226, 238);
        }
        doc.roundedRect(x, kpiCardY, kpiW, kpiCardH, 2.5, 2.5, 'FD');

        doc.setFontSize(6.2);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(kpi.highlight ? 198 : 100, kpi.highlight ? 245 : 115, kpi.highlight ? 0 : 135);
        doc.text(kpi.label, x + 3, kpiCardY + 7);

        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(kpi.highlight ? 255 : 20, kpi.highlight ? 255 : 25, kpi.highlight ? 255 : 35);
        doc.text(kpi.val, x + 3, kpiCardY + 18);
      });

      currentY = kpiCardY + kpiCardH + 14;

      // 4. TABELAS DETALHADAS
      const drawSectionHeader = (title: string, y: number) => {
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 20, 30);
        doc.text(title, MARGIN, y);

        const tableY = y + 4;
        doc.setFillColor(11, 13, 19);
        doc.rect(MARGIN, tableY, CONTENT_WIDTH, 8, 'F');
        doc.setTextColor(198, 245, 0);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text('MÉTRICA / INDICADOR', MARGIN + 4, tableY + 5.5);
        doc.text('RESULTADO', MARGIN + CONTENT_WIDTH - 45, tableY + 5.5);
        return tableY + 8;
      };

      const drawTableRow = (label: string, value: string, y: number, isAlt: boolean, isTotal = false) => {
        if (isTotal) {
          doc.setFillColor(235, 240, 250);
          doc.rect(MARGIN, y, CONTENT_WIDTH, 8.5, 'F');
          doc.setTextColor(10, 15, 25);
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'bold');
        } else {
          if (isAlt) {
            doc.setFillColor(248, 250, 254);
            doc.rect(MARGIN, y, CONTENT_WIDTH, 8, 'F');
          }
          doc.setTextColor(45, 55, 75);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
        }

        doc.text(label, MARGIN + 4, y + (isTotal ? 6 : 5.5));
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(isTotal ? 0 : 25, isTotal ? 0 : 30, isTotal ? 0 : 40);
        doc.text(value, MARGIN + CONTENT_WIDTH - 45, y + (isTotal ? 6 : 5.5));
        return y + (isTotal ? 8.5 : 8);
      };

      // SEÇÃO 1: ORÇAMENTOS NOVOS NO DIA
      currentY = drawSectionHeader('ORÇAMENTOS NOVOS NO DIA', currentY);
      currentY = drawTableRow('Quantos Orçamentos', currentData.orcamentosNovos || '0', currentY, false);
      currentY = drawTableRow('Quantas Vendas', currentData.vendasNovos || '0', currentY, true);
      currentY = drawTableRow('Valor de Contrato', currentData.valorContratoNovos || 'R$ 0,00', currentY, false);
      currentY = drawTableRow('Cash Coletado', currentData.cashColetadoNovos || 'R$ 0,00', currentY, true);
      currentY = drawTableRow('Taxa de Conversão (Novos)', `${summary.taxaConversaoNovos.toFixed(1)}%`, currentY, false);

      currentY += 12;

      // SEÇÃO 2: TRABALHO NA BASE
      currentY = drawSectionHeader('TRABALHO NA BASE', currentY);
      currentY = drawTableRow('Quantos Follow Realizados', currentData.followRealizados || '0', currentY, false);
      currentY = drawTableRow('Valor em Negociação', currentData.valorNegociacaoBase || 'R$ 0,00', currentY, true);
      currentY = drawTableRow('Quantas Vendas', currentData.vendasBase || '0', currentY, false);
      currentY = drawTableRow('Valor de Contrato', currentData.valorContratoBase || 'R$ 0,00', currentY, true);
      currentY = drawTableRow('Cash Coletado', currentData.cashColetadoBase || 'R$ 0,00', currentY, false);
      currentY = drawTableRow('Taxa de Conversão (Base)', `${summary.taxaConversaoBase.toFixed(1)}%`, currentY, true);

      currentY += 12;

      // SEÇÃO 3: TOTALIZADORES CONSOLIDADOS
      currentY = drawSectionHeader('SÍNTESE CONSOLIDADA DO DIA', currentY);
      currentY = drawTableRow('Total de Vendas Realizadas (Novos + Base)', `${summary.totalVendas} Vendas`, currentY, false);
      currentY = drawTableRow('Ticket Médio Geral por Venda', formatCurrency(summary.ticketMedio), currentY, true);
      currentY = drawTableRow('TOTAL EM CONTRATOS FECHADOS', formatCurrency(summary.totalContratos), currentY, false);
      currentY = drawTableRow('TOTAL CASH COLETADO (RECEITA)', formatCurrency(summary.totalCashColetado), currentY, false, true);

      // FOOTER
      doc.setFontSize(7);
      doc.setTextColor(150, 160, 175);
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
    <div className="min-h-screen bg-[#090B10] text-gray-100 font-sans flex items-center justify-center p-3 sm:p-6 relative overflow-hidden">
      {/* Subtle Premium Animated Background with Fazendo Acontecer Lime Tint */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none fade-in-grid">
        <div className="absolute inset-0 bg-grid-pattern [mask-image:radial-gradient(ellipse_at_center,white,transparent_85%)] animate-grid-scroll"></div>
      </div>

      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#C6F500]/[0.025] blur-[150px] rounded-full pointer-events-none z-0"></div>

      {/* Main Container */}
      <div className="w-full max-w-6xl flex flex-col md:flex-row relative z-10 bg-[#0E1017] border border-[#222736] shadow-[0_25px_70px_rgba(0,0,0,0.85)] rounded-[24px] overflow-hidden min-h-[750px] h-[92vh] max-h-[1200px]">
        {/* Sidebar Institucional & Closer Switcher */}
        <aside className="w-full md:w-[290px] bg-[#0A0C12] border-r border-[#1B1F2C] p-6 lg:p-7 flex flex-col shrink-0 flex-none justify-between">
          <div className="space-y-7">
            {/* Logo */}
            <div className="space-y-1.5">
              <img
                src="/logo.png"
                alt="Fazendo Acontecer"
                className="h-8 w-auto max-w-[210px] object-contain drop-shadow-[0_0_20px_rgba(198,245,0,0.25)]"
              />
              <p className="text-[10px] text-[#7E8B9F] font-mono tracking-widest uppercase pl-0.5 font-medium">
                Hub Closers • Gestão
              </p>
            </div>

            {/* SEÇÃO MENU PRINCIPAL / SELEÇÃO DO CLOSER */}
            <div className="space-y-3">
              <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest px-1 flex items-center justify-between">
                <span>Menu Principal</span>
                <span className="text-[9px] font-mono bg-[#161924] text-[#94A3B8] px-1.5 py-0.5 rounded border border-[#232838]">
                  CLOSERS
                </span>
              </p>

              {/* Selector Pills with Fazendo Acontecer Lime Active Theme */}
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#121520] border border-[#202535] rounded-xl">
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
                      className={`relative py-2.5 px-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                        isSelected
                          ? 'bg-[#C6F500] text-black shadow-[0_0_20px_rgba(198,245,0,0.35)] scale-[1.02]'
                          : 'text-[#94A3B8] hover:text-white hover:bg-[#181C2B]'
                      }`}
                    >
                      <User size={14} className={isSelected ? 'text-black' : 'text-[#64748B]'} />
                      {closer}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Menu Active Pill Item */}
            <div className="space-y-2">
              <div className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-[#C6F500] text-black font-bold text-sm shadow-[0_0_25px_rgba(198,245,0,0.22)]">
                <div className="flex items-center gap-2.5">
                  <LayoutDashboard size={17} className="text-black" />
                  <span>Dashboard</span>
                </div>
                <ChevronDown size={16} className="text-black" />
              </div>

              <div className="pl-4 pt-1">
                <div className="w-full px-3.5 py-2.5 rounded-lg bg-[#161924] border border-[#232838] text-white text-xs font-semibold flex items-center justify-between">
                  <span>Visão Geral • {selectedCloser}</span>
                  <span className="w-2 h-2 rounded-full bg-[#C6F500] shadow-[0_0_8px_#C6F500]"></span>
                </div>
              </div>
            </div>

            {/* Resumo Rápido na Sidebar */}
            <div className="p-4 rounded-xl bg-[#121520] border border-[#202535] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#7E8B9F] uppercase tracking-wider font-semibold">
                  Métricas de {selectedCloser}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#C6F500] bg-[#C6F500]/10 px-2 py-0.5 rounded-full border border-[#C6F500]/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C6F500] animate-pulse"></span>
                  Ativo
                </span>
              </div>

              <div className="pt-2 border-t border-[#1C2130] space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#8F9CAE]">Total Vendas:</span>
                  <span className="font-bold text-white font-mono">{summary.totalVendas} un</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#8F9CAE]">Valor Contrato:</span>
                  <span className="font-bold text-white font-mono">
                    {formatCurrency(summary.totalContratos)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#8F9CAE]">Cash Coletado:</span>
                  <span className="font-bold text-[#C6F500] font-mono">
                    {formatCurrency(summary.totalCashColetado)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* User Session Info */}
          <div className="pt-5 border-t border-[#1B1F2C] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#141824] border border-[#222738] flex items-center justify-center text-[#C6F500]">
              <UserCheck size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Painel do Closer</p>
              <p className="text-[10px] text-[#64748B] tracking-wider uppercase font-mono">Ambiente Seguro</p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto px-5 py-7 md:p-10 custom-scrollbar relative bg-[#0B0D13]">
          <div className="w-full max-w-3xl mx-auto space-y-7 pb-8">
            {/* Header & Date Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C2130] pb-6">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-md bg-[#C6F500]/10 border border-[#C6F500]/25 text-[#C6F500] text-[11px] font-mono font-bold tracking-wide">
                    Closer: {selectedCloser}
                  </span>
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight text-white">
                  Preenchimento de Métricas
                </h1>
                <p className="text-[#7E8B9F] text-xs mt-0.5">
                  Informe os orçamentos novos e o trabalho na base do dia.
                </p>
              </div>

              {/* DATE PICKER */}
              <div className="relative" ref={calendarRef}>
                <button
                  onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                  className={`flex items-center gap-2.5 bg-[#121520] border rounded-xl py-2.5 px-4 text-xs font-semibold transition-all focus:outline-none hover:border-[#C6F500]/40 ${
                    isCalendarOpen
                      ? 'border-[#C6F500] ring-1 ring-[#C6F500]/30 text-white'
                      : 'border-[#222738] text-white/90'
                  }`}
                >
                  <CalendarIcon size={14} className="text-[#C6F500]" />
                  <span>{formatPeriod()}</span>
                  <ChevronDown
                    size={14}
                    className={`text-[#7E8B9F] transition-transform ${
                      isCalendarOpen ? 'rotate-180 text-[#C6F500]' : ''
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
                      className="absolute z-50 top-12 right-0 p-4 bg-[#0E1119] border border-[#242A3D] rounded-2xl shadow-2xl shadow-black"
                    >
                      <style
                        dangerouslySetInnerHTML={{
                          __html: `
                          .rdp-root {
                            --rdp-accent-color: #C6F500;
                            --rdp-background-color: rgba(198, 245, 0, 0.12);
                            --rdp-day-height: 38px;
                            --rdp-day-width: 38px;
                            --rdp-day_button-border-radius: 8px;
                            --rdp-selected-color: #000000;
                            --rdp-selected-font: bold;
                            --rdp-margin: 0;
                            color: #E2E8F0;
                          }
                          .rdp-caption_label {
                            text-transform: capitalize;
                            font-weight: bold;
                            font-size: 0.95rem;
                            color: #FFFFFF;
                          }
                          .rdp-weekday {
                            text-transform: uppercase;
                            font-size: 0.68rem;
                            color: #64748B;
                            font-weight: 700;
                          }
                          .rdp-nav_button {
                            color: #94A3B8;
                          }
                          .rdp-nav_button:hover {
                            background-color: rgba(198, 245, 0, 0.15);
                            color: #C6F500;
                          }
                          .rdp-day_button:hover:not([disabled]):not(.rdp-selected) {
                            background-color: rgba(198, 245, 0, 0.15);
                            color: #C6F500;
                          }
                          .rdp-selected {
                            background-color: transparent !important;
                          }
                          .rdp-day_button.rdp-range_start, 
                          .rdp-day_button.rdp-range_end,
                          .rdp-range_start .rdp-day_button,
                          .rdp-range_end .rdp-day_button {
                            background-color: #C6F500 !important;
                            color: #000000 !important;
                            font-weight: bold !important;
                            border-radius: 8px !important;
                          }
                          .rdp-day_button.rdp-range_middle,
                          .rdp-range_middle .rdp-day_button {
                            background-color: rgba(198, 245, 0, 0.15) !important;
                            color: #C6F500 !important;
                            border-radius: 0 !important;
                          }
                          .rdp-outside {
                            color: #334155 !important;
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
                      <div className="mt-3 pt-3 border-t border-[#1E2435] flex justify-end">
                        <button
                          onClick={() => setIsCalendarOpen(false)}
                          className="px-3.5 py-1.5 bg-[#C6F500] text-black text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-[#B8E600] transition-colors"
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
              <div className="bg-[#11141F] border border-[#202638] rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7E8B9F]">
                  Total Vendas
                </span>
                <p className="text-xl font-extrabold text-white font-mono mt-1">
                  {summary.totalVendas}
                </p>
                <span className="text-[10px] text-[#64748B] mt-1">
                  {summary.vNovos} novos + {summary.vBase} base
                </span>
              </div>

              <div className="bg-[#11141F] border border-[#202638] rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7E8B9F]">
                  Valor Contrato
                </span>
                <p className="text-xl font-extrabold text-white font-mono mt-1 truncate">
                  {formatCurrency(summary.totalContratos)}
                </p>
                <span className="text-[10px] text-[#64748B] mt-1">Contratos fechados</span>
              </div>

              <div className="bg-[#11141F] border border-[#202638] rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7E8B9F]">
                  Cash Coletado
                </span>
                <p className="text-xl font-extrabold text-[#C6F500] font-mono mt-1 truncate">
                  {formatCurrency(summary.totalCashColetado)}
                </p>
                <span className="text-[10px] text-[#C6F500]/70 mt-1 font-medium">Receita recebida</span>
              </div>

              <div className="bg-[#11141F] border border-[#202638] rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7E8B9F]">
                  Em Negociação
                </span>
                <p className="text-xl font-extrabold text-white/80 font-mono mt-1 truncate">
                  {formatCurrency(summary.valNegociacao)}
                </p>
                <span className="text-[10px] text-[#64748B] mt-1">Trabalho na base</span>
              </div>
            </div>

            {/* BLOCO 1: ORÇAMENTOS NOVOS NO DIA */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-[#11141F] border border-[#202638] rounded-2xl p-6 sm:p-7 shadow-lg"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#C6F500]/10 border border-[#C6F500]/20 flex items-center justify-center text-[#C6F500]">
                    <PieChart size={16} />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold text-white tracking-wide">
                      ORÇAMENTOS NOVOS NO DIA
                    </h2>
                    <p className="text-[11px] text-[#7E8B9F]">
                      Métricas de primeiras abordagens e novos orçamentos
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Quantos Orçamentos */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#8F9CAE] uppercase tracking-wider">
                    Quantos Orçamentos
                  </label>
                  <div className="relative group">
                    <Hash
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#C6F500] transition-colors"
                      size={15}
                    />
                    <input
                      type="number"
                      placeholder="0"
                      value={currentData.orcamentosNovos}
                      onChange={(e) => handleChange('orcamentosNovos', e.target.value)}
                      className="w-full bg-[#090B10] border border-[#1E2436] rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#C6F500]/40 focus:border-[#C6F500]/60 transition-all placeholder:text-[#475569] font-mono hover:border-[#2D364D]"
                    />
                  </div>
                </div>

                {/* Quantas Vendas */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#8F9CAE] uppercase tracking-wider">
                    Quantas Vendas
                  </label>
                  <div className="relative group">
                    <CheckCircle2
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#C6F500] transition-colors"
                      size={15}
                    />
                    <input
                      type="number"
                      placeholder="0"
                      value={currentData.vendasNovos}
                      onChange={(e) => handleChange('vendasNovos', e.target.value)}
                      className="w-full bg-[#090B10] border border-[#1E2436] rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#C6F500]/40 focus:border-[#C6F500]/60 transition-all placeholder:text-[#475569] font-mono hover:border-[#2D364D]"
                    />
                  </div>
                </div>

                {/* Valor de Contrato */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#8F9CAE] uppercase tracking-wider">
                    Valor de Contrato
                  </label>
                  <div className="relative group">
                    <DollarSign
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#C6F500] transition-colors"
                      size={15}
                    />
                    <input
                      type="text"
                      placeholder="R$ 0,00"
                      value={currentData.valorContratoNovos}
                      onChange={(e) => handleCurrencyInput('valorContratoNovos', e.target.value)}
                      className="w-full bg-[#090B10] border border-[#1E2436] rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#C6F500]/40 focus:border-[#C6F500]/60 transition-all placeholder:text-[#475569] font-mono hover:border-[#2D364D]"
                    />
                  </div>
                </div>

                {/* Cash Coletado */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#C6F500] uppercase tracking-wider flex items-center gap-1.5">
                    <Wallet size={13} className="text-[#C6F500]" />
                    Cash Coletado
                  </label>
                  <div className="relative group">
                    <DollarSign
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C6F500]/60 group-focus-within:text-[#C6F500] transition-colors"
                      size={15}
                    />
                    <input
                      type="text"
                      placeholder="R$ 0,00"
                      value={currentData.cashColetadoNovos}
                      onChange={(e) => handleCurrencyInput('cashColetadoNovos', e.target.value)}
                      className="w-full bg-[#090B10] border border-[#C6F500]/30 rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#C6F500]/50 focus:border-[#C6F500] transition-all placeholder:text-[#475569] font-mono hover:border-[#C6F500]/50"
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
              className="bg-[#11141F] border border-[#202638] rounded-2xl p-6 sm:p-7 shadow-lg"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#C6F500]/10 border border-[#C6F500]/20 flex items-center justify-center text-[#C6F500]">
                    <BarChart3 size={16} />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold text-white tracking-wide">
                      TRABALHO NA BASE
                    </h2>
                    <p className="text-[11px] text-[#7E8B9F]">
                      Métricas de follow-up, negociação ativa e vendas recuperadas
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Quantos Follow Realizados */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#8F9CAE] uppercase tracking-wider">
                    Quantos Follow Realizados
                  </label>
                  <div className="relative group">
                    <Hash
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#C6F500] transition-colors"
                      size={15}
                    />
                    <input
                      type="number"
                      placeholder="0"
                      value={currentData.followRealizados}
                      onChange={(e) => handleChange('followRealizados', e.target.value)}
                      className="w-full bg-[#090B10] border border-[#1E2436] rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#C6F500]/40 focus:border-[#C6F500]/60 transition-all placeholder:text-[#475569] font-mono hover:border-[#2D364D]"
                    />
                  </div>
                </div>

                {/* Valor em Negociação */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#8F9CAE] uppercase tracking-wider">
                    Valor em Negociação
                  </label>
                  <div className="relative group">
                    <DollarSign
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#C6F500] transition-colors"
                      size={15}
                    />
                    <input
                      type="text"
                      placeholder="R$ 0,00"
                      value={currentData.valorNegociacaoBase}
                      onChange={(e) => handleCurrencyInput('valorNegociacaoBase', e.target.value)}
                      className="w-full bg-[#090B10] border border-[#1E2436] rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#C6F500]/40 focus:border-[#C6F500]/60 transition-all placeholder:text-[#475569] font-mono hover:border-[#2D364D]"
                    />
                  </div>
                </div>

                {/* Quantas Vendas */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#8F9CAE] uppercase tracking-wider">
                    Quantas Vendas
                  </label>
                  <div className="relative group">
                    <CheckCircle2
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#C6F500] transition-colors"
                      size={15}
                    />
                    <input
                      type="number"
                      placeholder="0"
                      value={currentData.vendasBase}
                      onChange={(e) => handleChange('vendasBase', e.target.value)}
                      className="w-full bg-[#090B10] border border-[#1E2436] rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#C6F500]/40 focus:border-[#C6F500]/60 transition-all placeholder:text-[#475569] font-mono hover:border-[#2D364D]"
                    />
                  </div>
                </div>

                {/* Valor de Contrato */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#8F9CAE] uppercase tracking-wider">
                    Valor de Contrato
                  </label>
                  <div className="relative group">
                    <DollarSign
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#C6F500] transition-colors"
                      size={15}
                    />
                    <input
                      type="text"
                      placeholder="R$ 0,00"
                      value={currentData.valorContratoBase}
                      onChange={(e) => handleCurrencyInput('valorContratoBase', e.target.value)}
                      className="w-full bg-[#090B10] border border-[#1E2436] rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#C6F500]/40 focus:border-[#C6F500]/60 transition-all placeholder:text-[#475569] font-mono hover:border-[#2D364D]"
                    />
                  </div>
                </div>

                {/* Cash Coletado */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[11px] font-bold text-[#C6F500] uppercase tracking-wider flex items-center gap-1.5">
                    <Wallet size={13} className="text-[#C6F500]" />
                    Cash Coletado
                  </label>
                  <div className="relative group">
                    <DollarSign
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C6F500]/60 group-focus-within:text-[#C6F500] transition-colors"
                      size={15}
                    />
                    <input
                      type="text"
                      placeholder="R$ 0,00"
                      value={currentData.cashColetadoBase}
                      onChange={(e) => handleCurrencyInput('cashColetadoBase', e.target.value)}
                      className="w-full bg-[#090B10] border border-[#C6F500]/30 rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#C6F500]/50 focus:border-[#C6F500] transition-all placeholder:text-[#475569] font-mono hover:border-[#C6F500]/50"
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

            {/* Action Buttons with Fazendo Acontecer Lime Glow */}
            <div className="space-y-3 pt-2">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.985 }}
                onClick={generatePDF}
                disabled={isGenerating}
                className="w-full py-4 bg-[#C6F500] hover:bg-[#B5E200] text-black rounded-xl font-extrabold text-sm shadow-[0_4px_25px_rgba(198,245,0,0.25)] transition-all flex justify-center items-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed uppercase tracking-wider"
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
                  <p className="text-white/90 text-sm font-semibold flex items-center justify-center gap-2 mb-2">
                    <CheckCircle2 size={16} className="text-[#C6F500]" />
                    Relatório de {selectedCloser} gerado e baixado com sucesso!
                  </p>
                  <button
                    onClick={generatePDF}
                    className="text-[#7E8B9F] hover:text-[#C6F500] transition-colors text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 mx-auto font-semibold"
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
            linear-gradient(to right, rgba(198, 245, 0, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(198, 245, 0, 0.04) 1px, transparent 1px);
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
          background-color: rgba(198, 245, 0, 0.15);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(198, 245, 0, 0.3);
        }
      `
        }}
      />
    </div>
  );
}
