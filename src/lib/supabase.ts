import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = () => {
  const isConfigured = !!(
    supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl !== 'https://placeholder.supabase.co' && 
    supabaseAnonKey !== 'placeholder-key' &&
    (supabaseUrl.includes('.supabase.co') || supabaseUrl.includes('localhost')) &&
    supabaseAnonKey.length > 20
  );
  
  if (!isConfigured) {
    console.warn('⚠️ Supabase non configuré:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      urlValid: supabaseUrl?.includes('.supabase.co') || supabaseUrl?.includes('localhost'),
      keyLength: supabaseAnonKey?.length
    });
  }
  
  return isConfigured;
};

let supabaseClient: any = null;

if (isSupabaseConfigured()) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        'x-application-name': 'BookingFast',
        'x-application-version': '1.0.0'
      }
    },
    db: {
      schema: 'public'
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  });
} else {
  supabaseClient = {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Supabase non configuré') }),
      signUp: () => Promise.resolve({ data: null, error: new Error('Supabase non configuré') }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    from: () => ({
      select: () => ({
        order: () => ({
          eq: () => Promise.resolve({ data: [], error: new Error('Supabase non configuré') }),
          single: () => Promise.resolve({ data: null, error: new Error('Supabase non configuré') }),
          limit: () => Promise.resolve({ data: [], error: new Error('Supabase non configuré') })
        }),
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: new Error('Supabase non configuré') })
        }),
        single: () => Promise.resolve({ data: null, error: new Error('Supabase non configuré') })
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: null, error: new Error('Supabase non configuré') })
        })
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: new Error('Supabase non configuré') })
          })
        })
      }),
      delete: () => ({
        eq: () => Promise.resolve({ data: null, error: new Error('Supabase non configuré') })
      }),
      upsert: () => ({
        select: () => Promise.resolve({ data: null, error: new Error('Supabase non configuré') })
      })
    })
  };
}

export const supabase = supabaseClient;