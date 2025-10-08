/*
  # Ajout des Price IDs Stripe
  
  1. Mise à jour
    - Ajout des stripe_price_id_monthly et stripe_price_id_yearly pour chaque plan
*/

-- Mise à jour du plan Basic avec Price ID mensuel
UPDATE subscription_plans 
SET stripe_price_id_monthly = 'price_1SG0crKiNbWQJGP32LZ3uBoT'
WHERE id = 'basic';

-- Mise à jour du plan Premium avec Price IDs mensuel et annuel
UPDATE subscription_plans 
SET 
  stripe_price_id_monthly = 'price_1SG0bfKiNbWQJGP3IBm6hcbW',
  stripe_price_id_yearly = 'price_1SG0dzKiNbWQJGP3KYkvl0Xf'
WHERE id = 'premium';
