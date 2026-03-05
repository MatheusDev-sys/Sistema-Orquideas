import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Hardcoded fallbacks for the user's project to ensure it works in the preview
const USER_SUPABASE_URL = 'https://rwkgrwvgozbwzerenwyw.supabase.co';
const USER_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3a2dyd3Znb3pid3plcmVud3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NzYwODgsImV4cCI6MjA4ODI1MjA4OH0.yzxqbRQVN3ztgMuU4q0Ma1i9trpxRQWeRGAhfdgxzJY';

const effectiveUrl = (supabaseUrl && supabaseUrl !== 'undefined' && supabaseUrl.startsWith('http')) 
  ? supabaseUrl 
  : USER_SUPABASE_URL;

const effectiveKey = (supabaseAnonKey && supabaseAnonKey !== 'undefined' && supabaseAnonKey.length > 20) 
  ? supabaseAnonKey 
  : USER_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'undefined') {
  console.warn('Supabase credentials missing or invalid in .env. Using hardcoded fallbacks for preview.');
}

export const supabase = createClient(effectiveUrl, effectiveKey, {
  auth: {
    persistSession: false, // User requested the app to start logged out
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
