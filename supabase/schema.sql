-- Run once in your Supabase project. No service-role key is used in the browser.
create table if not exists public.learning_state (
 user_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null,
 updated_at timestamptz not null default now()
);
alter table public.learning_state enable row level security;
create policy "Own learning state" on public.learning_state for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
