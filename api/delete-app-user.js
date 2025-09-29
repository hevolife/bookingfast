const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['DELETE', 'POST', 'OPTIONS'],
  allowedHeaders: ['authorization', 'x-client-info', 'apikey', 'content-type']
}));

app.use(express.json());

app.post('/api/delete-app-user', async (req, res) => {
  try {
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
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    console.log('🗑️ Début suppression utilisateur:', user_id);

    // Supprimer les données liées dans l'ordre correct
    const deleteOperations = [
      () => supabaseClient.from('code_redemptions').delete().eq('user_id', user_id),
      () => supabaseClient.from('user_subscriptions').delete().eq('user_id', user_id),
      () => supabaseClient.from('affiliates').delete().eq('user_id', user_id),
      () => supabaseClient.from('bookings').delete().eq('user_id', user_id),
      () => supabaseClient.from('services').delete().eq('user_id', user_id),
      () => supabaseClient.from('clients').delete().eq('user_id', user_id),
      () => supabaseClient.from('business_settings').delete().eq('user_id', user_id),
      () => supabaseClient.from('team_members').delete().eq('owner_id', user_id),
      () => supabaseClient.from('team_members').delete().eq('user_id', user_id),
      () => supabaseClient.from('user_roles').delete().eq('user_id', user_id),
      () => supabaseClient.from('users').delete().eq('id', user_id)
    ];

    for (const operation of deleteOperations) {
      try {
        await operation();
      } catch (error) {
        console.warn('⚠️ Erreur suppression (continuons):', error);
      }
    }

    // Supprimer l'utilisateur auth
    try {
      const { error: authError } = await supabaseClient.auth.admin.deleteUser(user_id);
      if (authError) {
        console.error('❌ Erreur suppression auth user:', authError);
        return res.status(500).json({ error: authError.message });
      }
    } catch (authErr) {
      console.error('❌ Impossible de supprimer auth user:', authErr);
      return res.status(500).json({ error: 'Failed to delete authentication user' });
    }

    console.log('✅ Utilisateur supprimé avec succès');

    res.json({ 
      success: true, 
      message: 'User deleted successfully',
      user_id: user_id
    });

  } catch (error) {
    console.error('❌ Erreur suppression utilisateur:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Unexpected error during user deletion'
    });
  }
});

module.exports = app;