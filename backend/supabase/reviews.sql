-- This file is autogenerated from regen-schema.ts
create table if not exists
  reviews (
    reviewer_id text not null,
    vendor_id text not null,
    market_id text not null,
    rating numeric not null,
    content jsonb,
    created_time timestamp with time zone default now() not null
  );

-- Indexes
drop index if exists reviews_pkey;

create unique index reviews_pkey on public.reviews using btree (reviewer_id, market_id);