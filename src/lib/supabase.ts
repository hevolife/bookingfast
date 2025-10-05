import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

// Fonction utilitaire pour détecter les erreurs réseau
export function isNetworkError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code?.toLowerCase() || '';
  
  return (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('timeout') ||
    errorCode === 'network_error' ||
    errorCode === 'fetch_error' ||
    error.name === 'NetworkError' ||
    error.name === 'TypeError' && errorMessage.includes('failed to fetch')
  );
}

// Fonction utilitaire pour réessayer une requête en cas d'erreur réseau
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      if (!isNetworkError(error) || attempt === maxRetries - 1) {
        throw error;
      }
      
      console.warn(`🔄 Tentative ${attempt + 1}/${maxRetries} échouée, nouvelle tentative dans ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }
  
  throw lastError;
}
