import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Helper function to check if error is a network/connectivity issue
export const isNetworkError = (error: any): boolean => {
  if (!error) return false;
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorName = error.name?.toLowerCase() || '';
  
  return (
    errorMessage.includes('failed to fetch') ||
    errorMessage.includes('network error') ||
    errorMessage.includes('fetch error') ||
    errorName === 'typeerror' ||
    error.code === 'NETWORK_ERROR' ||
    error.status === 0
  );
};

// Helper function to retry failed requests
export const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      if (!isNetworkError(error) || attempt === maxRetries) {
        throw error;
      }
      
      console.warn(`🔄 Tentative ${attempt}/${maxRetries} échouée, retry dans ${delay}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError;
};
export const isSupabaseConfigured = () => {
  const isConfigured = !!(
    supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl !== 'https://placeholder.supabase.co' && 
    supabaseAnonKey !== 'placeholder-key' &&
    (supabaseUrl.includes('.supabase.co') || supabaseUrl.includes('localhost') || supabaseUrl.includes('sslip.io') || supabaseUrl.includes('hevolife.fr') || supabaseUrl.includes('bookingfast.hevolife.fr') || /^\d+\.\d+\.\d+\.\d+/.test(supabaseUrl)) &&
    supabaseAnonKey.length > 20
  );
  
  if (!isConfigured) {
    console.warn('⚠️ Supabase non configuré:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      urlValid: supabaseUrl?.includes('.supabase.co') || supabaseUrl?.includes('localhost') || supabaseUrl?.includes('sslip.io') || supabaseUrl?.includes('hevolife.fr') || supabaseUrl?.includes('bookingfast.hevolife.fr') || /^\d+\.\d+\.\d+\.\d+/.test(supabaseUrl || ''),
      keyLength: supabaseAnonKey?.length
    });
  }
  
  console.log('🔍 Configuration Supabase détectée:', {
    url: supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    isConfigured
  });
  
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