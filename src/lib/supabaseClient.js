import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
} else {
  console.log('Supabase URL:', supabaseUrl);
  console.log('Supabase Key length:', supabaseAnonKey.length);
  if (!supabaseAnonKey.startsWith('eyJ')) {
    console.warn('Warning: Supabase Anon Key does not appear to be a valid JWT (should start with "eyJ"). Check your .env file.');
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
