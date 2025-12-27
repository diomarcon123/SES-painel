
export interface HistoricoPonto {
  periodo: string;
  valor: number;
}

export interface ImpactoProjetado {
  novas_internacoes_evitaveis: number;
  impacto_financeiro_rs: number;
  pacientes_uti_projetados: number;
  diarias_uti_estimadas: number;
  risco_saturacao_leitos: 'BAIXO' | 'MODERADO' | 'ALTO';
  prazo_estimado_dias: number;
}

export interface MunicipioData {
  id: number;
  nome: string;
  regiao: string;
  populacao: number;
  cobertura_aps_percentual: number;
  ig_aps: number; // Indicador Geral de APS (Previne Brasil) 0-100
  cobertura_hipertensos: number;
  internacoes_icsap: number; // Internações evitáveis (Base)
  custo_hospitalar_estimado: number;
  historico_ig_aps: HistoricoPonto[];
}

export interface PredictionResult {
  risco: 'BAIXO' | 'MÉDIO' | 'ALTO' | 'CRÍTICO';
  impactoFinanceiro: string;
  recomendacao: string;
  detalhesCalculo?: ImpactoProjetado;
}
