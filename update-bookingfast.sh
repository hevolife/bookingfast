#!/bin/bash
APP_DIR="/var/www/bookingfast"

echo "🔄 Début mise à jour BookingFast..."

# Aller dans le répertoire
cd $APP_DIR

# Sauvegarder avant mise à jour
/root/backup-bookingfast.sh

# Télécharger la nouvelle version (adaptez selon votre méthode)
git pull origin main  # Si Git
# ou télécharger et extraire le nouveau ZIP

# Installer les dépendances
npm ci --only=production

# Build de production
npm run build

# Redémarrer les services
systemctl reload nginx
pm2 restart all

echo "✅ Mise à jour terminée !"