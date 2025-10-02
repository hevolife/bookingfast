/*
  # Système de Permissions pour les Plugins

  1. Nouvelles Tables
    - `team_member_plugin_permissions`
      - `id` (uuid, primary key)
      - `team_member_id` (uuid, foreign key) - Référence au membre d'équipe
      - `plugin_id` (uuid, foreign key) - Référence au plugin
      - `granted_by` (uuid, foreign key) - Qui a accordé la permission
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Sécurité
    - RLS activé
    - Policies pour propriétaires et admins
    - Fonction pour vérifier l'accès aux plugins

  3. Modifications
    - Ajout de colonnes dans team_members pour tracking
*/

-- Table des permissions plugins pour les membres d'équipe
CREATE TABLE IF NOT EXISTS team_member_plugin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id uuid NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  plugin_id uuid NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
  granted_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(team_member_id, plugin_id)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_team_member_plugin_permissions_member ON team_member_plugin_permissions(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_member_plugin_permissions_plugin ON team_member_plugin_permissions(plugin_id);

-- RLS
ALTER TABLE team_member_plugin_permissions ENABLE ROW LEVEL SECURITY;

-- Policies pour team_member_plugin_permissions
CREATE POLICY "Owners can manage team plugin permissions"
  ON team_member_plugin_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.id = team_member_plugin_permissions.team_member_id
      AND tm.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view team plugin permissions"
  ON team_member_plugin_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.id = team_member_plugin_permissions.team_member_id
      AND tm.owner_id IN (
        SELECT owner_id FROM team_members
        WHERE user_id = auth.uid()
        AND role_name = 'admin'
      )
    )
  );

-- Fonction pour vérifier si un membre d'équipe a accès à un plugin
CREATE OR REPLACE FUNCTION has_team_member_plugin_access(
  p_user_id uuid,
  p_plugin_slug text
)
RETURNS boolean AS $$
DECLARE
  v_is_owner boolean;
  v_team_member_id uuid;
  v_has_permission boolean;
BEGIN
  -- Vérifier si l'utilisateur est propriétaire (accès à tous les plugins)
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE owner_id = p_user_id
    LIMIT 1
  ) INTO v_is_owner;
  
  IF v_is_owner THEN
    RETURN true;
  END IF;
  
  -- Récupérer l'ID du membre d'équipe
  SELECT id INTO v_team_member_id
  FROM team_members
  WHERE user_id = p_user_id
  AND is_active = true
  LIMIT 1;
  
  IF v_team_member_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Vérifier si le membre a la permission pour ce plugin
  SELECT EXISTS (
    SELECT 1
    FROM team_member_plugin_permissions tmpp
    JOIN plugins p ON p.id = tmpp.plugin_id
    WHERE tmpp.team_member_id = v_team_member_id
    AND p.slug = p_plugin_slug
    AND p.is_active = true
  ) INTO v_has_permission;
  
  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les plugins accessibles par un membre d'équipe
CREATE OR REPLACE FUNCTION get_team_member_accessible_plugins(p_user_id uuid)
RETURNS TABLE (
  plugin_id uuid,
  plugin_name text,
  plugin_slug text,
  plugin_icon text,
  plugin_category text
) AS $$
DECLARE
  v_is_owner boolean;
  v_team_member_id uuid;
BEGIN
  -- Vérifier si l'utilisateur est propriétaire
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE owner_id = p_user_id
    LIMIT 1
  ) INTO v_is_owner;
  
  -- Si propriétaire, retourner tous les plugins actifs auxquels il est abonné
  IF v_is_owner THEN
    RETURN QUERY
    SELECT 
      p.id,
      p.name,
      p.slug,
      p.icon,
      p.category
    FROM plugins p
    JOIN plugin_subscriptions ps ON ps.plugin_id = p.id
    WHERE ps.user_id = p_user_id
    AND ps.status = 'active'
    AND p.is_active = true;
    RETURN;
  END IF;
  
  -- Récupérer l'ID du membre d'équipe
  SELECT id INTO v_team_member_id
  FROM team_members
  WHERE user_id = p_user_id
  AND is_active = true
  LIMIT 1;
  
  IF v_team_member_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Retourner les plugins autorisés pour ce membre
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.slug,
    p.icon,
    p.category
  FROM team_member_plugin_permissions tmpp
  JOIN plugins p ON p.id = tmpp.plugin_id
  WHERE tmpp.team_member_id = v_team_member_id
  AND p.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
