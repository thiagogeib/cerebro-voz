-- ============================================================
-- 002_rls_policies.sql
-- Row Level Security policies do cerebro-voz
-- Depende de: 001_initial_schema.sql
-- ============================================================


-- ------------------------------------------------------------
-- HELPER: verifica se o usuário autenticado é admin
-- (reutilizado nas policies abaixo)
-- ------------------------------------------------------------
-- Uso inline:
--   exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')


-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------

-- usuário lê o próprio perfil
create policy "profiles: user reads own"
  on public.profiles
  for select
  using (id = auth.uid());

-- admin lê todos os perfis
create policy "profiles: admin reads all"
  on public.profiles
  for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- usuário edita somente o próprio perfil
create policy "profiles: user updates own"
  on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());


-- ------------------------------------------------------------
-- favorites
-- ------------------------------------------------------------

create policy "favorites: user reads own"
  on public.favorites
  for select
  using (user_id = auth.uid());

create policy "favorites: user inserts own"
  on public.favorites
  for insert
  with check (user_id = auth.uid());

create policy "favorites: user updates own"
  on public.favorites
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "favorites: user deletes own"
  on public.favorites
  for delete
  using (user_id = auth.uid());


-- ------------------------------------------------------------
-- usage_events
-- ------------------------------------------------------------

-- usuário insere somente eventos próprios
create policy "usage_events: user inserts own"
  on public.usage_events
  for insert
  with check (user_id = auth.uid());

-- usuário lê os próprios eventos
create policy "usage_events: user reads own"
  on public.usage_events
  for select
  using (user_id = auth.uid());

-- admin lê todos os eventos
create policy "usage_events: admin reads all"
  on public.usage_events
  for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );


-- ------------------------------------------------------------
-- sessions
-- ------------------------------------------------------------

-- usuário insere somente as próprias sessões
create policy "sessions: user inserts own"
  on public.sessions
  for insert
  with check (user_id = auth.uid());

-- usuário atualiza somente as próprias sessões (ex: ended_at, phrase_count)
create policy "sessions: user updates own"
  on public.sessions
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- admin lê todas as sessões
create policy "sessions: admin reads all"
  on public.sessions
  for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- usuário lê as próprias sessões
create policy "sessions: user reads own"
  on public.sessions
  for select
  using (user_id = auth.uid());
