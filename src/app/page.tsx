'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import {
  FileText,
  Calendar as CalendarIcon,
  CalendarRange,
  Clock,
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
  Wallet,
  Building2,
  TrendingUp,
  Percent,
  XCircle,
  Sparkles,
  RotateCcw,
  Layers,
  ArrowUpRight,
  Check
} from 'lucide-react';

import { DayPicker, DateRange } from 'react-day-picker';
import 'react-day-picker/style.css';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type TabType = 'diario' | 'semanal';

/* =========================================================================
   BASE DE DADOS: CLOSERS E SEUS CLIENTES ESPECÍFICOS
   ========================================================================= */

const CLOSER_CLIENTS: Record<string, string[]> = {
  'Thais': [
    'Dr. Gabriel',
    'Dr. Tiago Prause',
    'Dra. Samara Pighinelli',
    'Dr. Rodrigo Vieira',
    'Dr Diego Padão',
    'Dr Kleison Resende',
    'Dr. Molino',
    'Dr. Kellison Viana',
    'Dra. Camila Citra',
    'Dra. Mari Masiero'
  ],
  'Elinaldo': [
    'Dra. Judite Costa',
    'Dra Rafaela Nunes',
    'Dr. Rafael Raso',
    'Dr. Francisco Lopes',
    'Dr. Ricardo Raymundi',
    'Dr. Samyr',
    'Dra. Celyne',
    'Dra. Paola Telles',
    'Dra. Reggina Rillo',
    'Dra. Jaqueline',
    'Dra. Layane',
    'Dra. Patrícia Rufino',
    'Dra. Wennya',
    'Dr Hete Maom',
    'Dra Sandy Farias'
  ],
  'José': [
    'Dra. Marcela Fiel',
    'Bodyincision'
  ],
  'Gabriel': [
    'Dr. Fernando Silveira'
  ]
};

const CLOSERS_LIST = Object.keys(CLOSER_CLIENTS);

/* =========================================================================
   INTERFACES & ESTADOS INICIAIS
   ========================================================================= */

// Métricas Diárias
interface CloserFormData {
  orcamentosNovos: string;
  vendasNovos: string;
  valorContratoNovos: string;
  cashColetadoNovos: string;

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

// Métricas Semanais
interface SemanalFormData {
  qtdContratosFechados: string;
  valorTotalFechado: string;

  qtdPropostasNegociacao: string;
  valorEmNegociacao: string;

