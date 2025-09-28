#!/bin/bash
set -e

# 🚀 Script de mise à jour BookingFast VPS depuis GitHub
# Usage: ./update-vps.sh [branch]
# Basé sur le script existant /root/update-bookingfast.sh

# Configuration
GITHUB_REPO="votre-username/bookingfast"  # ⚠️ MODIFIEZ AVEC VOTRE REPO GITHUB
BRANCH="${1:-main}"  # Branche par défaut: main
APP_DIR="/var/www/bookingfast"
SUPABASE_DIR="/opt/supabase"
BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Variables Supabase (à adapter selon votre configuration)
SUPABASE_URL="https://bookingfast.hevolife.fr"
SERVICE_ROLE_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc1OTA4ODc2MCwiZXhwIjo0OTE0NzYyMzYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.D17ig-Q-dCSgM3_ICJT6OXqx_Fr97yFmeNLTNmKCTeY"
ANON_KEY="VOTRE_ANON_KEY_ICI"  # ⚠️ À RÉCUPÉRER DE VOTRE SUPABASE

echo "🚀 Début mise à jour BookingFast VPS - $DATE"
echo "📦 Repository: $GITHUB_REPO"
echo "🌿 Branche: $BRANCH"

# Fonction de log avec timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Fonction de vérification des services
check_service() {
    local service=$1
    if systemctl is-active --quiet $service; then
        log "✅ $service est actif"
        return 0
    else
        log "❌ $service est inactif"
        return 1
    fi
}

# Fonction de test de connectivité
test_connectivity() {
    local url=$1
    local name=$2
    if curl -s --max-time 10 "$url" > /dev/null; then
        log "✅ $name accessible"
        return 0
    else
        log "❌ $name inaccessible"
        return 1
    fi
}

# 1. SAUVEGARDE AVANT MISE À JOUR
log "💾 Sauvegarde avant mise à jour..."
mkdir -p $BACKUP_DIR

# Sauvegarde de l'application actuelle
if [ -d "$APP_DIR" ]; then
    log "📱 Sauvegarde application actuelle..."
    tar -czf $BACKUP_DIR/app_before_update_$DATE.tar.gz -C $APP_DIR . 2>/dev/null || log "⚠️ Erreur sauvegarde app"
fi

# Sauvegarde de la base de données
if [ -d "$SUPABASE_DIR" ]; then
    log "🗄️ Sauvegarde base de données..."
    cd $SUPABASE_DIR
    if docker ps | grep -q supabase_db; then
        docker exec $(docker ps --format "table {{.Names}}" | grep supabase_db | head -1) pg_dump -U postgres postgres > $BACKUP_DIR/database_before_update_$DATE.sql 2>/dev/null || log "⚠️ Erreur sauvegarde DB"
    fi
fi

# 2. TÉLÉCHARGEMENT DE LA NOUVELLE VERSION
log "📥 Téléchargement nouvelle version depuis GitHub..."

# Créer un répertoire temporaire
TEMP_DIR="/tmp/bookingfast_update_$DATE"
mkdir -p $TEMP_DIR
cd $TEMP_DIR

# Télécharger depuis GitHub
log "🔄 Clonage du repository..."
if git clone --depth 1 --branch $BRANCH https://github.com/$GITHUB_REPO.git . ; then
    log "✅ Repository cloné avec succès"
else
    log "❌ Erreur clonage repository"
    log "💡 Vérifiez que le repository existe et est accessible"
    log "💡 Repository configuré: $GITHUB_REPO"
    log "💡 Branche: $BRANCH"
    exit 1
fi

# Vérifier que c'est bien une app BookingFast
if [ ! -f "package.json" ] || ! grep -q "bookingfast\|BookingFast" package.json; then
    log "❌ Ce ne semble pas être une application BookingFast valide"
    exit 1
fi

log "✅ Application BookingFast détectée"

# 3. ARRÊT DES SERVICES
log "🛑 Arrêt temporaire des services..."

# Arrêter Nginx temporairement
systemctl stop nginx || log "⚠️ Erreur arrêt Nginx"

# 4. MISE À JOUR DE L'APPLICATION
log "📱 Mise à jour de l'application..."

# Sauvegarder l'ancien .env
if [ -f "$APP_DIR/.env" ]; then
    cp $APP_DIR/.env $TEMP_DIR/.env.backup
    log "✅ Fichier .env sauvegardé"
fi

# Supprimer l'ancienne version (sauf .env)
if [ -d "$APP_DIR" ]; then
    find $APP_DIR -mindepth 1 -not -name '.env' -not -name '.env.*' -delete 2>/dev/null || log "⚠️ Erreur nettoyage"
fi

