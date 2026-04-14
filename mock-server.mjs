/**
 * SUNU YOON - Serveur Mock Local
 * Remplace le backend Render en mode développement.
 * Données persistées en mémoire (reset à chaque démarrage).
 * Port: 3001
 */

import http from 'http';
import { randomUUID } from 'crypto';

// ─── DONNÉES EN MÉMOIRE ────────────────────────────────────────────────────────
const users = new Map();    // id → user
const usersByPhone = new Map(); // phone → user
const rides = new Map();    // id → ride
const guestRides = new Map(); // id → guestRide
const bookings = new Map(); // id → booking
const tokens = new Map();    // token → userId
const verifCodes = new Map(); // phone → code

// ─── DONNÉES INITIALES (quelques trajets de démo) ─────────────────────────────
function seedData() {
  // Utilisateur demo
  const demoUserId = randomUUID();
  const demoUser = {
    id: demoUserId,
    name: 'Amadou Diallo',
    firstName: 'Amadou',
    lastName: 'Diallo',
    phone: '+221771234567',
    email: 'amadou@demo.sn',
    passwordHash: 'demo123',  // simplifié
    avatarUrl: 'https://ui-avatars.com/api/?name=Amadou+Diallo&background=10b981&color=fff',
    rating: 4.8,
    reviewCount: 23,
    isVerified: true,
    isPhoneVerified: true,
    isDriver: true,
    createdAt: new Date().toISOString()
  };
  users.set(demoUserId, demoUser);
  usersByPhone.set('+221771234567', demoUser);

  const driver2Id = randomUUID();
  const driver2 = {
    id: driver2Id,
    name: 'Fatou Mbaye',
    firstName: 'Fatou',
    lastName: 'Mbaye',
    phone: '+221787654321',
    email: 'fatou@demo.sn',
    passwordHash: 'demo456',
    avatarUrl: 'https://ui-avatars.com/api/?name=Fatou+Mbaye&background=059669&color=fff',
    rating: 4.6,
    reviewCount: 15,
    isVerified: true,
    isPhoneVerified: true,
    isDriver: true,
    createdAt: new Date().toISOString()
  };
  users.set(driver2Id, driver2);
  usersByPhone.set('+221787654321', driver2);

  // Trajets de démo
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(7, 0, 0, 0);

  const ride1Id = randomUUID();
  rides.set(ride1Id, {
    id: ride1Id,
    driverId: demoUserId,
    originCity: 'Dakar',
    originAddress: 'Dakar, Gare Routière',
    destinationCity: 'Thiès',
    destinationAddress: 'Thiès, Centre-ville',
    departureTime: new Date(tomorrow).toISOString(),
    estimatedDuration: 75,
    pricePerSeat: 2500,
    currency: 'XOF',
    totalSeats: 4,
    availableSeats: 3,
    features: ['Climatisation', 'Non-fumeur'],
    description: 'Départ ponctuel depuis la gare routière de Dakar.',
    carModel: 'Toyota Corolla',
    status: 'OPEN',
    createdAt: new Date().toISOString()
  });

  const day2 = new Date();
  day2.setDate(day2.getDate() + 1);
  day2.setHours(9, 30, 0, 0);
  const ride2Id = randomUUID();
  rides.set(ride2Id, {
    id: ride2Id,
    driverId: driver2Id,
    originCity: 'Dakar',
    originAddress: 'Dakar, Liberté 6',
    destinationCity: 'Saint-Louis',
    destinationAddress: 'Saint-Louis, Pont Faidherbe',
    departureTime: new Date(day2).toISOString(),
    estimatedDuration: 240,
    pricePerSeat: 6000,
    currency: 'XOF',
    totalSeats: 3,
    availableSeats: 2,
    features: ['Climatisation', 'Bagages acceptés', 'Musique'],
    description: 'Voyage direct, pas d\'arrêt prolongé.',
    carModel: 'Peugeot 308',
    status: 'OPEN',
    createdAt: new Date().toISOString()
  });

  const day3 = new Date();
  day3.setDate(day3.getDate() + 2);
  day3.setHours(6, 0, 0, 0);
  const ride3Id = randomUUID();
  rides.set(ride3Id, {
    id: ride3Id,
    driverId: demoUserId,
    originCity: 'Thiès',
    originAddress: 'Thiès, Gare',
    destinationCity: 'Touba',
    destinationAddress: 'Touba, Grande Mosquée',
    departureTime: new Date(day3).toISOString(),
    estimatedDuration: 120,
    pricePerSeat: 3500,
    currency: 'XOF',
    totalSeats: 5,
    availableSeats: 4,
    features: ['Non-fumeur', 'Silence préféré'],
    description: 'Trajet calme et rapide.',
    carModel: 'Renault Lodgy',
    status: 'OPEN',
    createdAt: new Date().toISOString()
  });

  // Trajet invité de démo
  const guest1Id = randomUUID();
  guestRides.set(guest1Id, {
    id: guest1Id,
    driverName: 'Ousmane Sall',
    driverPhone: '+221776543210',
    originCity: 'Dakar',
    originAddress: 'Dakar, Plateau',
    destinationCity: 'Kaolack',
    destinationAddress: 'Kaolack, Centre commercial',
    departureTime: (() => { const d = new Date(); d.setDate(d.getDate()+1); d.setHours(8,0,0,0); return d.toISOString(); })(),
    estimatedDuration: 180,
    pricePerSeat: 4000,
    currency: 'XOF',
    totalSeats: 3,
    availableSeats: 3,
    features: ['Climatisation'],
    description: 'Contact par WhatsApp uniquement.',
    carModel: 'Mercedes Classe C',
    status: 'PUBLISHED',
    createdAt: new Date().toISOString()
  });

  console.log('✅ Données de démo initialisées');
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

function sendJSON(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  });
  res.end(JSON.stringify(data));
}

