import { createClient } from '@supabase/supabase-js';

// These two values are public by design — they identify the project.
// Actual data protection happens server-side via Row Level Security.
const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

if (!url || !key) {
  // Fail loudly during development if the .env file is missing.
  // eslint-disable-next-line no-console
  console.error(
    'Missing Supabase configuration. Copy .env.example to .env and fill in the values.',
  );
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
