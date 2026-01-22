
import { GoogleGenAI } from "@google/genai";
import { Bucket, Flavor } from "../types";

export const getInventoryInsights = async (buckets: Bucket[], flavors: Flavor[]): Promise<string> => {
  // Fix: Initializing GoogleGenAI with the API key from process.env.API_KEY directly as per requirements.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const inventoryData = buckets.reduce((acc: any, b) => {
    const flavor = flavors.find(f => f.id === b.flavorId)?.name || 'Desconhecido';
    if (!acc[flavor]) acc[flavor] = { totalGrams: 0, count: 0, locations: {} };
    acc[flavor].totalGrams += b.grams;
    acc[flavor].count += 1;
    acc[flavor].locations[b.location] = (acc[flavor].locations[b.location] || 0) + 1;
    return acc;
  }, {});

  const prompt = `
    Analise o seguinte estoque de gelato e forneça 3 insights curtos e práticos para o gerente de produção em português. 
    Foque em: saberes com pouco estoque, sugestão de próxima produção e distribuição entre as lojas (Campo Duna, Casa Kimo, Rosa).
    Dados: ${JSON.stringify(inventoryData)}
    Responda em um parágrafo conciso com bullet points.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Sem insights disponíveis no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Não foi possível carregar insights inteligentes agora.";
  }
};
