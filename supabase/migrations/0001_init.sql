create extension if not exists "uuid-ossp";

create table if not exists items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  name text not null,
  category text not null check (category in ('top','bottom','shoe','outerwear','accessory')),
  color text not null,
  formality smallint not null check (formality between 1 and 4),
  warmth smallint not null check (warmth between 1 and 5),
  pattern text not null default 'solid' check (pattern in ('solid','pattern')),
  photo_url text,
  last_worn_date timestamptz,
  created_at timestamptz default now()
);

create table if not exists outfit_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  item_ids uuid[] not null,
  occasion text not null,
  worn_at timestamptz default now()
);

alter table items enable row level security;
alter table outfit_history enable row level security;

create policy "Users manage their own items" on items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own outfit history" on outfit_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
