import { GoogleGenAI } from "@google/genai";

// Obtém a API Key de forma segura verificando se import.meta.env existe.
// Prioriza VITE_API_KEY (padrão Vite) e faz fallback para API_KEY.
const getApiKey = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_API_KEY || import.meta.env.API_KEY || '';
  }
  return '';
};

// Cria um objeto 'process' local para simular o ambiente Node.js exigido pela SDK ou diretrizes,
// evitando "ReferenceError: process is not defined" no navegador.
const process = {
  env: {
    API_KEY: getApiKey()
  }
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateProductDescription = async (productName: string, category: string): Promise<string> => {
  if (!process.env.API_KEY) {
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
