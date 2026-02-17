
import { GoogleGenAI } from "@google/genai";

// Em projetos Vite, usamos import.meta.env. O process.env é fallback para outros ambientes.
// @ts-ignore
const apiKey = import.meta.env.VITE_API_KEY || process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey });

export const generateProductDescription = async (productName: string, category: string): Promise<string> => {
  try {
    if (!apiKey) {
      console.warn("Gemini API Key is missing. Check your .env file.");
      return "Descrição indisponível (Chave de API não configurada).";
    }

    const model = 'gemini-2.5-flash'; // Modelo mais rápido para descrições curtas
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
    return "Descrição automática indisponível.";
  }
};
