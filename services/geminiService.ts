import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AppLanguage, LearningContent, ChatMessage } from "../types";

// Schema for the structured learning output
const learningSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    topic: { type: Type.STRING, description: "The main title or topic of the content." },
    short_reading: { type: Type.STRING, description: "The exact text extracted from the image. If unclear, say 'Text not visible clearly'." },
    simple_explanation: { type: Type.STRING, description: "A beginner-friendly explanation of the concept in a supportive teacher style." },
    key_points: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "3 distinct key takeaways from the material."
    },
    example: { type: Type.STRING, description: "A real-world simple example illustrating the concept." },
    quiz: { type: Type.STRING, description: "A simple quiz question related to the content to test understanding." }
  },
  required: ["topic", "short_reading", "simple_explanation", "key_points", "example", "quiz"]
};

export const analyzeImageContent = async (
  base64Image: string,
  language: AppLanguage
): Promise<LearningContent> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = "gemini-3-pro-preview";
    
    const prompt = `
      You are a helpful, supportive teacher for visually impaired students. 
      Analyze this image (textbook page, handwriting, or notes).
      
      Tasks:
      1. Extract the text visible (OCR).
      2. Explain the core concept simply.
      3. Provide a real-world example.
      4. Create a quiz question.
      
      Important:
      - The output language MUST be ${language}.
      - If the image contains no text or is blurry, explicitly state that in the 'short_reading' field.
      - Do not hallucinate facts not present in the image context, but use your knowledge to explain the visible topics.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: learningSchema,
        temperature: 0.3, 
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text) as LearningContent;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const askFollowUpQuestion = async (
  historyContext: string,
  chatHistory: ChatMessage[],
  language: AppLanguage
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = "gemini-2.5-flash";
    
    const systemInstruction = `
      You are a learning assistant. The user is asking a question about a topic they just studied.
      The context of the study material is:
      ${historyContext}
      
      Respond in ${language}. Keep the answer brief, encouraging, and simple (under 2-3 sentences).
    `;

    // Convert internal chat history to Gemini format
    const contents = chatHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    const response = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    return response.text || "I couldn't generate an answer at the moment.";

  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Sorry, I am having trouble connecting to the brain right now.";
  }
};