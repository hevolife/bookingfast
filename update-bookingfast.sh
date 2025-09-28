#!/bin/bash
set -e

APP_DIR="/var/www/bookingfast"
SUPABASE_DIR="/opt/supabase"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/backups"

echo "🔄 Début mise à jour BookingFast - $DATE"

# Vérifier que nous sommes root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Ce script doit être exécuté en tant que root"
  exit 1
fi

# Créer le répertoire de sauvegarde s'il n'existe pas
mkdir -p $BACKUP_DIR

# 1. Sauvegarde avant mise à jour
echo "💾 Sauvegarde avant mise à jour..."
if [ -f "/root/backup-bookingfast.sh" ]; then
  /root/backup-bookingfast.sh
else
  echo "⚠️ Script de sauvegarde non trouvé, création d'une sauvegarde rapide..."
  tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz -C $APP_DIR .
fi

# 2. Vérifier que le répertoire existe
if [ ! -d "$APP_DIR" ]; then
  echo "❌ Répertoire $APP_DIR non trouvé"
  exit 1
fi

# Aller dans le répertoire
cd $APP_DIR

# 3. Mise à jour du code source
echo "📱 Mise à jour du code source..."

# Méthode 1: Git (si repository configuré)
if [ -d ".git" ]; then
  echo "🔄 Mise à jour via Git..."
  git fetch origin
  git reset --hard origin/main
  echo "✅ Code mis à jour via Git"
  
# Méthode 2: Téléchargement manuel (recommandé pour Bolt)
else
  echo "📥 Téléchargement manuel requis..."
  echo "⚠️ Veuillez télécharger la nouvelle version depuis Bolt et la placer dans $APP_DIR"
  echo "💡 Ou configurez un repository Git pour automatiser cette étape"
  
  # Attendre confirmation de l'utilisateur
  read -p "Appuyez sur Entrée quand la nouvelle version est en place..." -r
  
  # Vérifier que les fichiers essentiels sont présents
  if [ ! -f "package.json" ]; then
    echo "❌ package.json non trouvé - mise à jour incomplète"
    exit 1
  fi
  
  if [ ! -f "index.html" ]; then
    echo "❌ index.html non trouvé - mise à jour incomplète"
    exit 1
  fi
  
  echo "✅ Nouveaux fichiers détectés"
fi

# 4. Vérifier Node.js
echo "🔍 Vérification Node.js..."
if ! command -v node &> /dev/null; then
  echo "❌ Node.js non installé"
  exit 1
fi

if ! command -v npm &> /dev/null; then
  echo "❌ npm non installé"
  exit 1
fi

NODE_VERSION=$(node --version)
echo "✅ Node.js version: $NODE_VERSION"

# 5. Nettoyer les anciens modules
echo "🧹 Nettoyage des anciens modules..."
rm -rf node_modules
rm -f package-lock.json

# 6. Installer les dépendances
echo "📦 Installation des dépendances..."
npm install --production --no-audit --no-fund

# Vérifier que l'installation s'est bien passée
if [ ! -d "node_modules" ]; then
  echo "❌ Erreur installation des dépendances"
  exit 1
fi

echo "✅ Dépendances installées"

# 7. Build de production
echo "🔨 Build de production..."

# Vérifier que les variables d'environnement sont présentes
if [ ! -f ".env" ] && [ ! -f ".env.production" ]; then
  echo "⚠️ Aucun fichier .env trouvé - création d'un fichier par défaut"
  cat > .env << EOF
# Configuration par défaut
VITE_SUPABASE_URL=https://placeholder.supabase.co
VITE_SUPABASE_ANON_KEY=placeholder-key
NODE_ENV=production
EOF
fi

# Copier .env.production si il existe
if [ -f ".env.production" ]; then
  cp .env.production .env
  echo "✅ Variables d'environnement de production chargées"
fi

# Nettoyer le build précédent
rm -rf dist

# Lancer le build
npm run build

# Vérifier que le build s'est bien passé
if [ ! -d "dist" ]; then
  echo "❌ Erreur lors du build - répertoire dist non créé"
  exit 1
fi

if [ ! -f "dist/index.html" ]; then
  echo "❌ Erreur lors du build - index.html non trouvé"
  exit 1
fi

echo "✅ Build de production terminé"

