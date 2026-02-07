import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateProductDescription = async (productName: string, category: string): Promise<string> => {
  if (!apiKey) {
    console.warn("API Key is missing for Gemini Service");
    return "Descrição IA indisponível (Falta API Key)";
  }

  try {
    const model = 'gemini-3-flash-preview';
    const prompt = `Escreva uma descrição curta, apetitosa e focada em vendas (máximo 20 palavras) para um item de menu de restaurante.
    Nome do Produto: ${productName}
    Categoria: ${category}
    Sem aspas. Apenas o texto em Português do Brasil.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text?.trim() || "Comida fresca e deliciosa preparada diariamente.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Erro ao gerar descrição.";
  }
};