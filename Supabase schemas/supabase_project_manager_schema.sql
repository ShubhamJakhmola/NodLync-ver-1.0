-- Supabase Project Manager Schema

-- 1. Milestones
create table if not exists public.milestones (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  deadline date,
  status text not null check (status in ('not_started', 'in_progress', 'completed')) default 'not_started',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Task Items
create table if not exists public.task_items (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  milestone_id uuid references public.milestones(id) on delete cascade not null,
  title text not null,
  deadline date,
  status text not null check (status in ('not_done', 'in_progress', 'done')) default 'not_done',
  is_completed boolean not null default false,
  priority text not null check (priority in ('low', 'medium', 'high')) default 'medium',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Project Logs
create table if not exists public.project_logs (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  completed_work text,
  next_steps text,
  blockers text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Project Members
create table if not exists public.project_members (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('Owner', 'Contributor', 'Viewer')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (project_id, user_id)
);

-- 5. Project Reports
create table if not exists public.project_reports (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('today', 'full')),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Note: user_profiles already exists as per supabase_settings_schema.sql

-- Enable RLS
alter table public.milestones enable row level security;
alter table public.task_items enable row level security;
alter table public.project_logs enable row level security;
alter table public.project_members enable row level security;
alter table public.project_reports enable row level security;

-- Existing deployments might already have the tables; ensure the new columns exist.
alter table public.milestones add column if not exists deadline date;
alter table public.task_items add column if not exists deadline date;

-- Policies (Simplified for demonstration: owner or team access)

drop policy if exists "Users can access milestones" on public.milestones;
create policy "Users can access milestones" on public.milestones for all using (true) with check (true);

drop policy if exists "Users can access task_items" on public.task_items;
create policy "Users can access task_items" on public.task_items for all using (true) with check (true);

drop policy if exists "Users can access project_logs" on public.project_logs;
create policy "Users can access project_logs" on public.project_logs for all using (true) with check (true);

drop policy if exists "Users can access project_members" on public.project_members;
create policy "Users can access project_members" on public.project_members for all using (true) with check (true);

drop policy if exists "Users can access project_reports" on public.project_reports;
create policy "Users can access project_reports" on public.project_reports for all using (true) with check (true);

NOTIFY pgrst, reload_schema;
