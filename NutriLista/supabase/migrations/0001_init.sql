-- NutriLista — esquema inicial
-- Todas las tablas de usuario llevan Row Level Security: cada usuario
-- solo puede leer y escribir sus propias filas.

-- =========================================================
-- Perfiles (1:1 con auth.users)
-- =========================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  shopping_day int check (shopping_day between 1 and 7), -- 1 = lunes
  favorite_store text,
  household_size int not null default 1 check (household_size between 1 and 12),
  allergies text[] not null default '{}',
  onboarding_done boolean not null default false,
  is_pro boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Crear el perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- Menús escaneados y sus comidas
-- =========================================================
create table public.menus (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Menú',
  created_at timestamptz not null default now()
);

alter table public.menus enable row level security;
create policy "menus_all_own" on public.menus
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.menus (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  day_of_week int not null check (day_of_week between 1 and 7), -- 1 = lunes
  slot text not null check (slot in ('desayuno','colacion_1','comida','colacion_2','cena')),
  name text not null,
  -- [{"name":"pechuga de pollo","quantity":120,"unit":"g","category":"proteinas"}]
  ingredients jsonb not null default '[]',
  kcal int,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  created_at timestamptz not null default now()
);

alter table public.meals enable row level security;
create policy "meals_all_own" on public.meals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index meals_menu_idx on public.meals (menu_id);
create index meals_user_idx on public.meals (user_id);

-- =========================================================
-- Despensa ("ya lo tengo en casa")
-- =========================================================
create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.pantry_items enable row level security;
create policy "pantry_all_own" on public.pantry_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================
-- Lista de compras (generada por la app a partir del menú)
-- =========================================================
create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  menu_id uuid not null references public.menus (id) on delete cascade,
  name text not null,
  quantity_text text not null default '',
  category text not null default 'otros',
  price_estimate numeric, -- MXN, null si no hay precio de referencia
  checked boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.shopping_items enable row level security;
create policy "shopping_all_own" on public.shopping_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index shopping_menu_idx on public.shopping_items (menu_id);

-- =========================================================
-- Adherencia: comidas cumplidas
-- =========================================================
create table public.adherence_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  meal_id uuid not null references public.meals (id) on delete cascade,
  log_date date not null default current_date,
  unique (user_id, meal_id, log_date)
);

alter table public.adherence_logs enable row level security;
create policy "adherence_all_own" on public.adherence_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================
-- Escaneos (cuota freemium) — solo escribe la Edge Function
-- =========================================================
create table public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.scans enable row level security;
create policy "scans_select_own" on public.scans
  for select using (auth.uid() = user_id);
-- Sin política de insert: solo el service role (Edge Function) inserta.

-- =========================================================
-- Suscripciones — solo escribe la Edge Function
-- =========================================================
create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  original_transaction_id text not null,
  product_id text not null,
  expires_at timestamptz not null,
  environment text not null default 'Production',
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

-- =========================================================
-- Precios de referencia (lectura pública para usuarios autenticados)
-- =========================================================
create table public.reference_prices (
  id uuid primary key default gen_random_uuid(),
  store text not null,            -- 'Walmart' | 'Soriana' | 'Chedraui'
  item text not null,             -- nombre legible
  normalized text not null,       -- minúsculas, sin acentos, para emparejar
  unit text not null default 'pieza',
  price numeric not null          -- MXN por unidad
);

alter table public.reference_prices enable row level security;
create policy "prices_read_authenticated" on public.reference_prices
  for select to authenticated using (true);

create index prices_normalized_idx on public.reference_prices (normalized, store);
