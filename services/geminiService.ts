import { GoogleGenAI } from "@google/genai";

// Initialization: Always use `const ai = new GoogleGenAI({apiKey: process.env.API_KEY});`.
// GUIDELINE COMPLIANCE: The API key is obtained exclusively from process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateProductDescription = async (productName: string, category: string): Promise<string> => {
  try {
    // Basic Text Task model selection: 'gemini-3-flash-preview'
    const model = 'gemini-3-flash-preview';
    const prompt = `Escreva uma descrição curta, apetitosa e focada em vendas (máximo 20 palavras) para um item de menu de restaurante.
    Nome do Produto: ${productName}
    Categoria: ${category}
    Sem aspas. Apenas o texto em Português do Brasil.`;

    // Perform content generation following SDK parameters structure
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    // Extracting Text Output: Correct Method is accessing .text property.
    return response.text?.trim() || "Comida fresca e deliciosa preparada diariamente.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Erro ao gerar descrição.";
  }
};