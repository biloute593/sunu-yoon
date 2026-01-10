// Script de test pour vérifier la publication de trajets
const testRideCreation = () => {
  console.log('=== TEST DE PUBLICATION DE TRAJET ===');
  
  // Test des données
  const testData = {
    originCity: 'Dakar',
    destinationCity: 'Saint-Louis',
    departureTime: new Date(Date.now() + 24*60*60*1000).toISOString(), // Demain
    pricePerSeat: 5000,
    totalSeats: 4,
    availableSeats: 4,
    description: 'Trajet test',
    features: ['Climatisation'],
    estimatedDuration: 180,
    distance: 320,
    driverName: 'Test Driver',
    driverPhone: '+221771234567'
  };
  
  console.log('Données de test:', JSON.stringify(testData, null, 2));
  
  // Test via fetch
  const apiUrl = window.location.origin.includes('localhost') 
    ? 'http://localhost:3001/api/rides'
    : '/api/rides';
    
  fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(testData)
  })
  .then(response => {
    console.log('Statut de réponse:', response.status);
    return response.json();
  })
  .then(data => {
    if (data.success) {
      console.log('✅ SUCCÈS - Trajet créé:', data);
    } else {
      console.error('❌ ÉCHEC - Erreur API:', data);
    }
  })
  .catch(error => {
    console.error('❌ ERREUR RÉSEAU:', error);
  });
};

// Fonction pour tester depuis la console du navigateur
window.testRideCreation = testRideCreation;
console.log('Script de test chargé. Utilisez testRideCreation() pour tester.');