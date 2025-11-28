export enum RideStatus {
  OPEN = 'OPEN',
  FULL = 'FULL',
  COMPLETED = 'COMPLETED'
}

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
  name: string;
  avatarUrl: string;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
}

export interface Ride {
  id: string;
  driver: User;
  origin: string;
  destination: string;
  departureTime: string;
  price: number;
  currency: string;
  seatsAvailable: number;
  totalSeats: number;
  carModel: string;
  description?: string;
  features: string[]; // e.g., "Climatisation", "Non-fumeur", "Bagages acceptés"
  duration: string; // e.g., "4h 30m"
}

export interface SearchParams {
  origin: string;
  destination: string;
  date: string;
  passengers: number;
  userLocation?: Coordinates;
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
}