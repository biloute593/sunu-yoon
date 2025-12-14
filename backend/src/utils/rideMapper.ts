import type { GuestRide, Ride, User } from '@prisma/client';

const formatDuration = (minutes?: number | null): string => {
  if (!minutes || minutes <= 0) {
    return '~3h';
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
};

const splitName = (fullName?: string | null): { firstName: string; lastName: string } => {
  if (!fullName || !fullName.trim()) {
    return { firstName: 'Conducteur', lastName: '' };
  }
  const parts = fullName.trim().split(/\s+/);
  const [firstName, ...rest] = parts;
  return {
    firstName,
    lastName: rest.join(' ')
  };
};

const sanitizePhone = (phone: string): string => {
  return phone.replace(/[^0-9+]/g, '');
};

const buildGuestContact = (rawPhone: string) => {
  const sanitized = sanitizePhone(rawPhone);
  let numeric = sanitized.replace(/[^0-9]/g, '');
  if (numeric.startsWith('221')) {
    numeric = numeric.slice(3);
  }
  if (numeric.length === 9 && !numeric.startsWith('0')) {
    numeric = `221${numeric}`;
  }
  const whatsappUrl = `https://wa.me/${numeric}`;
  const telUrl = `tel:${sanitized.startsWith('+') ? sanitized : `+${numeric}`}`;
  return {
    phone: rawPhone,
    whatsappUrl,
    callUrl: telUrl
  };
};

type RideWithDriver = Ride & {
  driver: Pick<User, 'id' | 'name' | 'avatarUrl' | 'rating' | 'reviewCount' | 'isVerified' | 'carModel'>;
};

export const mapRegisteredRide = (ride: RideWithDriver) => {
  const { firstName, lastName } = splitName(ride.driver.name);
  const avatar = ride.driver.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(ride.driver.name || firstName)}&background=10b981&color=fff`;

  return {
    id: ride.id,
    type: 'registered' as const,
    isGuest: false,
    driver: {
      id: ride.driver.id,
      name: ride.driver.name || `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      avatarUrl: avatar,
      rating: ride.driver.rating ?? null,
      reviewCount: ride.driver.reviewCount ?? 0,
      isVerified: ride.driver.isVerified ?? false,
      isGuest: false
    },
    driverContact: null,
    origin: ride.originCity,
    originAddress: ride.originAddress,
    destination: ride.destinationCity,
    destinationAddress: ride.destinationAddress,
    departureTime: ride.departureTime.toISOString(),
    duration: formatDuration(ride.estimatedDuration),
    estimatedDuration: ride.estimatedDuration,
    price: ride.pricePerSeat,
    currency: ride.currency,
    seatsAvailable: ride.availableSeats,
    totalSeats: ride.totalSeats,
    carModel: ride.driver.carModel || 'Véhicule',
    features: ride.features ?? [],
    description: ride.description,
    status: ride.status,
    createdAt: ride.createdAt.toISOString()
  };
};

export const mapGuestRide = (ride: GuestRide) => {
  const { firstName, lastName } = splitName(ride.driverName);
  const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(ride.driverName)}&background=0f766e&color=fff`;
  const contact = buildGuestContact(ride.driverPhone);

  return {
    id: `guest_${ride.id}`,
    type: 'guest' as const,
    isGuest: true,
    driver: {
      id: `guest_${ride.id}`,
      name: ride.driverName,
      firstName,
      lastName,
      avatarUrl: avatar,
      rating: null,
      reviewCount: 0,
      isVerified: false,
      phone: contact.phone,
      isGuest: true
    },
    driverContact: contact,
    origin: ride.originCity,
    originAddress: ride.originAddress,
    destination: ride.destinationCity,
    destinationAddress: ride.destinationAddress,
    departureTime: ride.departureTime.toISOString(),
    duration: formatDuration(ride.estimatedDuration),
    estimatedDuration: ride.estimatedDuration,
    price: ride.pricePerSeat,
    currency: ride.currency,
    seatsAvailable: ride.availableSeats,
    totalSeats: ride.totalSeats,
    carModel: ride.carModel || 'Véhicule',
    features: ride.features ?? [],
    description: ride.description,
    status: ride.status,
    createdAt: ride.createdAt.toISOString()
  };
};
