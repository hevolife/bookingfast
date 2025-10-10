/*
  # Ajout du champ stripe_price_id à la table plugins

  1. Modifications
    - Ajoute la colonne `stripe_price_id` à la table `plugins`
    - Permet de stocker le Price ID Stripe récurrent pour chaque plugin
*/

-- Ajouter la colonne stripe_price_id
ALTER TABLE plugins 
ADD COLUMN IF NOT EXISTS stripe_price_id text;

-- Créer un index pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_plugins_stripe_price_id ON plugins(stripe_price_id);
