-- 🔍 LISTER TOUTES LES TABLES DE LA BASE
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 🔍 VÉRIFIER LA STRUCTURE DE LA TABLE BOOKINGS
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'bookings'
ORDER BY ordinal_position;

-- 🔍 CHERCHER DES TABLES CONTENANT "transaction"
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%transaction%';
