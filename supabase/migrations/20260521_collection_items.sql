-- Collection items per authenticated user.
-- Keeps holdings private and portable across devices.

create table if not exists public.collection_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null,
  quantity integer not null default 1,
  condition text,
  purchase_price numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collection_items_quantity_positive check (quantity > 0),
  constraint collection_items_user_card_unique unique (user_id, card_id)
);

create index if not exists collection_items_user_id_idx on public.collection_items(user_id);
create index if not exists collection_items_card_id_idx on public.collection_items(card_id);

alter table public.collection_items enable row level security;

drop policy if exists "collection_items_select_own" on public.collection_items;
create policy "collection_items_select_own"
on public.collection_items
for select
using (auth.uid() = user_id);

drop policy if exists "collection_items_insert_own" on public.collection_items;
create policy "collection_items_insert_own"
on public.collection_items
for insert
with check (auth.uid() = user_id);

drop policy if exists "collection_items_update_own" on public.collection_items;
create policy "collection_items_update_own"
on public.collection_items
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "collection_items_delete_own" on public.collection_items;
create policy "collection_items_delete_own"
on public.collection_items
for delete
using (auth.uid() = user_id);

drop trigger if exists set_collection_items_updated_at on public.collection_items;
create trigger set_collection_items_updated_at
before update on public.collection_items
for each row
execute function public.set_updated_at();
