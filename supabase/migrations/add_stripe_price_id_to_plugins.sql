/*
  # Ajout du stripe_price_id aux plugins

  1. Modifications
    - Ajoute la colonne `stripe_price_id` à la table `plugins`
    - Cette colonne stocke l'ID du prix récurrent Stripe pour chaque plugin
*/

-- Ajouter la colonne stripe_price_id
ALTER TABLE plugins 
ADD COLUMN IF NOT EXISTS stripe_price_id text;

-- Créer un index pour les performances
CREATE INDEX IF NOT EXISTS idx_plugins_stripe_price_id ON plugins(stripe_price_id);

-- Mettre à jour les plugins existants avec des Price IDs temporaires
-- IMPORTANT: Vous devrez remplacer ces IDs par vos vrais Price IDs Stripe

UPDATE plugins SET stripe_price_id = 'price_plugin_reports' WHERE slug = 'reports';
UPDATE plugins SET stripe_price_id = 'price_plugin_vtc' WHERE slug = 'vtc';
UPDATE plugins SET stripe_price_id = 'price_plugin_multi_user' WHERE slug = 'multi-user';
UPDATE plugins SET stripe_price_id = 'price_plugin_marketing' WHERE slug = 'marketing';
UPDATE plugins SET stripe_price_id = 'price_plugin_inventory' WHERE slug = 'inventory';
