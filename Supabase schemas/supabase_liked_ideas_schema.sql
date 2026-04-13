-- Liked Ideas table for AI Playground
create table if not exists public.liked_ideas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.liked_ideas enable row level security;

drop policy if exists "Users can manage their liked ideas" on public.liked_ideas;
create policy "Users can manage their liked ideas" on public.liked_ideas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

NOTIFY pgrst, reload_schema;
