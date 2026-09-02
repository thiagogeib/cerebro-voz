-- ============================================================
-- 004_sessions_leitura.sql
-- Corrige a sessão de uso que nunca se ligava aos eventos
-- Depende de: 001, 002, 003
-- ============================================================
--
-- O PROBLEMA
--
-- A tabela `sessions` tinha policy de INSERT e de UPDATE para o usuário, e de
-- SELECT só para o admin. Faltava o usuário poder ler as PRÓPRIAS sessões.
--
-- O app cria a sessão assim:
--
--     supabase.from('sessions').insert({...}).select('id').single()
--
-- O INSERT funcionava e a linha era criada — mas o `.select('id')` voltava
-- vazio, porque ler exigia uma permissão que não existia. O app ficava sem o
-- id da sessão, e a partir daí:
--
--   · todo evento era gravado com `session_id` nulo (412 de 425 em produção);
--   · `endSession` desistia logo no começo (`if (!sessionId) return`), então
--     `phrase_count` e `ended_at` quase nunca eram preenchidos;
--   · o painel mostrava sessões de duração desconhecida e zero frases, em
--     dias com mais de cem frases faladas.
--
-- A migration 002 previa esta policy; o banco de produção nunca a teve. Mais
-- uma divergência entre o arquivo e o banco real (ver a nota no fim da 002).

create policy "sessions: user reads own"
  on public.sessions
  for select
  using (user_id = auth.uid());


-- ------------------------------------------------------------
-- profiles.last_seen_at
--
-- A coluna existe desde a 001 e nunca foi escrita por ninguém: a coluna
-- "Último acesso" do painel estava vazia para 100% das contas.
--
-- Agora o app a atualiza ao abrir uma sessão. Para o histórico que já existe,
-- o backfill abaixo usa o último evento de cada pessoa — o dado sempre esteve
-- lá, só não estava nesta coluna.
-- ------------------------------------------------------------

update public.profiles p
set last_seen_at = u.ultimo
from (
  select user_id, max(created_at) as ultimo
  from public.usage_events
  group by user_id
) u
where u.user_id = p.id
  and p.last_seen_at is null;
