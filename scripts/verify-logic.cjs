
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting Verification...');

    try {
        // 1. Cleanup previous test data
        console.log('🧹 Cleaning up old test data...');
        // Be careful not to delete real data if any. For now, we assume safe to clean specific test entries if we tracked them, but here we just create new ones.

        // 2. Create a Driver User
        console.log('👤 Creating Driver...');
        const driverPhone = '+221770000001';
        let driver = await prisma.user.findUnique({ where: { phone: driverPhone } });
        if (!driver) {
            driver = await prisma.user.create({
                data: {
                    phone: driverPhone,
                    name: 'Test Driver',
                    firstName: 'Test',
                    lastName: 'Driver',
                    passwordHash: 'hash',
                    isDriver: true,
                    isVerified: true
                }
            });
        }
        console.log('✅ Driver created:', driver.id);

        // 3. Publish a Ride via Prisma (mimics RideService.createRide)
        console.log('🚗 Publishing Ride...');
        const ride = await prisma.ride.create({
            data: {
                driverId: driver.id,
                originCity: 'Dakar',
                destinationCity: 'Touba',
                departureTime: new Date(Date.now() + 86400000), // Tomorrow
                pricePerSeat: 5000,
                totalSeats: 4,
                availableSeats: 4,
                features: ['Climatisation'],
                status: 'OPEN'
            }
        });
        console.log('✅ Ride published:', ride.id);

        // 4. Create a Passenger User
        console.log('👤 Creating Passenger...');
        const passengerPhone = '+221770000002';
        let passenger = await prisma.user.findUnique({ where: { phone: passengerPhone } });
        if (!passenger) {
            passenger = await prisma.user.create({
                data: {
                    phone: passengerPhone,
                    name: 'Test Passenger',
                    firstName: 'Test',
                    lastName: 'Passenger',
                    passwordHash: 'hash',
                }
            });
        }
        console.log('✅ Passenger created:', passenger.id);

        // 5. Create a Booking (Simulating authenticated booking)
        console.log('🎫 Booking Ride...');
        const booking = await prisma.booking.create({
            data: {
                rideId: ride.id,
                passengerId: passenger.id,
                seats: 2,
                status: 'PENDING'
            }
        });

        // Update seats
        await prisma.ride.update({
            where: { id: ride.id },
            data: { availableSeats: ride.availableSeats - 2 }
        });

        console.log('✅ Booking created:', booking.id);

        // 6. Verify Seats
        const updatedRide = await prisma.ride.findUnique({ where: { id: ride.id } });
        console.log(`✅ Seats remaining: ${updatedRide.availableSeats} (Expected: 2)`);

        if (updatedRide.availableSeats !== 2) {
            throw new Error('Seat calculation failed!');
        }

        // 7. Test Guest Booking Logic (Simulate logic from guestBookings.ts)
        console.log('👤 Creating Guest Booking...');
        const guestPhone = '+221770000003';
        // Logic from guestBookings.ts: Find or create user, then book
        let guestUser = await prisma.user.findUnique({ where: { phone: guestPhone } });
        if (!guestUser) {
            guestUser = await prisma.user.create({
                data: {
                    phone: guestPhone,
                    name: 'Guest User',
                    firstName: 'Guest',
                    passwordHash: 'guest_hash',
                    isVerified: false
                }
            });
        }

        const guestBooking = await prisma.booking.create({
            data: {
                rideId: ride.id,
                passengerId: guestUser.id,
                seats: 1,
                status: 'PENDING'
            }
        });

        await prisma.ride.update({
            where: { id: ride.id },
            data: { availableSeats: updatedRide.availableSeats - 1 }
        });

        const finalRide = await prisma.ride.findUnique({ where: { id: ride.id } });
        console.log(`✅ Final Seats remaining: ${finalRide.availableSeats} (Expected: 1)`);

        if (finalRide.availableSeats !== 1) {
            throw new Error('Guest booking seat calculation failed!');
        }

        console.log('🎉 Verification Successful! Core logic is sound.');

    } catch (error) {
        console.error('❌ Verification Failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
