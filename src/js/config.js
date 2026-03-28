import { createClient } from '@supabase/supabase-js';

export const SB_URL = 'https://kjblegripbhbrttejiyv.supabase.co';
export const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqYmxlZ3JpcGJoYnJ0dGVqaXl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MzIyMTQsImV4cCI6MjA4ODIwODIxNH0.OdyBIFPqSd9NyXwsIAQVhVl2vYln9A_wBtmcJ84ty5c';

// Cabeçalhos base — Authorization é sobrescrito dinamicamente em api.js com o JWT do usuário
export const SB_H = {
  'apikey': SB_KEY,
  'Authorization': 'Bearer ' + SB_KEY,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

// Cliente Supabase (usado para Auth)
export const supabase = createClient(SB_URL, SB_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});
