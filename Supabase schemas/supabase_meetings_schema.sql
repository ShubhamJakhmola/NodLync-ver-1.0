-- Run this in the Supabase SQL editor to create the Meetings schema

create table public.meeting_links (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  platform text not null,
  meeting_url text not null,
  scheduled_at timestamp with time zone not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.meeting_links enable row level security;

-- Policies for Meeting Links
create policy "Users can view their own meetings" 
on public.meeting_links for select using (auth.uid() = user_id);

create policy "Users can insert their own meetings" 
on public.meeting_links for insert with check (auth.uid() = user_id);

create policy "Users can update their own meetings" 
on public.meeting_links for update using (auth.uid() = user_id);

create policy "Users can delete their own meetings" 
on public.meeting_links for delete using (auth.uid() = user_id);
