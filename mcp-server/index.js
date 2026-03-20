#!/usr/bin/env node

/**
 * Sunu Yoon MCP Server
 * 
 * Serveur MCP (Model Context Protocol) qui expose l'API de Sunu Yoon
 * aux plateformes d'IA (ChatGPT, Claude, Cursor, etc.) pour permettre
 * la recherche et la réservation de covoiturages au Sénégal directement
 * depuis une conversation.
 * 
 * Usage avec ChatGPT Desktop / Claude Desktop:
 * {
 *   "mcpServers": {
 *     "sunu-yoon": {
 *       "command": "node",
 *       "args": ["path/to/mcp-server/index.js"]
 *     }
 *   }
 * }
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_BASE = process.env.SUNU_YOON_API_URL || 'https://sunuyoon.net/api';

// Helper pour appeler l'API
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  try {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, error: { message: `Erreur de connexion: ${error.message}` } };
  }
}

// Formater un trajet pour l'affichage
function formatRide(ride) {
  const date = new Date(ride.departureTime || ride.departureDate);
  const dateStr = date.toLocaleDateString('fr-SN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  const timeStr = date.toLocaleTimeString('fr-SN', { hour: '2-digit', minute: '2-digit' });
  
  const origin = ride.originCity || ride.origin || '?';
  const dest = ride.destinationCity || ride.destination || '?';
  const price = ride.pricePerSeat || ride.price || '?';
  const seats = ride.availableSeats || ride.seatsAvailable || '?';
  const driver = ride.driver?.name || 'Conducteur';
  const car = ride.carModel || '';
  const rating = ride.driver?.rating ? `⭐ ${ride.driver.rating}/5` : '';

  return [
    `🚗 ${origin} → ${dest}`,
    `📅 ${dateStr} à ${timeStr}`,
    `💰 ${price} FCFA / place`,
    `💺 ${seats} place(s) disponible(s)`,
    driver !== 'Conducteur' ? `👤 ${driver} ${rating}` : '',
    car ? `🚙 ${car}` : '',
    ride.description ? `📝 ${ride.description}` : '',
    `🔗 ID: ${ride.id}`
  ].filter(Boolean).join('\n');
}

// Créer le serveur MCP
const server = new McpServer({
  name: 'sunu-yoon',
  version: '1.0.0',
  description: 'Covoiturage au Sénégal - Rechercher et réserver des trajets entre toutes les villes du Sénégal (Dakar, Thiès, Saint-Louis, Mbour, Touba, Kaolack, Ziguinchor, etc.). Prix en FCFA. Paiement Orange Money, Wave ou espèces.',
});

// ============================================================
// TOOL 1: Rechercher des trajets
// ============================================================
server.tool(
  'search_rides',
  `Rechercher des covoiturages disponibles au Sénégal. Cherche des trajets entre deux villes avec date et nombre de places.
Villes populaires: Dakar, Thiès, Saint-Louis, Touba, Kaolack, Ziguinchor, Mbour, Saly, Diourbel, Tambacounda, Kolda, Fatick, Louga, Rufisque, Pikine.
Prix en FCFA (XOF). Retourne les trajets avec conducteur, prix, places et horaires.`,
  {
    origin: z.string().optional().describe('Ville de départ (ex: Dakar, Thiès, Saint-Louis)'),
    destination: z.string().optional().describe('Ville de destination (ex: Saint-Louis, Mbour, Touba)'),
    date: z.string().optional().describe('Date du trajet au format YYYY-MM-DD'),
    seats: z.number().int().min(1).optional().describe('Nombre minimum de places requises'),
  },
  async ({ origin, destination, date, seats }) => {
    const params = new URLSearchParams();
    if (origin) params.append('origin', origin);
    if (destination) params.append('destination', destination);
    if (date) params.append('date', date);
    if (seats) params.append('seats', seats.toString());

    const result = await apiCall(`/rides/search?${params.toString()}`);
    
    if (!result.success) {
      return { content: [{ type: 'text', text: `❌ Erreur: ${result.error?.message || 'Recherche échouée'}` }] };
    }

    const rides = result.data?.rides || [];
    if (rides.length === 0) {
      const tip = origin && destination 
        ? `Aucun trajet ${origin} → ${destination} trouvé${date ? ` pour le ${date}` : ''}. Essayez une autre date ou consultez les trajets récents.`
        : 'Aucun trajet trouvé. Essayez avec des critères différents.';
      return { content: [{ type: 'text', text: `🔍 ${tip}\n\n💡 Astuce: Vous pouvez aussi créer une demande de trajet pour que les conducteurs vous contactent.` }] };
    }

    const header = `🔍 ${rides.length} trajet(s) trouvé(s)${origin ? ` de ${origin}` : ''}${destination ? ` vers ${destination}` : ''}:\n`;
    const list = rides.map((r, i) => `\n--- Trajet ${i + 1} ---\n${formatRide(r)}`).join('\n');
    const footer = '\n\n💡 Pour réserver, utilisez l\'outil book_ride avec l\'ID du trajet.';

    return { content: [{ type: 'text', text: header + list + footer }] };
  }
);

// ============================================================
// TOOL 2: Trajets récents
// ============================================================
server.tool(
  'get_recent_rides',
  `Obtenir les derniers covoiturages publiés au Sénégal. Utile pour voir ce qui est disponible maintenant sans critères spécifiques.`,
  {
    limit: z.number().int().min(1).max(20).optional().describe('Nombre de trajets à afficher (défaut: 5)'),
  },
  async ({ limit = 5 }) => {
    const result = await apiCall(`/rides/recent?limit=${limit}`);
    
    if (!result.success) {
      return { content: [{ type: 'text', text: '❌ Impossible de charger les trajets récents.' }] };
    }

    const rides = result.data?.rides || [];
    if (rides.length === 0) {
      return { content: [{ type: 'text', text: '📭 Aucun trajet récent disponible pour le moment.' }] };
    }

    const header = `📋 ${rides.length} trajet(s) récent(s) disponibles au Sénégal:\n`;
    const list = rides.map((r, i) => `\n--- Trajet ${i + 1} ---\n${formatRide(r)}`).join('\n');

    return { content: [{ type: 'text', text: header + list }] };
  }
);

// ============================================================
// TOOL 3: Détail d'un trajet
// ============================================================
server.tool(
  'get_ride_details',
  `Obtenir tous les détails d'un trajet spécifique par son ID.`,
  {
    ride_id: z.string().describe('Identifiant unique du trajet'),
  },
  async ({ ride_id }) => {
    const result = await apiCall(`/rides/${ride_id}`);
    
    if (!result.success) {
      return { content: [{ type: 'text', text: `❌ Trajet non trouvé (ID: ${ride_id})` }] };
    }

    const ride = result.data?.ride;
    if (!ride) {
      return { content: [{ type: 'text', text: '❌ Trajet introuvable.' }] };
    }

    const details = formatRide(ride);
    const features = ride.features?.length ? `\n✨ Options: ${ride.features.join(', ')}` : '';

    return { content: [{ type: 'text', text: `📍 Détails du trajet:\n\n${details}${features}` }] };
  }
);

// ============================================================
// TOOL 4: Réserver un trajet (guest)
// ============================================================
server.tool(
  'book_ride',
  `Réserver des places sur un covoiturage au Sénégal. Le passager n'a pas besoin de compte. Paiement par Orange Money, Wave ou espèces au conducteur.`,
  {
    ride_id: z.string().describe('ID du trajet à réserver'),
    seats: z.number().int().min(1).max(4).describe('Nombre de places à réserver (1 à 4)'),
    passenger_name: z.string().describe('Nom complet du passager'),
    passenger_phone: z.string().describe('Numéro de téléphone du passager (format +221XXXXXXXXX ou 7XXXXXXXX)'),
    payment_method: z.enum(['WAVE', 'ORANGE_MONEY', 'CASH']).describe('Méthode de paiement: WAVE, ORANGE_MONEY, ou CASH (espèces)'),
    notes: z.string().optional().describe('Message optionnel pour le conducteur (ex: bagages, point de rendez-vous)'),
  },
  async ({ ride_id, seats, passenger_name, passenger_phone, payment_method, notes }) => {
    // Normaliser le numéro
    let phone = passenger_phone.replace(/\s/g, '');
    if (phone.startsWith('7') && phone.length === 9) phone = '+221' + phone;
    if (phone.startsWith('221') && !phone.startsWith('+')) phone = '+' + phone;

    const result = await apiCall('/guest-bookings', {
      method: 'POST',
      body: JSON.stringify({
        rideId: ride_id,
        seats,
        passengerName: passenger_name,
        passengerPhone: phone,
        paymentMethod: payment_method,
        notes: notes || '',
      }),
    });

    if (!result.success) {
      const msg = result.error?.message || result.message || 'Erreur inconnue';
      return { content: [{ type: 'text', text: `❌ Réservation échouée: ${msg}\n\n💡 Vérifiez que le trajet existe et a assez de places disponibles.` }] };
    }

    const payMethodLabel = { WAVE: 'Wave', ORANGE_MONEY: 'Orange Money', CASH: 'Espèces' };
    return {
      content: [{
        type: 'text',
        text: [
          '✅ Réservation confirmée !',
          '',
          `👤 Passager: ${passenger_name}`,
          `📱 Téléphone: ${phone}`,
          `💺 ${seats} place(s) réservée(s)`,
          `💳 Paiement: ${payMethodLabel[payment_method] || payment_method}`,
          '',
          '📞 Le conducteur va vous contacter pour confirmer le point de rendez-vous.',
          '🔔 Gardez votre téléphone accessible !'
        ].join('\n')
      }]
    };
  }
);

// ============================================================
// TOOL 5: Demandes de trajets
// ============================================================
server.tool(
  'get_ride_requests',
  `Voir les demandes de trajets publiées par des passagers qui cherchent un conducteur au Sénégal.`,
  {},
  async () => {
    const result = await apiCall('/ride-requests/active');
    
    if (!result.success) {
      return { content: [{ type: 'text', text: '❌ Impossible de charger les demandes.' }] };
    }

    const requests = result.data?.requests || [];
    if (requests.length === 0) {
      return { content: [{ type: 'text', text: '📭 Aucune demande de trajet active pour le moment.' }] };
    }

    const header = `🙋 ${requests.length} demande(s) de passagers:\n`;
    const list = requests.map((r, i) => {
      const date = new Date(r.departureDate).toLocaleDateString('fr-SN', {
        weekday: 'short', day: 'numeric', month: 'long'
      });
      return [
        `\n--- Demande ${i + 1} ---`,
        `📍 ${r.originCity} → ${r.destinationCity}`,
        `📅 ${date}`,
        `💺 ${r.seats} place(s)`,
        r.maxPricePerSeat ? `💰 Budget max: ${r.maxPricePerSeat} FCFA/place` : '',
        r.description ? `📝 ${r.description}` : '',
      ].filter(Boolean).join('\n');
    }).join('\n');

    return { content: [{ type: 'text', text: header + list }] };
  }
);

// ============================================================
// TOOL 6: Créer une demande de trajet
// ============================================================
server.tool(
  'create_ride_request',
  `Publier une demande de trajet en tant que passager. Les conducteurs verront cette demande et pourront vous proposer un trajet.`,
  {
    origin: z.string().describe('Ville de départ'),
    destination: z.string().describe('Ville de destination'),
    date: z.string().describe('Date souhaitée au format YYYY-MM-DD'),
    seats: z.number().int().min(1).max(4).describe('Nombre de places nécessaires'),
    max_price: z.number().optional().describe('Prix maximum par place en FCFA (optionnel)'),
    description: z.string().optional().describe('Description ou précisions (ex: avec bagages, horaire flexible)'),
    name: z.string().describe('Nom du passager'),
    phone: z.string().describe('Numéro de téléphone'),
  },
  async ({ origin, destination, date, seats, max_price, description, name, phone }) => {
    let phoneNorm = phone.replace(/\s/g, '');
    if (phoneNorm.startsWith('7') && phoneNorm.length === 9) phoneNorm = '+221' + phoneNorm;

    const result = await apiCall('/ride-requests', {
      method: 'POST',
      body: JSON.stringify({
        originCity: origin,
        destinationCity: destination,
        departureDate: `${date}T08:00:00.000Z`,
        seats,
        maxPricePerSeat: max_price || null,
        description: description || `Je cherche un trajet ${origin} → ${destination}`,
        passengerName: name,
        passengerPhone: phoneNorm,
      }),
    });

    if (!result.success) {
      return { content: [{ type: 'text', text: `❌ Erreur: ${result.error?.message || 'Impossible de créer la demande'}` }] };
    }

    return {
      content: [{
        type: 'text',
        text: [
          '✅ Demande de trajet publiée !',
          '',
          `📍 ${origin} → ${destination}`,
          `📅 ${date}`,
          `💺 ${seats} place(s)`,
          max_price ? `💰 Budget max: ${max_price} FCFA/place` : '',
          '',
          '🔔 Les conducteurs verront votre demande et pourront vous contacter.',
        ].filter(Boolean).join('\n')
      }]
    };
  }
);

// ============================================================
// TOOL 7: Info Sunu Yoon
// ============================================================
server.tool(
  'sunu_yoon_info',
  `Informations sur Sunu Yoon, la plateforme de covoiturage au Sénégal. Villes desservies, façon d'utiliser, paiements acceptés.`,
  {},
  async () => {
    return {
      content: [{
        type: 'text',
        text: [
          '🚗 SUNU YOON - Covoiturage au Sénégal',
          '',
          '🌍 Présent dans TOUTES les villes du Sénégal:',
          'Dakar, Thiès, Saint-Louis, Touba, Kaolack, Ziguinchor, Mbour, Saly,',
          'Tambacounda, Kolda, Fatick, Diourbel, Louga, Matam, Kédougou, Sédhiou,',
          'Pikine, Guédiawaye, Rufisque, Cap Skirring, Diamniadio, et plus...',
          '',
          '📍 Trajets populaires:',
          '• Dakar → Saint-Louis (~5h, 3000-5000 FCFA)',
          '• Dakar → Thiès (~1h30, 1500-3000 FCFA)',
          '• Dakar → Mbour/Saly (~2h, 2000-4000 FCFA)',
          '• Dakar → Touba (~4h, 3000-5000 FCFA)',
          '• Dakar → Kaolack (~3h, 2500-4500 FCFA)',
          '• Dakar → Ziguinchor (~6h, 5000-8000 FCFA)',
          '',
          '💳 Moyens de paiement:',
          '• Orange Money',
          '• Wave',
          '• Espèces (au conducteur)',
          '',
          '✨ Fonctionnalités:',
          '• Rechercher un trajet',
          '• Proposer un trajet (conducteur)',
          '• Réserver sans inscription',
          '• Suivi GPS en temps réel',
          '• Notes et avis conducteurs',
          '',
          '🔗 Site: https://sunuyoon.net',
          '📧 Contact: support@sunuyoon.sn',
          '🇸🇳 100% Sénégalais'
        ].join('\n')
      }]
    };
  }
);

// ============================================================
// RESOURCE: llms.txt
// ============================================================
server.resource(
  'about',
  'sunuyoon://about',
  async (uri) => ({
    contents: [{
      uri: uri.href,
      mimeType: 'text/plain',
      text: `Sunu Yoon est la première plateforme de covoiturage au Sénégal (https://sunuyoon.net). 
Elle connecte conducteurs et passagers pour des trajets entre toutes les villes du pays: 
Dakar, Thiès, Saint-Louis, Touba, Kaolack, Ziguinchor, Mbour, Saly, etc.
Prix en FCFA (XOF). Paiement par Orange Money, Wave, ou espèces.
API publique: https://sunuyoon.net/api
Les outils disponibles permettent de chercher des trajets, voir les détails, réserver des places,
et publier des demandes de passagers.`
    }]
  })
);

// Démarrer le serveur
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🚗 Sunu Yoon MCP Server démarré');
}

main().catch((error) => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});
