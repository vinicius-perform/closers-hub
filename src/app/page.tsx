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
  ArrowUpRight
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

  // Ao trocar de Closer, seleciona automaticamente o primeiro cliente disponível ou limpa
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
    <div className="min-h-screen bg-[#090B10] text-gray-100 font-sans flex flex-col items-center justify-start p-3 sm:p-6 relative overflow-x-hidden">
      {/* Background Decorativo com Grid e Glow */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none fade-in-grid">
        <div className="absolute inset-0 bg-grid-pattern [mask-image:radial-gradient(ellipse_at_center,white,transparent_85%)] animate-grid-scroll"></div>
      </div>

      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#C6F500]/[0.025] blur-[150px] rounded-full pointer-events-none z-0"></div>

      {/* =========================================================================
          1. HEADER GLASS FLUTUANTE (SEPARAÇÃO DIÁRIO & SEMANAL)
          ========================================================================= */}
      <header className="w-full max-w-6xl mb-4 relative z-30 flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 rounded-2xl bg-[#0E1017]/80 backdrop-blur-xl border border-[#222736] shadow-[0_12px_35px_rgba(0,0,0,0.6)]">
        {/* Identificação Esquerda */}
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#C6F500] shadow-[0_0_12px_#C6F500] animate-pulse"></div>
          <div>
            <span className="text-[11px] font-mono font-bold tracking-wider text-[#A0AEC0] uppercase">
              Hub Closers • Painel de Gestão
            </span>
          </div>
        </div>

        {/* Alternador Central (Pill Glass) */}
        <div className="flex items-center p-1 bg-[#121520] border border-[#202535] rounded-xl relative shadow-inner">
          <button
            onClick={() => {
              setActiveTab('diario');
              setError(null);
            }}
            className={`relative px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'diario'
                ? 'bg-[#C6F500] text-black shadow-[0_0_20px_rgba(198,245,0,0.35)] scale-[1.02]'
                : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
            }`}
          >
            <Clock size={14} className={activeTab === 'diario' ? 'text-black' : 'text-[#64748B]'} />
            <span>Diário</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('semanal');
              setError(null);
            }}
            className={`relative px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'semanal'
                ? 'bg-[#C6F500] text-black shadow-[0_0_20px_rgba(198,245,0,0.35)] scale-[1.02]'
                : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
            }`}
          >
            <CalendarRange size={14} className={activeTab === 'semanal' ? 'text-black' : 'text-[#64748B]'} />
            <span>Semanal</span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                activeTab === 'semanal' ? 'bg-black text-[#C6F500]' : 'bg-[#C6F500]/10 text-[#C6F500]'
              }`}
            >
              NOVO
            </span>
          </button>
        </div>

        {/* Informação Direita */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141824] border border-[#222738] text-xs">
            <span className="text-[#64748B] font-mono text-[10px] uppercase">Closer:</span>
            <span className="text-white font-bold">{selectedCloser || 'Não selecionado'}</span>
          </div>
          <span className="text-[10px] text-[#C6F500] font-mono bg-[#C6F500]/10 px-2.5 py-1 rounded-lg border border-[#C6F500]/25 font-bold">
            {activeTab === 'diario' ? 'Visão Diária' : `Semana ${selectedWeekNumber}`}
          </span>
        </div>
      </header>

      {/* =========================================================================
          2. CONTAINER PRINCIPAL (LAYOUT INTEGRADO COM SIDEBAR)
          ========================================================================= */}
      <div className="w-full max-w-6xl flex flex-col md:flex-row relative z-10 bg-[#0E1017] border border-[#222736] shadow-[0_25px_70px_rgba(0,0,0,0.85)] rounded-[24px] overflow-hidden min-h-[750px] max-h-[1250px]">
        {/* Sidebar Institucional com Menus Suspensos para Closer e Clientes */}
        <aside className="w-full md:w-[290px] bg-[#0A0C12] border-r border-[#1B1F2C] p-6 lg:p-7 flex flex-col shrink-0 flex-none justify-between">
          <div className="space-y-6">
            {/* Logo Oficial Fazendo Acontecer */}
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

            {/* SEÇÃO MENU PRINCIPAL: DROPDOWNS SUSPENSOS DE CLOSER E CLIENTE */}
            <div className="space-y-3">
              <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest px-1 flex items-center justify-between">
                <span>Menu Principal</span>
                <span className="text-[9px] font-mono bg-[#161924] text-[#94A3B8] px-1.5 py-0.5 rounded border border-[#232838]">
                  CLOSERS
                </span>
              </p>

              {/* 1. DROPDOWN SUSPENSO: NOME DO CLOSER */}
              <div className="space-y-1.5" ref={closerDropdownRef}>
                <label className="text-[10px] font-semibold text-[#7E8B9F] uppercase tracking-wider block px-0.5">
                  NOME DO CLOSER
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCloserDropdownOpen(!isCloserDropdownOpen);
                      setIsClientDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between bg-[#0B0D13] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white transition-all cursor-pointer shadow-inner ${
                      isCloserDropdownOpen
                        ? 'border-2 border-[#C6F500] shadow-[0_0_15px_rgba(198,245,0,0.25)]'
                        : 'border border-[#232838] hover:border-[#384259]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <User size={15} className="text-[#C6F500] shrink-0" />
                      <span className="truncate">{selectedCloser || 'Selecione o Closer'}</span>
                    </div>
                    <ChevronDown
                      size={14}
                      className={`text-[#C6F500] transition-transform duration-200 shrink-0 ${
                        isCloserDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {isCloserDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 top-full mt-1.5 left-0 w-full bg-[#0E1119] border border-[#232838] rounded-xl shadow-2xl overflow-hidden py-1"
                      >
                        <div className="px-3 py-1.5 text-[11px] text-[#64748B] font-mono font-medium border-b border-[#1A1F2C]">
                          Selecione o Closer
                        </div>
                        <div className="max-h-56 overflow-y-auto custom-scrollbar">
                          {CLOSERS_LIST.map((closer) => {
                            const isSelected = selectedCloser === closer;
                            return (
                              <button
                                key={closer}
                                type="button"
                                onClick={() => handleSelectCloser(closer)}
                                className={`w-full text-left px-3.5 py-2.5 text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#2563EB] text-white font-bold'
                                    : 'text-[#E2E8F0] hover:bg-[#181D2B] hover:text-white'
                                }`}
                              >
                                <span>{closer}</span>
                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* 2. DROPDOWN SUSPENSO: CLIENTE / OPERAÇÃO (LIBERADO APÓS SELECIONAR CLOSER) */}
              <div className="space-y-1.5" ref={clientDropdownRef}>
                <label className="text-[10px] font-semibold text-[#7E8B9F] uppercase tracking-wider block px-0.5">
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
                    className={`w-full flex items-center justify-between bg-[#0B0D13] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white transition-all shadow-inner ${
                      !selectedCloser
                        ? 'opacity-50 cursor-not-allowed border border-[#1A1F2C]'
                        : isClientDropdownOpen
                        ? 'border-2 border-[#C6F500] shadow-[0_0_15px_rgba(198,245,0,0.25)] cursor-pointer'
                        : 'border border-[#232838] hover:border-[#384259] cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Building2 size={15} className="text-[#C6F500] shrink-0" />
                      <span className="truncate">
                        {clientName || (selectedCloser ? 'Selecione o Cliente / Operação' : 'Selecione o Closer primeiro')}
                      </span>
                    </div>
                    <ChevronDown
                      size={14}
                      className={`text-[#C6F500] transition-transform duration-200 shrink-0 ${
                        isClientDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {isClientDropdownOpen && selectedCloser && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 top-full mt-1.5 left-0 w-full bg-[#0E1119] border border-[#232838] rounded-xl shadow-2xl overflow-hidden py-1"
                      >
                        <div className="px-3 py-1.5 text-[11px] text-[#64748B] font-mono font-medium border-b border-[#1A1F2C]">
                          Selecione o Cliente / Operação
                        </div>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
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
                                  className={`w-full text-left px-3.5 py-2.5 text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                                    isSelected
                                      ? 'bg-[#2563EB] text-white font-bold'
                                      : 'text-[#E2E8F0] hover:bg-[#181D2B] hover:text-white'
                                  }`}
                                >
                                  <span className="truncate pr-2">{client}</span>
                                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />}
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
            <div className="space-y-2">
              <div className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-[#C6F500] text-black font-bold text-sm shadow-[0_0_25px_rgba(198,245,0,0.22)]">
                <div className="flex items-center gap-2.5">
                  <LayoutDashboard size={17} className="text-black" />
                  <span>Dashboard {activeTab === 'diario' ? 'Diário' : 'Semanal'}</span>
                </div>
                <ChevronDown size={16} className="text-black" />
              </div>

              <div className="pl-4 pt-1">
                <div className="w-full px-3.5 py-2.5 rounded-lg bg-[#161924] border border-[#232838] text-white text-xs font-semibold flex items-center justify-between">
                  <span className="truncate">Visão • {selectedCloser || 'Closer'}</span>
                  <span className="w-2 h-2 rounded-full bg-[#C6F500] shadow-[0_0_8px_#C6F500] shrink-0"></span>
                </div>
              </div>
            </div>

            {/* Resumo Rápido na Sidebar */}
            <div className="p-4 rounded-xl bg-[#121520] border border-[#202535] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#7E8B9F] uppercase tracking-wider font-semibold truncate pr-2">
                  {activeTab === 'diario' ? `Diário • ${selectedCloser}` : `Semanal • ${selectedCloser}`}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#C6F500] bg-[#C6F500]/10 px-2 py-0.5 rounded-full border border-[#C6F500]/25 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C6F500] animate-pulse"></span>
                  Ativo
                </span>
              </div>

              {activeTab === 'diario' ? (
                <div className="pt-2 border-t border-[#1C2130] space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#8F9CAE]">Total Vendas:</span>
                    <span className="font-bold text-white font-mono">{dailySummary.totalVendas} un</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#8F9CAE]">Valor Contrato:</span>
                    <span className="font-bold text-white font-mono">
                      {formatCurrency(dailySummary.totalContratos)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#8F9CAE]">Cash Coletado:</span>
                    <span className="font-bold text-[#C6F500] font-mono">
                      {formatCurrency(dailySummary.totalCashColetado)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t border-[#1C2130] space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#8F9CAE]">Volume Total:</span>
                    <span className="font-bold text-white font-mono">
                      {formatCurrency(semanalSummary.volumeTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#8F9CAE]">Total Fechado:</span>
                    <span className="font-bold text-[#C6F500] font-mono">
                      {formatCurrency(semanalSummary.valFechado)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#8F9CAE]">Conversão:</span>
                    <span className="font-bold text-white font-mono">
                      {semanalSummary.taxaConversao.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Informações da Sessão */}
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

        {/* =========================================================================
            3. ÁREA DE CONTEÚDO PRINCIPAL (ALTERNÂNCIA DIÁRIO / SEMANAL)
            ========================================================================= */}
        <main className="flex-1 overflow-y-auto px-5 py-7 md:p-10 custom-scrollbar relative bg-[#0B0D13]">
          {/* PAINEL 1: VISÃO DIÁRIA */}
          {activeTab === 'diario' && (
            <motion.div
              key="diario-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-3xl mx-auto space-y-7 pb-8"
            >
              {/* Header & Date Selector Diário */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C2130] pb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#C6F500]/10 border border-[#C6F500]/25 text-[#C6F500] text-[11px] font-mono font-bold tracking-wide">
                      Closer: {selectedCloser || 'Não selecionado'}
                    </span>
                    {clientName.trim() && (
                      <span className="px-2.5 py-0.5 rounded-md bg-[#161924] border border-[#232838] text-white text-[11px] font-mono font-semibold tracking-wide flex items-center gap-1.5">
                        <Building2 size={11} className="text-[#C6F500]" />
                        Cliente: {clientName.trim()}
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-white">
                    Preenchimento de Métricas Diárias
                  </h1>
                  <p className="text-[#7E8B9F] text-xs mt-0.5">
                    Informe os orçamentos novos e o trabalho na base do dia.
                  </p>
                </div>

                {/* DATE PICKER */}
                <div className="relative" ref={calendarRef}>
                  <button
                    onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                    className={`flex items-center gap-2.5 bg-[#121520] border rounded-xl py-2.5 px-4 text-xs font-semibold transition-all focus:outline-none hover:border-[#C6F500]/40 cursor-pointer ${
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
                        <DayPicker
                          mode="range"
                          selected={dateRange}
                          onSelect={setDateRange}
                          locale={ptBR}
                          className="text-white"
                        />
                        <div className="mt-3 pt-3 border-t border-[#1F2536] flex justify-end">
                          <button
                            onClick={() => setIsCalendarOpen(false)}
                            className="px-3.5 py-1.5 rounded-lg bg-[#C6F500] text-black font-bold text-xs hover:bg-[#B5E200] transition-colors cursor-pointer"
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
                <div className="bg-[#11141F] border border-[#202638] rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7E8B9F]">
                    Total Vendas
                  </span>
                  <p className="text-xl font-extrabold text-white font-mono mt-1">
                    {dailySummary.totalVendas}
                  </p>
                  <span className="text-[10px] text-[#64748B] mt-1">
                    {dailySummary.vNovos} novos + {dailySummary.vBase} base
                  </span>
                </div>

                <div className="bg-[#11141F] border border-[#202638] rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7E8B9F]">
                    Valor Contrato
                  </span>
                  <p className="text-xl font-extrabold text-white font-mono mt-1 truncate">
                    {formatCurrency(dailySummary.totalContratos)}
                  </p>
                  <span className="text-[10px] text-[#64748B] mt-1">Contratos fechados</span>
                </div>

                <div className="bg-[#11141F] border border-[#202638] rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7E8B9F]">
                    Cash Coletado
                  </span>
                  <p className="text-xl font-extrabold text-[#C6F500] font-mono mt-1 truncate">
                    {formatCurrency(dailySummary.totalCashColetado)}
                  </p>
                  <span className="text-[10px] text-[#C6F500]/70 mt-1 font-medium">Receita recebida</span>
                </div>

                <div className="bg-[#11141F] border border-[#202638] rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7E8B9F]">
                    Em Negociação
                  </span>
                  <p className="text-xl font-extrabold text-white/80 font-mono mt-1 truncate">
                    {formatCurrency(dailySummary.valNegociacao)}
                  </p>
                  <span className="text-[10px] text-[#64748B] mt-1">Trabalho na base</span>
                </div>
              </div>

              {/* CARD 1: ORÇAMENTOS NOVOS NO DIA */}
              <div className="bg-[#11141F] border border-[#202638] rounded-2xl p-6 sm:p-7 shadow-lg">
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
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#8F9CAE] uppercase tracking-wider">
                      Quantos Orçamentos
                    </label>
                    <div className="relative group">
                      <Hash
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#C6F500] transition-colors"
                      />
                      <input
                        type="number"
                        placeholder="0"
                        value={currentDailyData.orcamentosNovos}
                        onChange={(e) => handleDailyChange('orcamentosNovos', e.target.value)}
                        className="w-full bg-[#090B10] border border-[#1E2436] rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#C6F500]/40 focus:border-[#C6F500]/60 transition-all placeholder:text-[#475569] font-mono hover:border-[#2D364D]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#8F9CAE] uppercase tracking-wider">
                      Quantas Vendas
                    </label>
                    <div className="relative group">
                      <CheckCircle2
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#C6F500] transition-colors"
                      />
                      <input
                        type="number"
                        placeholder="0"
                        value={currentDailyData.vendasNovos}
                        onChange={(e) => handleDailyChange('vendasNovos', e.target.value)}
                        className="w-full bg-[#090B10] border border-[#1E2436] rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#C6F500]/40 focus:border-[#C6F500]/60 transition-all placeholder:text-[#475569] font-mono hover:border-[#2D364D]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#8F9CAE] uppercase tracking-wider">
                      Valor de Contrato
                    </label>
                    <div className="relative group">
                      <DollarSign
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#C6F500] transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="R$ 0,00"
                        value={currentDailyData.valorContratoNovos}
                        onChange={(e) => handleDailyCurrencyInput('valorContratoNovos', e.target.value)}
                        className="w-full bg-[#090B10] border border-[#1E2436] rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#C6F500]/40 focus:border-[#C6F500]/60 transition-all placeholder:text-[#475569] font-mono hover:border-[#2D364D]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#C6F500] uppercase tracking-wider flex items-center gap-1.5">
                      <Wallet size={13} className="text-[#C6F500]" />
                      Cash Coletado
                    </label>
                    <div className="relative group">
                      <DollarSign
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C6F500]/60 group-focus-within:text-[#C6F500] transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="R$ 0,00"
                        value={currentDailyData.cashColetadoNovos}
                        onChange={(e) => handleDailyCurrencyInput('cashColetadoNovos', e.target.value)}
                        className="w-full bg-[#090B10] border border-[#C6F500]/30 rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#C6F500]/50 focus:border-[#C6F500] transition-all placeholder:text-[#475569] font-mono hover:border-[#C6F500]/50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 2: TRABALHO NA BASE */}
              <div className="bg-[#11141F] border border-[#202638] rounded-2xl p-6 sm:p-7 shadow-lg">
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
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#8F9CAE] uppercase tracking-wider">
                      Quantos Follow Realizados
                    </label>
                    <div className="relative group">
                      <Hash
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#C6F500] transition-colors"
                      />
                      <input
                        type="number"
                        placeholder="0"
                        value={currentDailyData.followRealizados}
                        onChange={(e) => handleDailyChange('followRealizados', e.target.value)}
                        className="w-full bg-[#090B10] border border-[#1E2436] rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#C6F500]/40 focus:border-[#C6F500]/60 transition-all placeholder:text-[#475569] font-mono hover:border-[#2D364D]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#8F9CAE] uppercase tracking-wider">
                      Valor em Negociação
                    </label>
                    <div className="relative group">
                      <DollarSign
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#C6F500] transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="R$ 0,00"
                        value={currentDailyData.valorNegociacaoBase}
                        onChange={(e) => handleDailyCurrencyInput('valorNegociacaoBase', e.target.value)}
                        className="w-full bg-[#090B10] border border-[#1E2436] rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#C6F500]/40 focus:border-[#C6F500]/60 transition-all placeholder:text-[#475569] font-mono hover:border-[#2D364D]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#8F9CAE] uppercase tracking-wider">
                      Quantas Vendas
                    </label>
                    <div className="relative group">
                      <CheckCircle2
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#C6F500] transition-colors"
                      />
                      <input
                        type="number"
                        placeholder="0"
                        value={currentDailyData.vendasBase}
                        onChange={(e) => handleDailyChange('vendasBase', e.target.value)}
                        className="w-full bg-[#090B10] border border-[#1E2436] rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#C6F500]/40 focus:border-[#C6F500]/60 transition-all placeholder:text-[#475569] font-mono hover:border-[#2D364D]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#8F9CAE] uppercase tracking-wider">
                      Valor de Contrato
                    </label>
                    <div className="relative group">
                      <DollarSign
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#C6F500] transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="R$ 0,00"
                        value={currentDailyData.valorContratoBase}
                        onChange={(e) => handleDailyCurrencyInput('valorContratoBase', e.target.value)}
                        className="w-full bg-[#090B10] border border-[#1E2436] rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#C6F500]/40 focus:border-[#C6F500]/60 transition-all placeholder:text-[#475569] font-mono hover:border-[#2D364D]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[11px] font-bold text-[#C6F500] uppercase tracking-wider flex items-center gap-1.5">
                      <Wallet size={13} className="text-[#C6F500]" />
                      Cash Coletado
                    </label>
                    <div className="relative group">
                      <DollarSign
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C6F500]/60 group-focus-within:text-[#C6F500] transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="R$ 0,00"
                        value={currentDailyData.cashColetadoBase}
                        onChange={(e) => handleDailyCurrencyInput('cashColetadoBase', e.target.value)}
                        className="w-full bg-[#090B10] border border-[#C6F500]/30 rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#C6F500]/50 focus:border-[#C6F500] transition-all placeholder:text-[#475569] font-mono hover:border-[#C6F500]/50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* MENSAGEM DE ERRO OU SUCESSO */}
              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2.5">
                  <AlertCircle size={16} className="text-red-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {pdfGenerated && (
                <div className="p-4 rounded-xl bg-[#C6F500]/10 border border-[#C6F500]/30 text-[#C6F500] text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    <span>Relatório diário gerado e baixado com sucesso!</span>
                  </div>
                </div>
              )}

              {/* BOTÃO DE GERAÇÃO DE PDF DIÁRIO */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={generateDailyPDF}
                  disabled={isGenerating}
                  className="w-full py-4 bg-[#C6F500] hover:bg-[#B5E200] text-black rounded-xl font-extrabold text-sm shadow-[0_4px_25px_rgba(198,245,0,0.25)] transition-all flex justify-center items-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed uppercase tracking-wider cursor-pointer active:scale-[0.99]"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Gerando Documento Diário...</span>
                    </>
                  ) : (
                    <>
                      <FileText size={17} className="text-black" />
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
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-3xl mx-auto space-y-7 pb-8"
            >
              {/* Header do Painel Semanal */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C2130] pb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#C6F500]/10 border border-[#C6F500]/25 text-[#C6F500] text-[11px] font-mono font-bold tracking-wide">
                      Closer: {selectedCloser || 'Geral'}
                    </span>
                    {clientName.trim() && (
                      <span className="px-2.5 py-0.5 rounded-md bg-[#161924] border border-[#232838] text-white text-[11px] font-mono font-semibold tracking-wide flex items-center gap-1.5">
                        <Building2 size={11} className="text-[#C6F500]" />
                        Cliente: {clientName.trim()}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-md bg-[#161924] border border-[#232838] text-[#94A3B8] text-[10px] font-mono">
                      Semana {selectedWeekNumber}
                    </span>
                  </div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-white">
                    Relatório Comercial — Orçamentos
                  </h1>
                  <p className="text-[#7E8B9F] text-xs mt-0.5">
                    Acompanhamento semanal de volume, em negociação e receita.
                  </p>
                </div>

                {/* Controles de Ação Rápida Semanal */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleLoadSemanalSample}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#141824] border border-[#222738] text-xs font-semibold text-[#94A3B8] hover:text-white hover:border-[#C6F500]/30 transition-all cursor-pointer"
                    title="Preencher com valores de exemplo para testar"
                  >
                    <Sparkles size={13} className="text-[#C6F500]" />
                    <span>Exemplo</span>
                  </button>

                  <button
                    onClick={handleResetSemanal}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#141824] border border-[#222738] text-xs font-semibold text-[#94A3B8] hover:text-white hover:border-red-500/30 transition-all cursor-pointer"
                    title="Limpar campos da semana"
                  >
                    <RotateCcw size={13} />
                    <span>Limpar</span>
                  </button>
                </div>
              </div>

              {/* 4 CARDS BENTO TOP (VOLUME TOTAL, TOTAL ORÇAMENTOS, FECHADOS, CONVERSÃO) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* 1. Volume Total */}
                <div className="bg-[#11141F] border border-[#202638] rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7E8B9F]">
                    VOLUME TOTAL
                  </span>
                  <p className="text-xl font-extrabold text-white font-mono mt-1 truncate">
                    {formatCurrency(semanalSummary.volumeTotal)}
                  </p>
                  <span className="text-[10px] text-[#64748B] mt-1">no funil</span>
                </div>

                {/* 2. Total Orçamentos */}
                <div className="bg-[#11141F] border border-[#202638] rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7E8B9F]">
                    TOTAL ORÇAMENTOS
                  </span>
                  <p className="text-xl font-extrabold text-white font-mono mt-1">
                    {semanalSummary.totalOrcamentos}
                  </p>
                  <span className="text-[10px] text-[#64748B] mt-1">na semana</span>
                </div>

                {/* 3. Fechados */}
                <div className="bg-[#11141F] border border-[#202638] rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7E8B9F]">
                    FECHADOS
                  </span>
                  <p className="text-xl font-extrabold text-[#C6F500] font-mono mt-1 truncate">
                    {formatCurrency(semanalSummary.valFechado)}
                  </p>
                  <span className="text-[10px] text-[#C6F500]/70 mt-1 font-medium">
                    {semanalSummary.qtdFechados} contratos convertidos
                  </span>
                </div>

                {/* 4. Taxa de Conversão */}
                <div className="bg-[#11141F] border border-[#202638] rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7E8B9F]">
                    TAXA DE CONVERSÃO
                  </span>
                  <p className="text-xl font-extrabold text-white font-mono mt-1">
                    {semanalSummary.taxaConversao.toFixed(1)}%
                  </p>
                  <span className="text-[10px] text-[#64748B] mt-1">Eficiência do funil</span>
                </div>
              </div>

              {/* CARD 1: ORÇAMENTOS FECHADOS */}
              <div className="bg-[#11141F] border border-[#202638] rounded-2xl p-6 sm:p-7 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#C6F500]/10 border border-[#C6F500]/20 flex items-center justify-center text-[#C6F500]">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <h2 className="text-[15px] font-bold text-white tracking-wide">
                        ORÇAMENTOS FECHADOS
                      </h2>
                      <p className="text-[11px] text-[#7E8B9F]">
                        Contratos assinados e receita capturada na semana
                      </p>
                    </div>
                  </div>

                  <div className="self-start sm:self-center px-3 py-1 rounded-lg bg-[#161924] border border-[#24293A] text-xs font-mono">
                    <span className="text-[#7E8B9F]">Ticket Médio: </span>
                    <span className="text-[#C6F500] font-bold">
                      {formatCurrency(semanalSummary.ticketFechado)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#8F9CAE] uppercase tracking-wider">
                      Quantidade de Contratos
                    </label>
                    <div className="relative group">
                      <Hash
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#C6F500] transition-colors"
                      />
                      <input
                        type="number"
                        placeholder="0"
                        value={currentSemanalData.qtdContratosFechados}
                        onChange={(e) => handleSemanalChange('qtdContratosFechados', e.target.value)}
                        className="w-full bg-[#090B10] border border-[#1E2436] rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#C6F500]/40 focus:border-[#C6F500]/60 transition-all placeholder:text-[#475569] font-mono hover:border-[#2D364D]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#8F9CAE] uppercase tracking-wider">
                      Valor Total Fechado
                    </label>
                    <div className="relative group">
                      <DollarSign
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#C6F500] transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="R$ 0,00"
                        value={currentSemanalData.valorTotalFechado}
                        onChange={(e) => handleSemanalCurrencyInput('valorTotalFechado', e.target.value)}
                        className="w-full bg-[#090B10] border border-[#1E2436] rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#C6F500]/40 focus:border-[#C6F500]/60 transition-all placeholder:text-[#475569] font-mono hover:border-[#2D364D]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 2: EM NEGOCIAÇÃO / AGUARDANDO */}
              <div className="bg-[#11141F] border border-[#202638] rounded-2xl p-6 sm:p-7 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <Clock size={16} />
                    </div>
                    <div>
                      <h2 className="text-[15px] font-bold text-white tracking-wide">
                        EM NEGOCIAÇÃO / AGUARDANDO
                      </h2>
                      <p className="text-[11px] text-[#7E8B9F]">
                        Propostas ativas com follow-up ativo e decisão pendente
                      </p>
                    </div>
                  </div>

                  <div className="self-start sm:self-center px-3 py-1 rounded-lg bg-[#161924] border border-[#24293A] text-xs font-mono">
                    <span className="text-[#7E8B9F]">Ticket Médio: </span>
                    <span className="text-indigo-400 font-bold">
                      {formatCurrency(semanalSummary.ticketNegociacao)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#8F9CAE] uppercase tracking-wider">
                      Quantidade de Propostas
                    </label>
                    <div className="relative group">
                      <Hash
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-indigo-400 transition-colors"
                      />
                      <input
                        type="number"
                        placeholder="0"
                        value={currentSemanalData.qtdPropostasNegociacao}
                        onChange={(e) => handleSemanalChange('qtdPropostasNegociacao', e.target.value)}
                        className="w-full bg-[#090B10] border border-[#1E2436] rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/40 focus:border-indigo-500/60 transition-all placeholder:text-[#475569] font-mono hover:border-[#2D364D]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#8F9CAE] uppercase tracking-wider">
                      Valor em Negociação
                    </label>
                    <div className="relative group">
                      <DollarSign
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-indigo-400 transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="R$ 0,00"
                        value={currentSemanalData.valorEmNegociacao}
                        onChange={(e) => handleSemanalCurrencyInput('valorEmNegociacao', e.target.value)}
                        className="w-full bg-[#090B10] border border-[#1E2436] rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/40 focus:border-indigo-500/60 transition-all placeholder:text-[#475569] font-mono hover:border-[#2D364D]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 3: SEM CONDIÇÕES FINANCEIRAS (PERDIDOS) */}
              <div className="bg-[#11141F] border border-[#202638] rounded-2xl p-6 sm:p-7 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                      <XCircle size={16} />
                    </div>
                    <div>
                      <h2 className="text-[15px] font-bold text-white tracking-wide">
                        SEM CONDIÇÕES FINANCEIRAS (PERDIDOS)
                      </h2>
                      <p className="text-[11px] text-[#7E8B9F]">
                        Sem condições no momento ou objeção de investimento não superada
                      </p>
                    </div>
                  </div>

                  <div className="self-start sm:self-center px-3 py-1 rounded-lg bg-[#161924] border border-[#24293A] text-xs font-mono">
                    <span className="text-[#7E8B9F]">Ticket Médio: </span>
                    <span className="text-rose-400 font-bold">
                      {formatCurrency(semanalSummary.ticketPerdido)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#8F9CAE] uppercase tracking-wider">
                      Quantidade de Pacientes / Leads
                    </label>
                    <div className="relative group">
                      <Hash
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-rose-400 transition-colors"
                      />
                      <input
                        type="number"
                        placeholder="0"
                        value={currentSemanalData.qtdPacientesPerdidos}
                        onChange={(e) => handleSemanalChange('qtdPacientesPerdidos', e.target.value)}
                        className="w-full bg-[#090B10] border border-[#1E2436] rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-rose-500/40 focus:border-rose-500/60 transition-all placeholder:text-[#475569] font-mono hover:border-[#2D364D]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#8F9CAE] uppercase tracking-wider">
                      Valor Perdido
                    </label>
                    <div className="relative group">
                      <DollarSign
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-rose-400 transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="R$ 0,00"
                        value={currentSemanalData.valorPerdido}
                        onChange={(e) => handleSemanalCurrencyInput('valorPerdido', e.target.value)}
                        className="w-full bg-[#090B10] border border-[#1E2436] rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-rose-500/40 focus:border-rose-500/60 transition-all placeholder:text-[#475569] font-mono hover:border-[#2D364D]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 4: DIAGNÓSTICO COMERCIAL & PIPELINE (DISTRIBUIÇÃO PROPORCIONAL) */}
              <div className="bg-[#11141F] border border-[#202638] rounded-2xl p-6 sm:p-7 shadow-lg space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1C2130] pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#C6F500]/10 border border-[#C6F500]/20 flex items-center justify-center text-[#C6F500]">
                      <TrendingUp size={16} />
                    </div>
                    <div>
                      <h2 className="text-[15px] font-bold text-white tracking-wide">
                        DIAGNÓSTICO COMERCIAL & PIPELINE
                      </h2>
                      <p className="text-[11px] text-[#7E8B9F]">
                        DISTRIBUIÇÃO PROPORCIONAL DO PIPELINE
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-lg bg-[#161924] border border-[#24293A] text-xs font-mono text-white/90 font-bold self-start sm:self-center">
                    {semanalSummary.totalOrcamentos} ORÇAMENTOS REGISTRADOS
                  </span>
                </div>

                {/* Barra de Distribuição Visual */}
                <div className="space-y-2">
                  <div className="h-3 w-full rounded-full bg-[#090B10] border border-[#1E2436] overflow-hidden flex">
                    <div
                      style={{ width: `${semanalSummary.pctQtdFechado}%` }}
                      className="h-full bg-[#C6F500] transition-all duration-500"
                      title={`Fechados: ${semanalSummary.pctQtdFechado.toFixed(1)}%`}
                    />
                    <div
                      style={{ width: `${semanalSummary.pctQtdNegociacao}%` }}
                      className="h-full bg-indigo-500 transition-all duration-500"
                      title={`Em Negociação: ${semanalSummary.pctQtdNegociacao.toFixed(1)}%`}
                    />
                    <div
                      style={{ width: `${semanalSummary.pctQtdPerdido}%` }}
                      className="h-full bg-rose-500 transition-all duration-500"
                      title={`Perdidos: ${semanalSummary.pctQtdPerdido.toFixed(1)}%`}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#C6F500]" />
                      <span className="text-white font-medium">Fechados:</span>
                      <span className="text-[#C6F500] font-mono font-bold">
                        {semanalSummary.pctQtdFechado.toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      <span className="text-white font-medium">Em Negociação:</span>
                      <span className="text-indigo-400 font-mono font-bold">
                        {semanalSummary.pctQtdNegociacao.toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <span className="text-white font-medium">Perdidos:</span>
                      <span className="text-rose-400 font-mono font-bold">
                        {semanalSummary.pctQtdPerdido.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3 Blocos de Diagnóstico Estratégico */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-4 rounded-xl bg-[#0E1119] border border-[#1E2436] space-y-1">
                    <span className="text-[10px] font-bold text-[#C6F500] tracking-wider uppercase font-mono">
                      01 • FECHAMENTO
                    </span>
                    <p className="text-sm font-bold text-white">
                      {formatCurrency(semanalSummary.valFechado)}
                    </p>
                    <p className="text-[11px] text-[#7E8B9F]">
                      {semanalSummary.qtdFechados} contratos convertidos na semana com eficiência máxima.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0E1119] border border-[#1E2436] space-y-1">
                    <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase font-mono">
                      02 • RECUPERAÇÃO
                    </span>
                    <p className="text-sm font-bold text-white">
                      {formatCurrency(semanalSummary.valNegociacao)}
                    </p>
                    <p className="text-[11px] text-[#7E8B9F]">
                      {semanalSummary.qtdNegociacao} propostas ativas aguardando follow-up estratégico.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0E1119] border border-[#1E2436] space-y-1">
                    <span className="text-[10px] font-bold text-rose-400 tracking-wider uppercase font-mono">
                      03 • PERDAS FINANCEIRAS
                    </span>
                    <p className="text-sm font-bold text-white">
                      {formatCurrency(semanalSummary.valPerdido)}
                    </p>
                    <p className="text-[11px] text-[#7E8B9F]">
                      {semanalSummary.qtdPerdidos} pacientes sem condições imediatas; cadastrar em régua fria.
                    </p>
                  </div>
                </div>
              </div>

              {/* MENSAGEM DE ERRO OU SUCESSO SEMANAL */}
              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2.5">
                  <AlertCircle size={16} className="text-red-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {pdfGenerated && (
                <div className="p-4 rounded-xl bg-[#C6F500]/10 border border-[#C6F500]/30 text-[#C6F500] text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    <span>Relatório comercial semanal gerado e baixado com sucesso!</span>
                  </div>
                </div>
              )}

              {/* BOTÃO DE GERAÇÃO DE PDF SEMANAL */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={generateSemanalPDF}
                  disabled={isGenerating}
                  className="w-full py-4 bg-[#C6F500] hover:bg-[#B5E200] text-black rounded-xl font-extrabold text-sm shadow-[0_4px_25px_rgba(198,245,0,0.25)] transition-all flex justify-center items-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed uppercase tracking-wider cursor-pointer active:scale-[0.99]"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Gerando Documento Semanal...</span>
                    </>
                  ) : (
                    <>
                      <FileText size={17} className="text-black" />
                      <span>GERAR RELATÓRIO SEMANAL (PDF)</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </main>
      </div>

      {/* ESTILOS CUSTOMIZADOS DE SCROLLBAR E ANIMAÇÃO */}
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
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(198, 245, 0, 0.35);
        }
      `
        }}
      />
    </div>
  );
}
