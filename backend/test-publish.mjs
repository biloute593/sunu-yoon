// Test de publication d'annonce
import http from 'http';

// 1. Login pour obtenir le token
const login = () => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      phone: '+221771234567',
      password: 'password123'
    });

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        const response = JSON.parse(body);
        resolve(response.data.tokens.accessToken);
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
};

// 2. Publier une annonce
const publishRide = (token) => {
  return new Promise((resolve, reject) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    
    const ride = {
      originCity: 'Dakar',
      originAddress: 'Place de l\'Indépendance, Dakar',
      destinationCity: 'Thiès',
      destinationAddress: 'Gare routière de Thiès',
      departureTime: tomorrow.toISOString(),
      pricePerSeat: 2000,
      totalSeats: 4,
      description: 'Trajet rapide et confortable, départ garanti'
    };

    const data = JSON.stringify(ride);

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/rides',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log('✅ Status:', res.statusCode);
        console.log('📦 Response:', body);
        if (body) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Status ${res.statusCode}, empty response`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
};

// 3. Rechercher les annonces
const searchRides = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/rides?origin=Dakar&destination=Thiès',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        const response = JSON.parse(body);
        console.log('\n🔍 Annonces trouvées:', response.data.length);
        response.data.forEach((ride, i) => {
          console.log(`\n${i + 1}. ${ride.origin} → ${ride.destination}`);
          console.log(`   Prix: ${ride.price} FCFA | Places: ${ride.availableSeats}`);
          console.log(`   Conducteur: ${ride.driver.name}`);
        });
        resolve(response);
      });
    });

    req.on('error', reject);
    req.end();
  });
};

console.log('🧪 Test complet de publication d\'annonce\n');
console.log('1️⃣ Connexion...');
login()
  .then(token => {
    console.log('✅ Connecté!\n');
    console.log('2️⃣ Publication d\'une annonce...');
    return publishRide(token);
  })
  .then(() => {
    console.log('✅ Annonce publiée!\n');
    console.log('3️⃣ Recherche des annonces...');
    return searchRides();
  })
  .then(() => {
    console.log('\n✅ Test complet réussi!');
  })
  .catch(err => {
    console.error('\n❌ Erreur:', err.message);
  });
