import { GoogleGenAI, Type } from "@google/genai";
import { LogEntry, AIInsight } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Analyzes baby logs to provide reasoning-based insights using gemini-3-pro-preview
export const getSmartInsights = async (entries: LogEntry[], babyName: string): Promise<AIInsight> => {
  const recentLogs = entries.slice(-20).map(e => ({
    type: e.type,
    time: new Date(e.timestamp).toLocaleString(),
    amount: e.amount,
    duration: e.duration
  }));

  const prompt = `Analyze these recent logs for a baby named ${babyName} and provide insights. 
  Logs: ${JSON.stringify(recentLogs)}
  
  Focus on:
  1. A one-sentence summary of the current status.
  2. A prediction of when the next feeding or diaper change might be needed.
  3. A helpful, calm parenting tip based on patterns (e.g., if sleep is irregular).`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // Upgraded for complex reasoning tasks
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            prediction: { type: Type.STRING },
            tip: { type: Type.STRING },
          },
          required: ["summary", "prediction", "tip"]
        },
      },
    });

    // fix: Ensure response.text is accessed as a property, not a function
    return JSON.parse(response.text || '{}') as AIInsight;
  } catch (error) {
    console.error("AI Insights Error:", error);
    return {
      summary: "I'm still learning your baby's patterns. Keep logging!",
      prediction: "Check back after a few more entries.",
      tip: "Remember to drink plenty of water while breastfeeding."
    };
  }
};

// Parses natural language input using gemini-3-flash-preview
export const parseNaturalLanguage = async (text: string): Promise<Partial<LogEntry> | null> => {
  const prompt = `Convert this natural language feeding/diaper note into a structured log object: "${text}"
  Types available: breast_left, breast_right, bottle, diaper_wet, diaper_dirty, diaper_both, sleep.
  Return null if it doesn't match any.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            duration: { type: Type.NUMBER },
            note: { type: Type.STRING },
          },
        },
      },
    });

    // fix: Ensure response.text is accessed as a property, not a function
    return JSON.parse(response.text || 'null');
  } catch (error) {
    console.error("Parsing Error:", error);
    return null;
  }
};