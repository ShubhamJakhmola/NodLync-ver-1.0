-- AI Vault V2 Schema (Production-Grade SaaS Vault)
-- Implements server-side encrypted API key storage.

-- Create the new table as requested
create table if not exists public.api_keys (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  provider text not null,
  encrypted_key text not null,
  iv text not null, -- Initialization vector for AES-GCM
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.api_keys enable row level security;

-- Policies
create policy "Users can manage their own vault keys"
  on public.api_keys
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Note: In a real production environment, you would use a function to encrypt 
-- the key before it touches the disk, or use Supabase's built-in Vault (if available).
-- For this refactor, our Edge Function will handle the encryption/decryption 
-- using a secret environment variable (VAULT_MASTER_SECRET).
