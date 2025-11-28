import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Créer des utilisateurs de test
  const passwordHash = await bcrypt.hash('password123', 12);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { phone: '+221771234567' },
      update: {},
      create: {
        phone: '+221771234567',
        email: 'moussa.diop@example.com',
        name: 'Moussa Diop',
        passwordHash,
        avatarUrl: 'https://ui-avatars.com/api/?name=Moussa+Diop&background=059669&color=fff',
        rating: 4.8,
        reviewCount: 156,
        isVerified: true,
        isPhoneVerified: true,
        isDriver: true,
        carModel: 'Peugeot 308',
        carPlate: 'DK-1234-AB',
        carColor: 'Gris métallisé'
      }
    }),
    prisma.user.upsert({
      where: { phone: '+221777654321' },
      update: {},
      create: {
        phone: '+221777654321',
        email: 'fatou.ndiaye@example.com',
        name: 'Fatou Ndiaye',
        passwordHash,
        avatarUrl: 'https://ui-avatars.com/api/?name=Fatou+Ndiaye&background=059669&color=fff',
        rating: 4.9,
        reviewCount: 42,
        isVerified: true,
        isPhoneVerified: true,
        isDriver: true,
        carModel: 'Toyota Corolla',
        carPlate: 'DK-5678-CD',
        carColor: 'Blanc'
      }
    }),
    prisma.user.upsert({
      where: { phone: '+221781112233' },
      update: {},
      create: {
        phone: '+221781112233',
        email: 'amadou.sow@example.com',
        name: 'Amadou Sow',
        passwordHash,
        avatarUrl: 'https://ui-avatars.com/api/?name=Amadou+Sow&background=059669&color=fff',
        rating: 4.5,
        reviewCount: 12,
        isVerified: true,
        isPhoneVerified: true,
        isDriver: false
      }
    }),
    prisma.user.upsert({
      where: { phone: '+221769998877' },
      update: {},
      create: {
        phone: '+221769998877',
        email: 'aissatou.ba@example.com',
        name: 'Aissatou Ba',
        passwordHash,
        avatarUrl: 'https://ui-avatars.com/api/?name=Aissatou+Ba&background=059669&color=fff',
        rating: 4.7,
        reviewCount: 28,
        isVerified: true,
        isPhoneVerified: true,
        isDriver: true,
        carModel: 'Renault Clio',
        carPlate: 'DK-9012-EF',
        carColor: 'Bleu'
      }
    })
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Créer des trajets de test
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(14, 30, 0, 0);

  const rides = await Promise.all([
    prisma.ride.create({
      data: {
        driverId: users[0].id,
        originCity: 'Dakar',
        originAddress: 'Gare routière des Beaux Maraichers, Pikine',
        originLat: 14.7645,
        originLng: -17.4019,
        destinationCity: 'Saint-Louis',
        destinationAddress: 'Gare routière de Saint-Louis',
        destinationLat: 16.0326,
        destinationLng: -16.4818,
        departureTime: tomorrow,
        estimatedDuration: 270,
        distance: 265,
        pricePerSeat: 5000,
        totalSeats: 4,
        availableSeats: 2,
        features: ['Climatisation', 'Bagages acceptés', 'Non-fumeur'],
        description: 'Trajet confortable avec pauses café. Musique sénégalaise garantie!'
      }
    }),
    prisma.ride.create({
      data: {
        driverId: users[1].id,
        originCity: 'Dakar',
        originAddress: 'Liberté 6, près du marché',
        originLat: 14.7167,
        originLng: -17.4677,
        destinationCity: 'Touba',
        destinationAddress: 'Grande Mosquée',
        destinationLat: 14.8556,
        destinationLng: -15.8833,
        departureTime: tomorrow,
        estimatedDuration: 135,
        distance: 195,
        pricePerSeat: 4500,
        totalSeats: 3,
        availableSeats: 1,
        features: ['Climatisation', 'Musique', 'Non-fumeur'],
        description: 'Départ ponctuel. Arrêt possible à Thiès.'
      }
    }),
    prisma.ride.create({
      data: {
        driverId: users[3].id,
        originCity: 'Dakar',
        originAddress: 'Plateau, Place de l\'Indépendance',
        originLat: 14.6697,
        originLng: -17.4378,
        destinationCity: 'Mbour',
        destinationAddress: 'Centre-ville Mbour',
        destinationLat: 14.4167,
        destinationLng: -16.9667,
        departureTime: nextWeek,
        estimatedDuration: 90,
        distance: 85,
        pricePerSeat: 2500,
        totalSeats: 4,
        availableSeats: 4,
        features: ['Climatisation', 'Bagages acceptés'],
        description: 'Direction la Petite Côte! Parfait pour une escapade.'
      }
    }),
    prisma.ride.create({
      data: {
        driverId: users[0].id,
        originCity: 'Saint-Louis',
        originAddress: 'Gare routière',
        destinationCity: 'Dakar',
        destinationAddress: 'Gare routière Pompiers',
        departureTime: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000),
        estimatedDuration: 270,
        distance: 265,
        pricePerSeat: 5000,
        totalSeats: 4,
        availableSeats: 3,
        features: ['Climatisation', 'Bagages acceptés', 'Non-fumeur'],
        description: 'Retour vers Dakar. Départ après la prière du Fajr.'
      }
    })
  ]);

  console.log(`✅ Created ${rides.length} rides`);

  // Créer une réservation de test
  const booking = await prisma.booking.create({
    data: {
      rideId: rides[0].id,
      passengerId: users[2].id,
      seats: 2,
      totalPrice: 10000,
      status: 'CONFIRMED'
    }
  });

  console.log('✅ Created 1 booking');

  // Créer une conversation de test
  const conversation = await prisma.conversation.create({
    data: {
      rideId: rides[0].id,
      messages: {
        create: [
          {
            senderId: users[2].id,
            receiverId: users[0].id,
            content: 'Bonjour! Est-ce que vous pouvez me prendre à Pikine au lieu des Beaux Maraichers?'
          },
          {
            senderId: users[0].id,
            receiverId: users[2].id,
            content: 'Bonjour Amadou! Oui pas de problème, ça m\'arrange même. On se retrouve où exactement?'
          },
          {
            senderId: users[2].id,
            receiverId: users[0].id,
            content: 'Super! Près de la station Total de Pikine, je serai là à 7h45.'
          }
        ]
      }
    }
  });

  console.log('✅ Created 1 conversation with messages');

  // Créer des notifications de test
  await prisma.notification.createMany({
    data: [
      {
        userId: users[0].id,
        type: 'BOOKING_REQUEST',
        title: 'Nouvelle réservation',
        message: 'Amadou Sow a réservé 2 places pour votre trajet Dakar → Saint-Louis',
        data: { bookingId: booking.id, rideId: rides[0].id }
      },
      {
        userId: users[2].id,
        type: 'BOOKING_CONFIRMED',
        title: 'Réservation confirmée',
        message: 'Votre réservation pour Dakar → Saint-Louis a été confirmée!',
        data: { bookingId: booking.id, rideId: rides[0].id }
      }
    ]
  });

  console.log('✅ Created notifications');

  // Créer des avis
  await prisma.review.create({
    data: {
      authorId: users[2].id,
      targetId: users[0].id,
      rating: 5,
      comment: 'Excellent conducteur! Très ponctuel et voiture très propre. Je recommande vivement.'
    }
  });

  console.log('✅ Created 1 review');

  console.log('');
  console.log('🎉 Database seeded successfully!');
  console.log('');
  console.log('📱 Test accounts:');
  console.log('   Phone: +221771234567 | Password: password123 (Moussa - Conducteur)');
  console.log('   Phone: +221777654321 | Password: password123 (Fatou - Conducteur)');
  console.log('   Phone: +221781112233 | Password: password123 (Amadou - Passager)');
  console.log('   Phone: +221769998877 | Password: password123 (Aissatou - Conducteur)');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
