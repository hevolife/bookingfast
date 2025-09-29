#!/bin/bash
set -e

echo "🚀 RÉPARATION RAPIDE SUPABASE SELF-HOSTED"
echo "========================================"

# Fonction de log avec timestamp
log() {
    echo "[$(date '+%H:%M:%S')] $1"
}

# Vérifier que nous sommes root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Ce script doit être exécuté en tant que root"
    exit 1
fi

# 1. Vérifier et démarrer Docker
log "🐳 Vérification Docker..."
if ! systemctl is-active --quiet docker; then
    log "🔄 Démarrage Docker..."
    systemctl start docker
    systemctl enable docker
    sleep 5
fi
log "✅ Docker actif"

# 2. Aller dans le répertoire Supabase
if [ ! -d "/opt/supabase" ]; then
    log "❌ Répertoire /opt/supabase non trouvé"
    log "💡 Lancez d'abord l'installation complète"
    exit 1
fi

cd /opt/supabase
log "📁 Répertoire: $(pwd)"

# 3. Arrêter les services existants
log "🛑 Arrêt des services Supabase..."
docker-compose down --remove-orphans

# 4. Nettoyer Docker (optionnel - décommentez si nécessaire)
# log "🧹 Nettoyage Docker..."
# docker system prune -f

# 5. Vérifier la configuration
log "⚙️ Vérification configuration..."
if [ ! -f ".env" ]; then
    log "❌ Fichier .env manquant - création avec valeurs par défaut..."
    cat > .env << EOF
# Configuration Supabase Self-Hosted
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-32)
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-12)
API_EXTERNAL_URL=https://api.bookingfast.hevolife.fr
SUPABASE_PUBLIC_URL=https://api.bookingfast.hevolife.fr
STUDIO_DEFAULT_ORGANIZATION=BookingFast
STUDIO_DEFAULT_PROJECT=Production
EOF
    log "✅ Fichier .env créé avec nouvelles clés"
else
    log "✅ Fichier .env trouvé"
fi

# 6. Redémarrer les services
log "🚀 Redémarrage des services Supabase..."
docker-compose up -d

# 7. Attendre que les services soient prêts
log "⏳ Attente des services (90 secondes)..."
sleep 30

# Vérifier progressivement
for i in {1..6}; do
    log "🔍 Vérification $i/6..."
    if curl -s http://localhost:54321/rest/v1/ > /dev/null 2>&1; then
        log "✅ API accessible après $((i*10)) secondes"
        break
    fi
    if [ $i -eq 6 ]; then
        log "❌ API toujours inaccessible après 60 secondes"
    fi
    sleep 10
done

# 8. Vérifier l'état des containers
log "📊 État des containers:"
docker-compose ps

# 9. Afficher les informations de connexion
log "📋 Informations de connexion:"
if command -v supabase > /dev/null 2>&1; then
    supabase status 2>/dev/null || log "⚠️ Impossible d'obtenir le statut Supabase"
else
    log "⚠️ CLI Supabase non installée"
fi

# 10. Test de connectivité
log "🧪 Tests de connectivité:"

# Test API locale
if curl -s -o /dev/null -w "%{http_code}" http://localhost:54321/rest/v1/ | grep -q "200"; then
    log "✅ API locale accessible (port 54321)"
else
    log "❌ API locale inaccessible"
fi

# Test Studio local
if curl -s -o /dev/null -w "%{http_code}" http://localhost:54323/ | grep -q "200"; then
    log "✅ Studio local accessible (port 54323)"
else
    log "❌ Studio local inaccessible"
fi

# Test base de données
if docker exec supabase_db_1 pg_isready -U postgres > /dev/null 2>&1; then
    log "✅ Base de données accessible"
else
    log "❌ Base de données inaccessible"
fi

# 11. Vérifier et corriger Nginx si nécessaire
log "🌐 Vérification Nginx..."
if systemctl is-active --quiet nginx; then
    if nginx -t > /dev/null 2>&1; then
        log "✅ Nginx actif et configuration valide"
        systemctl reload nginx
    else
        log "❌ Configuration Nginx invalide"
        log "💡 Vérifiez /etc/nginx/sites-available/bookingfast"
    fi
else
    log "❌ Nginx inactif"
    systemctl start nginx
fi

# 12. Test final externe
log "🌍 Test connectivité externe..."
if curl -s -o /dev/null -w "%{http_code}" https://api.bookingfast.hevolife.fr/rest/v1/ | grep -q "200"; then
    log "✅ API externe accessible"
else
    log "❌ API externe inaccessible"
    log "💡 Vérifiez la configuration DNS et Nginx"
fi

# 13. Résumé final
echo ""
log "🎯 RÉSUMÉ DE LA RÉPARATION"
log "========================="
log "📅 Date: $(date)"
log "🐳 Docker: $(systemctl is-active docker)"
log "🗄️ Supabase: $(docker-compose ps --services --filter status=running | wc -l)/$(docker-compose ps --services | wc -l) services actifs"
log "🌐 Nginx: $(systemctl is-active nginx)"
log ""
log "🔗 URLs à tester:"
log "  📱 Application: https://bookingfast.hevolife.fr"
log "  🗄️ API: https://api.bookingfast.hevolife.fr/rest/v1/"
log "  🎨 Studio: https://studio.bookingfast.hevolife.fr"
log ""
log "💡 Si l'API externe ne fonctionne toujours pas:"
log "  1. Vérifiez votre DNS: nslookup api.bookingfast.hevolife.fr"
log "  2. Vérifiez les certificats SSL: certbot certificates"
log "  3. Vérifiez les logs Nginx: tail -f /var/log/nginx/error.log"
log ""
log "🎉 Réparation terminée !"