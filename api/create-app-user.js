const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['authorization', 'x-client-info', 'apikey', 'content-type']
}));

app.use(express.json());

app.post('/api/create-app-user', async (req, res) => {
  try {
    console.log('🔄 Début création utilisateur...');
    
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

    const { email, password, full_name, role_ids } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validation mot de passe
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    console.log('🔄 Création utilisateur:', email);

    // Récupérer les informations d'abonnement du créateur
    const { data: creatorData, error: creatorError } = await supabaseClient
      .from('users')
      .select('subscription_status, trial_ends_at')
      .eq('id', user.id)
      .single();

    let inheritedSubscriptionStatus = 'trial';
    let inheritedTrialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    if (!creatorError && creatorData) {
      inheritedSubscriptionStatus = creatorData.subscription_status || 'trial';
      inheritedTrialEndsAt = creatorData.trial_ends_at;
    }

    // Créer l'utilisateur dans auth.users
    const { data: authData, error: authError2 } = await supabaseClient.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || null
      }
    });

    if (authError2) {
      console.error('❌ Erreur création auth user:', authError2);
      return res.status(400).json({ 
        error: authError2.message,
        details: 'Failed to create authentication user'
      });
    }

    if (!authData.user) {
      return res.status(500).json({ error: 'Failed to create user - no user data returned' });
    }

    // Créer l'entrée dans la table users
    const { data: userData2, error: userError2 } = await supabaseClient
      .from('users')
      .insert([{
        id: authData.user.id,
        email: email,
        full_name: full_name || null,
        is_super_admin: false,
        subscription_status: inheritedSubscriptionStatus,
        trial_started_at: new Date().toISOString(),
        trial_ends_at: inheritedTrialEndsAt
      }])
      .select()
      .single();

    if (userError2) {
      console.error('❌ Erreur création user profile:', userError2);
      try {
        await supabaseClient.auth.admin.deleteUser(authData.user.id);
      } catch (cleanupError) {
        console.error('❌ Erreur nettoyage utilisateur auth:', cleanupError);
      }
      return res.status(400).json({ 
        error: userError2.message,
        details: 'Failed to create user profile'
      });
    }

    // Assigner les rôles si fournis
    if (role_ids && Array.isArray(role_ids) && role_ids.length > 0) {
      const roleAssignments = role_ids.map(roleId => ({
        user_id: authData.user.id,
        role_id: roleId,
        granted_by: user.id
      }));

      const { error: rolesError } = await supabaseClient
        .from('user_roles')
        .insert(roleAssignments);

      if (rolesError) {
        console.error('❌ Erreur assignation rôles:', rolesError);
      }
    }

    console.log('✅ Utilisateur créé avec succès:', email);

    res.json({ 
      success: true, 
      user: {
        id: authData.user.id,
        email: email,
        full_name: full_name,
        subscription_status: inheritedSubscriptionStatus,
        trial_ends_at: inheritedTrialEndsAt,
        created: true
      }
    });

  } catch (error) {
    console.error('❌ Erreur création utilisateur:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Unexpected error during user creation'
    });
  }
});

module.exports = app;