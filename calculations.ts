
import { ImpactoProjetado } from './types';

/**
 * Calcula o impacto projetado de custos hospitalares e pressão em UTI.
 * Lógica: Para cada 1 ponto abaixo da meta (7.0 no ISF), há um aumento de 12% nas internações evitáveis.
 * Taxa de conversão UTI: 15% das ICSAP agravadas evoluem para cuidados intensivos.
 */
export function calcularImpactoProjetado(igAps: number, internacoesBase: number): ImpactoProjetado {
  const isfAtual = igAps / 10; 
  const META_ISF = 7.0;
  const CUSTO_MEDIO_INTERNACAO_ICSAP = 4250.00;
  const CUSTO_DIARIA_UTI = 2100.00;
  const MEDIA_PERMANENCIA_UTI = 5.5; // Dias médios em UTI para casos de descompensação APS
  
  // 1. Calcular o desvio da meta
  const desvio = Math.max(0, META_ISF - isfAtual);
  
  // 2. Projeção de aumento de volume (Causalidade)
  const fatorAumento = 1 + (desvio * 0.12);
  const internacoesProjetadas = internacoesBase * fatorAumento;
  const novasInternacoes = Math.max(0, internacoesProjetadas - internacoesBase);
  
  // 3. Projeção de UTI
  // Estimamos que 15% das novas ICSAP descompensadas (falha de APS) evoluem para UTI
  const pacientesUti = novasInternacoes * 0.15;
  const diariasUti = pacientesUti * MEDIA_PERMANENCIA_UTI;
  
  // 4. Cálculo de Impacto Financeiro
  const custoEnfermaria = novasInternacoes * CUSTO_MEDIO_INTERNACAO_ICSAP;
  const custoUtiProjetado = diariasUti * CUSTO_DIARIA_UTI;
  
  const impactoTotal = custoEnfermaria + custoUtiProjetado;
  
  return {
    novas_internacoes_evitaveis: Math.round(novasInternacoes),
    impacto_financeiro_rs: Number(impactoTotal.toFixed(2)),
    pacientes_uti_projetados: parseFloat(pacientesUti.toFixed(1)),
    diarias_uti_estimadas: Math.round(diariasUti),
    risco_saturacao_leitos: desvio > 2.0 ? 'ALTO' : desvio > 1.0 ? 'MODERADO' : 'BAIXO',
    prazo_estimado_dias: 45
  };
}
