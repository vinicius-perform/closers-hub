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
      await new Promise((resolve) => setTimeout(resolve, 500));

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

      // Header com Logo
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
        doc.setFillColor(204, 255, 0);
        doc.roundedRect(MARGIN, currentY, 12, 12, 2.5, 2.5, 'F');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('FA', MARGIN + 3.2, currentY + 8);
      }

      doc.setTextColor(11, 13, 19);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(`RELATÓRIO DIÁRIO DE CLOSER`, MARGIN + headerOffset, currentY + 8.5);

      doc.setFontSize(8);
      doc.setTextColor(110, 122, 145);
      doc.setFont('helvetica', 'normal');
      doc.text('INTELIGÊNCIA COMERCIAL', MARGIN + CONTENT_WIDTH - 38, currentY + 8.5);

      currentY += 16;
      drawDivider(currentY);
      currentY += 10;

      // Informações Gerais
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(90, 105, 130);
      doc.text('INFORMAÇÕES GERAIS', MARGIN, currentY);
      currentY += 8;

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

      if (clientName.trim()) {
        const colWidth3 = CONTENT_WIDTH / 3;
        drawInfoItem('Cliente / Operação:', clientName.trim(), MARGIN, currentY);
        drawInfoItem('Closer Responsável:', selectedCloser.trim() || 'Closer', MARGIN + colWidth3, currentY);
        drawInfoItem('Período de Análise:', formatPeriod(), MARGIN + colWidth3 * 2, currentY);
      } else {
        const colWidth = CONTENT_WIDTH / 2;
        drawInfoItem('Closer Responsável:', selectedCloser.trim() || 'Closer', MARGIN, currentY);
        drawInfoItem('Período de Análise:', formatPeriod(), MARGIN + colWidth, currentY);
      }
      currentY += 16;

      // Cards de Resumo Executivo
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(MARGIN, currentY, CONTENT_WIDTH, 20, 2, 2, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(MARGIN, currentY, CONTENT_WIDTH, 20, 2, 2, 'S');

      const kpiWidth = CONTENT_WIDTH / 4;
      const drawKpi = (label: string, val: string, x: number) => {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text(label, x + 4, currentY + 6.5);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(val, x + 4, currentY + 14);
      };

      drawKpi('TOTAL VENDAS', `${dailySummary.totalVendas} un`, MARGIN);
      drawKpi('VALOR CONTRATO', formatCurrency(dailySummary.totalContratos), MARGIN + kpiWidth);
      drawKpi('CASH COLETADO', formatCurrency(dailySummary.totalCashColetado), MARGIN + kpiWidth * 2);
      drawKpi('EM NEGOCIAÇÃO', formatCurrency(dailySummary.valNegociacao), MARGIN + kpiWidth * 3);

      currentY += 28;

      // Tabela de Detalhamento
      const renderSectionTable = (title: string, rows: [string, string][]) => {
        doc.setFillColor(241, 245, 249);
        doc.rect(MARGIN, currentY, CONTENT_WIDTH, 7, 'F');
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(title.toUpperCase(), MARGIN + 4, currentY + 5);
        currentY += 7;

        rows.forEach(([label, value], i) => {
          if (i % 2 === 1) {
            doc.setFillColor(250, 250, 250);
            doc.rect(MARGIN, currentY, CONTENT_WIDTH, 6.5, 'F');
          }
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(71, 85, 105);
          doc.text(label, MARGIN + 4, currentY + 4.8);

          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          doc.text(value, MARGIN + CONTENT_WIDTH - 4, currentY + 4.8, { align: 'right' });
          currentY += 6.5;
        });

        currentY += 4;
      };

      renderSectionTable('1. Orçamentos Novos no Dia', [
        ['Quantos Orçamentos:', `${dailySummary.orcNovos} un`],
        ['Quantas Vendas:', `${dailySummary.vNovos} un`],
        ['Valor de Contrato:', formatCurrency(dailySummary.valContratoNovos)],
        ['Cash Coletado:', formatCurrency(dailySummary.cashNovos)],
        ['Taxa de Conversão em Novos:', `${dailySummary.taxaConversaoNovos.toFixed(1)}%`]
      ]);

      renderSectionTable('2. Trabalho na Base', [
        ['Quantos Follow Realizados:', `${dailySummary.fRealizados} un`],
        ['Valor em Negociação:', formatCurrency(dailySummary.valNegociacao)],
        ['Quantas Vendas Recuperadas:', `${dailySummary.vBase} un`],
        ['Valor de Contrato:', formatCurrency(dailySummary.valContratoBase)],
        ['Cash Coletado na Base:', formatCurrency(dailySummary.cashBase)],
        ['Taxa de Conversão na Base:', `${dailySummary.taxaConversaoBase.toFixed(1)}%`]
      ]);

      // Rodapé
      doc.setFontSize(7);
      doc.setTextColor(150, 160, 175);
      const closerDisplay = selectedCloser.trim() || 'Closer';
      const clientPart = clientName.trim() ? ` | Cliente: ${clientName.trim()}` : '';
      const footerText = `FA Closer Hub | Closer: ${closerDisplay}${clientPart} | Emitido em ${format(new Date(), 'dd/MM/yyyy HH:mm')} | Confidencial`;
      doc.text(footerText, MARGIN, 285);

      const cleanCloserName = closerDisplay.toLowerCase().replace(/[^a-z0-9]/gi, '_');
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
      await new Promise((resolve) => setTimeout(resolve, 500));

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

      // Header com Logo
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
        doc.setFillColor(204, 255, 0);
        doc.roundedRect(MARGIN, currentY, 12, 12, 2.5, 2.5, 'F');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('FA', MARGIN + 3.2, currentY + 8);
      }

      doc.setTextColor(11, 13, 19);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(`RELATÓRIO COMERCIAL SEMANAL — ORÇAMENTOS`, MARGIN + headerOffset, currentY + 8.5);

      doc.setFontSize(8);
      doc.setTextColor(110, 122, 145);
      doc.setFont('helvetica', 'normal');
      doc.text(`SEMANA ${selectedWeekNumber}`, MARGIN + CONTENT_WIDTH - 25, currentY + 8.5);

      currentY += 16;
      drawDivider(currentY);
      currentY += 10;

      // Informações Gerais
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(90, 105, 130);
      doc.text('INFORMAÇÕES DA OPERAÇÃO', MARGIN, currentY);
      currentY += 8;

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

      if (clientName.trim()) {
        const colWidth3 = CONTENT_WIDTH / 3;
        drawInfoItem('Cliente / Operação:', clientName.trim(), MARGIN, currentY);
        drawInfoItem('Closer Responsável:', selectedCloser.trim() || 'Geral', MARGIN + colWidth3, currentY);
        drawInfoItem('Semana de Referência:', `Semana ${selectedWeekNumber}`, MARGIN + colWidth3 * 2, currentY);
      } else {
        const colWidth = CONTENT_WIDTH / 2;
        drawInfoItem('Closer Responsável:', selectedCloser.trim() || 'Geral', MARGIN, currentY);
        drawInfoItem('Semana de Referência:', `Semana ${selectedWeekNumber} • Gestão de Pipeline`, MARGIN + colWidth, currentY);
      }
      currentY += 16;

      // 4 KPIs Bento Topo
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(MARGIN, currentY, CONTENT_WIDTH, 20, 2, 2, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(MARGIN, currentY, CONTENT_WIDTH, 20, 2, 2, 'S');

      const kpiWidth = CONTENT_WIDTH / 4;
      const drawKpi = (label: string, val: string, sub: string, x: number) => {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text(label, x + 4, currentY + 6);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(val, x + 4, currentY + 12.5);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(140, 150, 165);
        doc.text(sub, x + 4, currentY + 17);
      };

      drawKpi('VOLUME TOTAL', formatCurrency(semanalSummary.volumeTotal), 'no funil', MARGIN);
      drawKpi('TOTAL ORÇAMENTOS', `${semanalSummary.totalOrcamentos} un`, 'na semana', MARGIN + kpiWidth);
      drawKpi('FECHADOS', formatCurrency(semanalSummary.valFechado), `${semanalSummary.qtdFechados} convertidos`, MARGIN + kpiWidth * 2);
      drawKpi('CONVERSÃO', `${semanalSummary.taxaConversao.toFixed(1)}%`, 'eficiência funil', MARGIN + kpiWidth * 3);

      currentY += 28;

      // Tabela dos 3 Blocos de Orçamentos
      const renderSemanalTable = (title: string, qtd: number, valor: number, ticket: number, subdesc: string) => {
        doc.setFillColor(241, 245, 249);
        doc.rect(MARGIN, currentY, CONTENT_WIDTH, 7, 'F');
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(title.toUpperCase(), MARGIN + 4, currentY + 5);

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Ticket Médio: ${formatCurrency(ticket)}`, MARGIN + CONTENT_WIDTH - 4, currentY + 5, { align: 'right' });
        currentY += 7;

        const rows: [string, string][] = [
          ['Status & Descrição:', subdesc],
          ['Quantidade Registrada:', `${qtd} un`],
          ['Volume Financeiro Total:', formatCurrency(valor)],
          ['Proporção do Volume Total:', `${semanalSummary.volumeTotal > 0 ? ((valor / semanalSummary.volumeTotal) * 100).toFixed(1) : '0'}%`]
        ];

        rows.forEach(([label, value], i) => {
          if (i % 2 === 1) {
            doc.setFillColor(250, 250, 250);
            doc.rect(MARGIN, currentY, CONTENT_WIDTH, 6.5, 'F');
          }
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(71, 85, 105);
          doc.text(label, MARGIN + 4, currentY + 4.8);

          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          doc.text(value, MARGIN + CONTENT_WIDTH - 4, currentY + 4.8, { align: 'right' });
          currentY += 6.5;
        });

        currentY += 4;
      };

      renderSemanalTable(
        '1. Orçamentos Fechados',
        semanalSummary.qtdFechados,
        semanalSummary.valFechado,
        semanalSummary.ticketFechado,
        'Contratos assinados e receita capturada na semana'
      );

      renderSemanalTable(
        '2. Em Negociação / Aguardando',
        semanalSummary.qtdNegociacao,
        semanalSummary.valNegociacao,
        semanalSummary.ticketNegociacao,
        'Propostas ativas com follow-up e decisão pendente'
      );

      renderSemanalTable(
        '3. Sem Condições Financeiras (Perdidos)',
        semanalSummary.qtdPerdidos,
        semanalSummary.valPerdido,
        semanalSummary.ticketPerdido,
        'Sem condições no momento / objeção de investimento não superada'
      );

      // Diagnóstico Comercial do Pipeline
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(MARGIN, currentY, CONTENT_WIDTH, 26, 2, 2, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(MARGIN, currentY, CONTENT_WIDTH, 26, 2, 2, 'S');

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('DIAGNÓSTICO COMERCIAL & PIPELINE', MARGIN + 4, currentY + 6);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Conversão Efetiva: ${semanalSummary.taxaConversao.toFixed(1)}% • Em Aberto: ${semanalSummary.pctQtdNegociacao.toFixed(1)}% • Perdas: ${semanalSummary.pctQtdPerdido.toFixed(1)}%`,
        MARGIN + 4,
        currentY + 12
      );

      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Volume total gerido de ${formatCurrency(semanalSummary.volumeTotal)} com ${semanalSummary.totalOrcamentos} orçamentos registrados no funil.`,
        MARGIN + 4,
        currentY + 18
      );

      // Rodapé
      doc.setFontSize(7);
      doc.setTextColor(150, 160, 175);
      const closerDisplay = selectedCloser.trim() || 'Geral';
      const clientPart = clientName.trim() ? ` | Cliente: ${clientName.trim()}` : '';
      const footerText = `FA Closer Hub | Relatório Semanal: Sem. ${selectedWeekNumber} | Closer: ${closerDisplay}${clientPart} | Emitido em ${format(new Date(), 'dd/MM/yyyy HH:mm')} | Confidencial`;
      doc.text(footerText, MARGIN, 285);

      const cleanCloserName = closerDisplay.toLowerCase().replace(/[^a-z0-9]/gi, '_');
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
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                activeTab === 'semanal' ? 'bg-black text-[#CCFF00]' : 'bg-[#CCFF00]/10 text-[#CCFF00]'
              }`}
            >
              NOVO
            </span>
          </button>
        </div>

        {/* Informação Direita */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-[8px] bg-[#141824] border border-[#212739] text-xs">
            <span className="text-[#64748B] text-[10px] uppercase font-semibold">Closer:</span>
            <span className="text-[#F5F5F7] font-semibold">{selectedCloser || 'Não selecionado'}</span>
          </div>
          <span className="text-[10px] text-[#CCFF00] bg-[#CCFF00]/10 px-2.5 py-1 rounded-[8px] border border-[#CCFF00]/25 font-semibold">
            {activeTab === 'diario' ? 'Visão Diária' : `Semana ${selectedWeekNumber}`}
          </span>
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
                    <span className="px-2.5 py-0.5 rounded-full bg-[#141824] border border-[#212739] text-[#94A0B2] text-[10px] font-medium [font-variant-numeric:lining-nums_tabular-nums]">
                      Semana {selectedWeekNumber}
                    </span>
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
