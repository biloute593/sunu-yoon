// Script de test de l'API
import http from 'http';

const testLogin = () => {
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
        console.log('✅ Status:', res.statusCode);
        console.log('📦 Response:', body);
        resolve(JSON.parse(body));
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
};

console.log('🧪 Test de connexion à l\'API...\n');
testLogin()
  .then(() => console.log('\n✅ Test réussi!'))
  .catch(err => console.error('\n❌ Erreur:', err.message));
