import { MunicipioData } from './types';

const generateHistory = (base: number) => {
  // Previne Brasil utiliza quadrimestres (Q1, Q2, Q3).
  // Solicitado: últimos dois de 2024 (Q2, Q3) e dois primeiros de 2025 (Q1, Q2).
  return [
    { periodo: "2024 Q2", valor: parseFloat((base - 3 + Math.random() * 5).toFixed(1)) },
    { periodo: "2024 Q3", valor: parseFloat((base - 2 + Math.random() * 4).toFixed(1)) },
    { periodo: "2025 Q1", valor: parseFloat((base - 1 + Math.random() * 2).toFixed(1)) },
    { periodo: "2025 Q2", valor: base }
  ];
};

export const REGIONS = [
  "Baixada Cuiabana",
  "Sul Mato-grossense",
  "Teles Pires",
  "Médio Norte",
  "Oeste Mato-grossense",
  "Araguaia Xingu",
  "Vale do Peixoto",
  "Garças Araguaia",
  "Vale do Guaporé",
  "Vale do Arinos",
  "Médio Araguaia",
  "Norte Araguaia",
  "Noroeste Mato-grossense",
  "Alto Tapajós",
  "Sudoeste Mato-grossense",
  "Centro Sul"
];

// Mapeamento de populações aproximadas (Censo 2022/Estimativas) para os principais polos e faixas reais
const POP_REAL: Record<string, number> = {
  "Cuiabá": 650912,
  "Várzea Grande": 299472,
  "Rondonópolis": 244897,
  "Sinop": 196067,
  "Sorriso": 110635,
  "Tangará da Serra": 106434,
  "Cáceres": 89478,
  "Primavera do Leste": 85146,
  "Lucas do Rio Verde": 83798,
  "Barra do Garças": 69214,
  "Nova Mutum": 55648,
  "Pontes e Lacerda": 52050,
  "Alta Floresta": 51782,
  "Campo Novo do Parecis": 45893,
  "Campo Verde": 44585,
  "Juína": 41101,
  "Guarantã do Norte": 37532,
  "Confresa": 35075,
  "Juara": 34906,
  "Peixoto de Azevedo": 32714,
  "Poconé": 31234,
  "Colíder": 31370,
  "Sapezal": 28944,
  "Querência": 26769,
  "Vila Rica": 26115,
  "Canarana": 25859,
  "Água Boa": 25548,
  "Diamantino": 21941,
  "Boa Esperança do Norte": 7000, // Estimativa para o novo município
  "Araguainha": 1010, // O menor município
};

