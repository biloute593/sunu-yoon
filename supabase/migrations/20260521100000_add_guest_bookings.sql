-- ============================================================
-- guest_bookings : réservations sans compte
-- ============================================================
create table if not exists public.guest_bookings (
  id                  uuid primary key default gen_random_uuid(),
  ride_id             uuid references public.rides(id) on delete cascade not null,
  passenger_name      text not null,
  passenger_phone     text not null,
  seats               int default 1,
  total_price         int,
  payment_method      text default 'CASH',
  contact_preference  text,
  notes               text,
  status              text default 'pending',
  created_at          timestamptz default now()
);

create index if not exists guest_bookings_ride on public.guest_bookings(ride_id);

alter table public.guest_bookings enable row level security;

-- Tout le monde peut créer une réservation invité (pas d'auth requise)
create policy "guest_bookings_insert" on public.guest_bookings
  for insert with check (true);

-- Seul le conducteur du trajet peut voir ses réservations invitées
create policy "guest_bookings_select" on public.guest_bookings
  for select using (
    auth.uid() = (select driver_id from public.rides where id = ride_id)
  );

-- Seul le conducteur peut modifier le statut
create policy "guest_bookings_update" on public.guest_bookings
  for update using (
    auth.uid() = (select driver_id from public.rides where id = ride_id)
  );

-- Realtime pour que le conducteur reçoive les nouvelles réservations
alter publication supabase_realtime add table public.guest_bookings;
