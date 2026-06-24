-- ============================================================
-- SUNU YOON — Schema Supabase
-- Colle ce fichier dans : Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- 1. TABLE PROFILES (extension de auth.users)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  phone       text unique not null,
  avatar_url  text,
  rating      numeric(3,1) default 5.0,
  review_count int default 0,
  is_verified  boolean default true,
  created_at  timestamptz default now()
);

-- 2. TABLE RIDES
create table if not exists public.rides (
  id                 uuid primary key default gen_random_uuid(),
  driver_id          uuid references public.profiles(id) on delete cascade not null,
  origin             text not null,
  origin_address     text,
  destination        text not null,
  destination_address text,
  departure_time     timestamptz not null,
  estimated_duration int default 120,
  price              int not null,
  currency           text default 'XOF',
  seats_available    int not null,
  total_seats        int not null,
  car_model          text,
  features           text[] default '{}',
  description        text,
  status             text default 'OPEN',
  created_at         timestamptz default now()
);

create index if not exists rides_origin_dest on public.rides(origin, destination);
create index if not exists rides_status on public.rides(status);
create index if not exists rides_departure on public.rides(departure_time);

-- 3. TABLE BOOKINGS
create table if not exists public.bookings (
  id             uuid primary key default gen_random_uuid(),
  ride_id        uuid references public.rides(id) on delete cascade not null,
  passenger_id   uuid references public.profiles(id) on delete cascade not null,
  seats          int default 1,
  total_price    int not null,
  status         text default 'PENDING',
  payment_method text,
  created_at     timestamptz default now(),
  unique(ride_id, passenger_id)
);

create index if not exists bookings_passenger on public.bookings(passenger_id);
create index if not exists bookings_ride on public.bookings(ride_id);

-- 4. TABLE CONVERSATIONS
create table if not exists public.conversations (
  id            uuid primary key default gen_random_uuid(),
  ride_id       uuid references public.rides(id) on delete set null,
  participant_1 uuid references public.profiles(id) on delete cascade not null,
  participant_2 uuid references public.profiles(id) on delete cascade not null,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists conv_p1 on public.conversations(participant_1);
create index if not exists conv_p2 on public.conversations(participant_2);

-- 5. TABLE MESSAGES
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id       uuid references public.profiles(id) on delete cascade not null,
  content         text not null,
  is_read         boolean default false,
  created_at      timestamptz default now()
);

create index if not exists messages_conv on public.messages(conversation_id);

-- ============================================================
-- ROW LEVEL SECURITY (sécurité par utilisateur)
-- ============================================================

alter table public.profiles     enable row level security;
alter table public.rides        enable row level security;
alter table public.bookings     enable row level security;
alter table public.conversations enable row level security;
alter table public.messages     enable row level security;

-- Profiles : lecture publique, écriture propre profil seulement
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Rides : lecture publique des trajets OPEN, création par conducteur authentifié
create policy "rides_select" on public.rides for select
  using (status = 'OPEN' or driver_id = auth.uid());
create policy "rides_insert" on public.rides for insert
  with check (auth.uid() = driver_id);
create policy "rides_update" on public.rides for update
  using (auth.uid() = driver_id);

-- Bookings : passager voit ses réservations, conducteur voit les siens
create policy "bookings_select" on public.bookings for select
  using (
    auth.uid() = passenger_id
    or auth.uid() = (select driver_id from public.rides where id = ride_id)
  );
create policy "bookings_insert" on public.bookings for insert
  with check (auth.uid() = passenger_id);
create policy "bookings_update" on public.bookings for update
  using (auth.uid() = passenger_id);

-- Conversations : participants uniquement
create policy "conv_select" on public.conversations for select
  using (auth.uid() = participant_1 or auth.uid() = participant_2);
create policy "conv_insert" on public.conversations for insert
  with check (auth.uid() = participant_1 or auth.uid() = participant_2);
create policy "conv_update" on public.conversations for update
  using (auth.uid() = participant_1 or auth.uid() = participant_2);

-- Messages : participants de la conversation uniquement
create policy "messages_select" on public.messages for select
  using (
    auth.uid() in (
      select participant_1 from public.conversations where id = conversation_id
      union
      select participant_2 from public.conversations where id = conversation_id
    )
  );
create policy "messages_insert" on public.messages for insert
  with check (auth.uid() = sender_id);

-- ============================================================
-- REALTIME (pour le chat en temps réel)
-- ============================================================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;

-- ============================================================
-- FONCTION : créer le profil après inscription
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Le nom et le téléphone sont passés dans raw_user_meta_data lors de signUp
  insert into public.profiles (id, name, phone, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Utilisateur'),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