  qtdPacientesPerdidos: string;
  valorPerdido: string;
}

const INITIAL_SEMANAL_STATE: SemanalFormData = {
  qtdContratosFechados: '',
  valorTotalFechado: '',
  qtdPropostasNegociacao: '',
  valorEmNegociacao: '',
  qtdPacientesPerdidos: '',
  valorPerdido: ''
};

export default function FACloserHub() {
  // Controle de Navegação Principal: Diário vs Semanal
  const [activeTab, setActiveTab] = useState<TabType>('diario');

  // Seleção de Closer e Cliente
  const [selectedCloser, setSelectedCloser] = useState<string>('Thais');
  const [clientName, setClientName] = useState<string>('Dr. Gabriel');

  // Estados dos Dropdowns Suspensos Customizados
  const [isCloserDropdownOpen, setIsCloserDropdownOpen] = useState(false);
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const closerDropdownRef = useRef<HTMLDivElement>(null);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // Estados Globais de Carregamento e Notificações
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Armazenamento de dados diários por chave de Closer + Cliente
  const [closersData, setClosersData] = useState<Record<string, CloserFormData>>({});

  // Armazenamento de dados semanais por chave de Closer + Cliente
  const [semanalData, setSemanalData] = useState<Record<string, SemanalFormData>>({});

  // Número da Semana
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number>(48);

  // Date Range State para o Diário
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date()
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Fechar menus suspensos ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
      if (closerDropdownRef.current && !closerDropdownRef.current.contains(event.target as Node)) {
        setIsCloserDropdownOpen(false);
      }
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setIsClientDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Chave única para isolar os dados de cada combinação de Closer e Cliente
  const storageKey = useMemo(() => {
    const c = selectedCloser.trim() || 'default';
    const cli = clientName.trim() || 'all';
    return `${c}_${cli}`;
  }, [selectedCloser, clientName]);

  const currentDailyData = closersData[storageKey] || INITIAL_CLOSER_STATE;
  const currentSemanalData = semanalData[storageKey] || INITIAL_SEMANAL_STATE;

  // Clientes disponíveis para o closer atualmente selecionado
  const availableClients = useMemo(() => {
    if (!selectedCloser || !CLOSER_CLIENTS[selectedCloser]) return [];
    return CLOSER_CLIENTS[selectedCloser];
  }, [selectedCloser]);

  // Ao trocar de Closer, seleciona automaticamente o primeiro cliente disponível
  const handleSelectCloser = (closer: string) => {
    setSelectedCloser(closer);
    const clients = CLOSER_CLIENTS[closer] || [];
    setClientName(clients.length > 0 ? clients[0] : '');
    setIsCloserDropdownOpen(false);
    setError(null);
    setPdfGenerated(false);
  };

  const handleSelectClient = (client: string) => {
    setClientName(client);
    setIsClientDropdownOpen(false);
    setError(null);
    setPdfGenerated(false);
  };

  /* =========================================================================
     UTILITÁRIOS DE FORMATAÇÃO E CÁLCULO
     ========================================================================= */

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

  // Cálculo das Métricas Diárias em Tempo Real
  const dailySummary = useMemo(() => {
    const orcNovos = parseInt(currentDailyData.orcamentosNovos, 10) || 0;
    const vNovos = parseInt(currentDailyData.vendasNovos, 10) || 0;
    const valContratoNovos = parseCurrency(currentDailyData.valorContratoNovos);
    const cashNovos = parseCurrency(currentDailyData.cashColetadoNovos);

    const fRealizados = parseInt(currentDailyData.followRealizados, 10) || 0;
    const valNegociacao = parseCurrency(currentDailyData.valorNegociacaoBase);
    const vBase = parseInt(currentDailyData.vendasBase, 10) || 0;
    const valContratoBase = parseCurrency(currentDailyData.valorContratoBase);
    const cashBase = parseCurrency(currentDailyData.cashColetadoBase);

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
  }, [currentDailyData]);

  // Cálculo das Métricas Semanais em Tempo Real
  const semanalSummary = useMemo(() => {
    const qtdFechados = parseInt(currentSemanalData.qtdContratosFechados, 10) || 0;
    const valFechado = parseCurrency(currentSemanalData.valorTotalFechado);
    const ticketFechado = qtdFechados > 0 ? valFechado / qtdFechados : 0;

    const qtdNegociacao = parseInt(currentSemanalData.qtdPropostasNegociacao, 10) || 0;
    const valNegociacao = parseCurrency(currentSemanalData.valorEmNegociacao);
    const ticketNegociacao = qtdNegociacao > 0 ? valNegociacao / qtdNegociacao : 0;

    const qtdPerdidos = parseInt(currentSemanalData.qtdPacientesPerdidos, 10) || 0;
    const valPerdido = parseCurrency(currentSemanalData.valorPerdido);
    const ticketPerdido = qtdPerdidos > 0 ? valPerdido / qtdPerdidos : 0;

    const totalOrcamentos = qtdFechados + qtdNegociacao + qtdPerdidos;
    const volumeTotal = valFechado + valNegociacao + valPerdido;
    const taxaConversao = totalOrcamentos > 0 ? (qtdFechados / totalOrcamentos) * 100 : 0;

    const pctQtdFechado = totalOrcamentos > 0 ? (qtdFechados / totalOrcamentos) * 100 : 0;
    const pctQtdNegociacao = totalOrcamentos > 0 ? (qtdNegociacao / totalOrcamentos) * 100 : 0;
    const pctQtdPerdido = totalOrcamentos > 0 ? (qtdPerdidos / totalOrcamentos) * 100 : 0;

    return {
      qtdFechados,
      valFechado,
      ticketFechado,
      qtdNegociacao,
      valNegociacao,
      ticketNegociacao,
      qtdPerdidos,
      valPerdido,
      ticketPerdido,
      totalOrcamentos,
      volumeTotal,
      taxaConversao,
      pctQtdFechado,
      pctQtdNegociacao,
      pctQtdPerdido
    };
  }, [currentSemanalData]);

  /* =========================================================================
     MANIPULADORES DE ENTRADA
     ========================================================================= */

  const handleDailyChange = (field: keyof CloserFormData, value: string) => {
    setClosersData((prev) => ({
      ...prev,
      [storageKey]: {
        ...(prev[storageKey] || INITIAL_CLOSER_STATE),
        [field]: value
      }
    }));
    setError(null);
    setPdfGenerated(false);
  };

  const handleDailyCurrencyInput = (field: keyof CloserFormData, rawValue: string) => {
    const numericValue = rawValue.replace(/\D/g, '');
    if (!numericValue) {
      handleDailyChange(field, '');
      return;
    }
    const amount = parseInt(numericValue, 10) / 100;
    const formatted = formatCurrency(amount);
    handleDailyChange(field, formatted);
  };

  const handleSemanalChange = (field: keyof SemanalFormData, value: string) => {
    setSemanalData((prev) => ({
      ...prev,
      [storageKey]: {
        ...(prev[storageKey] || INITIAL_SEMANAL_STATE),
        [field]: value
      }
    }));
    setError(null);
    setPdfGenerated(false);
  };

  const handleSemanalCurrencyInput = (field: keyof SemanalFormData, rawValue: string) => {
    const numericValue = rawValue.replace(/\D/g, '');
    if (!numericValue) {
      handleSemanalChange(field, '');
      return;
    }
    const amount = parseInt(numericValue, 10) / 100;
    const formatted = formatCurrency(amount);
    handleSemanalChange(field, formatted);
  };

  // Preencher Exemplo no Painel Diário
  const handleLoadDailySample = () => {
    setClosersData((prev) => ({
      ...prev,
      [storageKey]: {
        orcamentosNovos: '5',
        vendasNovos: '2',
        valorContratoNovos: formatCurrency(18500),
        cashColetadoNovos: formatCurrency(12000),
        followRealizados: '14',
        vendasBase: '3',
        valorContratoBase: formatCurrency(24000),
        cashColetadoBase: formatCurrency(15500),
        valorNegociacaoBase: formatCurrency(35000)
      }
    }));
    setError(null);
    setPdfGenerated(false);
  };

  // Limpar campos diários
  const handleResetDaily = () => {
    setClosersData((prev) => ({
      ...prev,
      [storageKey]: { ...INITIAL_CLOSER_STATE }
    }));
    setError(null);
    setPdfGenerated(false);
  };

  // Preencher Exemplo no Painel Semanal
  const handleLoadSemanalSample = () => {
    setSemanalData((prev) => ({
      ...prev,
      [storageKey]: {
        qtdContratosFechados: '8',
        valorTotalFechado: formatCurrency(42500),
        qtdPropostasNegociacao: '12',
        valorEmNegociacao: formatCurrency(78000),
        qtdPacientesPerdidos: '4',
        valorPerdido: formatCurrency(22000)
      }
    }));
    setError(null);
  };

  // Limpar campos semanais
  const handleResetSemanal = () => {
    setSemanalData((prev) => ({
      ...prev,
      [storageKey]: { ...INITIAL_SEMANAL_STATE }
    }));
    setError(null);
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

  /* =========================================================================
     GERAÇÃO DE RELATÓRIO PDF (DIÁRIO E SEMANAL)
     ========================================================================= */

  // 1. PDF DIÁRIO
  const generateDailyPDF = async () => {
    if (!selectedCloser.trim()) {
      setError('Por favor, selecione um Closer.');
      return;
    }

    if (!dateRange?.from) {
      setError('Selecione o período das métricas.');
      return;
    }

    const d = closersData[storageKey] || INITIAL_CLOSER_STATE;

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
      setError(`Preencha pelo menos um campo para gerar o relatório diário de ${selectedCloser}.`);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));

      const MARGIN = 14;
      const PAGE_WIDTH = 210;
      const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 182mm
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // 1. Background Total Escuro (Obsidian)
      doc.setFillColor(11, 13, 18); // #0B0D12
      doc.rect(0, 0, 210, 297, 'F');

      let currentY = 12;

      // 2. Header Superior com Logo e Metadados
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
        doc.addImage(img, 'PNG', MARGIN, currentY, 44, 9);
      } catch {
        doc.setFillColor(204, 255, 0);
        doc.roundedRect(MARGIN, currentY, 10, 10, 2, 2, 'F');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('FA', MARGIN + 2.5, currentY + 6.8);
      }

      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139); // #64748B
      doc.text('HUB CLOSERS • GESTÃO DE PERFORMANCE COMERCIAL', MARGIN, currentY + 12.5);

      // 4 Colunas de Metadados no Topo Direito
      const colStartX = MARGIN + 68;
      const colW = (CONTENT_WIDTH - 68) / 4;

      const drawHeaderCol = (labelLine1: string, labelLine2: string, value: string, xPos: number, isAccent = false) => {
        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        if (labelLine2) {
          doc.text(labelLine1, xPos, currentY + 3);
          doc.text(labelLine2, xPos, currentY + 6);
        } else {
          doc.text(labelLine1, xPos, currentY + 5);
        }

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        if (isAccent) {
          doc.setTextColor(204, 255, 0); // #CCFF00
        } else {
          doc.setTextColor(245, 245, 247);
        }
        doc.text(value, xPos, currentY + 10.5);
      };

      drawHeaderCol('CLOSER', 'RESPONSÁVEL', selectedCloser.trim() || 'Closer', colStartX, true);
      drawHeaderCol('CLIENTE /', 'OPERAÇÃO', clientName.trim() || 'Todas as Operações', colStartX + colW);
      drawHeaderCol('PERÍODO', 'ANALISADO', formatPeriod(), colStartX + colW * 2);
      drawHeaderCol('DATA', 'EMISSÃO', format(new Date(), 'dd/MM/yyyy'), colStartX + colW * 3);

      currentY += 16;

      // Linha Divisória Sutil
      doc.setDrawColor(33, 39, 57);
      doc.setLineWidth(0.3);
      doc.line(MARGIN, currentY, MARGIN + CONTENT_WIDTH, currentY);

      currentY += 7;

      // 3. Título e Subtítulo + Badge Oficial
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(245, 245, 247);
      doc.text('Relatório Diário de Métricas Comerciais', MARGIN, currentY);

      // Badge • RELATÓRIO OFICIAL
      doc.setFillColor(20, 24, 36);
      doc.setDrawColor(204, 255, 0);
      doc.setLineWidth(0.3);
      doc.roundedRect(MARGIN + CONTENT_WIDTH - 34, currentY - 5.5, 34, 6.5, 3.25, 3.25, 'FD');
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(204, 255, 0);
      doc.text('• RELATÓRIO OFICIAL', MARGIN + CONTENT_WIDTH - 30.5, currentY - 1.5);

      currentY += 4.5;
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 160, 178);
      doc.text('Consolidado diário de prospecção, vendas em novos, trabalho na base e cash coletado.', MARGIN, currentY);

      currentY += 7;

      // 4. Quatro Cards Bento Superiores
      const kpiGap = 3;
      const kpiW = (CONTENT_WIDTH - kpiGap * 3) / 4;
      const kpiH = 22;

      const drawKpiCard = (x: number, label: string, val: string, sub: string, isNeon = false) => {
        doc.setFillColor(20, 24, 36);
        doc.setDrawColor(33, 39, 57);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, currentY, kpiW, kpiH, 2.5, 2.5, 'FD');

        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text(label, x + 3.5, currentY + 5.5);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        if (isNeon) {
          doc.setTextColor(204, 255, 0);
        } else {
          doc.setTextColor(245, 245, 247);
        }
        doc.text(val, x + 3.5, currentY + 12.5);

        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 160, 178);
        doc.text(sub, x + 3.5, currentY + 17.5);
      };

      drawKpiCard(MARGIN, 'VOLUME DE VENDAS', `${dailySummary.totalVendas} un`, `${dailySummary.vNovos} novos + ${dailySummary.vBase} base`);
      drawKpiCard(MARGIN + (kpiW + kpiGap), 'VALOR DE CONTRATO', formatCurrency(dailySummary.totalContratos), 'Contratos fechados no dia');
      drawKpiCard(MARGIN + (kpiW + kpiGap) * 2, 'CASH COLETADO', formatCurrency(dailySummary.totalCashColetado), 'Receita capturada à vista', true);
      drawKpiCard(MARGIN + (kpiW + kpiGap) * 3, 'TAXA DE CONVERSÃO', `${dailySummary.conversaoGeral.toFixed(1)}%`, 'Eficiência comercial do dia');

      currentY += kpiH + 5;

      // 5. Dois Grandes Cards de Detalhamento Diário (Novos vs Base)
      const detailGap = 4;
      const detailW = (CONTENT_WIDTH - detailGap) / 2;
      const detailH = 46;

      // Card 1: Orçamentos Novos no Dia
      doc.setFillColor(20, 24, 36);
      doc.setDrawColor(33, 39, 57);
      doc.setLineWidth(0.3);
      doc.roundedRect(MARGIN, currentY, detailW, detailH, 2.5, 2.5, 'FD');

      // Linha de acento verde
      doc.setDrawColor(34, 197, 94);
      doc.setLineWidth(1.2);
      doc.line(MARGIN + 3, currentY + 0.6, MARGIN + detailW - 3, currentY + 0.6);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(245, 245, 247);
      doc.text('1. ORÇAMENTOS NOVOS NO DIA', MARGIN + 4, currentY + 7);

      // Pill de conversão
      doc.setFillColor(34, 197, 94);
      doc.roundedRect(MARGIN + detailW - 20, currentY + 4, 16, 4.5, 2, 2, 'F');
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`${dailySummary.taxaConversaoNovos.toFixed(1)}% conv`, MARGIN + detailW - 18.5, currentY + 7.2);

      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(formatCurrency(dailySummary.valContratoNovos), MARGIN + 4, currentY + 16.5);

      const drawDetailRow = (cardX: number, w: number, label: string, val: string, yPos: number, isHighlight = false) => {
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 160, 178);
        doc.text(label, cardX + 4, yPos);
        doc.setFont('helvetica', 'bold');
        if (isHighlight) {
          doc.setTextColor(204, 255, 0);
        } else {
          doc.setTextColor(245, 245, 247);
        }
        doc.text(val, cardX + w - 4, yPos, { align: 'right' });
      };

      drawDetailRow(MARGIN, detailW, 'Quantos Orçamentos Novos:', `${dailySummary.orcNovos} un`, currentY + 23.5);
      drawDetailRow(MARGIN, detailW, 'Quantas Vendas em Novos:', `${dailySummary.vNovos} un`, currentY + 29.5);
      drawDetailRow(MARGIN, detailW, 'Cash Coletado em Novos:', formatCurrency(dailySummary.cashNovos), currentY + 35.5, true);
      drawDetailRow(MARGIN, detailW, 'Ticket Médio Novos:', formatCurrency(dailySummary.vNovos > 0 ? dailySummary.valContratoNovos / dailySummary.vNovos : 0), currentY + 41.5);

      // Card 2: Trabalho na Base
      const card2X = MARGIN + detailW + detailGap;
      doc.setFillColor(20, 24, 36);
      doc.setDrawColor(33, 39, 57);
      doc.setLineWidth(0.3);
      doc.roundedRect(card2X, currentY, detailW, detailH, 2.5, 2.5, 'FD');

      // Linha de acento azul
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(1.2);
      doc.line(card2X + 3, currentY + 0.6, card2X + detailW - 3, currentY + 0.6);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(245, 245, 247);
      doc.text('2. TRABALHO NA BASE DO DIA', card2X + 4, currentY + 7);

      // Pill de conversão base
      doc.setFillColor(59, 130, 246);
      doc.roundedRect(card2X + detailW - 20, currentY + 4, 16, 4.5, 2, 2, 'F');
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`${dailySummary.taxaConversaoBase.toFixed(1)}% conv`, card2X + detailW - 18.5, currentY + 7.2);

      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(formatCurrency(dailySummary.valContratoBase), card2X + 4, currentY + 16.5);

      drawDetailRow(card2X, detailW, 'Follow-ups Realizados:', `${dailySummary.fRealizados} un`, currentY + 23.5);
      drawDetailRow(card2X, detailW, 'Vendas Recuperadas:', `${dailySummary.vBase} un`, currentY + 29.5);
      drawDetailRow(card2X, detailW, 'Cash Coletado na Base:', formatCurrency(dailySummary.cashBase), currentY + 35.5, true);
      drawDetailRow(card2X, detailW, 'Valor em Negociação Ativa:', formatCurrency(dailySummary.valNegociacao), currentY + 41.5);

      currentY += detailH + 5;

      // 6. Barra de Distribuição de Contratos & Volume
      doc.setFillColor(20, 24, 36);
      doc.setDrawColor(33, 39, 57);
      doc.setLineWidth(0.3);
      doc.roundedRect(MARGIN, currentY, CONTENT_WIDTH, 19, 2.5, 2.5, 'FD');

      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('COMPOSIÇÃO PROPORCIONAL DO RESULTADO DIÁRIO', MARGIN + 4, currentY + 5);
      doc.text('DISTRIBUIÇÃO DE CONTRATOS & VOLUME', MARGIN + CONTENT_WIDTH - 4, currentY + 5, { align: 'right' });

      // Barra de progresso multi-segmentada
      const barX = MARGIN + 4;
      const barY = currentY + 7.5;
      const barW = CONTENT_WIDTH - 8;
      const barH = 3.5;

      const totalValDiario = (dailySummary.valContratoNovos + dailySummary.valContratoBase + dailySummary.valNegociacao) || 1;
      const wNovos = Math.max((dailySummary.valContratoNovos / totalValDiario) * barW, dailySummary.valContratoNovos > 0 ? 3 : 0);
      const wBase = Math.max((dailySummary.valContratoBase / totalValDiario) * barW, dailySummary.valContratoBase > 0 ? 3 : 0);
      const wNegoc = Math.max(barW - wNovos - wBase, 0);

      // Segmento Novos (Verde)
      doc.setFillColor(34, 197, 94);
      doc.roundedRect(barX, barY, Math.max(wNovos, 2), barH, 1.5, 1.5, 'F');
      // Segmento Base (Azul)
      if (wBase > 0) {
        doc.setFillColor(59, 130, 246);
        doc.rect(barX + wNovos, barY, wBase, barH, 'F');
      }
      // Segmento Negociação (Laranja/Amarelo)
      if (wNegoc > 0) {
        doc.setFillColor(234, 179, 8);
        doc.roundedRect(barX + wNovos + wBase, barY, wNegoc, barH, 1.5, 1.5, 'F');
      }

      // Legendas
      const legY = currentY + 15;
      doc.setFontSize(6);

      doc.setFillColor(34, 197, 94);
      doc.circle(MARGIN + 5, legY - 1, 1, 'F');
      doc.setTextColor(245, 245, 247);
      doc.setFont('helvetica', 'normal');
      doc.text(`Novos: ${dailySummary.vNovos} vendas • ${formatCurrency(dailySummary.valContratoNovos)}`, MARGIN + 7.5, legY);

      const leg2X = MARGIN + 68;
      doc.setFillColor(59, 130, 246);
      doc.circle(leg2X, legY - 1, 1, 'F');
      doc.text(`Base: ${dailySummary.vBase} vendas • ${formatCurrency(dailySummary.valContratoBase)}`, leg2X + 2.5, legY);

      const leg3X = MARGIN + 130;
      doc.setFillColor(234, 179, 8);
      doc.circle(leg3X, legY - 1, 1, 'F');
      doc.text(`Em Negociação: ${formatCurrency(dailySummary.valNegociacao)}`, leg3X + 2.5, legY);

      currentY += 23;

      // 7. Diagnóstico Comercial & Próximas Ações Estratégicas
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(204, 255, 0);
      doc.text('DIAGNÓSTICO COMERCIAL & PRÓXIMAS AÇÕES ESTRATÉGICAS', MARGIN, currentY);

      currentY += 3.5;

      const actionGap = 3;
      const actionW = (CONTENT_WIDTH - actionGap * 2) / 3;
      const actionH = 22;

      const drawActionCard = (x: number, title: string, text: string, titleColor: [number, number, number]) => {
        doc.setFillColor(20, 24, 36);
        doc.setDrawColor(33, 39, 57);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, currentY, actionW, actionH, 2, 2, 'FD');

        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
        doc.text(title, x + 3.5, currentY + 5);

        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 160, 178);
        const splitLines = doc.splitTextToSize(text, actionW - 7);
        doc.text(splitLines, x + 3.5, currentY + 9.5);
      };

      drawActionCard(
        MARGIN,
        '01 • FOCO EM NOVOS',
        `Priorizar cadência nos ${dailySummary.orcNovos} novos orçamentos para converter com ciclo ágil.`,
        [204, 255, 0]
      );

      drawActionCard(
        MARGIN + actionW + actionGap,
        '02 • RECUPERAÇÃO NA BASE',
        `Avançar nos ${dailySummary.fRealizados} follow-ups da base e fechar os ${formatCurrency(dailySummary.valNegociacao)} em negociação.`,
        [59, 130, 246]
      );

      drawActionCard(
        MARGIN + (actionW + actionGap) * 2,
        '03 • CAPTURA DE CASH',
        `Assegurar entrada e cash coletado (hoje: ${formatCurrency(dailySummary.totalCashColetado)} de ${formatCurrency(dailySummary.totalContratos)} contratados).`,
        [34, 197, 94]
      );

      // 8. Rodapé Fixo
      doc.setDrawColor(33, 39, 57);
      doc.setLineWidth(0.3);
      doc.line(MARGIN, 283, MARGIN + CONTENT_WIDTH, 283);

      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('FAZENDO ACONTECER™ • Hub Closers — Gestão Comercial de Alta Performance', MARGIN, 288);
      doc.text('Documento Confidencial • Uso Interno da Operação', MARGIN + CONTENT_WIDTH, 288, { align: 'right' });

      const cleanCloserName = selectedCloser.toLowerCase().replace(/[^a-z0-9]/gi, '_');
      const cleanClientName = clientName.trim() ? `_${clientName.trim().toLowerCase().replace(/[^a-z0-9]/gi, '_')}` : '';
      const periodoStr = getPdfSafePeriodString();
      doc.save(`Relatorio_Diario_${cleanCloserName}${cleanClientName}_${periodoStr}.pdf`);

      setPdfGenerated(true);
    } catch (err) {
      console.error(err);
      setError('Falha ao gerar o PDF diário. Verifique os dados inseridos.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. PDF SEMANAL
  const generateSemanalPDF = async () => {
    if (
      semanalSummary.qtdFechados === 0 &&
      semanalSummary.valFechado === 0 &&
      semanalSummary.qtdNegociacao === 0 &&
      semanalSummary.valNegociacao === 0 &&
      semanalSummary.qtdPerdidos === 0 &&
      semanalSummary.valPerdido === 0
    ) {
      setError(`Preencha pelo menos um campo para gerar o relatório semanal.`);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));

      const MARGIN = 14;
      const PAGE_WIDTH = 210;
      const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 182mm
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // 1. Background Total Escuro (Obsidian)
      doc.setFillColor(11, 13, 18); // #0B0D12
      doc.rect(0, 0, 210, 297, 'F');

      let currentY = 12;

      // 2. Header Superior com Logo e Metadados
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
        doc.addImage(img, 'PNG', MARGIN, currentY, 44, 9);
      } catch {
        doc.setFillColor(204, 255, 0);
        doc.roundedRect(MARGIN, currentY, 10, 10, 2, 2, 'F');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('FA', MARGIN + 2.5, currentY + 6.8);
      }

      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139); // #64748B
      doc.text('HUB CLOSERS • GESTÃO DE PERFORMANCE COMERCIAL', MARGIN, currentY + 12.5);

      // 4 Colunas de Metadados no Topo Direito
      const colStartX = MARGIN + 68;
      const colW = (CONTENT_WIDTH - 68) / 4;

      const drawHeaderCol = (labelLine1: string, labelLine2: string, value: string, xPos: number, isAccent = false) => {
        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        if (labelLine2) {
          doc.text(labelLine1, xPos, currentY + 3);
          doc.text(labelLine2, xPos, currentY + 6);
        } else {
          doc.text(labelLine1, xPos, currentY + 5);
        }

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        if (isAccent) {
          doc.setTextColor(204, 255, 0); // #CCFF00
        } else {
          doc.setTextColor(245, 245, 247);
        }
        doc.text(value, xPos, currentY + 10.5);
      };

      drawHeaderCol('CLOSER', 'RESPONSÁVEL', selectedCloser.trim() || 'Geral', colStartX, true);
      drawHeaderCol('CLIENTE /', 'OPERAÇÃO', clientName.trim() || 'Todas as Operações', colStartX + colW);
      drawHeaderCol('PERÍODO', 'ANALISADO', `Semana ${selectedWeekNumber}`, colStartX + colW * 2);
      drawHeaderCol('DATA', 'EMISSÃO', format(new Date(), 'dd/MM/yyyy'), colStartX + colW * 3);

      currentY += 16;

      // Linha Divisória Sutil
      doc.setDrawColor(33, 39, 57);
      doc.setLineWidth(0.3);
      doc.line(MARGIN, currentY, MARGIN + CONTENT_WIDTH, currentY);

      currentY += 7;

      // 3. Título e Subtítulo + Badge Oficial
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(245, 245, 247);
      doc.text('Relatório Semanal de Orçamentos & Pipeline', MARGIN, currentY);

      // Badge • RELATÓRIO OFICIAL
      doc.setFillColor(20, 24, 36);
      doc.setDrawColor(204, 255, 0);
      doc.setLineWidth(0.3);
      doc.roundedRect(MARGIN + CONTENT_WIDTH - 34, currentY - 5.5, 34, 6.5, 3.25, 3.25, 'FD');
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(204, 255, 0);
      doc.text('• RELATÓRIO OFICIAL', MARGIN + CONTENT_WIDTH - 30.5, currentY - 1.5);

      currentY += 4.5;
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 160, 178);
      doc.text('Consolidado comercial executivo de conversão, volume em negociação e captura de receita.', MARGIN, currentY);

      currentY += 7;

      // 4. Quatro Cards Bento Superiores
      const kpiGap = 3;
      const kpiW = (CONTENT_WIDTH - kpiGap * 3) / 4;
      const kpiH = 22;

      const drawKpiCard = (x: number, label: string, val: string, sub: string, isNeon = false) => {
        doc.setFillColor(20, 24, 36);
        doc.setDrawColor(33, 39, 57);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, currentY, kpiW, kpiH, 2.5, 2.5, 'FD');

        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text(label, x + 3.5, currentY + 5.5);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        if (isNeon) {
          doc.setTextColor(204, 255, 0);
        } else {
          doc.setTextColor(245, 245, 247);
        }
        doc.text(val, x + 3.5, currentY + 12.5);

        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 160, 178);
        doc.text(sub, x + 3.5, currentY + 17.5);
      };

      drawKpiCard(MARGIN, 'VOLUME TOTAL APRESENTADO', formatCurrency(semanalSummary.volumeTotal), 'Soma de todo o funil na semana');
      drawKpiCard(MARGIN + (kpiW + kpiGap), 'TOTAL DE ORÇAMENTOS', `${semanalSummary.totalOrcamentos} un`, 'Avaliações comerciais realizadas');
      drawKpiCard(MARGIN + (kpiW + kpiGap) * 2, 'RECEITA FECHADA', formatCurrency(semanalSummary.valFechado), `${semanalSummary.qtdFechados} contratos convertidos`, true);
      drawKpiCard(MARGIN + (kpiW + kpiGap) * 3, 'TAXA DE CONVERSÃO', `${semanalSummary.taxaConversao.toFixed(1)}%`, 'Eficiência de fechamento');

      currentY += kpiH + 5;

      // 5. Três Cards Detalhados de Orçamentos (Fechados, Negociação, Perdidos)
      const cardGap = 3.5;
      const cardW = (CONTENT_WIDTH - cardGap * 2) / 3;
      const cardH = 36;

      const pctFechado = semanalSummary.pctQtdFechado.toFixed(1);
      const pctNegoc = semanalSummary.pctQtdNegociacao.toFixed(1);
      const pctPerd = semanalSummary.pctQtdPerdido.toFixed(1);

      const drawFunnelCard = (
        x: number,
        title: string,
        pctText: string,
        accentColor: [number, number, number],
        val: string,
        sub1Label: string,
        sub1Val: string,
        sub2Label: string,
        sub2Val: string
      ) => {
        doc.setFillColor(20, 24, 36);
        doc.setDrawColor(33, 39, 57);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, currentY, cardW, cardH, 2.5, 2.5, 'FD');

        // Linha de acento colorido superior
        doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.setLineWidth(1.2);
        doc.line(x + 3, currentY + 0.6, x + cardW - 3, currentY + 0.6);

        // Título
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(245, 245, 247);
        doc.text(title, x + 4, currentY + 7);

        // Pill de percentual
        doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.roundedRect(x + cardW - 15, currentY + 4, 11, 4.5, 2, 2, 'F');
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(pctText, x + cardW - 13.5, currentY + 7.2);

        // Valor Principal
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(val, x + 4, currentY + 16.5);

        // Linha 1
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 160, 178);
        doc.text(sub1Label, x + 4, currentY + 24);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(245, 245, 247);
        doc.text(sub1Val, x + cardW - 4, currentY + 24, { align: 'right' });

        // Linha 2
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 160, 178);
        doc.text(sub2Label, x + 4, currentY + 30);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(245, 245, 247);
        doc.text(sub2Val, x + cardW - 4, currentY + 30, { align: 'right' });
      };

      drawFunnelCard(
        MARGIN,
        'ORÇAMENTOS FECHADOS',
        `${pctFechado}%`,
        [34, 197, 94], // #22C55E
        formatCurrency(semanalSummary.valFechado),
        'Volume Contratual:',
        `${semanalSummary.qtdFechados} contratos`,
        'Ticket Médio Fechado:',
        formatCurrency(semanalSummary.ticketFechado)
      );

      drawFunnelCard(
        MARGIN + cardW + cardGap,
        'EM NEGOCIAÇÃO',
        `${pctNegoc}%`,
        [59, 130, 246], // #3B82F6
        formatCurrency(semanalSummary.valNegociacao),
        'Propostas Ativas:',
        `${semanalSummary.qtdNegociacao} propostas`,
        'Ticket Médio Proposta:',
        formatCurrency(semanalSummary.ticketNegociacao)
      );

      drawFunnelCard(
        MARGIN + (cardW + cardGap) * 2,
        'SEM CONDIÇÕES (PERDIDOS)',
        `${pctPerd}%`,
        [239, 68, 68], // #EF4444
        formatCurrency(semanalSummary.valPerdido),
        'Leads / Pacientes:',
        `${semanalSummary.qtdPerdidos} pacientes/leads`,
        'Ticket Médio Perdido:',
        formatCurrency(semanalSummary.ticketPerdido)
      );

      currentY += cardH + 5;

      // 6. Barra de Pipeline Proporcional
      doc.setFillColor(20, 24, 36);
      doc.setDrawColor(33, 39, 57);
      doc.setLineWidth(0.3);
      doc.roundedRect(MARGIN, currentY, CONTENT_WIDTH, 19, 2.5, 2.5, 'FD');

      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('COMPOSIÇÃO PROPORCIONAL DO PIPELINE', MARGIN + 4, currentY + 5);
      doc.text('FLUXO SEMANAL', MARGIN + CONTENT_WIDTH - 4, currentY + 5, { align: 'right' });

      const barX = MARGIN + 4;
      const barY = currentY + 7.5;
      const barW = CONTENT_WIDTH - 8;
      const barH = 3.5;

      const totalValSemanal = semanalSummary.volumeTotal || 1;
      const wFech = Math.max((semanalSummary.valFechado / totalValSemanal) * barW, semanalSummary.valFechado > 0 ? 3 : 0);
      const wNeg = Math.max((semanalSummary.valNegociacao / totalValSemanal) * barW, semanalSummary.valNegociacao > 0 ? 3 : 0);
      const wPerd = Math.max(barW - wFech - wNeg, 0);

      doc.setFillColor(34, 197, 94);
      doc.roundedRect(barX, barY, Math.max(wFech, 2), barH, 1.5, 1.5, 'F');
      if (wNeg > 0) {
        doc.setFillColor(59, 130, 246);
        doc.rect(barX + wFech, barY, wNeg, barH, 'F');
      }
      if (wPerd > 0) {
        doc.setFillColor(239, 68, 68);
        doc.roundedRect(barX + wFech + wNeg, barY, wPerd, barH, 1.5, 1.5, 'F');
      }

      const legY = currentY + 15;
      doc.setFontSize(6);

      doc.setFillColor(34, 197, 94);
      doc.circle(MARGIN + 5, legY - 1, 1, 'F');
      doc.setTextColor(245, 245, 247);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fechados: ${semanalSummary.qtdFechados} (${pctFechado}%) • ${formatCurrency(semanalSummary.valFechado)}`, MARGIN + 7.5, legY);

      const leg2X = MARGIN + 68;
      doc.setFillColor(59, 130, 246);
      doc.circle(leg2X, legY - 1, 1, 'F');
      doc.text(`Em Negociação: ${semanalSummary.qtdNegociacao} (${pctNegoc}%) • ${formatCurrency(semanalSummary.valNegociacao)}`, leg2X + 2.5, legY);

      const leg3X = MARGIN + 130;
      doc.setFillColor(239, 68, 68);
      doc.circle(leg3X, legY - 1, 1, 'F');
      doc.text(`Sem Condições: ${semanalSummary.qtdPerdidos} (${pctPerd}%) • ${formatCurrency(semanalSummary.valPerdido)}`, leg3X + 2.5, legY);

      currentY += 23;

      // 7. Diagnóstico Comercial & Próximas Ações Estratégicas
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(204, 255, 0);
      doc.text('DIAGNÓSTICO COMERCIAL & PRÓXIMAS AÇÕES ESTRATÉGICAS', MARGIN, currentY);

      currentY += 3.5;

      const actionGap = 3;
      const actionW = (CONTENT_WIDTH - actionGap * 2) / 3;
      const actionH = 22;

      const drawActionCard = (x: number, title: string, text: string, titleColor: [number, number, number]) => {
        doc.setFillColor(20, 24, 36);
        doc.setDrawColor(33, 39, 57);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, currentY, actionW, actionH, 2, 2, 'FD');

        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
        doc.text(title, x + 3.5, currentY + 5);

        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 160, 178);
        const splitLines = doc.splitTextToSize(text, actionW - 7);
        doc.text(splitLines, x + 3.5, currentY + 9.5);
      };

      drawActionCard(
        MARGIN,
        '01 • PRIORIDADE MÁXIMA',
        `Converter ${formatCurrency(semanalSummary.valNegociacao)} trabalhando os ${semanalSummary.qtdNegociacao} orçamentos ativos no funil.`,
        [204, 255, 0]
      );

      drawActionCard(
        MARGIN + actionW + actionGap,
        '02 • RECUPERAÇÃO',
        `Flexibilizar condições de pagamento para os ${semanalSummary.qtdPerdidos} pacientes sem condições imediatas (${formatCurrency(semanalSummary.valPerdido)}).`,
        [59, 130, 246]
      );

      drawActionCard(
        MARGIN + (actionW + actionGap) * 2,
        '03 • FECHAMENTO',
        `Definir cadência individual e data de retorno para cada uma das ${semanalSummary.qtdNegociacao} propostas abertas.`,
        [34, 197, 94]
      );

      // 8. Rodapé Fixo
      doc.setDrawColor(33, 39, 57);
      doc.setLineWidth(0.3);
      doc.line(MARGIN, 283, MARGIN + CONTENT_WIDTH, 283);

      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('FAZENDO ACONTECER™ • Hub Closers — Gestão Comercial de Alta Performance', MARGIN, 288);
      doc.text('Documento Confidencial • Uso Interno da Operação', MARGIN + CONTENT_WIDTH, 288, { align: 'right' });

      const cleanCloserName = selectedCloser.toLowerCase().replace(/[^a-z0-9]/gi, '_');
      doc.save(`Relatorio_Semanal_Semana_${selectedWeekNumber}_${cleanCloserName}.pdf`);

      setPdfGenerated(true);
    } catch (err) {
      console.error(err);
      setError('Falha ao gerar o PDF semanal. Verifique os dados inseridos.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D12] text-[#F5F5F7] font-sans flex flex-col items-center justify-start p-3 sm:p-6 relative overflow-x-hidden">
      {/* =========================================================================
          1. HEADER GLASS FLUTUANTE (SEPARAÇÃO DIÁRIO & SEMANAL)
          ========================================================================= */}
      <header className="w-full max-w-6xl mb-4 relative z-30 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-5 py-2.5 sm:py-3 rounded-[12px] bg-[#0F121A]/90 backdrop-blur-md border border-[#212739] shadow-sm">
        {/* Identificação Esquerda */}
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-[#CCFF00] shadow-[0_0_10px_#CCFF00] animate-pulse"></div>
          <div>
            <span className="text-[11px] font-semibold tracking-wider text-[#94A0B2] uppercase">
              Hub Closers • Painel de Gestão
            </span>
          </div>
        </div>

        {/* Alternador Central (Pill Glass) */}
        <div className="flex items-center p-1 bg-[#0D1018] border border-[#212739] rounded-[9px] relative shadow-inner">
          <button
            onClick={() => {
              setActiveTab('diario');
              setError(null);
            }}
            className={`relative px-4 sm:px-5 py-1.5 rounded-[7px] text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'diario'
                ? 'bg-[#CCFF00] text-black shadow-[0_0_15px_rgba(204,255,0,0.25)]'
                : 'text-[#94A0B2] hover:text-[#F5F5F7] hover:bg-[#141824]'
            }`}
          >
            <Clock size={13} strokeWidth={1.75} className={activeTab === 'diario' ? 'text-black' : 'text-[#64748B]'} />
            <span>Diário</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('semanal');
              setError(null);
            }}
            className={`relative px-4 sm:px-5 py-1.5 rounded-[7px] text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'semanal'
                ? 'bg-[#CCFF00] text-black shadow-[0_0_15px_rgba(204,255,0,0.25)]'
                : 'text-[#94A0B2] hover:text-[#F5F5F7] hover:bg-[#141824]'
            }`}
          >
            <CalendarRange size={13} strokeWidth={1.75} className={activeTab === 'semanal' ? 'text-black' : 'text-[#64748B]'} />
            <span>Semanal</span>
          </button>
        </div>

        {/* Informação Direita */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#141824] border border-[#212739] text-xs">
            <span className="text-[#64748B] text-[10px] uppercase font-semibold">Closer:</span>
            <span className="text-[#F5F5F7] font-semibold">{selectedCloser || 'Não selecionado'}</span>
          </div>
        </div>
      </header>

      {/* =========================================================================
          2. CONTAINER PRINCIPAL (LAYOUT INTEGRADO COM SIDEBAR)
          ========================================================================= */}
      <div className="w-full max-w-6xl flex flex-col md:flex-row relative z-10 bg-[#0B0D12] border border-[#212739] rounded-[16px] overflow-hidden min-h-[750px] shadow-sm">
        {/* Sidebar Institucional com Menus Suspensos para Closer e Clientes */}
        <aside className="w-full md:w-[280px] bg-[#0F121A] border-r border-[#212739] p-5 sm:p-6 flex flex-col shrink-0 flex-none justify-between">
          <div className="space-y-6">
            {/* Logo Oficial Fazendo Acontecer */}
            <div className="space-y-1">
              <img
                src="/logo.png"
                alt="Fazendo Acontecer"
                className="h-7 w-auto max-w-[200px] object-contain"
              />
              <p className="text-[10px] text-[#64748B] font-semibold tracking-wider uppercase pl-0.5">
                Hub Closers • Gestão
              </p>
            </div>

            {/* SEÇÃO MENU PRINCIPAL: DROPDOWNS SUSPENSOS DE CLOSER E CLIENTE */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider px-1 flex items-center justify-between">
                <span>Menu Principal</span>
                <span className="text-[9px] font-semibold bg-[#141824] text-[#94A0B2] px-2 py-0.5 rounded-[6px] border border-[#212739]">
                  CLOSERS
                </span>
              </p>

              {/* 1. DROPDOWN SUSPENSO: NOME DO CLOSER */}
              <div className="space-y-1.5" ref={closerDropdownRef}>
                <label className="text-[10px] font-semibold text-[#94A0B2] uppercase tracking-wider block px-0.5">
                  NOME DO CLOSER
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCloserDropdownOpen(!isCloserDropdownOpen);
                      setIsClientDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between bg-[#0D1018] rounded-[8px] px-3.5 py-2.5 text-[13px] font-medium text-[#F5F5F7] transition-all cursor-pointer ${
                      isCloserDropdownOpen
                        ? 'border border-[#CCFF00]/60 ring-1 ring-[#CCFF00]/20 shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
                        : 'border border-[#212739] hover:border-[#2D354D]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <User size={14} strokeWidth={1.75} className="text-[#CCFF00] shrink-0" />
                      <span className="truncate">{selectedCloser || 'Selecione o Closer'}</span>
                    </div>
                    <ChevronDown
                      size={14}
                      strokeWidth={1.75}
                      className={`text-[#94A0B2] transition-transform duration-200 shrink-0 ${
                        isCloserDropdownOpen ? 'rotate-180 text-[#CCFF00]' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {isCloserDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 2, scale: 0.99 }}
                        transition={{ duration: 0.12 }}
                        className="absolute z-50 top-full mt-1.5 left-0 w-full bg-[#0F121A] border border-[#212739] rounded-[10px] shadow-[0_12px_32px_rgba(0,0,0,0.65)] overflow-hidden py-1 backdrop-blur-xl"
                      >
                        <div className="px-3.5 py-2 text-[10px] text-[#64748B] font-semibold uppercase tracking-wider border-b border-[#212739] bg-[#0B0D12]/50 flex items-center justify-between">
                          <span>Selecione o Closer</span>
                          <span className="text-[9px] text-[#94A0B2] lowercase font-normal">{CLOSERS_LIST.length} closers</span>
                        </div>
                        <div className="max-h-56 overflow-y-auto">
                          {CLOSERS_LIST.map((closer) => {
                            const isSelected = selectedCloser === closer;
                            return (
                              <button
                                key={closer}
                                type="button"
                                onClick={() => handleSelectCloser(closer)}
                                className={`w-full text-left px-3.5 py-2.5 text-[12px] font-medium transition-colors flex items-center justify-between cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#191D28] text-[#CCFF00] font-semibold border-l-2 border-[#CCFF00]'
                                    : 'text-[#94A0B2] hover:text-[#F5F5F7] hover:bg-[#141824] border-l-2 border-transparent'
                                }`}
                              >
                                <span>{closer}</span>
                                {isSelected && <Check size={14} className="text-[#CCFF00] shrink-0" strokeWidth={2.2} />}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* 2. DROPDOWN SUSPENSO: CLIENTE / OPERAÇÃO */}
              <div className="space-y-1.5" ref={clientDropdownRef}>
                <label className="text-[10px] font-semibold text-[#94A0B2] uppercase tracking-wider block px-0.5">
                  CLIENTE / OPERAÇÃO
                </label>
                <div className="relative">
                  <button
                    type="button"
                    disabled={!selectedCloser}
                    onClick={() => {
                      if (selectedCloser) {
                        setIsClientDropdownOpen(!isClientDropdownOpen);
                        setIsCloserDropdownOpen(false);
                      }
                    }}
                    className={`w-full flex items-center justify-between bg-[#0D1018] rounded-[8px] px-3.5 py-2.5 text-[13px] font-medium text-[#F5F5F7] transition-all ${
                      !selectedCloser
                        ? 'opacity-40 cursor-not-allowed border border-[#212739]'
                        : isClientDropdownOpen
                        ? 'border border-[#CCFF00]/60 ring-1 ring-[#CCFF00]/20 shadow-[0_4px_20px_rgba(0,0,0,0.4)] cursor-pointer'
                        : 'border border-[#212739] hover:border-[#2D354D] cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Building2 size={14} strokeWidth={1.75} className="text-[#CCFF00] shrink-0" />
                      <span className="truncate">
                        {clientName || (selectedCloser ? 'Selecione o Cliente / Operação' : 'Selecione o Closer primeiro')}
                      </span>
                    </div>
                    <ChevronDown
                      size={14}
                      strokeWidth={1.75}
                      className={`text-[#94A0B2] transition-transform duration-200 shrink-0 ${
                        isClientDropdownOpen ? 'rotate-180 text-[#CCFF00]' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {isClientDropdownOpen && selectedCloser && (
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 2, scale: 0.99 }}
                        transition={{ duration: 0.12 }}
                        className="absolute z-50 top-full mt-1.5 left-0 w-full bg-[#0F121A] border border-[#212739] rounded-[10px] shadow-[0_12px_32px_rgba(0,0,0,0.65)] overflow-hidden py-1 backdrop-blur-xl"
                      >
                        <div className="px-3.5 py-2 text-[10px] text-[#64748B] font-semibold uppercase tracking-wider border-b border-[#212739] bg-[#0B0D12]/50 flex items-center justify-between">
                          <span>Selecione o Cliente / Operação</span>
                          <span className="text-[9px] text-[#94A0B2] lowercase font-normal">{availableClients.length} clientes</span>
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          {availableClients.length === 0 ? (
                            <div className="px-3.5 py-3 text-xs text-[#64748B] italic">
                              Nenhum cliente cadastrado para este closer.
                            </div>
                          ) : (
                            availableClients.map((client) => {
                              const isSelected = clientName === client;
                              return (
                                <button
                                  key={client}
                                  type="button"
                                  onClick={() => handleSelectClient(client)}
                                  className={`w-full text-left px-3.5 py-2.5 text-[12px] font-medium transition-colors flex items-center justify-between cursor-pointer ${
                                    isSelected
                                      ? 'bg-[#191D28] text-[#CCFF00] font-semibold border-l-2 border-[#CCFF00]'
                                      : 'text-[#94A0B2] hover:text-[#F5F5F7] hover:bg-[#141824] border-l-2 border-transparent'
                                  }`}
                                >
                                  <span className="truncate pr-2">{client}</span>
                                  {isSelected && <Check size={14} className="text-[#CCFF00] shrink-0" strokeWidth={2.2} />}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Menu Active Pill Item */}
            <div className="space-y-1.5">
              <div className="w-full flex items-center justify-between px-3 py-2 rounded-[8px] bg-[#141824] border border-[#212739] text-[#F5F5F7] font-semibold text-xs">
                <div className="flex items-center gap-2">
                  <LayoutDashboard size={15} strokeWidth={1.75} className="text-[#CCFF00]" />
                  <span>Dashboard {activeTab === 'diario' ? 'Diário' : 'Semanal'}</span>
                </div>
                <ChevronDown size={14} className="text-[#94A0B2]" />
              </div>

              <div className="pl-3 pt-0.5">
                <div className="w-full px-3 py-1.5 rounded-[6px] bg-[#0D1018] border border-[#212739] text-[#94A0B2] text-[11px] font-medium flex items-center justify-between">
                  <span className="truncate">Visão • {selectedCloser || 'Closer'}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00] shadow-[0_0_6px_#CCFF00] shrink-0"></span>
                </div>
              </div>
            </div>

            {/* Resumo Rápido na Sidebar */}
            <div className="p-3.5 rounded-[10px] bg-[#141824] border border-[#212739] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#94A0B2] uppercase tracking-wider font-semibold truncate pr-2">
                  {activeTab === 'diario' ? `Diário • ${selectedCloser}` : `Semanal • ${selectedCloser}`}
                </span>
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#CCFF00] bg-[#CCFF00]/10 px-2 py-0.5 rounded-full border border-[#CCFF00]/25 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00] animate-pulse"></span>
                  Ativo
                </span>
              </div>

              {activeTab === 'diario' ? (
                <div className="pt-2 border-t border-[#212739] space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#94A0B2]">Total Vendas:</span>
                    <span className="font-semibold text-[#F5F5F7] [font-variant-numeric:lining-nums_tabular-nums]">{dailySummary.totalVendas} un</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#94A0B2]">Valor Contrato:</span>
                    <span className="font-semibold text-[#F5F5F7] [font-variant-numeric:lining-nums_tabular-nums]">
                      {formatCurrency(dailySummary.totalContratos)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#94A0B2]">Cash Coletado:</span>
                    <span className="font-bold text-[#CCFF00] [font-variant-numeric:lining-nums_tabular-nums]">
                      {formatCurrency(dailySummary.totalCashColetado)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t border-[#212739] space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#94A0B2]">Volume Total:</span>
                    <span className="font-semibold text-[#F5F5F7] [font-variant-numeric:lining-nums_tabular-nums]">
                      {formatCurrency(semanalSummary.volumeTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#94A0B2]">Total Fechado:</span>
                    <span className="font-bold text-[#CCFF00] [font-variant-numeric:lining-nums_tabular-nums]">
                      {formatCurrency(semanalSummary.valFechado)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#94A0B2]">Conversão:</span>
                    <span className="font-semibold text-[#F5F5F7] [font-variant-numeric:lining-nums_tabular-nums]">
                      {semanalSummary.taxaConversao.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Informações da Sessão */}
          <div className="pt-4 border-t border-[#212739] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] bg-[#141824] border border-[#212739] flex items-center justify-center text-[#CCFF00]">
              <UserCheck size={15} strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#F5F5F7]">Painel do Closer</p>
              <p className="text-[10px] text-[#64748B] tracking-wider uppercase">Ambiente Seguro</p>
            </div>
          </div>
        </aside>

        {/* =========================================================================
            3. ÁREA DE CONTEÚDO PRINCIPAL (ALTERNÂNCIA DIÁRIO / SEMANAL)
            ========================================================================= */}
        <main className="flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-7 relative bg-[#0B0D12]">
          {/* PAINEL 1: VISÃO DIÁRIA */}
          {activeTab === 'diario' && (
            <motion.div
              key="diario-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-3xl mx-auto space-y-6 pb-6"
            >
              {/* Header & Date Selector Diário */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#212739] pb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#CCFF00]/10 border border-[#CCFF00]/25 text-[#CCFF00] text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00] animate-pulse" />
                      Closer: {selectedCloser || 'Não selecionado'}
                    </span>
                    {clientName.trim() && (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#141824] border border-[#212739] text-[#94A0B2] text-[10px] font-medium tracking-wide flex items-center gap-1.5">
                        <Building2 size={11} strokeWidth={1.75} className="text-[#CCFF00]" />
                        Cliente: <span className="text-[#F5F5F7] font-semibold">{clientName.trim()}</span>
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F5F7]">
                    Preenchimento de Métricas
                  </h1>
                  <p className="text-[#94A0B2] text-xs mt-0.5">
                    Informe os orçamentos novos e o trabalho na base do dia.
                  </p>
                </div>

                {/* Controles Diários & Date Picker */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleLoadDailySample}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-[#141824] border border-[#212739] text-xs font-semibold text-[#94A0B2] hover:text-[#F5F5F7] hover:border-[#323B54] transition-all cursor-pointer"
                    title="Preencher com valores de exemplo para testar"
                  >
                    <Sparkles size={13} strokeWidth={1.75} className="text-[#CCFF00]" />
                    <span>Exemplo</span>
                  </button>

                  <button
                    onClick={handleResetDaily}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-[#141824] border border-[#212739] text-xs font-semibold text-[#94A0B2] hover:text-[#F5F5F7] hover:border-[#323B54] transition-all cursor-pointer"
                    title="Limpar todos os campos do dia"
                  >
                    <RotateCcw size={13} strokeWidth={1.75} className="text-[#64748B]" />
                    <span>Limpar</span>
                  </button>

                  {/* DATE PICKER */}
                  <div className="relative" ref={calendarRef}>
                    <button
                      onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                      className={`flex items-center gap-2 bg-[#141824] border rounded-[10px] py-2 px-3.5 text-xs font-semibold transition-all focus:outline-none hover:border-[#323B54] cursor-pointer ${
                        isCalendarOpen
                          ? 'border-[#CCFF00] ring-1 ring-[#CCFF00]/30 text-white'
                          : 'border-[#212739] text-[#F5F5F7]'
                      }`}
                    >
                      <CalendarIcon size={14} strokeWidth={1.75} className="text-[#CCFF00]" />
                      <span className="[font-variant-numeric:lining-nums_tabular-nums]">{formatPeriod()}</span>
                      <ChevronDown
                        size={13}
                        strokeWidth={1.75}
                        className={`text-[#94A0B2] transition-transform ${
                          isCalendarOpen ? 'rotate-180 text-[#CCFF00]' : ''
                        }`}
                      />
                    </button>

                    <AnimatePresence>
                      {isCalendarOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                          className="absolute z-50 top-11 right-0 p-4 bg-[#0F121A] border border-[#212739] rounded-[12px] shadow-2xl"
                        >
                          <DayPicker
                            mode="range"
                            selected={dateRange}
                            onSelect={setDateRange}
                            locale={ptBR}
                            className="text-[#F5F5F7]"
                          />
                          <div className="mt-3 pt-3 border-t border-[#212739] flex justify-end">
                            <button
                              onClick={() => setIsCalendarOpen(false)}
                              className="px-3 py-1.5 rounded-[8px] bg-[#CCFF00] text-black font-bold text-xs hover:bg-[#B8E600] transition-colors cursor-pointer"
                            >
                              Confirmar Data
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* 4 CARDS BENTO DE RESUMO RÁPIDO DIÁRIO */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#141824] border border-[#212739] rounded-[12px] p-4 flex flex-col justify-between shadow-sm">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A0B2]">
                    Total Vendas
                  </span>
                  <p className="text-[24px] sm:text-[28px] font-bold text-[#F5F5F7] tracking-tight [font-variant-numeric:lining-nums_tabular-nums] mt-1.5 leading-none">
                    {dailySummary.totalVendas}
                  </p>
                  <span className="text-[11px] text-[#64748B] mt-2">
                    {dailySummary.vNovos} novos + {dailySummary.vBase} base
                  </span>
                </div>

                <div className="bg-[#141824] border border-[#212739] rounded-[12px] p-4 flex flex-col justify-between shadow-sm">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A0B2]">
                    Valor Contrato
                  </span>
                  <p className="text-[20px] sm:text-[22px] font-bold text-[#F5F5F7] tracking-tight [font-variant-numeric:lining-nums_tabular-nums] mt-1.5 leading-none truncate">
                    {formatCurrency(dailySummary.totalContratos)}
                  </p>
                  <span className="text-[11px] text-[#64748B] mt-2">Contratos fechados</span>
                </div>

                <div className="bg-[#141824] border border-[#212739] rounded-[12px] p-4 flex flex-col justify-between shadow-sm">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A0B2]">
                    Cash Coletado
                  </span>
                  <p className="text-[20px] sm:text-[22px] font-bold text-[#CCFF00] tracking-tight [font-variant-numeric:lining-nums_tabular-nums] mt-1.5 leading-none truncate">
                    {formatCurrency(dailySummary.totalCashColetado)}
                  </p>
                  <span className="text-[11px] text-[#CCFF00]/70 mt-2 font-medium">Receita recebida</span>
                </div>

                <div className="bg-[#141824] border border-[#212739] rounded-[12px] p-4 flex flex-col justify-between shadow-sm">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A0B2]">
                    Em Negociação
                  </span>
                  <p className="text-[20px] sm:text-[22px] font-bold text-[#F5F5F7] tracking-tight [font-variant-numeric:lining-nums_tabular-nums] mt-1.5 leading-none truncate">
                    {formatCurrency(dailySummary.valNegociacao)}
                  </p>
                  <span className="text-[11px] text-[#64748B] mt-2">Trabalho na base</span>
                </div>
              </div>

              {/* CARD 1: ORÇAMENTOS NOVOS NO DIA */}
              <div className="bg-[#141824] border border-[#212739] rounded-[14px] p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-[8px] bg-[#191D28] border border-[#212739] flex items-center justify-center text-[#CCFF00]">
                      <PieChart size={15} strokeWidth={1.75} />
                    </div>
                    <div>
                      <h2 className="text-[15px] font-bold text-[#F5F5F7] tracking-tight">
                        ORÇAMENTOS NOVOS NO DIA
                      </h2>
                      <p className="text-[12px] text-[#94A0B2]">
                        Métricas de primeiras abordagens e novos orçamentos
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#94A0B2] uppercase tracking-wider">
                      Quantos Orçamentos
                    </label>
                    <div className="relative group">
                      <Hash
                        size={14}
                        strokeWidth={1.75}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#CCFF00] transition-colors"
                      />
                      <input
                        type="number"
                        placeholder="0"
                        value={currentDailyData.orcamentosNovos}
                        onChange={(e) => handleDailyChange('orcamentosNovos', e.target.value)}
                        className="w-full bg-[#0D1018] border border-[#212739] hover:border-[#2D354D] rounded-[8px] py-2 pl-9 pr-3 text-[#F5F5F7] text-[13px] font-medium [font-variant-numeric:lining-nums_tabular-nums] focus:outline-none focus:border-[#CCFF00] focus:ring-1 focus:ring-[#CCFF00]/30 transition-all placeholder:text-[#4A5568]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#94A0B2] uppercase tracking-wider">
                      Quantas Vendas
                    </label>
                    <div className="relative group">
                      <CheckCircle2
                        size={14}
                        strokeWidth={1.75}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#CCFF00] transition-colors"
                      />
                      <input
                        type="number"
                        placeholder="0"
                        value={currentDailyData.vendasNovos}
                        onChange={(e) => handleDailyChange('vendasNovos', e.target.value)}
                        className="w-full bg-[#0D1018] border border-[#212739] hover:border-[#2D354D] rounded-[8px] py-2 pl-9 pr-3 text-[#F5F5F7] text-[13px] font-medium [font-variant-numeric:lining-nums_tabular-nums] focus:outline-none focus:border-[#CCFF00] focus:ring-1 focus:ring-[#CCFF00]/30 transition-all placeholder:text-[#4A5568]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#94A0B2] uppercase tracking-wider">
                      Valor de Contrato
                    </label>
                    <div className="relative group">
                      <DollarSign
                        size={14}
                        strokeWidth={1.75}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#CCFF00] transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="R$ 0,00"
                        value={currentDailyData.valorContratoNovos}
                        onChange={(e) => handleDailyCurrencyInput('valorContratoNovos', e.target.value)}
                        className="w-full bg-[#0D1018] border border-[#212739] hover:border-[#2D354D] rounded-[8px] py-2 pl-9 pr-3 text-[#F5F5F7] text-[13px] font-medium [font-variant-numeric:lining-nums_tabular-nums] focus:outline-none focus:border-[#CCFF00] focus:ring-1 focus:ring-[#CCFF00]/30 transition-all placeholder:text-[#4A5568]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#CCFF00] uppercase tracking-wider flex items-center gap-1.5">
                      <Wallet size={12} strokeWidth={1.75} className="text-[#CCFF00]" />
                      Cash Coletado
                    </label>
                    <div className="relative group">
                      <DollarSign
                        size={14}
                        strokeWidth={1.75}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#CCFF00]/70 group-focus-within:text-[#CCFF00] transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="R$ 0,00"
                        value={currentDailyData.cashColetadoNovos}
                        onChange={(e) => handleDailyCurrencyInput('cashColetadoNovos', e.target.value)}
                        className="w-full bg-[#0D1018] border border-[#212739] hover:border-[#CCFF00]/40 rounded-[8px] py-2 pl-9 pr-3 text-[#F5F5F7] text-[13px] font-medium [font-variant-numeric:lining-nums_tabular-nums] focus:outline-none focus:border-[#CCFF00] focus:ring-1 focus:ring-[#CCFF00]/30 transition-all placeholder:text-[#4A5568]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 2: TRABALHO NA BASE */}
              <div className="bg-[#141824] border border-[#212739] rounded-[14px] p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-[8px] bg-[#191D28] border border-[#212739] flex items-center justify-center text-[#CCFF00]">
                      <BarChart3 size={15} strokeWidth={1.75} />
                    </div>
                    <div>
                      <h2 className="text-[15px] font-bold text-[#F5F5F7] tracking-tight">
                        TRABALHO NA BASE
                      </h2>
                      <p className="text-[12px] text-[#94A0B2]">
                        Métricas de follow-up, negociação ativa e vendas recuperadas
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#94A0B2] uppercase tracking-wider">
                      Quantos Follow Realizados
                    </label>
                    <div className="relative group">
                      <Hash
                        size={14}
                        strokeWidth={1.75}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#CCFF00] transition-colors"
                      />
                      <input
                        type="number"
                        placeholder="0"
                        value={currentDailyData.followRealizados}
                        onChange={(e) => handleDailyChange('followRealizados', e.target.value)}
                        className="w-full bg-[#0D1018] border border-[#212739] hover:border-[#2D354D] rounded-[8px] py-2 pl-9 pr-3 text-[#F5F5F7] text-[13px] font-medium [font-variant-numeric:lining-nums_tabular-nums] focus:outline-none focus:border-[#CCFF00] focus:ring-1 focus:ring-[#CCFF00]/30 transition-all placeholder:text-[#4A5568]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#94A0B2] uppercase tracking-wider">
                      Valor em Negociação
                    </label>
                    <div className="relative group">
                      <DollarSign
                        size={14}
                        strokeWidth={1.75}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#CCFF00] transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="R$ 0,00"
                        value={currentDailyData.valorNegociacaoBase}
                        onChange={(e) => handleDailyCurrencyInput('valorNegociacaoBase', e.target.value)}
                        className="w-full bg-[#0D1018] border border-[#212739] hover:border-[#2D354D] rounded-[8px] py-2 pl-9 pr-3 text-[#F5F5F7] text-[13px] font-medium [font-variant-numeric:lining-nums_tabular-nums] focus:outline-none focus:border-[#CCFF00] focus:ring-1 focus:ring-[#CCFF00]/30 transition-all placeholder:text-[#4A5568]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#94A0B2] uppercase tracking-wider">
                      Quantas Vendas
                    </label>
                    <div className="relative group">
                      <CheckCircle2
                        size={14}
                        strokeWidth={1.75}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#CCFF00] transition-colors"
                      />
                      <input
                        type="number"
                        placeholder="0"
                        value={currentDailyData.vendasBase}
                        onChange={(e) => handleDailyChange('vendasBase', e.target.value)}
                        className="w-full bg-[#0D1018] border border-[#212739] hover:border-[#2D354D] rounded-[8px] py-2 pl-9 pr-3 text-[#F5F5F7] text-[13px] font-medium [font-variant-numeric:lining-nums_tabular-nums] focus:outline-none focus:border-[#CCFF00] focus:ring-1 focus:ring-[#CCFF00]/30 transition-all placeholder:text-[#4A5568]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#94A0B2] uppercase tracking-wider">
                      Valor de Contrato
                    </label>
                    <div className="relative group">
                      <DollarSign
                        size={14}
                        strokeWidth={1.75}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#CCFF00] transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="R$ 0,00"
                        value={currentDailyData.valorContratoBase}
                        onChange={(e) => handleDailyCurrencyInput('valorContratoBase', e.target.value)}
                        className="w-full bg-[#0D1018] border border-[#212739] hover:border-[#2D354D] rounded-[8px] py-2 pl-9 pr-3 text-[#F5F5F7] text-[13px] font-medium [font-variant-numeric:lining-nums_tabular-nums] focus:outline-none focus:border-[#CCFF00] focus:ring-1 focus:ring-[#CCFF00]/30 transition-all placeholder:text-[#4A5568]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[11px] font-semibold text-[#CCFF00] uppercase tracking-wider flex items-center gap-1.5">
                      <Wallet size={12} strokeWidth={1.75} className="text-[#CCFF00]" />
                      Cash Coletado
                    </label>
                    <div className="relative group">
                      <DollarSign
                        size={14}
                        strokeWidth={1.75}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#CCFF00]/70 group-focus-within:text-[#CCFF00] transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="R$ 0,00"
                        value={currentDailyData.cashColetadoBase}
                        onChange={(e) => handleDailyCurrencyInput('cashColetadoBase', e.target.value)}
                        className="w-full bg-[#0D1018] border border-[#212739] hover:border-[#CCFF00]/40 rounded-[8px] py-2 pl-9 pr-3 text-[#F5F5F7] text-[13px] font-medium [font-variant-numeric:lining-nums_tabular-nums] focus:outline-none focus:border-[#CCFF00] focus:ring-1 focus:ring-[#CCFF00]/30 transition-all placeholder:text-[#4A5568]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* MENSAGEM DE ERRO OU SUCESSO */}
              {error && (
                <div className="p-3.5 rounded-[10px] bg-red-500/10 border border-red-500/25 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {pdfGenerated && (
                <div className="p-3.5 rounded-[10px] bg-[#CCFF00]/10 border border-[#CCFF00]/25 text-[#CCFF00] text-xs flex items-center gap-2">
                  <CheckCircle2 size={15} />
                  <span>Relatório diário gerado e baixado com sucesso!</span>
                </div>
              )}

              {/* BOTÃO DE GERAÇÃO DE PDF DIÁRIO */}
              <div className="pt-1">
                <button
                  onClick={generateDailyPDF}
                  disabled={isGenerating}
                  className="w-full py-3.5 bg-[#CCFF00] hover:bg-[#B8E600] text-black rounded-[10px] font-bold text-xs shadow-[0_2px_15px_rgba(204,255,0,0.2)] transition-all flex justify-center items-center gap-2 uppercase tracking-wider cursor-pointer active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Gerando Documento Diário...</span>
                    </>
                  ) : (
                    <>
                      <FileText size={15} strokeWidth={1.75} className="text-black" />
                      <span>Gerar Relatório de {selectedCloser.trim() || 'Closer'} (PDF)</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* PAINEL 2: NOVO PAINEL SEMANAL (RELATÓRIO COMERCIAL — ORÇAMENTOS) */}
          {activeTab === 'semanal' && (
            <motion.div
              key="semanal-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-3xl mx-auto space-y-6 pb-6"
            >
              {/* Header do Painel Semanal */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#212739] pb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#CCFF00]/10 border border-[#CCFF00]/25 text-[#CCFF00] text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00] animate-pulse" />
                      Closer: {selectedCloser || 'Geral'}
                    </span>
                    {clientName.trim() && (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#141824] border border-[#212739] text-[#94A0B2] text-[10px] font-medium tracking-wide flex items-center gap-1.5">
                        <Building2 size={11} strokeWidth={1.75} className="text-[#CCFF00]" />
                        Cliente: <span className="text-[#F5F5F7] font-semibold">{clientName.trim()}</span>
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F5F7]">
                    Relatório Comercial — Orçamentos
                  </h1>
                  <p className="text-[#94A0B2] text-xs mt-0.5">
                    Acompanhamento semanal de volume, em negociação e receita.
                  </p>
                </div>

                {/* Controles de Ação Rápida Semanal */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleLoadSemanalSample}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#141824] border border-[#212739] text-xs font-semibold text-[#94A0B2] hover:text-[#F5F5F7] hover:border-[#323B54] transition-all cursor-pointer"
                    title="Preencher com valores de exemplo para testar"
                  >
                    <Sparkles size={13} strokeWidth={1.75} className="text-[#CCFF00]" />
                    <span>Exemplo</span>
                  </button>

                  <button
                    onClick={handleResetSemanal}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#141824] border border-[#212739] text-xs font-semibold text-[#94A0B2] hover:text-[#F5F5F7] hover:border-red-500/30 transition-all cursor-pointer"
                    title="Limpar campos da semana"
                  >
                    <RotateCcw size={13} strokeWidth={1.75} />
                    <span>Limpar</span>
                  </button>
                </div>
              </div>

              {/* 4 CARDS BENTO TOP (VOLUME TOTAL, TOTAL ORÇAMENTOS, FECHADOS, CONVERSÃO) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* 1. Volume Total */}
                <div className="bg-[#141824] border border-[#212739] rounded-[12px] p-4 flex flex-col justify-between shadow-sm">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A0B2]">
                    VOLUME TOTAL
                  </span>
                  <p className="text-[20px] sm:text-[22px] font-bold text-[#F5F5F7] tracking-tight [font-variant-numeric:lining-nums_tabular-nums] mt-1.5 leading-none truncate">
                    {formatCurrency(semanalSummary.volumeTotal)}
                  </p>
                  <span className="text-[11px] text-[#64748B] mt-2">no funil</span>
                </div>

                {/* 2. Total Orçamentos */}
                <div className="bg-[#141824] border border-[#212739] rounded-[12px] p-4 flex flex-col justify-between shadow-sm">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A0B2]">
                    TOTAL ORÇAMENTOS
                  </span>
                  <p className="text-[24px] sm:text-[28px] font-bold text-[#F5F5F7] tracking-tight [font-variant-numeric:lining-nums_tabular-nums] mt-1.5 leading-none">
                    {semanalSummary.totalOrcamentos}
                  </p>
                  <span className="text-[11px] text-[#64748B] mt-2">na semana</span>
                </div>

                {/* 3. Fechados */}
                <div className="bg-[#141824] border border-[#212739] rounded-[12px] p-4 flex flex-col justify-between shadow-sm">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A0B2]">
                    FECHADOS
                  </span>
                  <p className="text-[20px] sm:text-[22px] font-bold text-[#CCFF00] tracking-tight [font-variant-numeric:lining-nums_tabular-nums] mt-1.5 leading-none truncate">
                    {formatCurrency(semanalSummary.valFechado)}
                  </p>
                  <span className="text-[11px] text-[#CCFF00]/70 mt-2 font-medium">
                    {semanalSummary.qtdFechados} contratos convertidos
                  </span>
                </div>

                {/* 4. Taxa de Conversão */}
                <div className="bg-[#141824] border border-[#212739] rounded-[12px] p-4 flex flex-col justify-between shadow-sm">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A0B2]">
                    TAXA DE CONVERSÃO
                  </span>
                  <p className="text-[24px] sm:text-[28px] font-bold text-[#F5F5F7] tracking-tight [font-variant-numeric:lining-nums_tabular-nums] mt-1.5 leading-none">
                    {semanalSummary.taxaConversao.toFixed(1)}%
                  </p>
                  <span className="text-[11px] text-[#64748B] mt-2">Eficiência do funil</span>
                </div>
              </div>

              {/* CARD 1: ORÇAMENTOS FECHADOS */}
              <div className="bg-[#141824] border border-[#212739] rounded-[14px] p-5 sm:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-[8px] bg-[#191D28] border border-[#212739] flex items-center justify-center text-[#CCFF00]">
                      <CheckCircle2 size={15} strokeWidth={1.75} />
                    </div>
                    <div>
                      <h2 className="text-[15px] font-bold text-[#F5F5F7] tracking-tight">
                        ORÇAMENTOS FECHADOS
                      </h2>
                      <p className="text-[12px] text-[#94A0B2]">
                        Contratos assinados e receita capturada na semana
                      </p>
                    </div>
                  </div>

                  <div className="self-start sm:self-center px-3 py-1 rounded-[8px] bg-[#0D1018] border border-[#212739] text-xs">
                    <span className="text-[#94A0B2]">Ticket Médio: </span>
                    <span className="text-[#CCFF00] font-semibold [font-variant-numeric:lining-nums_tabular-nums]">
                      {formatCurrency(semanalSummary.ticketFechado)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#94A0B2] uppercase tracking-wider">
                      Quantidade de Contratos
                    </label>
                    <div className="relative group">
                      <Hash
                        size={14}
                        strokeWidth={1.75}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#CCFF00] transition-colors"
                      />
                      <input
                        type="number"
                        placeholder="0"
                        value={currentSemanalData.qtdContratosFechados}
                        onChange={(e) => handleSemanalChange('qtdContratosFechados', e.target.value)}
                        className="w-full bg-[#0D1018] border border-[#212739] hover:border-[#2D354D] rounded-[8px] py-2 pl-9 pr-3 text-[#F5F5F7] text-[13px] font-medium [font-variant-numeric:lining-nums_tabular-nums] focus:outline-none focus:border-[#CCFF00] focus:ring-1 focus:ring-[#CCFF00]/30 transition-all placeholder:text-[#4A5568]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#94A0B2] uppercase tracking-wider">
                      Valor Total Fechado
                    </label>
                    <div className="relative group">
                      <DollarSign
                        size={14}
                        strokeWidth={1.75}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#CCFF00] transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="R$ 0,00"
                        value={currentSemanalData.valorTotalFechado}
                        onChange={(e) => handleSemanalCurrencyInput('valorTotalFechado', e.target.value)}
                        className="w-full bg-[#0D1018] border border-[#212739] hover:border-[#2D354D] rounded-[8px] py-2 pl-9 pr-3 text-[#F5F5F7] text-[13px] font-medium [font-variant-numeric:lining-nums_tabular-nums] focus:outline-none focus:border-[#CCFF00] focus:ring-1 focus:ring-[#CCFF00]/30 transition-all placeholder:text-[#4A5568]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 2: EM NEGOCIAÇÃO / AGUARDANDO */}
              <div className="bg-[#141824] border border-[#212739] rounded-[14px] p-5 sm:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-[8px] bg-[#191D28] border border-[#212739] flex items-center justify-center text-[#3B82F6]">
                      <Clock size={15} strokeWidth={1.75} />
                    </div>
                    <div>
                      <h2 className="text-[15px] font-bold text-[#F5F5F7] tracking-tight">
                        EM NEGOCIAÇÃO / AGUARDANDO
                      </h2>
                      <p className="text-[12px] text-[#94A0B2]">
                        Propostas ativas com follow-up ativo e decisão pendente
                      </p>
                    </div>
                  </div>

                  <div className="self-start sm:self-center px-3 py-1 rounded-[8px] bg-[#0D1018] border border-[#212739] text-xs">
                    <span className="text-[#94A0B2]">Ticket Médio: </span>
                    <span className="text-[#3B82F6] font-semibold [font-variant-numeric:lining-nums_tabular-nums]">
                      {formatCurrency(semanalSummary.ticketNegociacao)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#94A0B2] uppercase tracking-wider">
                      Quantidade de Propostas
                    </label>
                    <div className="relative group">
                      <Hash
                        size={14}
                        strokeWidth={1.75}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#3B82F6] transition-colors"
                      />
                      <input
                        type="number"
                        placeholder="0"
                        value={currentSemanalData.qtdPropostasNegociacao}
                        onChange={(e) => handleSemanalChange('qtdPropostasNegociacao', e.target.value)}
                        className="w-full bg-[#0D1018] border border-[#212739] hover:border-[#2D354D] rounded-[8px] py-2 pl-9 pr-3 text-[#F5F5F7] text-[13px] font-medium [font-variant-numeric:lining-nums_tabular-nums] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/30 transition-all placeholder:text-[#4A5568]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#94A0B2] uppercase tracking-wider">
                      Valor em Negociação
                    </label>
                    <div className="relative group">
                      <DollarSign
                        size={14}
                        strokeWidth={1.75}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#3B82F6] transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="R$ 0,00"
                        value={currentSemanalData.valorEmNegociacao}
                        onChange={(e) => handleSemanalCurrencyInput('valorEmNegociacao', e.target.value)}
                        className="w-full bg-[#0D1018] border border-[#212739] hover:border-[#2D354D] rounded-[8px] py-2 pl-9 pr-3 text-[#F5F5F7] text-[13px] font-medium [font-variant-numeric:lining-nums_tabular-nums] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/30 transition-all placeholder:text-[#4A5568]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 3: SEM CONDIÇÕES FINANCEIRAS (PERDIDOS) */}
              <div className="bg-[#141824] border border-[#212739] rounded-[14px] p-5 sm:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-[8px] bg-[#191D28] border border-[#212739] flex items-center justify-center text-[#EF4444]">
                      <XCircle size={15} strokeWidth={1.75} />
                    </div>
                    <div>
                      <h2 className="text-[15px] font-bold text-[#F5F5F7] tracking-tight">
                        SEM CONDIÇÕES FINANCEIRAS (PERDIDOS)
                      </h2>
                      <p className="text-[12px] text-[#94A0B2]">
                        Sem condições no momento ou objeção de investimento não superada
                      </p>
                    </div>
                  </div>

                  <div className="self-start sm:self-center px-3 py-1 rounded-[8px] bg-[#0D1018] border border-[#212739] text-xs">
                    <span className="text-[#94A0B2]">Ticket Médio: </span>
                    <span className="text-[#EF4444] font-semibold [font-variant-numeric:lining-nums_tabular-nums]">
                      {formatCurrency(semanalSummary.ticketPerdido)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#94A0B2] uppercase tracking-wider">
                      Quantidade de Pacientes / Leads
                    </label>
                    <div className="relative group">
                      <Hash
                        size={14}
                        strokeWidth={1.75}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#EF4444] transition-colors"
                      />
                      <input
                        type="number"
                        placeholder="0"
                        value={currentSemanalData.qtdPacientesPerdidos}
                        onChange={(e) => handleSemanalChange('qtdPacientesPerdidos', e.target.value)}
                        className="w-full bg-[#0D1018] border border-[#212739] hover:border-[#2D354D] rounded-[8px] py-2 pl-9 pr-3 text-[#F5F5F7] text-[13px] font-medium [font-variant-numeric:lining-nums_tabular-nums] focus:outline-none focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]/30 transition-all placeholder:text-[#4A5568]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#94A0B2] uppercase tracking-wider">
                      Valor Perdido
                    </label>
                    <div className="relative group">
                      <DollarSign
                        size={14}
                        strokeWidth={1.75}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#EF4444] transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="R$ 0,00"
                        value={currentSemanalData.valorPerdido}
                        onChange={(e) => handleSemanalCurrencyInput('valorPerdido', e.target.value)}
                        className="w-full bg-[#0D1018] border border-[#212739] hover:border-[#2D354D] rounded-[8px] py-2 pl-9 pr-3 text-[#F5F5F7] text-[13px] font-medium [font-variant-numeric:lining-nums_tabular-nums] focus:outline-none focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]/30 transition-all placeholder:text-[#4A5568]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 4: DIAGNÓSTICO COMERCIAL & PIPELINE (DISTRIBUIÇÃO PROPORCIONAL) */}
              <div className="bg-[#141824] border border-[#212739] rounded-[14px] p-5 sm:p-6 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#212739] pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-[8px] bg-[#191D28] border border-[#212739] flex items-center justify-center text-[#CCFF00]">
                      <TrendingUp size={15} strokeWidth={1.75} />
                    </div>
                    <div>
                      <h2 className="text-[15px] font-bold text-[#F5F5F7] tracking-tight">
                        DIAGNÓSTICO COMERCIAL & PIPELINE
                      </h2>
                      <p className="text-[12px] text-[#94A0B2]">
                        DISTRIBUIÇÃO PROPORCIONAL DO PIPELINE
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-[6px] bg-[#0D1018] border border-[#212739] text-xs font-semibold text-[#F5F5F7] [font-variant-numeric:lining-nums_tabular-nums] self-start sm:self-center">
                    {semanalSummary.totalOrcamentos} ORÇAMENTOS REGISTRADOS
                  </span>
                </div>

                {/* Barra de Distribuição Visual */}
                <div className="space-y-2">
                  <div className="h-2.5 w-full rounded-full bg-[#0D1018] border border-[#212739] overflow-hidden flex">
                    <div
                      style={{ width: `${semanalSummary.pctQtdFechado}%` }}
                      className="h-full bg-[#CCFF00] transition-all duration-500"
                      title={`Fechados: ${semanalSummary.pctQtdFechado.toFixed(1)}%`}
                    />
                    <div
                      style={{ width: `${semanalSummary.pctQtdNegociacao}%` }}
                      className="h-full bg-[#3B82F6] transition-all duration-500"
                      title={`Em Negociação: ${semanalSummary.pctQtdNegociacao.toFixed(1)}%`}
                    />
                    <div
                      style={{ width: `${semanalSummary.pctQtdPerdido}%` }}
                      className="h-full bg-[#EF4444] transition-all duration-500"
                      title={`Perdidos: ${semanalSummary.pctQtdPerdido.toFixed(1)}%`}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#CCFF00]" />
                      <span className="text-[#F5F5F7] font-medium">Fechados:</span>
                      <span className="text-[#CCFF00] font-semibold [font-variant-numeric:lining-nums_tabular-nums]">
                        {semanalSummary.pctQtdFechado.toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                      <span className="text-[#F5F5F7] font-medium">Em Negociação:</span>
                      <span className="text-[#3B82F6] font-semibold [font-variant-numeric:lining-nums_tabular-nums]">
                        {semanalSummary.pctQtdNegociacao.toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                      <span className="text-[#F5F5F7] font-medium">Perdidos:</span>
                      <span className="text-[#EF4444] font-semibold [font-variant-numeric:lining-nums_tabular-nums]">
                        {semanalSummary.pctQtdPerdido.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3 Blocos de Diagnóstico Estratégico */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="p-3.5 rounded-[10px] bg-[#0D1018] border border-[#212739] space-y-1">
                    <span className="text-[10px] font-semibold text-[#CCFF00] tracking-wider uppercase">
                      01 • FECHAMENTO
                    </span>
                    <p className="text-[14px] font-bold text-[#F5F5F7] [font-variant-numeric:lining-nums_tabular-nums]">
                      {formatCurrency(semanalSummary.valFechado)}
                    </p>
                    <p className="text-[11px] text-[#94A0B2] leading-relaxed">
                      {semanalSummary.qtdFechados} contratos convertidos na semana com eficiência máxima.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-[10px] bg-[#0D1018] border border-[#212739] space-y-1">
                    <span className="text-[10px] font-semibold text-[#3B82F6] tracking-wider uppercase">
                      02 • RECUPERAÇÃO
                    </span>
                    <p className="text-[14px] font-bold text-[#F5F5F7] [font-variant-numeric:lining-nums_tabular-nums]">
                      {formatCurrency(semanalSummary.valNegociacao)}
                    </p>
                    <p className="text-[11px] text-[#94A0B2] leading-relaxed">
                      {semanalSummary.qtdNegociacao} propostas ativas aguardando follow-up estratégico.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-[10px] bg-[#0D1018] border border-[#212739] space-y-1">
                    <span className="text-[10px] font-semibold text-[#EF4444] tracking-wider uppercase">
                      03 • PERDAS FINANCEIRAS
                    </span>
                    <p className="text-[14px] font-bold text-[#F5F5F7] [font-variant-numeric:lining-nums_tabular-nums]">
                      {formatCurrency(semanalSummary.valPerdido)}
                    </p>
                    <p className="text-[11px] text-[#94A0B2] leading-relaxed">
                      {semanalSummary.qtdPerdidos} pacientes sem condições imediatas; cadastrar em régua fria.
                    </p>
                  </div>
                </div>
              </div>

              {/* MENSAGEM DE ERRO OU SUCESSO SEMANAL */}
              {error && (
                <div className="p-3.5 rounded-[10px] bg-red-500/10 border border-red-500/25 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {pdfGenerated && (
                <div className="p-3.5 rounded-[10px] bg-[#CCFF00]/10 border border-[#CCFF00]/25 text-[#CCFF00] text-xs flex items-center gap-2">
                  <CheckCircle2 size={15} />
                  <span>Relatório comercial semanal gerado e baixado com sucesso!</span>
                </div>
              )}

              {/* BOTÃO DE GERAÇÃO DE PDF SEMANAL */}
              <div className="pt-1">
                <button
                  onClick={generateSemanalPDF}
                  disabled={isGenerating}
                  className="w-full py-3.5 bg-[#CCFF00] hover:bg-[#B8E600] text-black rounded-[10px] font-bold text-xs shadow-[0_2px_15px_rgba(204,255,0,0.2)] transition-all flex justify-center items-center gap-2 uppercase tracking-wider cursor-pointer active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Gerando Documento Semanal...</span>
                    </>
                  ) : (
                    <>
                      <FileText size={15} strokeWidth={1.75} className="text-black" />
                      <span>GERAR RELATÓRIO SEMANAL (PDF)</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}
