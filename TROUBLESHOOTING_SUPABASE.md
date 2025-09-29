# 🔧 **Guide de Dépannage Supabase Self-Hosted**

## 🚨 **Diagnostic Rapide**

### **1. Vérifier l'état des services**
```bash
# Aller dans le répertoire Supabase
cd /opt/supabase

# Vérifier l'état des containers
docker-compose ps

# Vérifier les logs
docker-compose logs --tail=50
```

### **2. Vérifier la connectivité réseau**
```bash
# Test de connectivité locale
curl -I http://localhost:54321/rest/v1/

# Test de connectivité externe
curl -I https://api.bookingfast.hevolife.fr/rest/v1/

# Test DNS
nslookup api.bookingfast.hevolife.fr
```

### **3. Vérifier Nginx**
```bash
# Statut Nginx
systemctl status nginx

# Test configuration
nginx -t

# Logs Nginx
tail -f /var/log/nginx/error.log
```

---

## 🔍 **Problèmes Courants et Solutions**

### **❌ Problème 1: Services Supabase arrêtés**

**Symptômes :**
- Erreur "Connection refused"
- Aucune réponse sur les ports 54321, 54322, 54323

**Solution :**
```bash
cd /opt/supabase

# Arrêter tous les services
docker-compose down

# Nettoyer les containers
docker system prune -f

# Redémarrer
docker-compose up -d

# Attendre que tous les services soient prêts
sleep 60

# Vérifier l'état
docker-compose ps
```

### **❌ Problème 2: Configuration Nginx incorrecte**

**Symptômes :**
- Erreur 502 Bad Gateway
- Erreur 404 sur l'API

**Solution :**
```bash
# Vérifier la configuration
nano /etc/nginx/sites-available/bookingfast
```

**Configuration correcte pour l'API :**
```nginx
# API Supabase
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.bookingfast.hevolife.fr;

    # SSL
    ssl_certificate /etc/letsencrypt/live/bookingfast.hevolife.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bookingfast.hevolife.fr/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Proxy vers Supabase API
    location / {
        proxy_pass http://localhost:54321;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "authorization, x-client-info, apikey, content-type" always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin * always;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
            add_header Access-Control-Allow-Headers "authorization, x-client-info, apikey, content-type" always;
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
    }
}
```

```bash
# Tester et recharger
nginx -t && systemctl reload nginx
```

### **❌ Problème 3: Variables d'environnement incorrectes**

**Symptômes :**
- Erreur "Invalid API key"
- Erreur d'authentification

**Solution :**
```bash
cd /opt/supabase

# Vérifier les variables
cat .env

# Récupérer les bonnes clés
supabase status
```

**Variables requises dans `.env` :**
```env
POSTGRES_PASSWORD=votre-mot-de-passe-postgres
JWT_SECRET=votre-jwt-secret
ANON_KEY=votre-anon-key-supabase
SERVICE_ROLE_KEY=votre-service-role-key
```

### **❌ Problème 4: Base de données non accessible**

**Symptômes :**
- Erreur "Connection to database failed"
- Services Supabase en erreur

**Solution :**
```bash
# Vérifier le container PostgreSQL
docker logs supabase_db_1

# Redémarrer seulement la DB
docker-compose restart db

# Vérifier la connectivité DB
docker exec -it supabase_db_1 psql -U postgres -d postgres -c "SELECT version();"
```

### **❌ Problème 5: Certificats SSL expirés**

**Symptômes :**
- Erreur SSL/TLS
- "Certificate has expired"

**Solution :**
```bash
# Vérifier l'expiration
openssl x509 -in /etc/letsencrypt/live/bookingfast.hevolife.fr/cert.pem -text -noout | grep "Not After"

# Renouveler si nécessaire
certbot renew --force-renewal

# Redémarrer Nginx
systemctl reload nginx
```

### **❌ Problème 6: Ports bloqués par le firewall**

**Symptômes :**
- Timeout de connexion
- Services inaccessibles

**Solution :**
```bash
# Vérifier UFW
ufw status

# Autoriser les ports Supabase (temporairement pour debug)
ufw allow 54321
ufw allow 54322
ufw allow 54323

# Tester la connectivité directe
curl http://localhost:54321/rest/v1/
```

---

## 🛠️ **Script de Diagnostic Automatique**

Créez ce script pour diagnostiquer automatiquement :

```bash
nano /root/diagnose-supabase.sh
```

