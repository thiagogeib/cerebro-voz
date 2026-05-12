-- ============================================================
-- 001_initial_schema.sql
-- Schema inicial do cerebro-voz
-- Executa no Supabase SQL Editor ou via supabase db push
-- ============================================================


-- ------------------------------------------------------------
-- TABELAS
-- ------------------------------------------------------------

-- profiles: extensão do auth.users, criada por trigger no primeiro login
create table public.profiles (
  id            uuid        primary key references auth.users(id) on delete cascade,
  email         text        not null,
  full_name     text,
  role          text        not null default 'user',    -- 'user' | 'admin'
  nivel         text        not null default 'basico',  -- 'basico' | 'intermediario' | 'avancado'
  context_text  text,
  selected_voice text,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz
);

-- favorites: frases favoritas por usuário (migrado do localStorage)
create table public.favorites (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  emoji       text        not null,
  label       text        not null,
  phrase_text text        not null,
  sort_order  int         default 0,
  created_at  timestamptz not null default now(),

  unique(user_id, phrase_text)
);

-- usage_events: cada frase falada pelo paciente
create table public.usage_events (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  phrase_text     text        not null,
  phrase_label    text,
  emoji           text,
  nivel           text,
  source          text,        -- 'button' | 'favorita' | 'historico' | 'fragmento'
  was_ai_enhanced boolean     default false,
  session_id      uuid,
  device_info     jsonb,
  created_at      timestamptz not null default now()
);

-- sessions: rastreia acessos ao app
create table public.sessions (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  started_at   timestamptz not null default now(),
  ended_at     timestamptz,
  device_info  jsonb,
  phrase_count int         default 0
);


-- ------------------------------------------------------------
-- ÍNDICES
-- ------------------------------------------------------------

create index idx_usage_events_user_created  on public.usage_events(user_id, created_at desc);
create index idx_usage_events_phrase_label  on public.usage_events(phrase_label);
create index idx_sessions_user_started      on public.sessions(user_id, started_at desc);

-- índices nas FKs restantes
create index idx_favorites_user_id          on public.favorites(user_id);


-- ------------------------------------------------------------
-- ROW LEVEL SECURITY (habilitação — policies em 002)
-- ------------------------------------------------------------

alter table public.profiles     enable row level security;
alter table public.favorites    enable row level security;
alter table public.usage_events enable row level security;
alter table public.sessions     enable row level security;


-- ------------------------------------------------------------
-- TRIGGER: cria profile automaticamente ao registrar usuário
-- ------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
