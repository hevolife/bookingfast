import { supabase, isSupabaseConfigured } from './supabase';

// Gestion des équipes côté client
export class ClientTeamManager {
  static async inviteTeamMember(memberData: {
    ownerEmail: string;
    email: string;
    password: string;
    fullName?: string;
    roleName: string;
    permissions: string[];
  }) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase non configuré');
    }

    try {
      // 1. Créer l'utilisateur via l'API auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: memberData.email.trim().toLowerCase(),
        password: memberData.password,
        email_confirm: true,
        user_metadata: {
          full_name: memberData.fullName || null
        }
      });

      if (authError) throw authError;

      // 2. Récupérer l'ID du propriétaire
      const { data: ownerData, error: ownerError } = await supabase
        .from('users')
        .select('id, subscription_status, trial_ends_at')
        .eq('email', memberData.ownerEmail)
        .single();

      if (ownerError || !ownerData) {
        throw new Error('Propriétaire non trouvé');
      }

      // 3. Créer le profil utilisateur avec héritage du statut d'abonnement
      const { error: userError } = await supabase
        .from('users')
        .insert([{
          id: authData.user!.id,
          email: memberData.email.trim().toLowerCase(),
          full_name: memberData.fullName || null,
          is_super_admin: false,
          subscription_status: ownerData.subscription_status,
          trial_started_at: new Date().toISOString(),
          trial_ends_at: ownerData.trial_ends_at
        }]);

      if (userError && !userError.message.includes('duplicate key')) {
        throw userError;
      }

      // 4. Ajouter le membre à l'équipe
      const { data: memberResult, error: memberError } = await supabase
        .from('team_members')
        .insert([{
          owner_id: ownerData.id,
          user_id: authData.user!.id,
          email: memberData.email.trim().toLowerCase(),
          full_name: memberData.fullName || null,
          role_name: memberData.roleName,
          permissions: memberData.permissions,
          invited_by: ownerData.id,
          joined_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (memberError) throw memberError;

      console.log('✅ Membre d\'équipe invité côté client');
      return memberResult;
    } catch (error) {
      console.error('❌ Erreur invitation membre:', error);
      throw error;
    }
  }

  static async createAffiliateAccount(userId: string) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase non configuré');
    }

    try {
      // Générer un code d'affiliation unique
      const affiliateCode = this.generateAffiliateCode();

      // Vérifier l'unicité du code
      const { data: existingCode } = await supabase
        .from('affiliates')
        .select('id')
        .eq('affiliate_code', affiliateCode)
        .single();

      if (existingCode) {
        // Régénérer si le code existe déjà
        return this.createAffiliateAccount(userId);
      }

      // Créer le compte d'affiliation
      const { data, error } = await supabase
        .from('affiliates')
        .insert([{
          user_id: userId,
          affiliate_code: affiliateCode,
          total_referrals: 0,
          successful_conversions: 0,
          total_commissions: 0,
          pending_commissions: 0,
          paid_commissions: 0,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Compte affiliation créé côté client');
      return data;
    } catch (error) {
      console.error('❌ Erreur création compte affiliation:', error);
      throw error;
    }
  }

  private static generateAffiliateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}