```bash
#!/bin/bash
echo "🔍 DIAGNOSTIC SUPABASE SELF-HOSTED"
echo "=================================="

# 1. Vérifier Docker
echo "1️⃣ Docker:"
if systemctl is-active --quiet docker; then
    echo "✅ Docker actif"
else
    echo "❌ Docker inactif"
    systemctl start docker
fi

# 2. Vérifier les containers Supabase
echo "2️⃣ Containers Supabase:"
cd /opt/supabase
docker-compose ps

# 3. Vérifier les ports
echo "3️⃣ Ports:"
netstat -tlnp | grep -E "(54321|54322|54323)"

# 4. Test connectivité locale
echo "4️⃣ Connectivité locale:"
curl -s -o /dev/null -w "API (54321): %{http_code}\n" http://localhost:54321/rest/v1/ || echo "API (54321): ERREUR"
curl -s -o /dev/null -w "Studio (54323): %{http_code}\n" http://localhost:54323/ || echo "Studio (54323): ERREUR"

# 5. Test connectivité externe
echo "5️⃣ Connectivité externe:"
curl -s -o /dev/null -w "API externe: %{http_code}\n" https://api.bookingfast.hevolife.fr/rest/v1/ || echo "API externe: ERREUR"

# 6. Vérifier Nginx
echo "6️⃣ Nginx:"
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx actif"
    nginx -t && echo "✅ Configuration valide" || echo "❌ Configuration invalide"
else
    echo "❌ Nginx inactif"
fi

# 7. Vérifier les certificats SSL
echo "7️⃣ Certificats SSL:"
if [ -f "/etc/letsencrypt/live/bookingfast.hevolife.fr/cert.pem" ]; then
    EXPIRY=$(openssl x509 -in /etc/letsencrypt/live/bookingfast.hevolife.fr/cert.pem -text -noout | grep "Not After" | cut -d: -f2-)
    echo "📅 Expire le:$EXPIRY"
else
    echo "❌ Certificat SSL non trouvé"
fi

# 8. Vérifier les variables d'environnement
echo "8️⃣ Variables d'environnement:"
if [ -f "/opt/supabase/.env" ]; then
    echo "✅ Fichier .env trouvé"
    echo "🔑 Variables définies:"
    grep -E "^[A-Z_]+" /opt/supabase/.env | cut -d= -f1 | sort
else
    echo "❌ Fichier .env manquant"
fi

echo ""
echo "🎯 RÉSUMÉ DU DIAGNOSTIC"
echo "======================"
```

```bash
chmod +x /root/diagnose-supabase.sh
/root/diagnose-supabase.sh
```

---

## 🚀 **Script de Réparation Automatique**

```bash
nano /root/fix-supabase.sh
```

```bash
#!/bin/bash
set -e

echo "🔧 RÉPARATION AUTOMATIQUE SUPABASE"
echo "=================================="

# 1. Arrêter tous les services
echo "🛑 Arrêt des services..."
cd /opt/supabase
docker-compose down

# 2. Nettoyer Docker
echo "🧹 Nettoyage Docker..."
docker system prune -f
docker volume prune -f

# 3. Vérifier la configuration
echo "⚙️ Vérification configuration..."
if [ ! -f ".env" ]; then
    echo "❌ Fichier .env manquant - création..."
    cat > .env << EOF
POSTGRES_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=$(openssl rand -base64 16)
API_EXTERNAL_URL=https://api.bookingfast.hevolife.fr
SUPABASE_PUBLIC_URL=https://api.bookingfast.hevolife.fr
EOF
    echo "✅ Fichier .env créé"
fi

# 4. Redémarrer les services
echo "🚀 Redémarrage des services..."
docker-compose up -d

# 5. Attendre que les services soient prêts
echo "⏳ Attente des services (60s)..."
sleep 60

# 6. Vérifier l'état
echo "🔍 Vérification de l'état..."
docker-compose ps

# 7. Test de connectivité
echo "🧪 Test de connectivité..."
for i in {1..10}; do
    if curl -s http://localhost:54321/rest/v1/ > /dev/null; then
        echo "✅ API accessible après ${i}0 secondes"
        break
    fi
    echo "⏳ Tentative $i/10..."
    sleep 10
done

# 8. Afficher les informations de connexion
echo "📊 Informations de connexion:"
supabase status

echo "✅ Réparation terminée !"
```

```bash
chmod +x /root/fix-supabase.sh
/root/fix-supabase.sh
```

---

## 🔄 **Redémarrage Complet (Solution Radicale)**

Si rien ne fonctionne, redémarrage complet :

```bash
# 1. Arrêter tout
cd /opt/supabase
docker-compose down
docker system prune -af
docker volume prune -f

# 2. Sauvegarder les données importantes
pg_dump "postgresql://postgres:$(grep POSTGRES_PASSWORD .env | cut -d '=' -f2)@localhost:54322/postgres" > /root/backup_before_restart.sql

# 3. Supprimer et recréer
rm -rf volumes/
supabase stop
supabase start

# 4. Restaurer les données
sleep 60
psql "postgresql://postgres:$(grep POSTGRES_PASSWORD .env | cut -d '=' -f2)@localhost:54322/postgres" < /root/backup_before_restart.sql

# 5. Redéployer les Edge Functions
supabase functions deploy stripe-webhook
supabase functions deploy public-booking-data
```