const MUNICIPIOS_POR_REGIAO: Record<string, string[]> = {
  "Baixada Cuiabana": ["Acorizal", "Barão de Melgaço", "Chapada dos Guimarães", "Cuiabá", "Jangada", "Nobres", "Nossa Senhora do Livramento", "Poconé", "Rosário Oeste", "Santo Antônio do Leverger", "Várzea Grande"],
  "Sul Mato-grossense": ["Alto Araguaia", "Alto Garças", "Alto Taquari", "Araguainha", "Dom Aquino", "Guiratinga", "Itiquira", "Jaciara", "Juscimeira", "Pedra Preta", "Rondonópolis", "São José do Povo", "São Pedro da Cipa", "Tesouro"],
  "Teles Pires": ["Boa Esperança do Norte", "Cláudia", "Feliz Natal", "Ipiranga do Norte", "Itanhangá", "Lucas do Rio Verde", "Nova Maringá", "Nova Mutum", "Nova Ubiratã", "Santa Carmem", "Santa Rita do Trivelato", "Sinop", "Sorriso", "Tapurah", "União do Sul", "Vera"],
  "Médio Norte": ["Alto Paraguai", "Arenápolis", "Barra do Bugres", "Campo Novo do Parecis", "Campos de Júlio", "Denise", "Diamantino", "Nortelândia", "Nova Marilândia", "Nova Olímpia", "Santo Afonso", "São José do Rio Claro", "Tangará da Serra", "Porto Estrela"],
  "Oeste Mato-grossense": ["Cáceres", "Curvelândia", "Glória D'Oeste", "Lambari D'Oeste", "Mirassol d'Oeste", "Porto Esperidião", "Reserva do Cabaçal", "Rio Branco", "Salto do Céu"],
  "Sudoeste Mato-grossense": ["Araputanga", "Figueirópolis D'Oeste", "Indiavaí", "Jauru", "São José dos Quatro Marcos", "Sapezal", "Vila Bela da Santíssima Trindade"],
  "Araguaia Xingu": ["Bom Jesus do Araguaia", "Canabrava do Norte", "Confresa", "Luciara", "Novo Santo Antônio", "Porto Alegre do Norte", "Santa Cruz do Xingu", "Santa Terezinha", "São Félix do Araguaia", "São José do Xingu", "Vila Rica"],
  "Vale do Peixoto": ["Colíder", "Guarantã do Norte", "Itaúba", "Marcelândia", "Matupá", "Nova Canaã do Norte", "Nova Guarita", "Nova Santa Helena", "Novo Mundo", "Peixoto de Azevedo", "Terra Nova do Norte"],
  "Garças Araguaia": ["Araguaiana", "Barra do Garças", "General Carneiro", "Pontal do Araguaia", "Ponte Branca", "Poxoréu", "Ribeirãozinho", "Torixoréu"],
  "Vale do Guaporé": ["Comodoro", "Conquista D'Oeste", "Nova Lacerda", "Pontes e Lacerda", "Vale de São Domingos"],
  "Vale do Arinos": ["Juara", "Novo Horizonte do Norte", "Porto dos Gaúchos", "Tabaporã"],
  "Médio Araguaia": ["Água Boa", "Campinápolis", "Canarana", "Cocalinho", "Gaúcha do Norte", "Nova Nazaré", "Nova Xavantina", "Novo São Joaquim", "Querência", "Ribeirão Cascalheira"],
  "Norte Araguaia": ["Alto Boa Vista", "Novo Santo Antônio Araguaia", "Serra Nova Dourada"],
  "Noroeste Mato-grossense": ["Aripuanã", "Brasnorte", "Castanheira", "Colniza", "Cotriguaçu", "Juína", "Juruena"],
  "Alto Tapajós": ["Alta Floresta", "Apiacás", "Carlinda", "Nova Bandeirantes", "Nova Monte Verde", "Paranaíta"],
  "Centro Sul": ["Campo Verde", "Nova Brasilândia", "Paranatinga", "Planalto da Serra", "Primavera do Leste", "Santo Antônio do Leste"]
};

export const DB_MUNICIPIOS: MunicipioData[] = Object.entries(MUNICIPIOS_POR_REGIAO).flatMap(([regiao, nomes], regIndex) => {
  return nomes.map((nome, index) => {
    let populacao = POP_REAL[nome];
    if (!populacao) {
      populacao = 4500 + Math.floor(Math.random() * 12000);
    }

    const isPolo = populacao > 50000;
    const isMuitoPequena = populacao < 10000;
    
    const baseAps = isMuitoPequena 
      ? (75 + Math.random() * 15) 
      : isPolo 
        ? (60 + Math.random() * 15) 
        : (50 + Math.random() * 30);
    
    const coberturaAps = isMuitoPequena
      ? 95 + Math.random() * 5
      : isPolo
        ? 65 + Math.random() * 20
        : 80 + Math.random() * 15;

    const taxaBaseInternacao = isPolo ? 0.001 : 0.002; 
    const fatorEficienciaAps = (100 - baseAps) / 50; 
    const internacoes = Math.round(populacao * taxaBaseInternacao * fatorEficienciaAps) + (isPolo ? 50 : 5);

    return {
      id: (regIndex * 100) + index + 1,
      nome: nome,
      regiao: regiao,
      populacao: populacao,
      cobertura_aps_percentual: parseFloat(coberturaAps.toFixed(1)),
      ig_aps: parseFloat(baseAps.toFixed(1)),
      cobertura_hipertensos: parseFloat((baseAps * (0.6 + Math.random() * 0.3)).toFixed(1)),
      internacoes_icsap: internacoes,
      custo_hospitalar_estimado: internacoes * (3500 + Math.random() * 2000),
      historico_ig_aps: generateHistory(baseAps)
    };
  });
}).sort((a, b) => a.nome.localeCompare(b.nome));
