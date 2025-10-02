/*
  # Fix get_user_active_plugins Function

  1. Changes
    - Drop and recreate function with correct return types
    - Change activated_features from text[] to jsonb
    - Ensure all return types match actual data types
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_user_active_plugins(uuid);

-- Recreate with correct types
CREATE OR REPLACE FUNCTION get_user_active_plugins(p_user_id uuid)
RETURNS TABLE (
  plugin_id uuid,
  plugin_name text,
  plugin_slug text,
  plugin_icon text,
  plugin_category text,
  activated_features jsonb,
  settings jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.slug,
    p.icon,
    p.category,
    ps.activated_features,
    COALESCE(pc.settings, '{}'::jsonb)
  FROM plugin_subscriptions ps
  JOIN plugins p ON p.id = ps.plugin_id
  LEFT JOIN plugin_configurations pc ON pc.user_id = ps.user_id AND pc.plugin_id = ps.plugin_id
  WHERE ps.user_id = p_user_id
  AND ps.status IN ('active', 'trial')
  AND (ps.current_period_end IS NULL OR ps.current_period_end > now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