---

## 📞 **Commandes de Debug Essentielles**

```bash
# Logs en temps réel
docker-compose logs -f

# Logs spécifiques
docker-compose logs kong
docker-compose logs db
docker-compose logs auth

# État détaillé
docker inspect supabase_kong_1
docker inspect supabase_db_1

# Processus réseau
netstat -tlnp | grep -E "(54321|54322|54323|80|443)"

# Espace disque
df -h

# Mémoire
free -h

# Processus Docker
docker stats
```

---

## 🎯 **Checklist de Vérification**

- [ ] Docker est actif : `systemctl status docker`
- [ ] Containers Supabase démarrés : `docker-compose ps`
- [ ] Ports ouverts : `netstat -tlnp | grep 54321`
- [ ] Nginx actif : `systemctl status nginx`
- [ ] Configuration Nginx valide : `nginx -t`
- [ ] Certificats SSL valides : `openssl x509 -in /etc/letsencrypt/live/bookingfast.hevolife.fr/cert.pem -text -noout | grep "Not After"`
- [ ] DNS résolu : `nslookup api.bookingfast.hevolife.fr`
- [ ] API accessible localement : `curl http://localhost:54321/rest/v1/`
- [ ] API accessible externement : `curl https://api.bookingfast.hevolife.fr/rest/v1/`
- [ ] Variables d'environnement définies : `cat /opt/supabase/.env`

---

## 🆘 **Si Rien Ne Fonctionne**

### **Option 1: Réinstallation Complète**
```bash
# Sauvegarder les données
pg_dump "postgresql://postgres:$(grep POSTGRES_PASSWORD /opt/supabase/.env | cut -d '=' -f2)@localhost:54322/postgres" > /root/full_backup.sql

# Supprimer complètement
rm -rf /opt/supabase
docker system prune -af

# Réinstaller
mkdir -p /opt/supabase
cd /opt/supabase
supabase init
supabase start

# Restaurer
psql "postgresql://postgres:$(grep POSTGRES_PASSWORD .env | cut -d '=' -f2)@localhost:54322/postgres" < /root/full_backup.sql
```

### **Option 2: Migration vers Supabase Cloud**
Si le self-hosting pose trop de problèmes :

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Exporter vos données : `supabase db dump > backup.sql`
3. Importer dans le cloud via l'interface Supabase
4. Mettre à jour vos variables d'environnement

---

## 📱 **Test de l'Application**

Une fois Supabase réparé :

```bash
# 1. Vérifier l'API
curl -H "apikey: $(grep ANON_KEY /opt/supabase/.env | cut -d '=' -f2)" \
     https://api.bookingfast.hevolife.fr/rest/v1/users

# 2. Test d'authentification
curl -X POST https://api.bookingfast.hevolife.fr/auth/v1/signup \
     -H "apikey: $(grep ANON_KEY /opt/supabase/.env | cut -d '=' -f2)" \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"testpass123"}'

# 3. Redémarrer l'application
cd /var/www/bookingfast
npm run dev
```

---

## 🔗 **URLs à Tester**

Après réparation, testez ces URLs :

- **API :** https://api.bookingfast.hevolife.fr/rest/v1/
- **Auth :** https://api.bookingfast.hevolife.fr/auth/v1/settings
- **Studio :** https://studio.bookingfast.hevolife.fr
- **Application :** https://bookingfast.hevolife.fr

---

## 📞 **Support Avancé**

Si le problème persiste :

1. **Collectez les logs :**
```bash
# Créer un rapport complet
/root/diagnose-supabase.sh > /root/diagnostic_$(date +%Y%m%d_%H%M%S).txt
docker-compose logs > /root/docker_logs_$(date +%Y%m%d_%H%M%S).txt
tail -100 /var/log/nginx/error.log > /root/nginx_logs_$(date +%Y%m%d_%H%M%S).txt
```

2. **Vérifiez la configuration réseau de votre VPS**
3. **Contactez votre hébergeur si les ports sont bloqués**

---

## 🎉 **Une Fois Réparé**

Votre Supabase self-hosted devrait être accessible :
- ✅ API fonctionnelle
- ✅ Authentification opérationnelle  
- ✅ Base de données accessible
- ✅ Edge Functions déployées
- ✅ Application BookingFast connectée

**Temps de réparation estimé :** 15-30 minutes selon le problème.