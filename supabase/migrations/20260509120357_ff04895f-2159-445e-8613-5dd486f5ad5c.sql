
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles self read" on public.profiles for select using (auth.uid() = id);
create policy "profiles self insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles self update" on public.profiles for update using (auth.uid() = id);

-- Auto profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Uploads
create table public.uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  storage_path text,
  client_name text,
  client_code text,
  period_from date,
  period_to date,
  realized_pnl numeric default 0,
  net_pnl numeric default 0,
  charges numeric default 0,
  turnover_equity_delivery numeric default 0,
  turnover_equity_intraday numeric default 0,
  turnover_futures numeric default 0,
  turnover_options numeric default 0,
  charges_brokerage numeric default 0,
  charges_gst numeric default 0,
  charges_misc numeric default 0,
  charges_stt_ctt numeric default 0,
  raw_summary jsonb,
  created_at timestamptz not null default now()
);
create index uploads_user_idx on public.uploads(user_id, created_at desc);
alter table public.uploads enable row level security;
create policy "uploads self all" on public.uploads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Trades
create table public.trades (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references public.uploads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  script_name text not null,
  security_type text,
  underlying text,
  expiry date,
  option_type text,
  strike numeric,
  isin text,
  qty numeric default 0,
  buy_amt numeric default 0,
  sell_amt numeric default 0,
  total_pnl numeric default 0,
  gst numeric default 0,
  brokerage numeric default 0,
  misc numeric default 0,
  stt_ctt numeric default 0,
  total_charges numeric default 0,
  gross_realized_pnl numeric default 0,
  net_pnl numeric default 0,
  gross_pnl_excl_charges numeric default 0,
  intraday_pnl numeric default 0,
  short_term_pnl numeric default 0,
  long_term_pnl numeric default 0
);
create index trades_upload_idx on public.trades(upload_id);
create index trades_user_idx on public.trades(user_id);
create index trades_underlying_idx on public.trades(underlying);
alter table public.trades enable row level security;
create policy "trades self all" on public.trades for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage bucket for raw report files
insert into storage.buckets (id, name, public) values ('reports', 'reports', false)
on conflict (id) do nothing;

create policy "reports read own" on storage.objects for select
  using (bucket_id = 'reports' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "reports insert own" on storage.objects for insert
  with check (bucket_id = 'reports' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "reports update own" on storage.objects for update
  using (bucket_id = 'reports' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "reports delete own" on storage.objects for delete
  using (bucket_id = 'reports' and auth.uid()::text = (storage.foldername(name))[1]);
