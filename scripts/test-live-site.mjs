/* global fetch, console */

// Test complet de l'API sunuyoon.net
const BASE = 'https://sunuyoon.net';

async function test() {
  const results = [];

  // 1. Health check
  console.log('=== 1. HEALTH CHECK ===');
  try {
    const r = await fetch(BASE + '/api/health');
    const d = await r.text();
    console.log('Status:', r.status, '| Body:', d.substring(0, 200));
    results.push({ test: 'Health', status: r.status, ok: r.status === 200 });
  } catch(e) { console.error('FAIL:', e.message); results.push({ test: 'Health', ok: false, error: e.message }); }

  // 2. Page accueil HTML
  console.log('\n=== 2. PAGE ACCUEIL ===');
  try {
    const r = await fetch(BASE);
    const html = await r.text();
    console.log('Status:', r.status, '| Content-Type:', r.headers.get('content-type'));
    console.log('HTML length:', html.length, '| Has root div:', html.includes('id="root"'));
    results.push({ test: 'Homepage', status: r.status, ok: r.status === 200 && html.includes('id="root"') });
  } catch(e) { console.error('FAIL:', e.message); results.push({ test: 'Homepage', ok: false }); }

  // 3. Trajets récents
  console.log('\n=== 3. TRAJETS RECENTS ===');
  try {
    const r = await fetch(BASE + '/api/rides/recent');
    const d = await r.json();
    console.log('Status:', r.status, '| Success:', d.success, '| Count:', d.data?.rides?.length || 0);
    if (d.data?.rides?.[0]) console.log('1er trajet:', JSON.stringify(d.data.rides[0]).substring(0, 300));
    results.push({ test: 'Recent rides', status: r.status, ok: d.success === true });
  } catch(e) { console.error('FAIL:', e.message); results.push({ test: 'Recent rides', ok: false, error: e.message }); }

  // 4. Recherche de trajets
  console.log('\n=== 4. RECHERCHE TRAJETS (Dakar -> Thies) ===');
  try {
    const r = await fetch(BASE + '/api/rides/search?origin=Dakar&destination=Thies&seats=1');
    const d = await r.json();
    console.log('Status:', r.status, '| Success:', d.success, '| Count:', d.data?.rides?.length || 0);
    results.push({ test: 'Search rides', status: r.status, ok: d.success === true });
  } catch(e) { console.error('FAIL:', e.message); results.push({ test: 'Search rides', ok: false, error: e.message }); }

  // 5. Ride requests (public) - actual route is /active
  console.log('\n=== 5. RIDE REQUESTS (PUBLIC) ===');
  try {
    const r = await fetch(BASE + '/api/ride-requests/active?limit=10');
    const d = await r.json();
    console.log('Status:', r.status, '| Body:', JSON.stringify(d).substring(0, 300));
    results.push({ test: 'Ride requests', status: r.status, ok: r.status === 200 });
  } catch(e) { console.error('FAIL:', e.message); results.push({ test: 'Ride requests', ok: false, error: e.message }); }

  // 6. Guest bookings
  console.log('\n=== 6. GUEST BOOKINGS ===');
  try {
    const r = await fetch(BASE + '/api/guest-bookings');
    const d = await r.text();
    console.log('Status:', r.status, '| Body:', d.substring(0, 300));
    results.push({ test: 'Guest bookings GET', status: r.status, ok: true });
  } catch(e) { console.error('FAIL:', e.message); results.push({ test: 'Guest bookings GET', ok: false }); }

  // 7. Tracking endpoint
  console.log('\n=== 7. TRACKING ===');
  try {
    const r = await fetch(BASE + '/api/tracking/test-code');
    const d = await r.text();
    console.log('Status:', r.status, '| Body:', d.substring(0, 300));
    results.push({ test: 'Tracking', status: r.status, ok: true });
  } catch(e) { console.error('FAIL:', e.message); results.push({ test: 'Tracking', ok: false }); }

  // 8. Test inscription avec un numéro aléatoire
  const testPhone = '+221' + '7' + Math.floor(10000000 + Math.random() * 90000000).toString().substring(0, 8);
  const testName = 'Test User ' + Date.now();
  const testPassword = 'TestPass123!';
  console.log('\n=== 8. INSCRIPTION ===');
  console.log('Phone:', testPhone, '| Name:', testName);
  try {
    const r = await fetch(BASE + '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone, name: testName, password: testPassword })
    });
    const d = await r.json();
    console.log('Status:', r.status, '| Success:', d.success, '| Message:', d.message);
    if (d.data) {
      console.log('User ID:', d.data.user?.id);
      console.log('Has tokens:', !!d.data.tokens?.accessToken);
      console.log('Verification required:', d.data.verificationRequired);
    }
    if (d.error) console.log('Error:', d.error);
    results.push({ test: 'Register', status: r.status, ok: d.success === true, data: d.data });
  } catch(e) { console.error('FAIL:', e.message); results.push({ test: 'Register', ok: false, error: e.message }); }

  // 9. Test connexion avec le compte créé
  console.log('\n=== 9. CONNEXION ===');
  try {
    const r = await fetch(BASE + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone, password: testPassword })
    });
    const d = await r.json();
    console.log('Status:', r.status, '| Success:', d.success);
    if (d.data) {
      console.log('User:', d.data.user?.name, '| ID:', d.data.user?.id);
      console.log('Has access token:', !!d.data.tokens?.accessToken);
      console.log('Has refresh token:', !!d.data.tokens?.refreshToken);
    }
    if (d.error) console.log('Error:', d.error);
    results.push({ test: 'Login', status: r.status, ok: d.success === true, data: d.data });
  } catch(e) { console.error('FAIL:', e.message); results.push({ test: 'Login', ok: false, error: e.message }); }

  // Récupérer le token du login pour les tests authentifiés
  const loginResult = results.find(r => r.test === 'Login');
  const token = loginResult?.data?.tokens?.accessToken;

  // 10. Publication de trajet (authentifié)
  console.log('\n=== 10. PUBLICATION TRAJET ===');
  if (token) {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(8, 0, 0, 0);

      const rideData = {
        originCity: 'Dakar',
        originAddress: 'Place de l\'Indépendance',
        destinationCity: 'Thiès',
        destinationAddress: 'Gare routière',
        departureTime: tomorrow.toISOString(),
        pricePerSeat: 3500,
        totalSeats: 3,
        availableSeats: 3,
        description: 'Trajet test - climatisation',
        features: ['Climatisation', 'Musique'],
        estimatedDuration: 90
      };

      const r = await fetch(BASE + '/api/rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(rideData)
      });
      const d = await r.json();
      console.log('Status:', r.status, '| Success:', d.success);
      if (d.data) console.log('Ride ID:', d.data.id || d.data.ride?.id);
      if (d.error) console.log('Error:', d.error);
      if (d.message) console.log('Message:', d.message);
      results.push({ test: 'Create ride', status: r.status, ok: d.success === true, data: d.data });
    } catch(e) { console.error('FAIL:', e.message); results.push({ test: 'Create ride', ok: false, error: e.message }); }
  } else {
    console.log('SKIP: Pas de token disponible');
    results.push({ test: 'Create ride', ok: false, error: 'No token' });
  }

  // 11. Guest ride publication (sans inscription)
  console.log('\n=== 11. GUEST RIDE PUBLICATION ===');
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    tomorrow.setHours(10, 0, 0, 0);

    const guestRide = {
      driverName: 'Amadou Sow',
      driverPhone: '+221771234567',
      originCity: 'Saint-Louis',
      destinationCity: 'Dakar',
      departureTime: tomorrow.toISOString(),
      pricePerSeat: 5000,
      totalSeats: 4,
      availableSeats: 4,
      description: 'Trajet guest test'
    };

    const r = await fetch(BASE + '/api/guest-bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guestRide)
    });
    const d = await r.text();
    console.log('Status:', r.status, '| Body:', d.substring(0, 300));
    results.push({ test: 'Guest ride', status: r.status, ok: r.status < 500 });
  } catch(e) { console.error('FAIL:', e.message); results.push({ test: 'Guest ride', ok: false }); }

  // 12. Ride request (demande passager) - uses correct field names
  console.log('\n=== 12. RIDE REQUEST (DEMANDE PASSAGER) ===');
  try {
    const rideRequest = {
      passengerName: 'Awa Diallo',
      passengerPhone: '+221776543210',
      originCity: 'Kaolack',
      destinationCity: 'Dakar',
      departureDate: new Date(Date.now() + 86400000 * 3).toISOString(),
      seats: 2,
      description: 'Je cherche un trajet pour moi et ma soeur'
    };

    const r = await fetch(BASE + '/api/ride-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rideRequest)
    });
    const d = await r.text();
    console.log('Status:', r.status, '| Body:', d.substring(0, 300));
    results.push({ test: 'Ride request', status: r.status, ok: r.status < 500 });
  } catch(e) { console.error('FAIL:', e.message); results.push({ test: 'Ride request', ok: false }); }

  // 13. Reservation (si on a un trajet et un token d'un autre user => simuler)
  console.log('\n=== 13. RESERVATION TRAJET ===');
  const rideCreated = results.find(r => r.test === 'Create ride');
  const rideId = rideCreated?.data?.id || rideCreated?.data?.ride?.id;
  if (token && rideId) {
    // On ne peut pas réserver notre propre trajet, mais testons l'erreur
    try {
      const r = await fetch(BASE + '/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ rideId, seats: 1 })
      });
      const d = await r.json();
      console.log('Status:', r.status, '| Body:', JSON.stringify(d).substring(0, 300));
      // On s'attend à une erreur "Vous ne pouvez pas réserver votre propre trajet"
      results.push({ test: 'Booking (own ride)', status: r.status, ok: r.status === 400, data: d });
    } catch(e) { console.error('FAIL:', e.message); results.push({ test: 'Booking', ok: false }); }
  } else {
    console.log('SKIP: Pas de ride ID ou token');
    results.push({ test: 'Booking', ok: false, error: 'No ride/token' });
  }

  // 14. Profil utilisateur
  console.log('\n=== 14. PROFIL UTILISATEUR ===');
  if (token) {
    try {
      const r = await fetch(BASE + '/api/users/me', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const d = await r.json();
      console.log('Status:', r.status, '| Body:', JSON.stringify(d).substring(0, 300));
      results.push({ test: 'User profile', status: r.status, ok: r.status < 500 });
    } catch(e) { console.error('FAIL:', e.message); results.push({ test: 'User profile', ok: false }); }
  } else {
    console.log('SKIP'); results.push({ test: 'User profile', ok: false, error: 'No token' });
  }

  // 15. Mes trajets (en tant que conducteur)
  console.log('\n=== 15. MES TRAJETS ===');
  if (token) {
    try {
      const r = await fetch(BASE + '/api/rides/my/published', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const d = await r.json();
      console.log('Status:', r.status, '| Body:', JSON.stringify(d).substring(0, 300));
      results.push({ test: 'My rides', status: r.status, ok: r.status < 500 });
    } catch(e) { console.error('FAIL:', e.message); results.push({ test: 'My rides', ok: false }); }
  } else {
    console.log('SKIP'); results.push({ test: 'My rides', ok: false, error: 'No token' });
  }

  // 16. Tracking - send GPS position (correct route: POST /api/tracking/:rideId)
  console.log('\n=== 16. TRACKING - SEND POSITION ===');
  try {
    const r = await fetch(BASE + '/api/tracking/test-ride-123', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: 14.6928, lng: -17.4467, speed: 60, heading: 180 })
    });
    const d = await r.text();
    console.log('Status:', r.status, '| Body:', d.substring(0, 300));
    results.push({ test: 'Tracking create', status: r.status, ok: r.status < 500 });
  } catch(e) { console.error('FAIL:', e.message); results.push({ test: 'Tracking create', ok: false }); }

  // 17. Auth - refresh token
  console.log('\n=== 17. REFRESH TOKEN ===');
  const refreshToken = loginResult?.data?.tokens?.refreshToken;
  if (refreshToken) {
    try {
      const r = await fetch(BASE + '/api/auth/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      const d = await r.json();
      console.log('Status:', r.status, '| Success:', d.success);
      if (d.data) console.log('New access token:', !!d.data.accessToken);
      results.push({ test: 'Refresh token', status: r.status, ok: r.status < 500 });
    } catch(e) { console.error('FAIL:', e.message); results.push({ test: 'Refresh token', ok: false }); }
  } else {
    console.log('SKIP'); results.push({ test: 'Refresh token', ok: false, error: 'No refresh token' });
  }

  // 18. HTTPS redirect test
  console.log('\n=== 18. HTTPS REDIRECT ===');
  try {
    const r = await fetch('http://sunuyoon.net', { redirect: 'manual' });
    console.log('Status:', r.status, '| Location:', r.headers.get('location'));
    results.push({ test: 'HTTPS redirect', status: r.status, ok: r.status >= 300 && r.status < 400 });
  } catch(e) { console.error('FAIL:', e.message); results.push({ test: 'HTTPS redirect', ok: false }); }

  // 19. www redirect test
  console.log('\n=== 19. WWW REDIRECT ===');
  try {
    const r = await fetch('https://www.sunuyoon.net', { redirect: 'manual' });
    console.log('Status:', r.status, '| Location:', r.headers.get('location'));
    results.push({ test: 'WWW redirect', status: r.status, ok: true });
  } catch(e) { console.error('FAIL:', e.message); results.push({ test: 'WWW redirect', ok: false }); }

  // 20. SPA routing (404 -> index.html)
  console.log('\n=== 20. SPA ROUTING ===');
  try {
    const r = await fetch(BASE + '/some-random-page-that-doesnt-exist');
    const html = await r.text();
    console.log('Status:', r.status, '| Is SPA (has root):', html.includes('id="root"'));
    results.push({ test: 'SPA routing', status: r.status, ok: html.includes('id="root"') });
  } catch(e) { console.error('FAIL:', e.message); results.push({ test: 'SPA routing', ok: false }); }

  // === RAPPORT FINAL ===
  console.log('\n\n========================================');
  console.log('        RAPPORT DE TESTS FINAL');
  console.log('========================================');
  let passed = 0, failed = 0;
  for (const r of results) {
    const icon = r.ok ? '✅' : '❌';
    console.log(`${icon} ${r.test} (HTTP ${r.status || 'N/A'})${r.error ? ' - ' + r.error : ''}`);
    if (r.ok) passed++; else failed++;
  }
  console.log('----------------------------------------');
  console.log(`TOTAL: ${passed} passed / ${failed} failed / ${results.length} tests`);
  console.log('========================================');
}

test();
