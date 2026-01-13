// Test rapide des notifications SMS
// Exécuter avec: node test-sms-notification.js

const testBookingNotification = () => {
  const driverPhone = '+221771234567';
  const passengerName = 'Moussa Diop';
  const seats = 2;
  const origin = 'Dakar';
  const destination = 'Saint-Louis';
  const departureDate = new Date().toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });

  const message = `🚗 SUNU YOON - Nouvelle réservation!\n\n` +
    `${passengerName} souhaite réserver ${seats} place(s)\n` +
    `📍 ${origin} → ${destination}\n` +
    `📅 ${departureDate}\n\n` +
    `Connectez-vous pour accepter ou refuser.`;

  console.log('\n=== TEST NOTIFICATION CONDUCTEUR ===');
  console.log(`À: ${driverPhone}`);
  console.log('\nContenu:');
  console.log(message);
  console.log('\nLongueur:', message.length, 'caractères');
  console.log('Nombre de SMS:', Math.ceil(message.length / 160));
  console.log('=====================================\n');
};

const testConfirmationNotification = () => {
  const passengerPhone = '+221779876543';
  const driverName = 'Abdou Seck';
  const driverPhone = '+221771234567';
  const origin = 'Dakar';
  const destination = 'Saint-Louis';
  const departureDate = new Date().toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });

  const message = `✅ SUNU YOON - Réservation confirmée!\n\n` +
    `Conducteur: ${driverName}\n` +
    `📞 ${driverPhone}\n` +
    `📍 ${origin} → ${destination}\n` +
    `📅 ${departureDate}\n\n` +
    `Bon voyage! 🚗`;

  console.log('\n=== TEST CONFIRMATION PASSAGER ===');
  console.log(`À: ${passengerPhone}`);
  console.log('\nContenu:');
  console.log(message);
  console.log('\nLongueur:', message.length, 'caractères');
  console.log('Nombre de SMS:', Math.ceil(message.length / 160));
  console.log('===================================\n');
};

console.log('\n🧪 TEST DES NOTIFICATIONS SMS SUNU YOON\n');
testBookingNotification();
testConfirmationNotification();
console.log('✅ Les messages sont prêts à être envoyés!\n');
console.log('📝 En développement, ils apparaîtront dans la console du backend.');
console.log('📱 En production (avec SMS_API_ENABLED=true), ils seront envoyés par SMS.\n');
