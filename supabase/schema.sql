-- Island Shopping Companion — Supabase schema (v1, single shared household).
-- Apply with: supabase db push, or paste into the SQL editor.
-- Keep in sync with src/lib/types.ts.
--
-- v1 is one shared household account (see DECISIONS.md D11): every device
-- signs in with the same credentials, RLS simply requires an authenticated
-- user. A later multi-user upgrade adds a households table + household_id
-- columns — additive, no rewrites.

create table islands (
  id text primary key,
  name text not null
);

create table cities (
  id text primary key,
  island_id text not null references islands(id) on delete cascade,
  name text not null
);

-- A store is a specific location: name + city. city_id null = online store.
create table stores (
  id text primary key,
  name text not null,
  city_id text references cities(id) on delete cascade,
  location_note text
);

create table members (
  id text primary key,
  name text not null
);

create type item_status as enum
  ('needed','in_cart','bought','out_of_stock','substituted','moved','parked');

create table items (
  id text primary key,
  name text not null,
  store_name text not null,             -- flexible assignment: chain name
  pinned_store_id text references stores(id) on delete set null,
  category text,
  quantity_note text,
  heat_safe boolean not null default false,
  member_id text references members(id) on delete set null,
  staple boolean not null default false,
  photo text,                            -- storage URL (or data URL locally)
  instruction_note text,
  photo_requested boolean not null default false,
  status item_status not null default 'needed',
  added_at timestamptz not null default now()
);

-- Learned aisle codes, per item name per store location (D4).
create table item_aisles (
  id text primary key,
  store_id text not null references stores(id) on delete cascade,
  item_name text not null,               -- lowercased
  code text not null,
  confirmed_at timestamptz not null default now(),
  unique (store_id, item_name)
);

create type trip_status as enum ('planned','active','done');

-- stops: [{store_id, position}], errands: [{id, text, done}] — jsonb v1 (D6).
create table trips (
  id text primary key,
  city_id text not null references cities(id) on delete cascade,
  date date not null default current_date,
  status trip_status not null default 'planned',
  stops jsonb not null default '[]',
  errands jsonb not null default '[]'
);

create type return_status as enum ('pending','done');

create table returns (
  id text primary key,
  item_name text not null,
  store_id text not null references stores(id) on delete cascade,
  reason text,
  status return_status not null default 'pending'
);

create type purchase_outcome as enum ('bought','disliked','loved');

-- reactions: [{member_id, reaction: liked|disliked|neutral, note}] (D6).
create table purchases (
  id text primary key,
  item_name text not null,
  store_id text not null references stores(id) on delete cascade,
  date timestamptz not null default now(),
  outcome purchase_outcome not null default 'bought',
  rating int check (rating between 1 and 5),
  reactions jsonb not null default '[]',
  aisle_code text,
  note text,
  photo text
);

create type question_status as enum ('open','answered');

create table questions (
  id text primary key,
  photo text,
  text text not null,
  store_id text references stores(id) on delete set null,
  item_id text references items(id) on delete set null,
  status question_status not null default 'open',
  answer text,
  created_at timestamptz not null default now()
);

create index items_status_idx on items(status);
create index purchases_item_name_idx on purchases(item_name);
create index item_aisles_lookup_idx on item_aisles(store_id, item_name);

-- RLS: one shared household — any authenticated user has full access.
alter table islands enable row level security;
alter table cities enable row level security;
alter table stores enable row level security;
alter table members enable row level security;
alter table items enable row level security;
alter table item_aisles enable row level security;
alter table trips enable row level security;
alter table returns enable row level security;
alter table purchases enable row level security;
alter table questions enable row level security;

do $$
declare t text;
begin
  foreach t in array array['islands','cities','stores','members','items',
    'item_aisles','trips','returns','purchases','questions']
  loop
    execute format(
      'create policy household_all on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Storage bucket for item/question photos:
insert into storage.buckets (id, name, public) values ('photos','photos', true)
on conflict do nothing;
create policy photos_rw on storage.objects for all to authenticated
  using (bucket_id = 'photos') with check (bucket_id = 'photos');