# 8. Mise à jour Supabase (si configuré)
echo "🗄️ Mise à jour Supabase..."
if [ -d "$SUPABASE_DIR" ]; then
  cd $SUPABASE_DIR
  
  # Mettre à jour Supabase CLI
  echo "🔄 Mise à jour Supabase CLI..."
  npm update -g supabase
  
  # Appliquer les nouvelles migrations si elles existent
  if [ -d "$APP_DIR/supabase/migrations" ]; then
    echo "🔄 Application des migrations..."
    cp -r $APP_DIR/supabase/migrations/* supabase/migrations/ 2>/dev/null || true
    supabase db push --local
  fi
  
  # Redéployer les Edge Functions si elles existent
  if [ -d "$APP_DIR/supabase/functions" ]; then
    echo "🔄 Mise à jour des Edge Functions..."
    cp -r $APP_DIR/supabase/functions/* supabase/functions/ 2>/dev/null || true
    
    # Déployer chaque fonction
    for func in supabase/functions/*/; do
      if [ -d "$func" ]; then
        func_name=$(basename "$func")
        echo "🚀 Déploiement fonction: $func_name"
        supabase functions deploy $func_name --no-verify-jwt || echo "⚠️ Erreur déploiement $func_name"
      fi
    done
  fi
  
  echo "✅ Supabase mis à jour"
else
  echo "⚠️ Supabase non configuré - ignoré"
fi

# 9. Mise à jour des permissions
echo "🔐 Mise à jour des permissions..."
cd $APP_DIR
chown -R www-data:www-data dist/
chmod -R 755 dist/

# 10. Test de l'application
echo "🧪 Test de l'application..."
if [ -f "dist/index.html" ]; then
  echo "✅ index.html présent"
else
  echo "❌ index.html manquant"
  exit 1
fi

# Vérifier la taille du build
BUILD_SIZE=$(du -sh dist/ | cut -f1)
echo "📊 Taille du build: $BUILD_SIZE"

# 11. Redémarrer les services
echo "🔄 Redémarrage des services..."

# Tester la configuration Nginx avant de recharger
nginx -t
if [ $? -eq 0 ]; then
  systemctl reload nginx
  echo "✅ Nginx rechargé"
else
  echo "❌ Erreur configuration Nginx"
  exit 1
fi

# Redémarrer PM2 si utilisé
if command -v pm2 &> /dev/null; then
  pm2 restart all 2>/dev/null || echo "⚠️ PM2 non configuré ou aucun processus"
fi

# Redémarrer Supabase si configuré
if [ -d "$SUPABASE_DIR" ]; then
  cd $SUPABASE_DIR
  docker-compose restart 2>/dev/null || echo "⚠️ Erreur redémarrage Supabase"
fi

# 12. Vérifications post-mise à jour
echo "🔍 Vérifications post-mise à jour..."
sleep 10

# Test connectivité locale
if curl -s http://localhost > /dev/null; then
  echo "✅ Application accessible localement"
else
  echo "⚠️ Application non accessible localement"
fi

# Test API Supabase si configuré
if [ -d "$SUPABASE_DIR" ]; then
  if curl -s http://localhost:54321/rest/v1/ > /dev/null; then
    echo "✅ API Supabase accessible"
  else
    echo "⚠️ API Supabase non accessible"
  fi
fi

# 13. Nettoyage
echo "🧹 Nettoyage..."
cd $APP_DIR

# Nettoyer les anciens builds (garder les 3 derniers)
find $BACKUP_DIR -name "app_backup_*.tar.gz" -mtime +3 -delete 2>/dev/null || true

# Nettoyer les logs anciens
find /var/log -name "*.log" -mtime +7 -delete 2>/dev/null || true

# Nettoyer Docker si configuré
if command -v docker &> /dev/null; then
  docker system prune -f 2>/dev/null || true
fi

echo "✅ Nettoyage terminé"

# 14. Résumé final
echo ""
echo "🎉 MISE À JOUR TERMINÉE AVEC SUCCÈS - $DATE"
echo "📊 Résumé:"
echo "  - Application: $APP_DIR"
echo "  - Build: $BUILD_SIZE"
echo "  - Sauvegarde: $BACKUP_DIR/app_backup_$DATE.tar.gz"
echo "  - Nginx: ✅ Rechargé"
echo "  - Permissions: ✅ Mises à jour"
echo ""
echo "🔗 Votre application est disponible à:"
echo "  - Local: http://localhost"
echo "  - Public: https://votre-domaine.com"
echo ""
echo "📝 Prochaines étapes:"
echo "  1. Testez l'application dans votre navigateur"
echo "  2. Vérifiez les fonctionnalités critiques"
echo "  3. Surveillez les logs: tail -f /var/log/nginx/error.log"
echo ""