function getTokenFromReq(req) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

function getUserFromReq(req) {
  const token = getTokenFromReq(req);
  if (!token) return null;
  const userId = tokens.get(token);
  if (!userId) return null;
  return users.get(userId) || null;
}

function mapRegisteredRide(ride) {
  const driver = users.get(ride.driverId) || {};
  const mins = ride.estimatedDuration || 180;
  const h = Math.floor(mins/60);
  const m = mins % 60;
  const duration = m === 0 ? `${h}h` : `${h}h ${m}m`;
  return {
    id: ride.id,
    type: 'registered',
    isGuest: false,
    driver: {
      id: driver.id || ride.driverId,
      name: driver.name || 'Conducteur',
      firstName: driver.firstName || '',
      lastName: driver.lastName || '',
      avatarUrl: driver.avatarUrl || `https://ui-avatars.com/api/?name=Driver&background=10b981&color=fff`,
      rating: driver.rating || 4.5,
      reviewCount: driver.reviewCount || 0,
      isVerified: driver.isVerified || false,
      isGuest: false,
    },
    driverContact: null,
    origin: ride.originCity,
    originAddress: ride.originAddress,
    destination: ride.destinationCity,
    destinationAddress: ride.destinationAddress,
    departureTime: ride.departureTime,
    duration,
    estimatedDuration: ride.estimatedDuration,
    price: ride.pricePerSeat,
    currency: ride.currency || 'XOF',
    seatsAvailable: ride.availableSeats,
    totalSeats: ride.totalSeats,
    carModel: driver.carModel || ride.carModel || 'Véhicule',
    features: ride.features || [],
    description: ride.description,
    status: ride.status,
    createdAt: ride.createdAt,
  };
}

