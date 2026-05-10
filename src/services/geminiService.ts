/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { PersonaType, LearningModule, PERSONA_CONFIG } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    topic: { type: Type.STRING },
    nodes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          content: { type: Type.STRING },
          fact: { type: Type.STRING },
          summary: { type: Type.STRING },
          reinforcement: { type: Type.STRING }
        },
        required: ["id", "title", "content", "summary", "reinforcement"]
      }
    },
    intermittentQuizzes: {
      type: Type.ARRAY,
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            correctAnswer: { type: Type.INTEGER },
            explanation: { type: Type.STRING }
          },
          required: ["question", "options", "correctAnswer", "explanation"]
        }
      }
    },
    finalAssessment: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          correctAnswer: { type: Type.INTEGER },
          explanation: { type: Type.STRING }
        },
        required: ["question", "options", "correctAnswer", "explanation"]
      }
    }
  },
  required: ["topic", "nodes", "intermittentQuizzes", "finalAssessment"]
};

export async function generateLearningContent(
  text: string,
  persona: PersonaType
): Promise<LearningModule> {
  const config = PERSONA_CONFIG[persona];
  
  const systemInstruction = `
    You are an expert Educational Technologist specializing in adaptive learning.
    Your goal is to transform the provided document text into an interactive learning module.

    ### PERSONA TARGET: ${config.name} (${config.ageRange})
    - Tone: ${config.styleMatrix.tone}
    - Analogies: ${config.styleMatrix.analogies}
    - Vocabulary: ${config.styleMatrix.vocabulary}
    - Pacing: ${config.styleMatrix.pacing}

    ### LOGIC FLOW:
    0. IDENTIFY the core topic of the document (e.g., "Photosynthesis", "The Great Depression", "Python Basics").
    1. EXTRACT 3-5 "High-Value Learning Nodes" (major concepts).
    2. REWRITE each node's content specifically for the ${config.name} persona. 
       - Use analogies relevant to them.
       - Keep it grounded in the PDF facts (NO HALLUCINATIONS).
    3. ADD a "Did you know?" fun fact, a 2-sentence "Summary", and a 1-sentence "Reinforcement" reminder for each node.
    4. GENERATE intermittent quizzes: For EVERY individual node (major concept) extracted in step 1, create a corresponding 3-question "Check-in" quiz. The length of the 'intermittentQuizzes' array MUST match exactly the length of the 'nodes' array.
    5. GENERATE a "Final Mastery Check": A 5-10 question comprehensive assessment covering all nodes.
    6. UNIQUENESS GUARANTEE: Every single question in the entire module MUST be unique. Do NOT repeat questions from the intermittent quizzes in the final assessment. Do NOT repeat questions within the same quiz. Every question should test a different facet or use a different phrasing of the core concepts.

    ### FORMATTING:
    - Return JSON matching the provided schema.
    - Title each node clearly.
    - Quizzes must have exactly 4 options.
    - Explanations for quiz answers must be in the target persona's tone.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: "user", parts: [{ text }] }],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA
    }
  });

  return JSON.parse(response.text) as LearningModule;
}
