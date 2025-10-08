/*
  # Fix subscription plans table
  
  1. Drop existing table
  2. Recreate with correct schema
  3. Add all necessary columns
*/

-- Drop existing table and recreate
DROP TABLE IF EXISTS subscription_plans CASCADE;

-- Create subscription_plans table with ALL columns
CREATE TABLE subscription_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  price_monthly numeric(10,2) NOT NULL,
  price_yearly numeric(10,2),
  stripe_price_id_monthly text,
  stripe_price_id_yearly text,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  max_bookings_per_month integer,
  team_members_allowed boolean DEFAULT false,
  custom_services_allowed boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Policy for reading plans
CREATE POLICY "Subscription plans are viewable by everyone"
  ON subscription_plans FOR SELECT
  TO public
  USING (is_active = true);

-- Insert default subscription plans
INSERT INTO subscription_plans (
  id, 
  name, 
  price_monthly, 
  price_yearly, 
  features, 
  max_bookings_per_month,
  team_members_allowed,
  custom_services_allowed
) VALUES
  (
    'basic', 
    'Plan Basic', 
    29.99, 
    NULL, 
    '["Réservations en ligne", "Gestion des clients", "Paiements en ligne", "Workflows email", "Support email"]'::jsonb,
    150,
    false,
    false
  ),
  (
    'premium', 
    'Plan Premium', 
    49.99, 
    499.99,
    '["Tout du plan Basic", "Membres d''équipe illimités", "Services personnalisés", "Réservations illimitées", "Support prioritaire", "Fonctionnalités avancées"]'::jsonb,
    NULL,
    true,
    true
  );

-- Add subscription tier columns to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_tier text DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'premium'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'monthly_booking_count'
  ) THEN
    ALTER TABLE profiles ADD COLUMN monthly_booking_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'booking_count_reset_date'
  ) THEN
    ALTER TABLE profiles ADD COLUMN booking_count_reset_date timestamptz DEFAULT date_trunc('month', now() + interval '1 month');
  END IF;
END $$;

-- Function to check if user can create booking
CREATE OR REPLACE FUNCTION check_booking_limit(user_id uuid)
RETURNS boolean AS $$
DECLARE
  user_profile record;
  max_bookings integer;
BEGIN
  SELECT * INTO user_profile FROM profiles WHERE id = user_id;
  
  IF user_profile.subscription_tier = 'premium' THEN
    RETURN true;
  END IF;
  
  IF user_profile.booking_count_reset_date <= now() THEN
    UPDATE profiles 
    SET monthly_booking_count = 0,
        booking_count_reset_date = date_trunc('month', now() + interval '1 month')
    WHERE id = user_id;
    RETURN true;
  END IF;
  
  SELECT max_bookings_per_month INTO max_bookings
  FROM subscription_plans
  WHERE id = 'basic';
  
  RETURN user_profile.monthly_booking_count < max_bookings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment booking counter
CREATE OR REPLACE FUNCTION increment_booking_counter()
RETURNS trigger AS $$
BEGIN
  UPDATE profiles
  SET monthly_booking_count = monthly_booking_count + 1
  WHERE id = NEW.user_id
    AND subscription_tier = 'basic';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to increment counter on new booking
DROP TRIGGER IF EXISTS increment_booking_counter_trigger ON bookings;
CREATE TRIGGER increment_booking_counter_trigger
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION increment_booking_counter();

-- Function to decrement booking counter on deletion
CREATE OR REPLACE FUNCTION decrement_booking_counter()
RETURNS trigger AS $$
BEGIN
  UPDATE profiles
  SET monthly_booking_count = GREATEST(0, monthly_booking_count - 1)
  WHERE id = OLD.user_id
    AND subscription_tier = 'basic';
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to decrement counter on booking deletion
DROP TRIGGER IF EXISTS decrement_booking_counter_trigger ON bookings;
CREATE TRIGGER decrement_booking_counter_trigger
  AFTER DELETE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION decrement_booking_counter();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_booking_count_reset ON profiles(booking_count_reset_date);
