
import { GoogleGenAI } from "@google/genai";
import { Bucket, Flavor } from "../types";

export const getInventoryInsights = async (buckets: Bucket[], flavors: Flavor[]): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return "API Key não configurada.";

  // Initialize the GenAI client with the correct parameter structure
  const ai = new GoogleGenAI({ apiKey });
  
  const inventoryData = buckets
    .filter(b => b.status === 'estoque')
    .reduce((acc: any, b) => {
      const flavor = flavors.find(f => f.id === b.flavorId)?.name || 'Desconhecido';
      if (!acc[flavor]) acc[flavor] = { totalKg: 0, locations: {} };
      acc[flavor].totalKg += b.grams / 1000;
      acc[flavor].locations[b.location] = (acc[flavor].locations[b.location] || 0) + (b.grams / 1000);
      return acc;
    }, {});

  const prompt = `
    Como consultor especialista em produção de gelato artesanal para a marca Lorenza, analise os dados de estoque abaixo e forneça 3 insights estratégicos curtos.
    Foque em: saberes críticos (estoque baixo), sugestão imediata de produção e equilíbrio de distribuição entre Campo Duna, Casa Kimo e Rosa.
    Dados em KG: ${JSON.stringify(inventoryData)}
    Responda em português, de forma executiva e direta. Use bullet points.
  `;

  try {
    // Generate content using the correct method signature
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.7,
        topP: 0.95,
      }
    });
    
    // Access response text as a property
    return response.text || "Sem insights disponíveis no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "O analista Gemini está processando outras batidas no momento. Tente novamente em breve.";
  }
};
