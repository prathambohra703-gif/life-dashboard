-- Life Dashboard: cloud database. Paste this whole file into Supabase > SQL Editor > Run. Safe to run twice.

create sequence if not exists public.records_seq;

create table if not exists public.records (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  col text not null,
  id text not null,
  flat jsonb not null default '{}'::jsonb,   -- field path -> value ("$del": true marks a soft delete)
  ft jsonb not null default '{}'::jsonb,     -- field path -> time it was last changed (ms)
  seq bigint not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, col, id)
);
create index if not exists records_user_seq on public.records (user_id, seq);

create table if not exists public.push_subs (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  label text,
  created_at timestamptz not null default now()
);
create table if not exists public.push_log (
  user_id uuid not null,
  key text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.records enable row level security;
alter table public.push_subs enable row level security;
alter table public.push_log enable row level security;

drop policy if exists "own records" on public.records;
create policy "own records" on public.records for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own subs" on public.push_subs;
create policy "own subs" on public.push_subs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- push_log has no policy on purpose: only the reminder function (service role) touches it.

-- Push changes. Each field keeps the newest value across devices; nothing is replaced wholesale.
create or replace function public.push_records(recs jsonb)
returns table (col text, id text, flat jsonb, ft jsonb, seq bigint)
language plpgsql security invoker set search_path = public as $$
#variable_conflict use_column
declare
  r jsonb; cur public.records%rowtype; nf jsonb; nt jsonb; k text; uid uuid := auth.uid();
  rf jsonb; rt jsonb;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  for r in select value from jsonb_array_elements(recs) loop
    rf := coalesce(r->'flat', '{}'::jsonb); rt := coalesce(r->'ft', '{}'::jsonb);
    select * into cur from public.records t
      where t.user_id = uid and t.col = r->>'col' and t.id = r->>'id' for update;
    if not found then
      insert into public.records (user_id, col, id, flat, ft, seq)
        values (uid, r->>'col', r->>'id', rf, rt, nextval('public.records_seq'));
    else
      nf := cur.flat; nt := cur.ft;
      for k in select jsonb_object_keys(rt) loop
        if coalesce((rt->>k)::numeric, 0) > coalesce((nt->>k)::numeric, -1) then
          nt := jsonb_set(nt, array[k], rt->k, true);
          if rf ? k then nf := jsonb_set(nf, array[k], rf->k, true); else nf := nf - k; end if;
        end if;
      end loop;
      for k in select jsonb_object_keys(rf) loop
        if not (nt ? k) and not (nf ? k) then nf := jsonb_set(nf, array[k], rf->k, true); end if;
      end loop;
      if nf is distinct from cur.flat or nt is distinct from cur.ft then
        update public.records t set flat = nf, ft = nt, seq = nextval('public.records_seq'), updated_at = now()
          where t.user_id = uid and t.col = cur.col and t.id = cur.id;
      end if;
    end if;
    return query select t.col, t.id, t.flat, t.ft, t.seq from public.records t
      where t.user_id = uid and t.col = r->>'col' and t.id = r->>'id';
  end loop;
end $$;

create or replace function public.pull_records(since bigint default 0, lim int default 500)
returns table (col text, id text, flat jsonb, ft jsonb, seq bigint)
language sql security invoker set search_path = public as $$
  select t.col, t.id, t.flat, t.ft, t.seq from public.records t
  where t.user_id = auth.uid() and t.seq > since order by t.seq limit lim;
$$;

create or replace function public.save_push_sub(endpoint text, p256dh text, auth text, label text default null)
returns void language sql security invoker set search_path = public as $$
  insert into public.push_subs (endpoint, p256dh, auth, label) values (endpoint, p256dh, auth, label)
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, label = excluded.label, user_id = auth.uid();
$$;

create or replace function public.drop_push_sub(endpoint text)
returns void language sql security invoker set search_path = public as $$
  delete from public.push_subs s where s.endpoint = drop_push_sub.endpoint and s.user_id = auth.uid();
$$;

grant execute on function public.push_records(jsonb), public.pull_records(bigint,int),
  public.save_push_sub(text,text,text,text), public.drop_push_sub(text) to authenticated;

-- Used only by the Google Drive backup script (service key). Not callable from the app.
create or replace function public.service_put(p_email text, p_col text, p_id text, p_data jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid; now_ms numeric := floor(extract(epoch from clock_timestamp()) * 1000); nt jsonb := '{}'::jsonb; k text;
begin
  select u.id into uid from auth.users u where lower(u.email) = lower(p_email);
  if uid is null then raise exception 'No user with that email'; end if;
  for k in select jsonb_object_keys(p_data) loop nt := jsonb_set(nt, array[k], to_jsonb(now_ms), true); end loop;
  insert into public.records as r (user_id, col, id, flat, ft, seq)
    values (uid, p_col, p_id, p_data, nt, nextval('public.records_seq'))
  on conflict (user_id, col, id) do update
    set flat = r.flat || excluded.flat, ft = r.ft || excluded.ft, seq = nextval('public.records_seq'), updated_at = now();
end $$;

create or replace function public.service_export(p_email text)
returns table (col text, id text, flat jsonb, ft jsonb)
language sql security definer set search_path = public as $$
  select t.col, t.id, t.flat, t.ft from public.records t
  join auth.users u on u.id = t.user_id where lower(u.email) = lower(p_email) order by t.col, t.id;
$$;

revoke all on function public.service_put(text,text,text,jsonb), public.service_export(text) from public, anon, authenticated;
grant execute on function public.service_put(text,text,text,jsonb), public.service_export(text) to service_role;

-- Calendar feed: the remind function looks up whose feed a secret link belongs to. Not callable from the app.
create index if not exists records_cal_token on public.records ((flat->>'token')) where col = 'meta' and id = 'calendar';
create or replace function public.service_calendar(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select t.flat from public.records t
  where t.col = 'meta' and t.id = 'calendar' and length(coalesce(p_token, '')) >= 20
    and t.flat->>'token' = p_token and not (t.flat ? '$del')
  limit 1;
$$;
revoke all on function public.service_calendar(text) from public, anon, authenticated;
grant execute on function public.service_calendar(text) to service_role;
