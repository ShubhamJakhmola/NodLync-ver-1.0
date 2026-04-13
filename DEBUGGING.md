# Debugging Guide for NodLync Logging System

## Issue: Columns are misaligned, logs not saving/creating/listing in Supabase

### ✅ Fixed Issues:
1. **Column Names**: Updated all API calls to use correct column names from your existing schema:
   - `"Id"` (with quotes) instead of `id`
   - `"Timestamp"` (with quotes) instead of `timestamp`
   - `"User"`, `"Action"`, `"Status"`, `"Details"` (with quotes)
   - `user_id`, `action`, `status`, `details` (lowercase versions)

2. **Error Logging**: Added comprehensive error logging to all API functions

### 🔍 How to Debug:

#### 1. Check Browser Console
Open your browser's developer tools and look for:
- `createAppLog error: ...`
- `queryLogs error: ...`
- `listAppLogs error: ...`

#### 2. Test Logging Manually
Add this temporary code to any component to test:

```javascript
import { logAppEvent } from '../utils/appLogger';

// Add this to a button click or useEffect
const testLog = async () => {
  try {
    await logAppEvent({
      type: 'info',
      module: 'debug-test',
      message: 'Manual test log: ' + new Date().toISOString()
    });
    console.log('✅ Log created successfully');
  } catch (error) {
    console.error('❌ Log creation failed:', error);
  }
};

testLog();
```

#### 3. Check Supabase Table
Verify your `app_logs` table structure matches:

```sql
create table public.app_logs (
  "Id" uuid not null default gen_random_uuid (),
  "Timestamp" timestamp with time zone not null default now(),
  "User" text not null default ''::text,
  "Action" text not null default ''::text,
  "Status" text not null default ''::text,
  "Details" text not null default ''::text,
  user_id uuid null default auth.uid (),
  action text null,
  status text null,
  details text null,
  created_at timestamp with time zone not null default now(),
  constraint AppLogs_pkey primary key ("Id")
);
```

#### 4. Check Supabase RLS Policies
Make sure Row Level Security allows inserts/selects:

```sql
-- Check if RLS is enabled
SELECT * FROM pg_policies WHERE tablename = 'app_logs';

-- Temporarily disable RLS for testing
ALTER TABLE app_logs DISABLE ROW LEVEL SECURITY;
```

#### 5. Verify Supabase Connection
Check your Supabase client configuration:

```javascript
// In src/api/supabaseClient.ts
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Supabase Key exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
```

### 🚨 Common Issues:

1. **Column Name Mismatch**: Supabase is case-sensitive. `"Timestamp"` ≠ `timestamp`
2. **RLS Policies**: Row Level Security might be blocking operations
3. **Missing Columns**: Table might not have the expected columns
4. **Environment Variables**: Supabase URL/key might be missing
5. **Network Issues**: CORS or connectivity problems

### 📋 Step-by-Step Debugging:

1. **Open Settings → System Logs → Module tab**
2. **Open Browser DevTools Console**
3. **Try to create a log** (any action in the app should create logs)
4. **Check console for errors**
5. **Check Supabase table directly** in the dashboard
6. **If still failing**, temporarily disable RLS and test again

### 🔧 Quick Fix Script:
If logs still don't appear, run this in your Supabase SQL editor:

```sql
-- Disable RLS temporarily for testing
ALTER TABLE app_logs DISABLE ROW LEVEL SECURITY;

-- Add a test log directly
INSERT INTO app_logs ("User", "Action", "Status", "Details", user_id)
VALUES ('test-user', 'test:action', 'info', 'Direct SQL test log', 'test-user-id');

-- Check if it appears
SELECT * FROM app_logs ORDER BY "Timestamp" DESC LIMIT 5;

-- Re-enable RLS after testing
ALTER TABLE app_logs ENABLE ROW LEVEL SECURITY;
```

### 📞 If Still Not Working:
1. Check the exact error message in browser console
2. Verify Supabase connection with a simple select query
3. Check network tab for failed HTTP requests
4. Ensure user is authenticated (user_id is required)

The logging system should now work with your existing table structure!
