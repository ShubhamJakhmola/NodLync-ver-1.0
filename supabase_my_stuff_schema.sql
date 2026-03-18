-- Run this in the Supabase SQL editor to create the My Stuff schema

create table public.my_stuff_categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.my_stuff_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  category_id uuid references public.my_stuff_categories(id) on delete cascade not null,
  title text not null,
  url text,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.my_stuff_categories enable row level security;
alter table public.my_stuff_items enable row level security;

-- Policies for Categories
create policy "Users can view their own categories" 
on public.my_stuff_categories for select using (auth.uid() = user_id);

create policy "Users can insert their own categories" 
on public.my_stuff_categories for insert with check (auth.uid() = user_id);

create policy "Users can update their own categories" 
on public.my_stuff_categories for update using (auth.uid() = user_id);

create policy "Users can delete their own categories" 
on public.my_stuff_categories for delete using (auth.uid() = user_id);

-- Policies for Items
create policy "Users can view their own items" 
on public.my_stuff_items for select using (auth.uid() = user_id);

create policy "Users can insert their own items" 
on public.my_stuff_items for insert with check (auth.uid() = user_id);

create policy "Users can update their own items" 
on public.my_stuff_items for update using (auth.uid() = user_id);

create policy "Users can delete their own items" 
on public.my_stuff_items for delete using (auth.uid() = user_id);
