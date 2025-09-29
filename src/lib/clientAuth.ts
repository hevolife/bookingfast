import { supabase, isSupabaseConfigured } from './supabase';

// Gestion de l'authentification côté client
export class ClientAuthManager {
  static async createUser(email: string, password: string, fullName?: string) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase non configuré');
    }

    try {
      // Créer l'utilisateur via l'API auth standard
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName || null
          }
        }
      });

      if (error) throw error;

      // Le trigger handle_new_user se chargera de créer le profil
      return data;
    } catch (error) {
      console.error('Erreur création utilisateur:', error);
      throw error;
    }
  }

  static async deleteUser(userId: string) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase non configuré');
    }

    try {
      // Supprimer les données liées en premier
      const { error: bookingsError } = await supabase
        .from('bookings')
        .delete()
        .eq('user_id', userId);

      const { error: servicesError } = await supabase
        .from('services')
        .delete()
        .eq('user_id', userId);

      const { error: clientsError } = await supabase
        .from('clients')
        .delete()
        .eq('user_id', userId);

      const { error: settingsError } = await supabase
        .from('business_settings')
        .delete()
        .eq('user_id', userId);

      // Supprimer le profil utilisateur
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (userError) throw userError;

      console.log('✅ Utilisateur et données supprimés côté client');
      return true;
    } catch (error) {
      console.error('Erreur suppression utilisateur:', error);
      throw error;
    }
  }

  static async listUsers() {
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erreur liste utilisateurs:', error);
      return [];
    }
  }
}