'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import {
  FileText,
  Calendar,
  User,
  DollarSign,
  Building2,
  Hash,
  Download,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  PieChart,
  Activity
} from 'lucide-react';

export default function FACloserHub() {
  const [reportType, setReportType] = useState<'novas' | 'cadencia'>('novas');
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    operacao: '',
    dataInicial: new Date().toISOString().split('T')[0],
    dataFinal: new Date().toISOString().split('T')[0],
    closer: '',
    // Relatório de Oportunidades Novas
    orcamentosNovos: '',
    valorOrcamentosNovos: '',
    qtdFechadoNovas: '',
    valorContratoNovas: '',
    valorRecebidoNovas: '',
    // Relatório de Cadência
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
    if (!formData.dataInicial || !formData.dataFinal) return 'O período das métricas é obrigatório.';
    if (!formData.closer) return 'Preencha o nome do Closer responsável.';

    if (reportType === 'novas') {
      if (!formData.orcamentosNovos || !formData.valorOrcamentosNovos || !formData.qtdFechadoNovas || !formData.valorContratoNovas || !formData.valorRecebidoNovas) {
        return 'Preencha todos os campos métricos de Oportunidades Novas.';
      }
    } else {
      if (!formData.qtdFollow || !formData.valorFollow || !formData.qtdFechadoCadencia || !formData.valorContratoCadencia || !formData.valorRecebidoCadencia) {
        return 'Preencha todos os campos métricos de Cadência.';
      }
    }

    return null;
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
      // Usar slight delay para mostrar estado de "loading" refinado
      await new Promise((resolve) => setTimeout(resolve, 600));

      const doc = new jsPDF();

      // Cores FA Brand Identity (Preto e Branco Puro)
      const primaryColor = [10, 10, 10]; // #0A0A0A
      const accentColor = [0, 0, 0]; // Black

      // Header Background (Deep Black)
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 40, 'F');

      // Logo FA Simulado 
      doc.setFillColor(255, 255, 255);
      doc.rect(14, 18, 12, 12, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('FA', 16.5, 26);

      // Header Texts
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Closer Hub | Relatório', 32, 26);

      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text('EXPORTAÇÃO AUTOMATIZADA', 145, 24);

      // Metadata section
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMAÇÕES GERAIS', 14, 55);

      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.line(14, 58, 196, 58);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Cliente / Operação:', 14, 68);
      doc.setFont('helvetica', 'normal');
      doc.text(formData.operacao, 55, 68);

      doc.setFont('helvetica', 'bold');
      doc.text('Período:', 14, 76);
      doc.setFont('helvetica', 'normal');
      const dataFormatada = formData.dataInicial === formData.dataFinal
        ? formData.dataInicial.split('-').reverse().join('/')
        : `${formData.dataInicial.split('-').reverse().join('/')} a ${formData.dataFinal.split('-').reverse().join('/')}`;
      doc.text(dataFormatada, 55, 76);

      doc.setFont('helvetica', 'bold');
      doc.text('Closer Responsável:', 14, 84);
      doc.setFont('helvetica', 'normal');
      doc.text(formData.closer, 55, 84);

      // Report Type Title
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      const title = reportType === 'novas' ? 'RELATÓRIO DE OPORTUNIDADES NOVAS' : 'RELATÓRIO DE CADÊNCIA';
      doc.text(title, 14, 105);

      // Data Table Setup
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(14, 115, 182, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('MÉTRICA', 18, 121.5);
      doc.text('VALOR', 120, 121.5);

      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'normal');
      let startY = 132;

      const drawRow = (label: string, value: string, isAlternate: boolean) => {
        if (isAlternate) {
          doc.setFillColor(245, 245, 245);
          doc.rect(14, startY - 6, 182, 10, 'F');
        }
        doc.text(label, 18, startY);
        doc.text(value, 120, startY);
        startY += 10;
      };

      if (reportType === 'novas') {
        drawRow('Orçamentos Novos', formData.orcamentosNovos, false);
        drawRow('Valor dos Orçamentos Novos', formData.valorOrcamentosNovos, true);
        drawRow('Quantidade de Orçamentos Fechados', formData.qtdFechadoNovas, false);
        drawRow('Valor do Contrato', formData.valorContratoNovas, true);
        drawRow('Valor Recebido (Cash Coletado)', formData.valorRecebidoNovas, false);
      } else {
        drawRow('Quantidade de Follows', formData.qtdFollow, false);
        drawRow('Valor Ofertado em Follow', formData.valorFollow, true);
        drawRow('Quantidade de Orçamentos Fechados', formData.qtdFechadoCadencia, false);
        drawRow('Valor do Contrato', formData.valorContratoCadencia, true);
        drawRow('Valor Recebido (Cash Coletado)', formData.valorRecebidoCadencia, false);
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Gerado automaticamente pelo sistema FA Closer Hub | Documento Corporativo Interno', 14, 280);

      const cleanOpName = formData.operacao.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const periodoStr = formData.dataInicial === formData.dataFinal ? formData.dataInicial : `${formData.dataInicial}_a_${formData.dataFinal}`;
      doc.save(`Relatorio-${cleanOpName}-${periodoStr}.pdf`);

      setPdfGenerated(true);
    } catch (err) {
      console.error(err);
      setError('Ocorreu um erro ao gerar o PDF. Verifique os dados ou o console.');
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

      {/* Very faint neutral glow in background core */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/[0.015] blur-[100px] rounded-full pointer-events-none z-0"></div>

      {/* Main Container - FA Corporativo */}
      <div className="w-full max-w-6xl flex flex-col md:flex-row relative z-10 bg-[#080808] border border-white/[0.08] shadow-2xl shadow-black rounded-[24px] overflow-hidden min-h-[750px] h-[88vh]">

        {/* Sidebar */}
        <aside className="w-full md:w-[280px] bg-[#0A0A0A] border-r border-white/[0.05] p-6 lg:p-8 flex flex-col h-full shrink-0">

          {/* Logo Section */}
          <div className="mb-12 flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded flex items-center justify-center text-black font-bold tracking-tighter text-lg shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              FA
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-white/90">
              Closer Hub
            </h1>
          </div>

          {/* Navigation */}
          <div className="space-y-3 flex-1">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-2 mb-4">Relatórios Corporativos</p>

            <button
              onClick={() => setReportType('novas')}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group ${reportType === 'novas'
                  ? 'bg-white/[0.08] border border-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.02)]'
                  : 'bg-transparent border border-transparent text-gray-400 hover:bg-white/[0.03] hover:text-gray-200'
                }`}
            >
              <Activity size={18} className={reportType === 'novas' ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'} />
              <span className="font-medium text-sm tracking-wide">Oportunidades</span>
            </button>

            <button
              onClick={() => setReportType('cadencia')}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group ${reportType === 'cadencia'
                  ? 'bg-white/[0.08] border border-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.02)]'
                  : 'bg-transparent border border-transparent text-gray-400 hover:bg-white/[0.03] hover:text-gray-200'
                }`}
            >
              <BarChart3 size={18} className={reportType === 'cadencia' ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'} />
              <span className="font-medium text-sm tracking-wide">Cadência</span>
            </button>
          </div>

          {/* User Profile */}
          <div className="mt-auto pt-6 flex items-center gap-3 px-2 opacity-80 hover:opacity-100 transition-opacity cursor-default">
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
          <div className="w-full max-w-3xl mx-auto space-y-8 pb-10">

            {/* Card Form 1: Informações Gerais */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} /* Custom spring-like ease */
              className="bg-[#0D0D0D] border border-white/[0.06] rounded-2xl p-6 md:p-8"
            >
              <h2 className="text-[15px] font-semibold mb-6 text-white/90 flex items-center gap-2 tracking-wide">
                <Building2 className="text-white/40" size={18} />
                Informações da Operação
              </h2>

              <div className="flex flex-col gap-6">

                {/* 1st row: Operação e Datas formam um bloco coeso no Desktop */}
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Select Operação */}
                  <div className="w-full md:w-5/12 space-y-2">
                    <label className="text-[13px] font-medium text-white/50 tracking-wide uppercase">Nome da Operação</label>
                    <div className="relative group">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/60 transition-colors" size={16} />
                      <select
                        name="operacao"
                        value={formData.operacao}
                        onChange={handleChange}
                        className="w-full bg-[#030303] border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-white/90 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/30 transition-all appearance-none cursor-pointer"
                      >
                        <option value="" disabled className="text-gray-500">Selecione uma operação</option>
                        <option value="Bodyplastia">Bodyplastia</option>
                        <option value="Dr. Marcelo">Dr. Marcelo</option>
                        <option value="Dra. Marcela">Dra. Marcela</option>
                      </select>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="w-full md:w-7/12 space-y-2">
                    <label className="text-[13px] font-medium text-white/50 tracking-wide uppercase">Data das Métricas</label>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="relative w-full group">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/60 transition-colors pointer-events-none" size={15} />
                        <input
                          type="date"
                          name="dataInicial"
                          value={formData.dataInicial}
                          onChange={handleChange}
                          className="w-full bg-[#030303] border border-white/10 rounded-xl py-3.5 pl-9 pr-2 sm:pr-4 text-white/90 text-[13px] sm:text-sm focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/30 transition-all [color-scheme:dark]"
                        />
                      </div>
                      <span className="text-white/30 text-xs sm:text-sm font-medium px-1">até</span>
                      <div className="relative w-full group">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/60 transition-colors pointer-events-none" size={15} />
                        <input
                          type="date"
                          name="dataFinal"
                          value={formData.dataFinal}
                          onChange={handleChange}
                          className="w-full bg-[#030303] border border-white/10 rounded-xl py-3.5 pl-9 pr-2 sm:pr-4 text-white/90 text-[13px] sm:text-sm focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/30 transition-all [color-scheme:dark]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2nd row: Closer */}
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
                      className="w-full bg-[#030303] border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-white/90 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/30 transition-all placeholder:text-white/20"
                    />
                  </div>
                </div>

              </div>
            </motion.div>

            {/* Card Form 2: Oportunidades / Cadência */}
            <AnimatePresence mode="wait">
              {reportType === 'novas' ? (
                <motion.div
                  key="novas"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
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
                          className="w-full bg-[#030303] border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-white/90 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/30 transition-all placeholder:text-white/20"
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
                          className="w-full bg-[#030303] border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-white/90 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/30 transition-all placeholder:text-white/20 font-mono"
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
                          className="w-full bg-[#030303] border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-white/90 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/30 transition-all placeholder:text-white/20"
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
                          className="w-full bg-[#030303] border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-white/90 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/30 transition-all placeholder:text-white/20 font-mono"
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
                          className="w-full bg-[#030303] border border-white/20 rounded-xl py-3.5 pl-10 pr-4 text-white focus:outline-none focus:ring-1 focus:ring-white/40 focus:border-white/50 transition-all placeholder:text-white/20 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="cadencia"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
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
                          className="w-full bg-[#030303] border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-white/90 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/30 transition-all placeholder:text-white/20"
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
                          className="w-full bg-[#030303] border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-white/90 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/30 transition-all placeholder:text-white/20 font-mono"
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
                          className="w-full bg-[#030303] border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-white/90 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/30 transition-all placeholder:text-white/20"
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
                          className="w-full bg-[#030303] border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-white/90 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/30 transition-all placeholder:text-white/20 font-mono"
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
                          className="w-full bg-[#030303] border border-white/20 rounded-xl py-3.5 pl-10 pr-4 text-white focus:outline-none focus:ring-1 focus:ring-white/40 focus:border-white/50 transition-all placeholder:text-white/20 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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

            {/* Primary Action Button (White / FA Premium) */}
            <motion.div className="pt-2">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={generatePDF}
                disabled={isGenerating}
                className="w-full py-4 bg-white hover:bg-gray-100 text-black rounded-xl font-semibold text-[15px] shadow-[0_4px_15px_rgba(255,255,255,0.08)] transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-wide"
              >
                {isGenerating ? (
                  <div className="w-5 h-5 border-[2px] border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <FileText size={18} className="text-black" />
                    Gerar Relatório Corporativo
                  </>
                )}
              </motion.button>
            </motion.div>

            {/* Success Download CTA */}
            <AnimatePresence>
              {pdfGenerated && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-4 text-center overflow-hidden"
                >
                  <p className="text-white/70 text-sm font-medium flex items-center justify-center gap-2 mb-3">
                    <CheckCircle2 size={16} className="text-white" />
                    Exportação Finalizada
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

      {/* Global & Layout Styles for Background and Scrollbar */}
      <style dangerouslySetInnerHTML={{
        __html: `
        /* Premium Background Animation */
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
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(50px);
          }
        }

        /* Deep Custom Scrollbar */
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

        /* Color Scheme override for datepicker */
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1) brightness(0.6);
          cursor: pointer;
        }
        input[type="date"]::-webkit-calendar-picker-indicator:hover {
          filter: invert(1) brightness(1);
        }
      `}} />
    </div>
  );
}
