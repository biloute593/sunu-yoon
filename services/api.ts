import { GoogleGenAI, Type } from "@google/genai";
import { Ride, RideStatus } from '../types';

const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Fallback data in case of API error or empty key
const MOCK_RIDES: Ride[] = [
  {
    id: 'mock-1',
    driver: {
      id: 'd1',
      name: 'Moussa Diop',
      phone: '+221771234567',
      avatarUrl: 'https://picsum.photos/seed/moussa/100/100',
      rating: 4.8,
      reviewCount: 156,
      isVerified: true
    },
    origin: 'Dakar',
    destination: 'Saint-Louis',
    departureTime: '2023-11-25T08:00:00',
    price: 5000,
    currency: 'XOF',
    seatsAvailable: 2,
    totalSeats: 4,
    carModel: 'Peugeot 308',
    features: ['Climatisation', 'Bagages'],
    duration: '4h 30m',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'mock-2',
    driver: {
      id: 'd2',
      name: 'Fatou Ndiaye',
      phone: '+221779876543',
      avatarUrl: 'https://picsum.photos/seed/fatou/100/100',
      rating: 4.9,
      reviewCount: 42,
      isVerified: true
    },
    origin: 'Dakar',
    destination: 'Touba',
    departureTime: '2023-11-25T14:30:00',
    price: 4500,
    currency: 'XOF',
    seatsAvailable: 1,
    totalSeats: 3,
    carModel: 'Toyota Corolla',
    features: ['Musique', 'Non-fumeur'],
    duration: '2h 15m',
    status: 'active',
    createdAt: new Date().toISOString()
  }
];

export const searchRides = async (origin: string, destination: string, date: string): Promise<Ride[]> => {
  if (!process.env.API_KEY) {
    console.warn("API Key missing, using mock data");
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return MOCK_RIDES;
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
      // Add avatars locally as Gemini can't generate image URLs reliably
      return data.map((ride, index) => ({
        ...ride,
        driver: {
          ...ride.driver,
          avatarUrl: `https://picsum.photos/seed/${ride.driver.name.replace(' ', '')}/100/100`
        }
      }));
    }
    return MOCK_RIDES;

  } catch (error) {
    console.error("Gemini Search Error:", error);
    return MOCK_RIDES;
  }
};
