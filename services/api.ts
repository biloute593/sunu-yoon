import { GoogleGenAI, Type } from "@google/genai";
import { Ride, RideStatus } from '../types';

const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const searchRides = async (origin: string, destination: string, date: string): Promise<Ride[]> => {
  if (!process.env.API_KEY) {
    return [];
  }

  try {
    const ai = getClient();
    const prompt = `Génère 5 offres de covoiturage réalistes pour le trajet de ${origin} à ${destination} au Sénégal pour la date du ${date}.
    Les prix doivent être en XOF (Franc CFA) réalistes pour le marché sénégalais.
    Les noms des chauffeurs doivent être des noms sénégalais courants.
    Inclus des détails comme le modèle de voiture (populaire au Sénégal).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              driver: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  rating: { type: Type.NUMBER },
                  reviewCount: { type: Type.INTEGER },
                  isVerified: { type: Type.BOOLEAN }
                },
                required: ['name', 'rating']
              },
              origin: { type: Type.STRING },
              destination: { type: Type.STRING },
              departureTime: { type: Type.STRING, description: "ISO format date time" },
              price: { type: Type.NUMBER },
              currency: { type: Type.STRING },
              seatsAvailable: { type: Type.INTEGER },
              totalSeats: { type: Type.INTEGER },
              carModel: { type: Type.STRING },
              features: { type: Type.ARRAY, items: { type: Type.STRING } },
              duration: { type: Type.STRING }
            }
          }
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text) as any[];
      return data;
    }
    return [];

  } catch (error) {
    console.error("Gemini Search Error:", error);
    return [];
  }
};