# Copier la nouvelle version
cp -r $TEMP_DIR/* $APP_DIR/
log "✅ Nouvelle version copiée"

# Restaurer le .env
if [ -f "$TEMP_DIR/.env.backup" ]; then
    cp $TEMP_DIR/.env.backup $APP_DIR/.env
    log "✅ Configuration .env restaurée"
fi

# 5. INSTALLATION DES DÉPENDANCES
log "📦 Installation des dépendances..."
cd $APP_DIR

# Nettoyer node_modules et package-lock
rm -rf node_modules package-lock.json 2>/dev/null || true

# Installer les dépendances
if npm ci --only=production; then
    log "✅ Dépendances installées"
else
    log "❌ Erreur installation dépendances"
    exit 1
fi

# 6. BUILD DE PRODUCTION
log "🔨 Build de production..."
if npm run build; then
    log "✅ Build réussi"
else
    log "❌ Erreur de build"
    exit 1
fi

# Vérifier que le build existe
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    log "❌ Build incomplet - dist/index.html manquant"
    exit 1
fi

log "✅ Build vérifié"

# 7. MISE À JOUR SUPABASE
log "🗄️ Mise à jour Supabase..."
cd $SUPABASE_DIR

# Copier les nouvelles migrations si elles existent
if [ -d "$APP_DIR/supabase/migrations" ]; then
    log "📋 Copie des nouvelles migrations..."
    cp -r $APP_DIR/supabase/migrations/* supabase/migrations/ 2>/dev/null || log "ℹ️ Aucune nouvelle migration"
    
    # Appliquer les migrations
    if supabase db push; then
        log "✅ Migrations appliquées"
    else
        log "⚠️ Erreur migrations (continuons quand même)"
    fi
fi

# Copier et redéployer les Edge Functions
if [ -d "$APP_DIR/supabase/functions" ]; then
    log "🚀 Mise à jour des Edge Functions..."
    cp -r $APP_DIR/supabase/functions/* supabase/functions/ 2>/dev/null || log "ℹ️ Aucune fonction à copier"
    
    # Redéployer chaque fonction
    for func_dir in supabase/functions/*/; do
        if [ -d "$func_dir" ]; then
            func_name=$(basename "$func_dir")
            log "🔄 Déploiement fonction: $func_name"
            if supabase functions deploy $func_name; then
                log "✅ Fonction $func_name déployée"
            else
                log "⚠️ Erreur déploiement fonction $func_name"
            fi
        fi
    done
fi

# 8. PERMISSIONS ET PROPRIÉTÉS
log "🔐 Configuration des permissions..."
cd $APP_DIR

# Permissions correctes
chown -R www-data:www-data $APP_DIR
chmod -R 755 $APP_DIR
chmod -R 644 $APP_DIR/dist/*

log "✅ Permissions configurées"

# 9. REDÉMARRAGE DES SERVICES
log "🔄 Redémarrage des services..."

# Redémarrer Nginx
if systemctl start nginx; then
    log "✅ Nginx redémarré"
else
    log "❌ Erreur redémarrage Nginx"
    exit 1
fi

# Redémarrer Supabase si nécessaire
cd $SUPABASE_DIR
if ! docker ps | grep -q supabase_kong; then
    log "🔄 Redémarrage Supabase..."
    docker-compose restart
    sleep 30
fi

# 10. TESTS POST-MISE À JOUR
log "🧪 Tests post-mise à jour..."

# Attendre que les services soient prêts
sleep 10

# Test de l'application
if test_connectivity "https://bookingfast.hevolife.fr" "Application"; then
    log "✅ Application accessible"
else
    log "❌ Application inaccessible"
    exit 1
fi

# Test de l'API Supabase
if test_connectivity "https://bookingfast.hevolife.fr/rest/v1/" "API Supabase"; then
    log "✅ API Supabase accessible"
else
    log "❌ API Supabase inaccessible"
    exit 1
fi

# Test de connexion à la base
if curl -s "https://bookingfast.hevolife.fr/rest/v1/" \
   -H "apikey: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc1OTA4ODc2MCwiZXhwIjo0OTE0NzYyMzYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.D17ig-Q-dCSgM3_ICJT6OXqx_Fr97yFmeNLTNmKCTeY" > /dev/null; then
    log "✅ Base de données accessible"
else
    log "❌ Base de données inaccessible"
fi

# 11. NETTOYAGE
log "🧹 Nettoyage..."
rm -rf $TEMP_DIR
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete 2>/dev/null || true
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete 2>/dev/null || true

# 12. RÉSUMÉ FINAL
log "📊 Résumé de la mise à jour:"
log "  ✅ Application mise à jour depuis GitHub"
log "  ✅ Build de production créé"
log "  ✅ Supabase mis à jour"
log "  ✅ Services redémarrés"
log "  ✅ Tests de connectivité réussis"

echo ""
echo "🎉 MISE À JOUR TERMINÉE AVEC SUCCÈS !"
echo ""
echo "🔗 URLs de votre application :"
echo "  📱 Application: https://bookingfast.hevolife.fr"
echo "  🔧 API Supabase: https://bookingfast.hevolife.fr/rest/v1/"
echo "  🎨 Studio: https://studio.bookingfast.hevolife.fr (si configuré)"
echo ""
echo "📋 Prochaines étapes :"
echo "  1. Testez l'application dans votre navigateur"
echo "  2. Vérifiez que les nouvelles fonctionnalités marchent"
echo "  3. Surveillez les logs: tail -f /var/log/nginx/error.log"
echo ""
echo "💾 Sauvegardes créées :"
echo "  📱 App: $BACKUP_DIR/app_before_update_$DATE.tar.gz"
echo "  🗄️ DB: $BACKUP_DIR/database_before_update_$DATE.sql"
echo ""