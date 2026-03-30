export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationState {
  coords: Coordinates | null;
  address: string;
  loading: boolean;
  error: string | null;
}

export interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  rating?: number;
  reviewCount?: number;
  isVerified?: boolean;
  isDriver?: boolean;
  carModel?: string;
  createdAt?: string;
}

export interface DraftRide {
  origin: string;
  destination: string;
  date: string;
  time: string;
  price: number;
  seats: number;
  carModel: string;
  description: string;
  features: string[];
  driverName?: string;
  driverPhone?: string;
}

/** Frontend-friendly driver displayed in ride cards */
export interface RideDriver {
  id: string;
  name: string;
  avatarUrl: string;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
}

/** Frontend-adapted ride (used in cards, details, search results) */
export interface FrontendRide {
  id: string;
  driver: RideDriver;
  origin: string;
  destination: string;
  departureTime: string;
  price: number;
  currency: string;
  seatsAvailable: number;
  totalSeats: number;
  carModel: string;
  description?: string;
  features: string[];
  duration: string;
}

export interface Ride {
  id: string;
  driver: RideDriver;
  origin: string;
  destination: string;
  departureTime: string;
  price: number;
  currency: string;
  seatsAvailable: number;
  totalSeats: number;
  carModel: string;
  description?: string;
  features: string[];
  duration: string;
  status: string;
  createdAt: string;
}

export interface SearchParams {
  origin: string;
  destination: string;
  date: string;
  passengers: number;
  userLocation?: Coordinates;
}

export type RideStatus = 'active' | 'completed' | 'cancelled';
