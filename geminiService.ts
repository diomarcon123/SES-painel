
import { GoogleGenAI, Type } from "@google/genai";
import { MunicipioData, PredictionResult } from "./types";
import { calcularImpactoProjetado } from "./calculations";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function analyzeMunicipioData(data: MunicipioData): Promise<PredictionResult> {
  const trend = data.historico_ig_aps.length >= 2 
    ? (data.historico_ig_aps[data.historico_ig_aps.length - 1].valor - data.historico_ig_aps[0].valor)
    : 0;
  
  const trendDescription = trend > 0 ? "em ascensão" : trend < 0 ? "em declínio" : "estável";
  
  // Cálculo de Impacto usando a nova lógica ministerial/financeira
  const impacto = calcularImpactoProjetado(data.ig_aps, data.internacoes_icsap);

  const prompt = `
    Analise os dados de saúde do município de ${data.nome} (Região: ${data.regiao}):
    - População: ${data.populacao.toLocaleString('pt-BR')} Hab.
    - IG-APS Atual (ISF): ${(data.ig_aps/10).toFixed(1)}
    - Tendência: ${trendDescription}
    
    PROJEÇÃO DE IMPACTO POR FALHA NA APS:
    - Novas Internações ICSAP: +${impacto.novas_internacoes_evitaveis} casos
    - Evolução para UTI: +${impacto.pacientes_uti_projetados} pacientes críticos
    - Carga de UTI: +${impacto.diarias_uti_estimadas} diárias intensivas
    - Impacto Financeiro Total: R$ ${impacto.impacto_financeiro_rs.toLocaleString('pt-BR')}
    - Risco de Saturação da Rede Regional: ${impacto.risco_saturacao_leitos}

    Com base no modelo SES-MT, forneça um parecer sucinto sobre a sustentabilidade do sistema se o indicador de APS não atingir 7.0. 
    Destaque a pressão nos leitos críticos (UTI).
    A resposta deve ser um JSON com: risco (BAIXO, MÉDIO, ALTO, CRÍTICO), impactoFinanceiro (inclua menção ao volume de UTI e custos) e recomendacao (ação estratégica).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            risco: {
              type: Type.STRING,
              description: "Classificação de risco: BAIXO, MÉDIO, ALTO ou CRÍTICO"
            },
            impactoFinanceiro: {
              type: Type.STRING,
              description: "Parecer sobre custos e pressão em UTI"
            },
            recomendacao: {
              type: Type.STRING,
              description: "Recomendação estratégica curta"
            }
          },
          required: ["risco", "impactoFinanceiro", "recomendacao"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}") as PredictionResult;
    return { ...result, detalhesCalculo: impacto };
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      risco: impacto.risco_saturacao_leitos === 'ALTO' ? 'ALTO' : 'MÉDIO',
      impactoFinanceiro: `Projeção de R$ ${impacto.impacto_financeiro_rs.toLocaleString('pt-BR')} e pressão de ${impacto.diarias_uti_estimadas} diárias de UTI.`,
      recomendacao: "Fortalecer APS para reduzir a conversão de casos crônicos em urgências hospitalares.",
      detalhesCalculo: impacto
    };
  }
}

export async function askGemini(question: string, context: MunicipioData[]) {
  const prompt = `
    Você é o consultor de inteligência da SES-MT. 
    Contexto: ${JSON.stringify(context.filter(m => m.ig_aps < 65).map(m => ({nome: m.nome, ig: m.ig_aps, pop: m.populacao})))}
    Sempre relacione queda de APS com pressão em leitos de UTI.
    Pergunta: ${question}
    Responda estrategicamente em português.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });
    return response.text;
  } catch (error) {
    return "Erro ao processar consulta de inteligência.";
  }
}