function mapGuestRide(ride) {
  const phone = ride.driverPhone || '';
  const numeric = phone.replace(/[^0-9]/g, '').replace(/^221/, '');
  const fullNumeric = numeric.startsWith('0') ? `221${numeric.slice(1)}` : `221${numeric}`;
  const mins = ride.estimatedDuration || 180;
  const h = Math.floor(mins/60);
  const m = mins % 60;
  const duration = m === 0 ? `${h}h` : `${h}h ${m}m`;
  return {
    id: `guest_${ride.id}`,
    type: 'guest',
    isGuest: true,
    driver: {
      id: `guest_${ride.id}`,
      name: ride.driverName,
      firstName: ride.driverName.split(' ')[0],
      lastName: ride.driverName.split(' ').slice(1).join(' '),
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(ride.driverName)}&background=0f766e&color=fff`,
      rating: null,
      reviewCount: 0,
      isVerified: false,
      phone: ride.driverPhone,
      isGuest: true,
    },
    driverContact: {
      phone: ride.driverPhone,
      whatsappUrl: `https://wa.me/${fullNumeric}`,
      callUrl: `tel:+${fullNumeric}`,
    },
    origin: ride.originCity,
    originAddress: ride.originAddress,
    destination: ride.destinationCity,
    destinationAddress: ride.destinationAddress,
    departureTime: ride.departureTime,
    duration,
    estimatedDuration: ride.estimatedDuration,
    price: ride.pricePerSeat,
    currency: ride.currency || 'XOF',
    seatsAvailable: ride.availableSeats,
    totalSeats: ride.totalSeats,
    carModel: ride.carModel || 'Véhicule',
    features: ride.features || [],
    description: ride.description,
    status: ride.status,
    createdAt: ride.createdAt,
  };
}

function makeToken(userId) {
  const token = `mock_token_${userId}_${Date.now()}`;
  tokens.set(token, userId);
  return token;
}

function mapUserToAuthUser(user) {
  return {
    id: user.id,
    firstName: user.firstName || user.name?.split(' ')[0] || '',
    lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
    name: user.name,
    phone: user.phone,
    email: user.email,
    avatarUrl: user.avatarUrl,
    rating: user.rating,
    reviewCount: user.reviewCount,
    isVerified: user.isVerified,
    isPhoneVerified: user.isPhoneVerified,
    createdAt: user.createdAt,
  };
}

