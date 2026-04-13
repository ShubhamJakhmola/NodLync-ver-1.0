-- Settings & Profile Module Setup

-- 1. App Settings
create table if not exists public.app_settings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  theme text default 'dark',
  default_project_view text default 'list',
  default_ai_provider text default 'openai',
  notifications_enabled boolean default true,
  auto_update_enabled boolean default true,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. User Profiles
create table if not exists public.user_profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. App Logs
create table if not exists public.app_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  action text not null,
  status text not null check (status in ('success', 'error', 'info')),
  details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.app_settings enable row level security;
alter table public.user_profiles enable row level security;
alter table public.app_logs enable row level security;

-- Policies: App Settings
drop policy if exists "Users can view own settings" on public.app_settings;
create policy "Users can view own settings" on public.app_settings for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own settings" on public.app_settings;
create policy "Users can insert own settings" on public.app_settings for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own settings" on public.app_settings;
create policy "Users can update own settings" on public.app_settings for update using (auth.uid() = user_id);

-- Policies: User Profiles
drop policy if exists "Users can view own profile" on public.user_profiles;
create policy "Users can view own profile" on public.user_profiles for select using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.user_profiles;
create policy "Users can insert own profile" on public.user_profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile" on public.user_profiles for update using (auth.uid() = id);

-- Policies: App Logs
drop policy if exists "Users can view own logs" on public.app_logs;
create policy "Users can view own logs" on public.app_logs for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own logs" on public.app_logs;
create policy "Users can insert own logs" on public.app_logs for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete own logs" on public.app_logs;
create policy "Users can delete own logs" on public.app_logs for delete using (auth.uid() = user_id);

-- 4. Storage Bucket for Profile Images
insert into storage.buckets (id, name, public) 
values ('Profile_image', 'Profile_image', true)
on conflict (id) do nothing;

create policy "Profile images are publicly accessible"
on storage.objects for select
using (bucket_id = 'Profile_image');

create policy "Users can upload their own profile image"
on storage.objects for insert
with check (
  bucket_id = 'Profile_image' AND 
  auth.uid() = (regexp_match(name, '^([^/]+)'))[1]::uuid
);

create policy "Users can update their own profile image"
on storage.objects for update
using (
  bucket_id = 'Profile_image' AND 
  auth.uid() = (regexp_match(name, '^([^/]+)'))[1]::uuid
);

create policy "Users can delete their own profile image"
on storage.objects for delete
using (
  bucket_id = 'Profile_image' AND 
  auth.uid() = (regexp_match(name, '^([^/]+)'))[1]::uuid
);

-- force schema cache refresh 
NOTIFY pgrst, reload_schema;
