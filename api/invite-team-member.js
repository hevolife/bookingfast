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

app.post('/api/invite-team-member', async (req, res) => {
  try {
    console.log('🔄 Début invitation membre d\'équipe...');
    
    const supabaseClient = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Vérifier l'authentification
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authentication' });
    }

    const { owner_id, email, password, full_name, role_name, permissions } = req.body;

    if (!owner_id || !email || !password) {
      return res.status(400).json({ error: 'owner_id, email and password are required' });
    }

    // Vérifier que l'utilisateur est bien le propriétaire
    if (user.id !== owner_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    console.log('🔄 Création utilisateur pour équipe:', email);

    // Vérifier si l'utilisateur existe déjà
    const { data: existingUsers, error: listError } = await supabaseClient.auth.admin.listUsers();
    
    if (listError) {
      return res.status(500).json({ error: 'Failed to check existing users' });
    }

    const existingUser = existingUsers.users.find(u => u.email === email.trim().toLowerCase());
    let targetUserId;

    if (existingUser) {
      // Vérifier si déjà membre de cette équipe
      const { data: existingMember, error: memberCheckError } = await supabaseClient
        .from('team_members')
        .select('id')
        .eq('owner_id', owner_id)
        .eq('user_id', existingUser.id)
        .single();

      if (!memberCheckError && existingMember) {
        return res.status(400).json({ error: 'User is already a member of this team' });
      }

      targetUserId = existingUser.id;
    } else {
      // Créer un nouvel utilisateur
      const { data: authData, error: authError2 } = await supabaseClient.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name || null
        }
      });

      if (authError2) {
        return res.status(400).json({ error: authError2.message });
      }

      if (!authData.user) {
        return res.status(500).json({ error: 'Failed to create user' });
      }

      targetUserId = authData.user.id;

      // Récupérer les informations d'abonnement du propriétaire
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

      // Créer le profil utilisateur
      const { error: userError } = await supabaseClient
        .from('users')
        .insert([{
          id: targetUserId,
          email: email.trim().toLowerCase(),
          full_name: full_name || null,
          is_super_admin: false,
          subscription_status: inheritedSubscriptionStatus,
          trial_started_at: new Date().toISOString(),
          trial_ends_at: inheritedTrialEndsAt
        }]);

      if (userError && !userError.message.includes('duplicate key')) {
        await supabaseClient.auth.admin.deleteUser(targetUserId);
        return res.status(400).json({ error: userError.message });
      }
    }

    // Ajouter le membre à l'équipe
    const { data: memberData, error: memberError } = await supabaseClient
      .from('team_members')
      .insert([{
        owner_id: owner_id,
        user_id: targetUserId,
        email: email.trim().toLowerCase(),
        full_name: full_name || null,
        role_name: role_name || 'employee',
        permissions: permissions || [],
        invited_by: user.id,
        joined_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (memberError) {
      console.error('❌ Erreur ajout membre équipe:', memberError);
      if (!existingUser) {
        await supabaseClient.auth.admin.deleteUser(targetUserId);
        await supabaseClient.from('users').delete().eq('id', targetUserId);
      }
      return res.status(400).json({ error: memberError.message });
    }

    console.log('✅ Membre ajouté à l\'équipe avec succès');

    res.json({ 
      success: true, 
      member: memberData
    });

  } catch (error) {
    console.error('❌ Erreur invitation membre:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = app;