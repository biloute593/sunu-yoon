import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/** true si Supabase est configuré, false → fallback localStorage */
export const supabaseEnabled = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = supabaseEnabled
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        storage: {
          getItem: (key) => localStorage.getItem(key),
          setItem: (key, value) => localStorage.setItem(key, value),
          removeItem: (key) => localStorage.removeItem(key),
        },
      },
    })
  : null;

// ─── TYPES SUPABASE (miroir du schema DB) ─────────────────────────────────────

export interface DbProfile {
  id: string;
  name: string;
  phone: string;
  avatar_url: string | null;
  rating: number;
  review_count: number;
  is_verified: boolean;
  created_at: string;
}

export interface DbRide {
  id: string;
  driver_id: string;
  origin: string;
  origin_address: string | null;
  destination: string;
  destination_address: string | null;
  departure_time: string;
  estimated_duration: number;
  price: number;
  currency: string;
  seats_available: number;
  total_seats: number;
  car_model: string | null;
  features: string[];
  description: string | null;
  status: string;
  created_at: string;
  driver?: DbProfile;
}

export interface DbBooking {
  id: string;
  ride_id: string;
  passenger_id: string;
  seats: number;
  total_price: number;
  status: string;
  payment_method: string | null;
  created_at: string;
  passenger?: DbProfile;
}

export interface DbConversation {
  id: string;
  ride_id: string | null;
  participant_1: string;
  participant_2: string;
  created_at: string;
  updated_at: string;
}

export interface DbMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: DbProfile;
}
