const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['authorization', 'x-client-info', 'apikey', 'content-type']
}));

app.use(express.json());

app.get('/api/list-users', async (req, res) => {
  try {
    console.log('🔔 Demande de liste des utilisateurs reçue');
    
    const supabaseClient = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Vérifier l'authentification
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.error('❌ Header Authorization manquant');
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Authentification invalide:', authError?.message);
      return res.status(401).json({ error: 'Invalid authentication' });
    }

    console.log('✅ Utilisateur authentifié:', user.email);

    // Vérifier les permissions d'admin
    let isAdmin = false;
    try {
      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('is_super_admin')
        .eq('id', user.id)
        .single();

      if (userError) {
        const { count, error: countError } = await supabaseClient
          .from('users')
          .select('*', { count: 'exact', head: true });
        
        if (!countError && count === 0) {
          console.log('🎯 Premier utilisateur - accès accordé');
          isAdmin = true;
        }
      } else {
        isAdmin = userData?.is_super_admin === true;
      }
    } catch (permError) {
      console.error('❌ Erreur critique permissions:', permError);
      isAdmin = false;
    }

    if (!isAdmin) {
      console.log('❌ Accès refusé - utilisateur non admin:', user.email);
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Récupérer tous les utilisateurs
    const { data: authUsers, error: authError2 } = await supabaseClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });
    
    if (authError2) {
      console.error('❌ Erreur récupération utilisateurs auth:', authError2);
      return res.status(500).json({ error: authError2.message });
    }

    // Récupérer les profils utilisateurs
    const { data: userProfiles, error: profilesError } = await supabaseClient
      .from('users')
      .select('id, email, full_name, is_super_admin, subscription_status, trial_started_at, trial_ends_at, created_at, updated_at')
      .limit(1000);
    
    if (profilesError) {
      console.warn('⚠️ Erreur chargement profils utilisateurs:', profilesError);
    }
    
    // Fusionner les données
    const mergedUsers = authUsers?.users?.map(authUser => {
      const profile = userProfiles?.find(p => p.id === authUser.id);
      return {
        id: authUser.id,
        email: authUser.email || '',
        full_name: profile?.full_name || authUser.user_metadata?.full_name || '',
        is_super_admin: profile?.is_super_admin || false,
        subscription_status: profile?.subscription_status || 'trial',
        trial_started_at: profile?.trial_started_at || authUser.created_at,
        trial_ends_at: profile?.trial_ends_at,
        created_at: authUser.created_at || profile?.created_at || new Date().toISOString(),
        updated_at: profile?.updated_at || authUser.updated_at || new Date().toISOString()
      };
    }) || [];

    console.log('✅ Utilisateurs récupérés:', mergedUsers.length);

    res.json({ 
      success: true, 
      users: mergedUsers,
      total: mergedUsers.length
    });

  } catch (error) {
    console.error('❌ Erreur liste utilisateurs:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Unexpected error during user listing'
    });
  }
});

module.exports = app;