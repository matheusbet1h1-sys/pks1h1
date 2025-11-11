

import { GoogleGenAI, Type } from "@google/genai";
import type { Signal, IntegrityAnalysis, EnhancedSignalSuggestion } from '../types';
import { getOrCreateCointelegraphProfile } from './firebase';

if (!process.env.API_KEY) {
  // Although the user provided a key, the instructions mandate using the environment variable.
  // This error ensures the app doesn't run without it being properly configured.
  throw new Error("API_KEY environment variable not set for Gemini API");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = 'gemini-2.5-pro';

type Language = 'pt' | 'en';


export const fetchRealSignals = async (): Promise<Signal[]> => {
    const cointelegraphAuthor = await getOrCreateCointelegraphProfile();
    const rssToJsonApi = 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fcointelegraph.com%2Frss';
    try {
        const response = await fetch(rssToJsonApi);
        if (!response.ok) {
            throw new Error(`Failed to fetch RSS feed: ${response.statusText}`);
        }
        const data = await response.json();

        if (data.status !== 'ok' || !data.items) {
            throw new Error('Invalid RSS feed data');
        }

        const signalsPromises = data.items.map(async (item: any): Promise<Signal | null> => {
            if (!item.pubDate) {
                console.warn('RSS item missing pubDate, skipping:', item.title);
                return null;
            }
            
            const signalId = item.guid ? btoa(item.guid) : `rss_signal_${Date.now()}`;
            const isoDateString = item.pubDate.replace(' ', 'T') + 'Z';
            const timestamp = new Date(isoDateString);
            if (isNaN(timestamp.getTime())) {
                console.warn('Failed to parse date from RSS item, skipping:', item.title, item.pubDate);
                return null;
            }

            let initialContent = item.description.replace(/<[^>]*>/g, '').trim();
            initialContent = initialContent.substring(0, 280) + (initialContent.length > 280 ? '...' : '');

            return {
                id: signalId,
                type: 'NEWS',
                dataType: item.categories[0] || 'News Article',
                author: cointelegraphAuthor,
                timestamp: timestamp,
                content: initialContent,
                title: item.title,
                source: item.link,
                tokenTags: item.categories.slice(0, 3).map((c: string) => c.toUpperCase().replace(/\s/g, '_')),
                signalStrength: Math.floor(Math.random() * 30) + 50,
                stats: {
                    likes: 0,
                    reposts: 0,
                    comments: 0,
                },
                integrityAnalysis: undefined,
                comments: [],
            };
        });
        
        const signals = await Promise.all(signalsPromises);
        return signals.filter((signal): signal is Signal => signal !== null);

    } catch (error) {
        console.error("Error fetching or parsing real signals:", error);
        return [];
    }
}

export const translateSignal = async (signal: Signal, language: Language): Promise<{ title: string; content: string }> => {
    if (language !== 'pt' || !signal.title || !signal.content) {
        return { title: signal.title, content: signal.content };
    }

    const prompt = `
        Translate the following JSON object's "title" and "content" values to Brazilian Portuguese.
        Return ONLY the translated JSON object, with the exact same structure. Do not add any other text or explanations.

        Input JSON:
        {
            "title": "${signal.title.replace(/"/g, '\\"')}",
            "content": "${signal.content.replace(/"/g, '\\"')}"
        }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro', // Using pro for quality as requested
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        content: { type: Type.STRING },
                    },
                    required: ['title', 'content']
                }
            }
        });

        const translatedData = JSON.parse(response.text);
        return translatedData;

    } catch (error) {
        console.error("Gemini API call for translateSignal failed:", error);
        throw error;
    }
};


export const analyzePostSafety = async (title: string, content: string, language: Language): Promise<IntegrityAnalysis> => {
    const langInstruction = language === 'pt'
      ? "Todas as conclusões e resumos devem estar em português do Brasil."
      : "All findings and summaries must be in English.";

    const prompt = `
        Act as the "APOLO Integrity Protocol," a world-class fact-checking AI for a crypto social network. Your primary goal is to determine the factuality and trustworthiness of a user's post.

        **CRITICAL INSTRUCTION:** Your internal knowledge is outdated. You MUST use Google Search to find the most up-to-date, real-time information to verify any real-world claims. This is especially important for volatile topics like cryptocurrency prices, market data, project roadmaps, and recent news events. Do not rely on your internal knowledge for these topics; prioritize live search results.

        **Your Task:**
        1.  **Analyze the Post:** Carefully read the user's post title and content.
        2.  **Perform Multi-Vector Scoring:** Based on your **live search results**, perform a rigorous analysis:
            *   **Factuality:** This is the most important metric.
                *   If claims are confirmed by reliable, current sources from your search, score it **90-100**.
                *   If claims are plausible but not widely confirmed, or presented as rumor, score it **40-60**.
                *   If claims are **refuted by current information from reliable sources**, score it **0-10**.
                *   If the claims are unverifiable or highly speculative, score it low, around **20-30**.
            *   **Manipulation Risk (FUD/FOMO):** Assess the language for emotional manipulation. Score 0 (neutral) to 100 (highly manipulative).
            *   **Scam Potential:** Look for red flags like guaranteed returns or suspicious phrasing. Score 0 (safe) to 100 (high scam potential).
        3.  **Calculate Final Trust Score:** The \`factuality\` score, derived from your search, must be the primary factor in the \`trustScore\`. A post with a \`factuality\` score of 0 should have a \`trustScore\` close to 0.

        **Output Format:**
        You MUST return your analysis as a single JSON object, and nothing else. Your response MUST be valid JSON and contain the 'trustScore', 'summary', and 'breakdown' fields.
        ${langInstruction}
        
        **JSON Schema to follow:**
        {
          "trustScore": number,
          "summary": string,
          "breakdown": {
            "manipulationRisk": { "score": number, "finding": string },
            "scamPotential": { "score": number, "finding": string },
            "factuality": { "score": number, "finding": string }
          }
        }

        **Post to Analyze:**
        Title: "${title}"
        Content: "${content}"
    `;
    
    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}],
            }
        });

        // The API response with tools can sometimes include markdown backticks.
        // We need to robustly find and parse the JSON block.
        let jsonString = response.text.trim();
        const jsonStart = jsonString.indexOf('{');
        const jsonEnd = jsonString.lastIndexOf('}');

        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            jsonString = jsonString.substring(jsonStart, jsonEnd + 1);
        } else {
             throw new Error("Could not find a valid JSON object in the AI's response.");
        }

        let analysisResult: IntegrityAnalysis;
        try {
            analysisResult = JSON.parse(jsonString);
        } catch (parseError) {
             console.error("Failed to parse JSON from AI response:", parseError, "Raw text:", response.text);
             throw new Error("Received malformed JSON from AI analysis.");
        }
        
        // The model may not return sources in the JSON, so get them from grounding metadata.
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (groundingChunks && groundingChunks.length > 0) {
            const sources = groundingChunks
                .map((chunk: any) => chunk.web)
                .filter(Boolean) // Filter out any non-web chunks or empty values
                .slice(0, 3); // Take up to 3 sources

            if (sources.length > 0) {
              analysisResult.sources = sources;
            }
        }
        
        return analysisResult;

    } catch (error) {
        console.error("Gemini API call for analyzePostSafety failed:", error);
        throw error;
    }
};

export const enhanceSignalIdea = async (idea: string, language: Language): Promise<EnhancedSignalSuggestion[]> => {
    const langInstruction = language === 'pt'
      ? "O título e o conteúdo de todas as sugestões devem estar em português do Brasil."
      : "The title and content for all suggestions must be in English.";

    const prompt = `
        Act as a crypto market analyst and expert content creator for a social network called APOLO. A user has provided a rough idea for a 'signal' (a post). Your task is to enhance this idea and generate exactly 3 distinct, improved versions.

        Each version should have:
        1.  A strong, catchy **title**.
        2.  Well-structured and insightful **content**.
        
        Vary the angle for each suggestion: one data-driven, one bullish, one cautious.

        **User's Idea:** "${idea}"

        ${langInstruction}
        
        Provide the output as a single JSON object following this structure: { "suggestions": [{ "title": "string", "content": "string" }] }.
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    content: { type: Type.STRING },
                                },
                                required: ['title', 'content']
                            }
                        }
                    },
                    required: ['suggestions']
                }
            }
        });

        const result = JSON.parse(response.text);
        return result.suggestions as EnhancedSignalSuggestion[];
    } catch (error) {
        console.error("Gemini API call for enhanceSignalIdea failed:", error);
        throw error;
    }
};