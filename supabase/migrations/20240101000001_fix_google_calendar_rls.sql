/*
  # Fix Google Calendar RLS Policies

  1. Problème identifié
    - Code erreur 42501: "permission denied for table google_calendar_tokens"
    - La policy actuelle bloque les opérations INSERT/UPDATE

  2. Solution
    - Supprimer l'ancienne policy restrictive
    - Créer des policies séparées pour chaque opération (SELECT, INSERT, UPDATE, DELETE)
    - Permettre explicitement toutes les opérations pour l'utilisateur authentifié

  3. Sécurité
    - Chaque utilisateur peut uniquement gérer ses propres tokens
    - Vérification via auth.uid() = user_id
*/

-- Supprimer l'ancienne policy
DROP POLICY IF EXISTS "Users can manage their own Google Calendar tokens" ON google_calendar_tokens;

-- Policy pour SELECT
CREATE POLICY "Users can view their own tokens"
  ON google_calendar_tokens
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy pour INSERT
CREATE POLICY "Users can insert their own tokens"
  ON google_calendar_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy pour UPDATE
CREATE POLICY "Users can update their own tokens"
  ON google_calendar_tokens
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy pour DELETE
CREATE POLICY "Users can delete their own tokens"
  ON google_calendar_tokens
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
