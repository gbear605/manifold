-- This file is autogenerated from regen-schema.ts
create table if not exists
  contract_comments (
    contract_id text not null,
    comment_id text not null,
    data jsonb not null,
    visibility text,
    user_id text not null,
    created_time timestamp with time zone not null,
    is_api boolean default false not null,
    likes integer default 0 not null
  );

-- Triggers
create trigger comment_populate before insert
or
update on public.contract_comments for each row
execute function comment_populate_cols ();

-- Functions
create
or replace function public.comment_populate_cols () returns trigger language plpgsql as $function$ begin 
    if new.data is not null then new.visibility := (new.data)->>'visibility';
    new.user_id := (new.data)->>'userId';
    new.created_time := case
  when new.data ? 'createdTime' then millis_to_ts(((new.data)->>'createdTime')::bigint)
  else null
  end;
    end if;
    return new;
end $function$;

-- Policies
alter table contract_comments enable row level security;

drop policy if exists "auth read" on contract_comments;

create policy "auth read" on contract_comments to service_role for
select
  using (true);

-- Indexes
drop index if exists contract_comments_pkey;

create unique index contract_comments_pkey on public.contract_comments using btree (contract_id, comment_id);

drop index if exists contract_comments_contract_id_created_time_idx;

create index contract_comments_contract_id_created_time_idx on public.contract_comments using btree (contract_id, created_time desc);

drop index if exists contract_comments_created_time_idx;

create index contract_comments_created_time_idx on public.contract_comments using btree (created_time desc);

drop index if exists contract_comments_id;

create index contract_comments_id on public.contract_comments using btree (comment_id);

drop index if exists contract_replies;

create index contract_replies on public.contract_comments using btree (
  ((data ->> 'replyToCommentId'::text)),
  contract_id,
  created_time desc
);

drop index if exists contracts_comments_user_id;

create index contracts_comments_user_id on public.contract_comments using btree (user_id, created_time);