// ─── ROUTER PRINCIPAL ─────────────────────────────────────────────────────────
async function handleRequest(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:3001`);
  const path = url.pathname;
  const method = req.method;

  console.log(`[${method}] ${path}`);

  // ─── HEALTH ──────────────────────────────────────────────────────────────
  if (path === '/health' && method === 'GET') {
    return sendJSON(res, 200, { status: 'ok', mock: true, timestamp: new Date().toISOString() });
  }

  // ─── AUTH: REGISTER ───────────────────────────────────────────────────────
  if (path === '/api/auth/register' && method === 'POST') {
    const body = await parseBody(req);
    let { name, firstName, lastName, phone, email, password } = body;
    
    if (!phone || !password) {
      return sendJSON(res, 400, { success: false, message: 'Téléphone et mot de passe requis' });
    }
    
    // Normaliser le téléphone
    let cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('221')) cleanPhone = `221${cleanPhone}`;
    const normalizedPhone = `+${cleanPhone}`;
    
    if (usersByPhone.has(normalizedPhone)) {
      return sendJSON(res, 409, { success: false, message: 'Ce numéro est déjà utilisé' });
    }
    
    const fullName = name || `${firstName || ''} ${lastName || ''}`.trim() || 'Utilisateur';
    const [fn, ...rest] = fullName.split(' ');
    const userId = randomUUID();
    const user = {
      id: userId,
      name: fullName,
      firstName: fn,
      lastName: rest.join(' '),
      phone: normalizedPhone,
      email: email || null,
      passwordHash: password, // simplifié - pas de bcrypt en mock
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=10b981&color=fff`,
      rating: 0,
      reviewCount: 0,
      isVerified: false,
      isPhoneVerified: false,
      isDriver: false,
      createdAt: new Date().toISOString()
    };
    
    users.set(userId, user);
    usersByPhone.set(normalizedPhone, user);
    
    // Simuler un code de vérification
    const code = '123456';
    verifCodes.set(normalizedPhone, code);
    console.log(`[DEV] Code de vérification pour ${normalizedPhone}: ${code}`);
    
    const accessToken = makeToken(userId);
    const refreshToken = makeToken(userId);
    
    return sendJSON(res, 201, {
      success: true,
      message: 'Inscription réussie (CODE: 123456)',
      data: {
        user: mapUserToAuthUser(user),
        tokens: { accessToken, refreshToken },
        verificationRequired: true,
        devNote: 'En mode dev, utilisez le code 123456'
      }
    });
  }

  // ─── AUTH: LOGIN ─────────────────────────────────────────────────────────
  if (path === '/api/auth/login' && method === 'POST') {
    const body = await parseBody(req);
    let { phone, password } = body;
    
    if (!phone || !password) {
      return sendJSON(res, 400, { success: false, message: 'Téléphone et mot de passe requis' });
    }
    
    let cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('221')) cleanPhone = `221${cleanPhone}`;
    const normalizedPhone = `+${cleanPhone}`;
    
    const user = usersByPhone.get(normalizedPhone);
    if (!user) {
      return sendJSON(res, 401, { success: false, message: 'Identifiants incorrects' });
    }
    
    // Vérification simplifiée du mot de passe
    if (user.passwordHash !== password) {
      return sendJSON(res, 401, { success: false, message: 'Identifiants incorrects' });
    }
    
    const accessToken = makeToken(user.id);
    const refreshToken = makeToken(user.id);
    
    // Si pas vérifié, renvoyer code
    if (!user.isPhoneVerified) {
      verifCodes.set(normalizedPhone, '123456');
      console.log(`[DEV] Code connexion pour ${normalizedPhone}: 123456`);
    }
    
    return sendJSON(res, 200, {
      success: true,
      data: {
        user: mapUserToAuthUser(user),
        tokens: { accessToken, refreshToken },
        token: accessToken,
        requiresVerification: !user.isPhoneVerified
      }
    });
  }

  // ─── AUTH: VERIFY ─────────────────────────────────────────────────────────
  if (path === '/api/auth/verify' && method === 'POST') {
    const body = await parseBody(req);
    const { code, phone } = body;
    
    // En mode dev, on accepte toujours le code 123456
    if (code !== '123456') {
      return sendJSON(res, 400, { success: false, message: 'Code invalide. En mode dev, utilisez 123456' });
    }
    
    // Trouver l'utilisateur via le token
    const reqUser = getUserFromReq(req);
    if (reqUser) {
      reqUser.isPhoneVerified = true;
      reqUser.isVerified = true;
      users.set(reqUser.id, reqUser);
      usersByPhone.set(reqUser.phone, reqUser);
    }
    
    return sendJSON(res, 200, {
      success: true,
      message: 'Vérification réussie',
      data: { isPhoneVerified: true, isVerified: true }
    });
  }

  // ─── AUTH: RESEND CODE ────────────────────────────────────────────────────
  if (path === '/api/auth/resend-code' && method === 'POST') {
    console.log('[DEV] Code renvoyé: 123456');
    return sendJSON(res, 200, {
      success: true,
      message: 'Code renvoyé. En mode dev, le code est toujours 123456'
    });
  }

  // ─── AUTH: REFRESH TOKEN ──────────────────────────────────────────────────
  if ((path === '/api/auth/refresh' || path === '/api/auth/refresh-token') && method === 'POST') {
    const body = await parseBody(req);
    const { refreshToken } = body;
    if (refreshToken) {
      const userId = tokens.get(refreshToken);
      if (userId) {
        const newToken = makeToken(userId);
        return sendJSON(res, 200, { success: true, data: { token: newToken, accessToken: newToken } });
      }
    }
    return sendJSON(res, 401, { success: false, message: 'Token invalide' });
  }

  // ─── AUTH: ME (PROFIL) ────────────────────────────────────────────────────
  if (path === '/api/auth/me' && method === 'GET') {
    const user = getUserFromReq(req);
    if (!user) return sendJSON(res, 401, { success: false, message: 'Non authentifié' });
    return sendJSON(res, 200, mapUserToAuthUser(user));
  }

  // ─── AUTH: LOGOUT ─────────────────────────────────────────────────────────
  if (path === '/api/auth/logout' && method === 'POST') {
    const token = getTokenFromReq(req);
    if (token) tokens.delete(token);
    return sendJSON(res, 200, { success: true, message: 'Déconnexion réussie' });
  }

  // ─── RIDES: SEARCH (GET /api/rides) ──────────────────────────────────────
  if (path === '/api/rides' && method === 'GET') {
    const origin = url.searchParams.get('origin') || '';
    const destination = url.searchParams.get('destination') || '';
    const date = url.searchParams.get('date');
    const seats = parseInt(url.searchParams.get('seats') || '1', 10);

    const allRides = [...rides.values()].filter(r => {
      if (r.status !== 'OPEN') return false;
      if (r.availableSeats < seats) return false;
      if (origin && !r.originCity.toLowerCase().includes(origin.toLowerCase())) return false;
      if (destination && !r.destinationCity.toLowerCase().includes(destination.toLowerCase())) return false;
      if (date) {
        const rDate = new Date(r.departureTime).toDateString();
        const sDate = new Date(date).toDateString();
        if (rDate !== sDate) return false;
      } else {
        if (new Date(r.departureTime) < new Date()) return false;
      }
      return true;
    }).map(mapRegisteredRide);

    const allGuestRides = [...guestRides.values()].filter(r => {
      if (r.status !== 'PUBLISHED') return false;
      if (r.availableSeats < seats) return false;
      if (origin && !r.originCity.toLowerCase().includes(origin.toLowerCase())) return false;
      if (destination && !r.destinationCity.toLowerCase().includes(destination.toLowerCase())) return false;
      if (date) {
        const rDate = new Date(r.departureTime).toDateString();
        const sDate = new Date(date).toDateString();
        if (rDate !== sDate) return false;
      } else {
        if (new Date(r.departureTime) < new Date()) return false;
      }
      return true;
    }).map(mapGuestRide);

    const combined = [...allRides, ...allGuestRides]
      .sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());

    return sendJSON(res, 200, {
      success: true,
      data: { rides: combined, total: combined.length }
    });
  }

  // ─── RIDES: MY RIDES ──────────────────────────────────────────────────────
  if (path === '/api/rides/my-rides' && method === 'GET') {
    const user = getUserFromReq(req);
    if (!user) return sendJSON(res, 401, { success: false, message: 'Non authentifié' });

    const myRides = [...rides.values()]
      .filter(r => r.driverId === user.id)
      .map(mapRegisteredRide);

    return sendJSON(res, 200, {
      success: true,
      data: { rides: myRides }
    });
  }

  // ─── RIDES: CREATE GUEST RIDE ──────────────────────────────────────────────
  if (path === '/api/rides/guest' && method === 'POST') {
    const body = await parseBody(req);
    const { driverName, driverPhone, originCity, originAddress, destinationCity, destinationAddress,
            departureTime, estimatedDuration, pricePerSeat, availableSeats, totalSeats,
            carModel, description, features, currency } = body;

    if (!driverName || !driverPhone || !originCity || !destinationCity || !departureTime || !pricePerSeat) {
      return sendJSON(res, 400, { success: false, message: 'Champs obligatoires manquants' });
    }

    if (new Date(departureTime) < new Date()) {
      return sendJSON(res, 400, { success: false, message: 'La date de départ doit être dans le futur' });
    }

    const id = randomUUID();
    const normalSeats = availableSeats || totalSeats || 1;
    const guestRide = {
      id,
      driverName,
      driverPhone,
      originCity,
      originAddress: originAddress || originCity,
      destinationCity,
      destinationAddress: destinationAddress || destinationCity,
      departureTime: new Date(departureTime).toISOString(),
      estimatedDuration: estimatedDuration || 180,
      pricePerSeat: parseInt(pricePerSeat),
      currency: currency || 'XOF',
      availableSeats: normalSeats,
      totalSeats: totalSeats || normalSeats,
      carModel: carModel || null,
      description: description || null,
      features: Array.isArray(features) ? features : [],
      status: 'PUBLISHED',
      createdAt: new Date().toISOString()
    };
    guestRides.set(id, guestRide);
    console.log(`✅ Trajet invité créé: ${originCity} → ${destinationCity}`);

    return sendJSON(res, 201, {
      success: true,
      message: 'Trajet publié avec succès',
      data: { ride: mapGuestRide(guestRide) }
    });
  }

  // ─── RIDES: CREATE REGISTERED RIDE ────────────────────────────────────────
  if (path === '/api/rides' && method === 'POST') {
    const user = getUserFromReq(req);
    if (!user) return sendJSON(res, 401, { success: false, message: 'Authentification requise' });

    const body = await parseBody(req);
    const { originCity, originAddress, destinationCity, destinationAddress, departureTime,
            estimatedDuration, pricePerSeat, totalSeats, features, description, carModel } = body;

    if (!originCity || !destinationCity || !departureTime || !pricePerSeat || !totalSeats) {
      return sendJSON(res, 400, { success: false, message: 'Champs obligatoires manquants' });
    }

    if (new Date(departureTime) < new Date()) {
      return sendJSON(res, 400, { success: false, message: 'La date de départ doit être dans le futur' });
    }

    const id = randomUUID();
    const ride = {
      id,
      driverId: user.id,
      originCity,
      originAddress: originAddress || originCity,
      destinationCity,
      destinationAddress: destinationAddress || destinationCity,
      departureTime: new Date(departureTime).toISOString(),
      estimatedDuration: estimatedDuration || 180,
      pricePerSeat: parseInt(pricePerSeat),
      currency: 'XOF',
      totalSeats: parseInt(totalSeats),
      availableSeats: parseInt(totalSeats),
      features: Array.isArray(features) ? features : [],
      description: description || null,
      carModel: carModel || user.carModel || null,
      status: 'OPEN',
      createdAt: new Date().toISOString()
    };
    rides.set(id, ride);
    console.log(`✅ Trajet enregistré créé: ${originCity} → ${destinationCity} par ${user.name}`);

    return sendJSON(res, 201, {
      success: true,
      message: 'Trajet publié avec succès',
      data: { ride: mapRegisteredRide(ride) }
    });
  }

  // ─── RIDES: GET BY ID ─────────────────────────────────────────────────────
  const rideDetailMatch = path.match(/^\/api\/rides\/([^\/]+)$/);
  if (rideDetailMatch && method === 'GET') {
    const id = rideDetailMatch[1];
    
    if (id.startsWith('guest_')) {
      const guestId = id.replace('guest_', '');
      const guestRide = guestRides.get(guestId);
      if (!guestRide) return sendJSON(res, 404, { success: false, message: 'Trajet non trouvé' });
      return sendJSON(res, 200, {
        success: true,
        data: { ride: mapGuestRide(guestRide), userBooking: null }
      });
    }
    
    const ride = rides.get(id);
    if (!ride) return sendJSON(res, 404, { success: false, message: 'Trajet non trouvé' });
    
    const user = getUserFromReq(req);
    const userBooking = user ? [...bookings.values()].find(b => b.rideId === id && b.passengerId === user.id) : null;
    
    return sendJSON(res, 200, {
      success: true,
      data: {
        ride: { ...mapRegisteredRide(ride), passengers: [] },
        userBooking: userBooking ? { id: userBooking.id, seats: userBooking.seats } : null
      }
    });
  }

  // ─── RIDES: CANCEL ────────────────────────────────────────────────────────
  const rideCancelMatch = path.match(/^\/api\/rides\/([^\/]+)\/cancel$/);
  if (rideCancelMatch && method === 'POST') {
    const user = getUserFromReq(req);
    if (!user) return sendJSON(res, 401, { success: false, message: 'Non authentifié' });
    
    const id = rideCancelMatch[1];
    const ride = rides.get(id);
    if (!ride) return sendJSON(res, 404, { success: false, message: 'Trajet non trouvé' });
    if (ride.driverId !== user.id) return sendJSON(res, 403, { success: false, message: 'Non autorisé' });
    
    ride.status = 'CANCELLED';
    rides.set(id, ride);
    return sendJSON(res, 200, { success: true, message: 'Trajet annulé' });
  }

  // ─── BOOKINGS: CREATE GUEST BOOKING ──────────────────────────────────────
  if (path === '/api/guest-bookings' && method === 'POST') {
    const body = await parseBody(req);
    const { rideId, seats = 1, passengerName, passengerPhone, paymentMethod, contactPreference, notes } = body;

    let ride = rides.get(rideId);
    let isGuestRide = false;
    
    if (!ride && guestRides.has(rideId.replace('guest_', ''))) {
      const gRide = guestRides.get(rideId.replace('guest_', ''));
      ride = { ...gRide, id: `guest_${gRide.id}`, driverId: gRide.id };
      isGuestRide = true;
    } else if (!ride && rideId.startsWith('guest_') && guestRides.has(rideId.replace('guest_', ''))) {
      const gRide = guestRides.get(rideId.replace('guest_', ''));
      ride = { ...gRide, id: `guest_${gRide.id}`, driverId: gRide.id };
      isGuestRide = true;
    }

    if (!ride) return sendJSON(res, 404, { success: false, message: 'Trajet non trouvé' });
    if (ride.availableSeats < seats) return sendJSON(res, 400, { success: false, message: `Seulement ${ride.availableSeats} place(s) disponible(s)` });

    const bookingId = randomUUID();
    const guestBooking = {
      id: bookingId,
      status: 'notified',
      seats,
      passenger: {
        name: passengerName,
        phone: passengerPhone,
        contactPreference
      },
      paymentMethod,
      notes,
      ride: {
        id: ride.id,
        origin: ride.originCity,
        destination: ride.destinationCity,
        departureTime: ride.departureTime,
        driver: {
          name: isGuestRide ? ride.driverName : (users.get(ride.driverId)?.name || 'Conducteur'),
          phone: isGuestRide ? ride.driverPhone : (users.get(ride.driverId)?.phone || null)
        }
      },
      remainingSeats: ride.availableSeats - seats
    };
    
    // Update seats
    if (isGuestRide) {
      const realId = ride.id.replace('guest_', '');
      const originalGuestRide = guestRides.get(realId);
      originalGuestRide.availableSeats -= seats;
      guestRides.set(realId, originalGuestRide);
    } else {
      const originalRide = rides.get(ride.id);
      originalRide.availableSeats -= seats;
      if (originalRide.availableSeats === 0) originalRide.status = 'FULL';
      rides.set(ride.id, originalRide);
    }
    
    console.log(`✅ Guest Booking créé: ${passengerName} a réservé ${seats} place(s) sur ${ride.originCity}→${ride.destinationCity}`);

    return sendJSON(res, 201, {
      success: true,
      data: { booking: guestBooking }
    });
  }

  // ─── BOOKINGS: REGISTERED ────────────────────────────────────────────────
  if (path === '/api/bookings' && method === 'POST') {
    const user = getUserFromReq(req);
    if (!user) return sendJSON(res, 401, { success: false, message: 'Authentification requise' });

    const body = await parseBody(req);
    const { rideId, seats = 1 } = body;

    const ride = rides.get(rideId);
    if (!ride) return sendJSON(res, 404, { success: false, message: 'Trajet non trouvé' });
    if (ride.status !== 'OPEN') return sendJSON(res, 400, { success: false, message: 'Ce trajet n\'accepte plus de réservations' });
    if (ride.driverId === user.id) return sendJSON(res, 400, { success: false, message: 'Vous ne pouvez pas réserver votre propre trajet' });
    if (ride.availableSeats < seats) return sendJSON(res, 400, { success: false, message: `Seulement ${ride.availableSeats} place(s) disponible(s)` });

    const existing = [...bookings.values()].find(b => b.rideId === rideId && b.passengerId === user.id);
    if (existing) return sendJSON(res, 409, { success: false, message: 'Vous avez déjà réservé ce trajet' });

    const bookingId = randomUUID();
    const booking = {
      id: bookingId,
      rideId,
      passengerId: user.id,
      seats,
      totalPrice: ride.pricePerSeat * seats,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString()
    };
    bookings.set(bookingId, booking);

    ride.availableSeats -= seats;
    if (ride.availableSeats === 0) ride.status = 'FULL';
    rides.set(rideId, ride);
    console.log(`✅ Réservation créée: ${user.name} a réservé ${seats} place(s) pour ${ride.originCity}→${ride.destinationCity}`);

    return sendJSON(res, 201, {
      success: true,
      message: 'Réservation confirmée !',
      data: {
        booking: {
          id: bookingId,
          seats,
          totalPrice: booking.totalPrice,
          status: 'CONFIRMED',
          ride: {
            id: rideId,
            origin: ride.originCity,
            destination: ride.destinationCity,
            departureTime: ride.departureTime,
          }
        }
      }
    });
  }

  // ─── BOOKINGS: MY BOOKINGS ────────────────────────────────────────────────
  if (path === '/api/bookings/my' && method === 'GET') {
    const user = getUserFromReq(req);
    if (!user) return sendJSON(res, 401, { success: false, message: 'Non authentifié' });

    const myBookings = [...bookings.values()]
      .filter(b => b.passengerId === user.id)
      .map(b => {
        const ride = rides.get(b.rideId);
        const driver = ride ? users.get(ride.driverId) : null;
        return {
          ...b,
          ride: ride ? {
            id: ride.id,
            origin: ride.originCity,
            destination: ride.destinationCity,
            departureTime: ride.departureTime,
            driver: driver ? { name: driver.name, avatarUrl: driver.avatarUrl } : null
          } : null
        };
      });

    return sendJSON(res, 200, { success: true, data: { bookings: myBookings } });
  }

  // ─── MESSAGES (stub) ──────────────────────────────────────────────────────
  if (path.startsWith('/api/messages') && method === 'GET') {
    return sendJSON(res, 200, { success: true, data: { messages: [] } });
  }
  if (path.startsWith('/api/messages') && method === 'POST') {
    return sendJSON(res, 201, { success: true, data: { message: { id: randomUUID(), createdAt: new Date().toISOString() } } });
  }

  // ─── NOTIFICATIONS (stub) ─────────────────────────────────────────────────
  if (path.startsWith('/api/notifications')) {
    return sendJSON(res, 200, { success: true, data: { notifications: [] } });
  }

  // ─── 404 ──────────────────────────────────────────────────────────────────
  console.warn(`[404] ${method} ${path}`);
  sendJSON(res, 404, { success: false, message: `Route non trouvée: ${method} ${path}` });
}

// ─── DÉMARRAGE ─────────────────────────────────────────────────────────────────
seedData();

const server = http.createServer(handleRequest);
const PORT = 3001;

server.listen(PORT, () => {
  console.log('');
  console.log('🚀 ═══════════════════════════════════════════════');
  console.log('   SUNU YOON - Serveur Mock Local');
  console.log(`   Port: http://localhost:${PORT}`);
  console.log('   Compte démo: +221771234567 / demo123');
  console.log('   Code vérif dev: 123456');
  console.log('══════════════════════════════════════════════════');
  console.log('');
});

server.on('error', (err) => {
  console.error('Erreur serveur:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error(`Le port ${PORT} est déjà utilisé. Arrêtez l'autre serveur d'abord.`);
  }
  process.exit(1);
});
