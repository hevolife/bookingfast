/*
  # Permissions PostgreSQL pour service_role

  1. Modifications
    - GRANT ALL sur plugins pour service_role
    - GRANT ALL sur plugin_subscriptions pour service_role
    - GRANT ALL sur plugin_configurations pour service_role
    - GRANT ALL sur users pour service_role

  2. Sécurité
    - service_role a accès complet (utilisé par Edge Functions)
*/

-- Donner tous les droits au service_role
GRANT ALL ON TABLE plugins TO service_role;
GRANT ALL ON TABLE plugin_subscriptions TO service_role;
GRANT ALL ON TABLE plugin_configurations TO service_role;
GRANT ALL ON TABLE users TO service_role;

-- Donner les droits sur les séquences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Vérifier les permissions
SELECT 
  schemaname,
  tablename,
  has_table_privilege('service_role', schemaname || '.' || tablename, 'SELECT') as can_select,
  has_table_privilege('service_role', schemaname || '.' || tablename, 'INSERT') as can_insert,
  has_table_privilege('service_role', schemaname || '.' || tablename, 'UPDATE') as can_update
FROM pg_tables
WHERE tablename IN ('plugins', 'plugin_subscriptions', 'plugin_configurations', 'users');
