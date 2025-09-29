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

app.post('/api/create-affiliate-account', async (req, res) => {
  try {
    console.log('🔄 Création compte affiliation...');
    
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

    const { user_id } = req.body;

    if (!user_id || user_id !== user.id) {
      return res.status(400).json({ error: 'Invalid user_id' });
    }

    // Vérifier si l'utilisateur a déjà un compte d'affiliation
    const { data: existingAffiliate, error: checkError } = await supabaseClient
      .from('affiliates')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (existingAffiliate && !checkError) {
      return res.json({ 
        success: true, 
        affiliate: existingAffiliate,
        message: 'Compte d\'affiliation déjà existant'
      });
    }

    // Générer un code d'affiliation unique
    const generateAffiliateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    const affiliateCode = generateAffiliateCode();

    // Créer le compte d'affiliation
    const { data: newAffiliate, error: createError } = await supabaseClient
      .from('affiliates')
      .insert([{
        user_id: user_id,
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

    if (createError) {
      console.error('❌ Erreur création compte affiliation:', createError);
      return res.status(400).json({ error: createError.message });
    }

    console.log('✅ Compte affiliation créé avec succès');

    res.json({ 
      success: true, 
      affiliate: newAffiliate,
      message: 'Compte d\'affiliation créé avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur création compte affiliation:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = app;