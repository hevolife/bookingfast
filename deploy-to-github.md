# 🚀 Guide de Déploiement GitHub → VPS

## 📋 **ÉTAPES POUR METTRE À JOUR VOTRE VPS**

### **1️⃣ PRÉPARER LE REPOSITORY GITHUB**

#### **Créer le repository (si pas encore fait) :**
```bash
# Sur votre machine locale
git init
git add .
git commit -m "Initial commit - BookingFast"
git branch -M main
git remote add origin https://github.com/VOTRE-USERNAME/bookingfast.git
git push -u origin main
```

#### **Ou mettre à jour un repository existant :**
```bash
git add .
git commit -m "Update: Nouvelle version BookingFast"
git push origin main
```

---

### **2️⃣ CONFIGURER LE SCRIPT SUR LE VPS**

#### **Copier le script sur votre VPS :**
```bash
# Depuis votre machine locale
scp update-vps.sh root@VOTRE-IP-VPS:/root/

# Ou directement sur le VPS
nano /root/update-vps.sh
# Coller le contenu du script
```

#### **Rendre le script exécutable :**
```bash
chmod +x /root/update-vps.sh
```

#### **Modifier la configuration dans le script :**
```bash
nano /root/update-vps.sh
```

**Changez cette ligne :**
```bash
GITHUB_REPO="votre-username/bookingfast"  # ⚠️ MODIFIEZ AVEC VOTRE REPO
```

**Par exemple :**
```bash
GITHUB_REPO="johndoe/bookingfast"
```

---

### **3️⃣ RÉCUPÉRER LA CLÉ ANON SUPABASE**

#### **Sur votre VPS, dans Supabase :**
```bash
cd /opt/supabase
supabase status
```

**Cherchez une ligne comme :**
```
anon key: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

#### **Ou dans les logs :**
```bash
docker logs supabase_kong_1 | grep -i anon
```

#### **Ou dans la configuration :**
```bash
cat .env | grep ANON
```

---

### **4️⃣ EXÉCUTER LA MISE À JOUR**

#### **Première mise à jour :**
```bash
cd /root
./update-vps.sh
```

#### **Mise à jour depuis une branche spécifique :**
```bash
./update-vps.sh develop
./update-vps.sh feature/nouvelle-fonctionnalite
```

---

### **5️⃣ AUTOMATISER LES MISES À JOUR**

#### **Créer un webhook GitHub (optionnel) :**

**Script webhook :**
```bash
nano /root/github-webhook.sh
```

```bash
#!/bin/bash
# Webhook pour mise à jour automatique
cd /root
./update-vps.sh main > /var/log/github-webhook.log 2>&1
```

```bash
chmod +x /root/github-webhook.sh
```

#### **Ou programmer des mises à jour automatiques :**
```bash
crontab -e
```

**Ajouter :**
```bash
# Mise à jour automatique tous les jours à 3h du matin
0 3 * * * /root/update-vps.sh main >> /var/log/auto-update.log 2>&1

# Ou mise à jour manuelle déclenchée par un fichier
*/5 * * * * [ -f /tmp/trigger-update ] && /root/update-vps.sh main && rm /tmp/trigger-update
```

---

### **6️⃣ DÉCLENCHER UNE MISE À JOUR**

#### **Depuis votre machine locale :**
```bash
# Créer le fichier déclencheur
ssh root@VOTRE-IP-VPS "touch /tmp/trigger-update"
```

#### **Ou directement sur le VPS :**
```bash
/root/update-vps.sh
```

---

### **7️⃣ SURVEILLER LES MISES À JOUR**

#### **Logs en temps réel :**
```bash
tail -f /var/log/auto-update.log
```

#### **Vérifier les services :**
```bash
systemctl status nginx
docker ps | grep supabase
```

#### **Tester l'application :**
```bash
curl -I https://bookingfast.hevolife.fr
curl -I https://bookingfast.hevolife.fr/rest/v1/
```

---

## **🔧 WORKFLOW COMPLET DE DÉVELOPPEMENT**

### **Sur votre machine de développement :**
```bash
# 1. Faire vos modifications
# 2. Tester localement
npm run dev

# 3. Commiter et pousser
git add .
git commit -m "Feature: Nouvelle fonctionnalité"
git push origin main

# 4. Déclencher la mise à jour VPS
ssh root@VOTRE-IP-VPS "/root/update-vps.sh"
```

### **Ou avec déclenchement automatique :**
```bash
# 1. Pousser sur GitHub
git push origin main

# 2. Attendre 5 minutes (cron job)
# 3. Vérifier que la mise à jour s'est bien passée
ssh root@VOTRE-IP-VPS "tail -20 /var/log/auto-update.log"
```

---

## **🚨 DÉPANNAGE**

### **Erreur de clonage GitHub :**
```bash
# Vérifier la connectivité
ping github.com

# Tester le clonage manuel
git clone https://github.com/VOTRE-USERNAME/bookingfast.git /tmp/test-clone
```

### **Erreur de build :**
```bash
# Vérifier Node.js
node --version  # Doit être 18+

# Nettoyer et réinstaller
rm -rf node_modules package-lock.json
npm install
npm run build
```

### **Services qui ne redémarrent pas :**
```bash
# Redémarrer manuellement
systemctl restart nginx
cd /opt/supabase && docker-compose restart
```

### **Rollback en cas de problème :**
```bash
# Restaurer l'ancienne version
cd /var/www
rm -rf bookingfast
tar -xzf /root/backups/app_before_update_YYYYMMDD_HHMMSS.tar.gz -C bookingfast/
systemctl restart nginx
```

---

## **💡 CONSEILS**

### **🔄 Mises à jour fréquentes :**
- **Testez** toujours en local avant de pousser
- **Utilisez** des branches pour les fonctionnalités
- **Faites** des commits atomiques avec des messages clairs

### **🛡️ Sécurité :**
- **Ne commitez jamais** les fichiers `.env` avec les vraies clés
- **Utilisez** des secrets GitHub pour les clés sensibles
- **Limitez** l'accès SSH à votre VPS

### **📊 Monitoring :**
- **Surveillez** les logs après chaque mise à jour
- **Testez** les fonctionnalités critiques
- **Gardez** les sauvegardes pendant au moins 7 jours

---

## **🎯 COMMANDES RAPIDES**

```bash
# Mise à jour rapide
ssh root@VOTRE-IP-VPS "/root/update-vps.sh"

# Vérifier le statut
ssh root@VOTRE-IP-VPS "systemctl status nginx && docker ps | grep supabase"

# Voir les logs
ssh root@VOTRE-IP-VPS "tail -f /var/log/nginx/error.log"
```

**Votre workflow de mise à jour est maintenant automatisé ! 🚀**