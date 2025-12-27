
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Area, 
  AreaChart,
  Line,
  LineChart,
  ReferenceLine,
  Legend
} from 'recharts';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { DB_MUNICIPIOS, REGIONS } from './constants';
import { MunicipioData, PredictionResult } from './types';
import { analyzeMunicipioData, askGemini } from './geminiService';
import { calcularImpactoProjetado } from './calculations';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass p-3 border border-blue-500/30 rounded-lg shadow-xl">
        <p className="text-[10px] text-slate-400 mb-2 uppercase tracking-wider">{String(label)}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-xs font-bold" style={{ color: p.color }}>
            {p.name}: <span className="text-white">{Number(p.value).toFixed(1)}%</span>
            <span className="ml-2 text-[9px] text-slate-500">(ISF: {(p.value/10).toFixed(1)})</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const App: React.FC = () => {
  const [selectedMunicipio, setSelectedMunicipio] = useState<MunicipioData | null>(null);
  const [analysis, setAnalysis] = useState<PredictionResult | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("TODAS");
  const [chatInput, setChatInput] = useState("");
  const [chatResponse, setChatResponse] = useState<string>("");
  const [loadingChat, setLoadingChat] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const analysisCardRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => {
    const avgAps = DB_MUNICIPIOS.reduce((acc, curr) => acc + curr.ig_aps, 0) / DB_MUNICIPIOS.length;
    const critical = DB_MUNICIPIOS.filter(m => m.ig_aps < 60).length;
    const totalCost = DB_MUNICIPIOS.reduce((acc, curr) => acc + curr.custo_hospitalar_estimado, 0);
    return { avgAps, critical, totalCost };
  }, []);

  const comparisonData = useMemo(() => {
    if (!selectedMunicipio) return [];
    
    const regionMunicipios = DB_MUNICIPIOS.filter(m => m.regiao === selectedMunicipio.regiao);
    const avgRegion = regionMunicipios.reduce((acc, curr) => acc + curr.ig_aps, 0) / regionMunicipios.length;
    
    return selectedMunicipio.historico_ig_aps.map((p, i) => {
      const regionOffset = (avgRegion - selectedMunicipio.ig_aps) * 0.8;
      const stateOffset = (stats.avgAps - selectedMunicipio.ig_aps) * 0.9;
      
      return {
        periodo: p.periodo,
        "Município": p.valor,
        "Média Regional": parseFloat((p.valor + regionOffset + (Math.random() * 2 - 1)).toFixed(1)),
        "Média Estadual": parseFloat((p.valor + stateOffset + (Math.random() * 2 - 1)).toFixed(1)),
      };
    });
  }, [selectedMunicipio, stats.avgAps]);

  const filteredMunicipios = useMemo(() => {
    return DB_MUNICIPIOS.filter(m => {
      const matchesSearch = m.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRegion = selectedRegion === "TODAS" || m.regiao === selectedRegion;
      return matchesSearch && matchesRegion;
    }).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [searchTerm, selectedRegion]);

  useEffect(() => {
    if (selectedMunicipio) {
      handleAnalyze(selectedMunicipio);
    }
  }, [selectedMunicipio]);

  const handleAnalyze = async (m: MunicipioData) => {
    setLoadingAnalysis(true);
    setAnalysis(null);
    try {
      const result = await analyzeMunicipioData(m);
      setAnalysis(result);
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleExportImage = async () => {
    if (!analysisCardRef.current) return;
    setIsExporting(true);
    setShowShareMenu(false);
    try {
      const canvas = await html2canvas(analysisCardRef.current, {
        backgroundColor: '#0A0E21',
        scale: 2,
        logging: false,
        useCORS: true
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Análise_Gemini_${selectedMunicipio?.nome}_${new Date().toLocaleDateString()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Export failed", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!analysisCardRef.current) return;
    setIsExporting(true);
    setShowShareMenu(false);
    try {
      const canvas = await html2canvas(analysisCardRef.current, {
        backgroundColor: '#0A0E21',
        scale: 2,
        useCORS: true
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Análise_SES_MT_${selectedMunicipio?.nome}.pdf`);
    } catch (error) {
      console.error("PDF export failed", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyText = () => {
    if (!analysis || !selectedMunicipio) return;
    const text = `
SES-MT 360 - RELATÓRIO DE INTELIGÊNCIA
Município: ${selectedMunicipio.nome} (${selectedMunicipio.regiao})
População: ${selectedMunicipio.populacao.toLocaleString('pt-BR')} Hab.
ISF Previne: ${(selectedMunicipio.ig_aps/10).toFixed(1)}

ANÁLISE GEMINI AI:
Risco: ${analysis.risco}
Impacto Financeiro/UTI: ${analysis.impactoFinanceiro}
Recomendação: ${analysis.recomendacao}

Gerado em: ${new Date().toLocaleString()}
    `.trim();
    
    navigator.clipboard.writeText(text);
    setShowShareMenu(false);
    alert("Dados copiados para a área de transferência!");
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setLoadingChat(true);
    setChatResponse("");
    try {
      const response = await askGemini(chatInput, DB_MUNICIPIOS);
      setChatResponse(response || "Sem resposta da IA.");
    } catch (error) {
      setChatResponse("Erro ao conectar com o serviço de IA.");
    } finally {
      setLoadingChat(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4 text-left">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40">
            <i className="fas fa-shield-virus text-2xl text-white"></i>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">SES-MT 360</h1>
            <p className="text-slate-400 text-sm">Painel de Inteligência e Cockpit de Gestão</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="glass px-4 py-2 rounded-lg text-sm flex items-center gap-2 border border-blue-500/30">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse-soft"></span>
            <span className="text-slate-300 font-medium text-[10px] uppercase tracking-wider">Monitoramento RNDS On-line</span>
          </div>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-left">
        <div className="glass p-6 rounded-2xl flex flex-col gap-2 border-l-4 border-emerald-500 shadow-xl">
          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Média IG-APS Mato Grosso</span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-emerald-400">{stats.avgAps.toFixed(1)}%</span>
            <span className="text-xs text-slate-500 font-bold">(ISF {(stats.avgAps/10).toFixed(1)})</span>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-emerald-400 h-full rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]" style={{ width: `${stats.avgAps}%` }}></div>
          </div>
        </div>

        <div className="glass p-6 rounded-2xl flex flex-col gap-2 border-l-4 border-red-500 shadow-xl">
          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Municípios em Alerta</span>
          <span className="text-4xl font-black text-red-400">{stats.critical}</span>
          <span className="text-[10px] text-red-300 font-medium tracking-wide text-left uppercase">Abaixo do ISF 6.0</span>
        </div>

        <div className="glass p-6 rounded-2xl flex flex-col gap-2 border-l-4 border-blue-500 shadow-xl">
          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Projeção ICSAP Regional</span>
          <span className="text-4xl font-black text-blue-400">R$ {(stats.totalCost / 1000000).toFixed(1)}M</span>
          <span className="text-[10px] text-blue-300 font-medium tracking-wide text-left uppercase">Impacto Financeiro Estimado</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow">
        
        {/* Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-4 max-h-[850px]">
          <div className="glass p-5 rounded-2xl space-y-4 border border-white/10 shadow-lg">
            <div className="relative group">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors"></i>
              <input 
                type="text" 
                placeholder="Localizar município..." 
                className="bg-black/30 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-white w-full text-sm outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="relative">
              <i className="fas fa-map-location-dot absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"></i>
              <select 
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="bg-black/30 border border-white/5 rounded-xl pl-10 pr-10 py-3 text-white w-full text-sm outline-none focus:border-blue-500/50 transition-all cursor-pointer appearance-none"
              >
                <option value="TODAS">Filtro: Todas as Regiões</option>
                {REGIONS.map(reg => (
                  <option key={reg} value={reg} className="bg-[#0A0E21]">{reg}</option>
                ))}
              </select>
              <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 pointer-events-none"></i>
            </div>
          </div>

          <div className="glass rounded-2xl overflow-hidden flex-grow flex flex-col border border-white/10 shadow-lg">
            <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
              <span className="font-black text-[10px] uppercase tracking-[0.15em] text-slate-400">
                Lista de Municípios ({filteredMunicipios.length})
              </span>
            </div>
            <div className="overflow-y-auto flex-grow text-left">
              {filteredMunicipios.length > 0 ? (
                filteredMunicipios.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMunicipio(m)}
                    className={`w-full text-left p-4 border-b border-white/5 transition-all hover:bg-white/5 flex items-center justify-between group ${selectedMunicipio?.id === m.id ? 'bg-blue-600/10 border-l-2 border-l-blue-400' : ''}`}
                  >
                    <div>
                      <div className="font-semibold text-white group-hover:text-blue-300 transition-colors text-sm">{m.nome}</div>
                      <div className="text-[9px] text-slate-500 uppercase font-black tracking-wider flex items-center gap-2">
                        <span>{m.regiao}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                        <span className="text-slate-400">{m.populacao.toLocaleString('pt-BR')} Hab.</span>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-md text-[10px] font-black ${m.ig_aps < 60 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {m.ig_aps.toFixed(1)}%
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-12 text-center text-slate-600">Nenhum município encontrado.</div>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {!selectedMunicipio ? (
            <div className="glass rounded-3xl flex-grow flex flex-col items-center justify-center p-12 text-center shadow-2xl border border-white/5">
              <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/5">
                <i className="fas fa-chart-line text-5xl text-slate-700 animate-pulse-soft"></i>
              </div>
              <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">Cockpit de Gestão</h2>
              <p className="max-w-md text-slate-400 text-sm leading-relaxed font-medium">
                Selecione um município para visualizar o benchmarking regional, 
                análise de custos ICSAP e recomendações estratégicas via IA.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
              
              {/* Profile Card Refined */}
              <div className="glass p-8 rounded-3xl flex flex-col xl:flex-row justify-between gap-6 relative overflow-hidden border border-blue-500/20 shadow-2xl">
                <div className="z-10 text-left flex-grow">
                  <h2 className="text-5xl font-black mb-2 text-white tracking-tighter">{selectedMunicipio.nome}</h2>
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-blue-400 font-black text-[10px] uppercase tracking-[0.2em]">{selectedMunicipio.regiao}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <i className="fas fa-users text-blue-500/50"></i>
                      {selectedMunicipio.populacao.toLocaleString('pt-BR')} Habitantes
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">ID #{selectedMunicipio.id.toString().padStart(4, '0')}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 gap-4 z-10 shrink-0">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-xl">
                    <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1 font-black">Cobertura APS</div>
                    <div className="text-2xl font-black text-white">{selectedMunicipio.cobertura_aps_percentual}%</div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-xl">
                    <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1 font-black">Internações</div>
                    <div className="text-2xl font-black text-white">{selectedMunicipio.internacoes_icsap}</div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-xl">
                    <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1 font-black">ISF Previne</div>
                    <div className={`text-2xl font-black ${(selectedMunicipio.ig_aps/10) < 6 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {(selectedMunicipio.ig_aps / 10).toFixed(1)}
                    </div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-xl">
                    <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1 font-black">Hipertensos</div>
                    <div className="text-2xl font-black text-blue-400">{selectedMunicipio.cobertura_hipertensos}%</div>
                  </div>
                </div>
              </div>

              {/* Benchmarking Chart */}
              <div className="glass p-8 rounded-3xl border border-white/5 shadow-2xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                  <div>
                    <h3 className="text-lg font-black flex items-center gap-3 text-white uppercase tracking-tight">
                      <i className="fas fa-chart-line text-blue-500"></i>
                      Benchmarking Regional e Estadual
                    </h3>
                    <p className="text-[10px] text-slate-500 uppercase font-bold mt-1 tracking-widest">Comparação Multisetorial da Atenção Primária</p>
                  </div>
                </div>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                      <XAxis 
                        dataKey="periodo" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#64748b', fontSize: 11, fontWeight: 700}} 
                        dy={15}
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#64748b', fontSize: 11, fontWeight: 700}} 
                        dx={-10}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        verticalAlign="top" 
                        align="right" 
                        iconType="circle" 
                        wrapperStyle={{paddingBottom: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase'}} 
                      />
                      <ReferenceLine 
                        y={70} 
                        stroke="#ef4444" 
                        strokeDasharray="5 5" 
                        strokeWidth={2}
                        label={{ value: 'Meta Previne (7.0)', position: 'insideBottomRight', fill: '#ef4444', fontSize: 10, fontWeight: 900 }} 
                      />
                      <Line 
                        name="Município"
                        type="monotone" 
                        dataKey="Município" 
                        stroke="#3b82f6" 
                        strokeWidth={4} 
                        dot={{ r: 4, strokeWidth: 2, fill: '#0A0E21' }} 
                        activeDot={{ r: 8 }}
                      />
                      <Line 
                        name="Média Regional"
                        type="monotone" 
                        dataKey="Média Regional" 
                        stroke="#10b981" 
                        strokeWidth={2} 
                        strokeDasharray="3 3"
                        dot={false}
                      />
                      <Line 
                        name="Média Estadual"
                        type="monotone" 
                        dataKey="Média Estadual" 
                        stroke="#f59e0b" 
                        strokeWidth={2} 
                        strokeDasharray="3 3"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Impacto Financeiro e UTI */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="glass p-6 rounded-3xl border border-white/5">
                   <h4 className="text-[10px] font-black text-slate-500 mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
                     <i className="fas fa-calculator text-emerald-500"></i>
                     Projeção de Impacto Causal
                   </h4>
                   {selectedMunicipio && (() => {
                     const impacto = calcularImpactoProjetado(selectedMunicipio.ig_aps, selectedMunicipio.internacoes_icsap);
                     return (
                       <div className="space-y-4">
                          <div className="flex justify-between items-end border-b border-white/5 pb-3">
                            <span className="text-xs text-slate-400 font-medium">Novas Internações Evitáveis</span>
                            <span className="text-2xl font-black text-white">+{impacto.novas_internacoes_evitaveis}</span>
                          </div>
                          
                          {/* UTI Breakdown */}
                          <div className="bg-red-500/5 p-4 rounded-xl border border-red-500/10 space-y-3">
                             <div className="flex justify-between items-center">
                               <span className="text-[10px] text-red-300 font-black uppercase tracking-widest flex items-center gap-2">
                                 <i className="fas fa-bed-pulse"></i> Pressão em UTI
                               </span>
                               <span className="text-xl font-black text-red-400">+{impacto.pacientes_uti_projetados}</span>
                             </div>
                             <div className="flex justify-between items-center text-[10px] text-slate-500 uppercase font-bold">
                               <span>Diárias Adicionais</span>
                               <span className="text-white">{impacto.diarias_uti_estimadas} dias</span>
                             </div>
                             <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${impacto.risco_saturacao_leitos === 'ALTO' ? 'bg-red-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(100, (impacto.pacientes_uti_projetados / 10) * 100)}%` }}></div>
                             </div>
                          </div>

                          <div className="flex justify-between items-end border-b border-white/5 pb-3">
                            <span className="text-xs text-slate-400 font-medium">Impacto Financeiro Adicional</span>
                            <span className="text-2xl font-black text-emerald-400">R$ {impacto.impacto_financeiro_rs.toLocaleString('pt-BR')}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Risco Saturação Leitos</span>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              impacto.risco_saturacao_leitos === 'ALTO' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                              'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}>
                              {impacto.risco_saturacao_leitos}
                            </span>
                          </div>
                       </div>
                     );
                   })()}
                 </div>
                 
                 <div className="glass p-6 rounded-3xl border border-white/5 flex flex-col justify-center">
                    <p className="text-[11px] text-slate-400 leading-relaxed italic">
                      "Para cada 1 ponto abaixo da meta de 7.0 no ISF, o modelo SES-MT projeta um aumento de 12% nas ICSAP. Deste incremento, 15% são classificados como casos de alta complexidade com indicação de UTI, gerando uma carga média de 5.5 diárias intensivas por paciente."
                    </p>
                 </div>
              </div>

              {/* AI Insights Section */}
              <div ref={analysisCardRef} className="glass-card p-10 rounded-3xl relative border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.15)] overflow-hidden">
                <div className="flex justify-between items-start mb-10">
                  <h3 className="text-xl font-black flex items-center gap-4 text-white uppercase tracking-tight">
                    <i className="fas fa-brain text-purple-400"></i>
                    Análise Preditiva Gemini AI
                  </h3>
                  
                  {analysis && !loadingAnalysis && (
                    <div className="relative">
                      <button 
                        onClick={() => setShowShareMenu(!showShareMenu)}
                        className="w-10 h-10 glass rounded-xl flex items-center justify-center text-purple-400 hover:bg-purple-500/20 transition-all border border-purple-500/30"
                        title="Compartilhar Análise"
                      >
                        {isExporting ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-share-nodes"></i>}
                      </button>
                      
                      {showShareMenu && (
                        <div className="absolute right-0 mt-2 w-48 glass rounded-2xl shadow-2xl z-50 border border-white/10 overflow-hidden animate-in fade-in slide-in-from-top-2">
                           <button onClick={handleExportImage} className="w-full text-left px-5 py-3 text-xs font-bold text-slate-300 hover:bg-white/10 flex items-center gap-3 transition-colors">
                             <i className="fas fa-image text-purple-400"></i> Exportar PNG
                           </button>
                           <button onClick={handleExportPDF} className="w-full text-left px-5 py-3 text-xs font-bold text-slate-300 hover:bg-white/10 flex items-center gap-3 transition-colors">
                             <i className="fas fa-file-pdf text-red-400"></i> Exportar PDF
                           </button>
                           <button onClick={handleCopyText} className="w-full text-left px-5 py-3 text-xs font-bold text-slate-300 hover:bg-white/10 flex items-center gap-3 transition-colors border-t border-white/5">
                             <i className="fas fa-copy text-blue-400"></i> Copiar Dados
                           </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {loadingAnalysis ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-14 h-14 border-4 border-purple-500/10 border-t-purple-500 rounded-full animate-spin mb-6"></div>
                    <p className="text-slate-400 animate-pulse text-xs font-black uppercase tracking-[0.2em]">Processando modelos...</p>
                  </div>
                ) : analysis ? (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
                    <div className="md:col-span-4 flex flex-col items-center justify-center p-10 bg-black/40 rounded-3xl border border-white/5 text-center">
                       <span className="text-[10px] text-slate-500 uppercase mb-4 font-black tracking-[0.2em]">Status de Risco</span>
                       <span className={`text-5xl font-black tracking-tighter ${analysis.risco === 'CRÍTICO' || analysis.risco === 'ALTO' ? 'text-red-500' : 'text-emerald-400'}`}>
                        {analysis.risco}
                       </span>
                    </div>
                    <div className="md:col-span-8 flex flex-col gap-8">
                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-[0.2em]">Parecer Financeiro e UTI</h4>
                        <p className="text-slate-200 text-sm leading-relaxed">{analysis.impactoFinanceiro}</p>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-[0.2em]">Recomendação PTA 2026</h4>
                        <div className="p-5 bg-blue-600/10 rounded-2xl border border-blue-500/20 text-blue-100 font-medium italic text-sm">
                          "{analysis.recomendacao}"
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Chat Assistant */}
              <div className="glass p-10 rounded-3xl border border-blue-500/10 shadow-2xl mb-12">
                <h3 className="text-lg font-black mb-8 flex items-center gap-4 text-white uppercase tracking-tight">
                  <i className="fas fa-headset text-blue-500"></i>
                  Assistente de Gestão SES-MT
                </h3>
                <form onSubmit={handleChat} className="flex gap-4">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Solicite uma análise regional ou sugestão de intervenção..." 
                    className="flex-grow bg-black/50 rounded-2xl px-8 py-5 text-sm border border-white/10 outline-none focus:border-blue-500/50 transition-all text-white"
                  />
                  <button 
                    type="submit"
                    disabled={loadingChat || !chatInput.trim()}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-10 py-5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl"
                  >
                    {loadingChat ? <i className="fas fa-circle-notch animate-spin"></i> : "Analisar"}
                  </button>
                </form>
                {chatResponse && (
                  <div className="mt-8 p-8 bg-slate-900/70 rounded-3xl text-sm text-slate-200 border border-white/5 animate-in fade-in zoom-in-95 duration-500 leading-relaxed font-medium">
                    <div className="whitespace-pre-wrap">{chatResponse}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto py-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 text-slate-600 text-[10px] uppercase tracking-[0.25em] font-black">
        <div className="flex items-center gap-6">
          <span>Governo de Mato Grosso</span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span>
          <span>SES-MT &copy; 2024</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
