# 🚀 Configuration Supabase Self-Hosted pour BookingFast

## 📋 Étapes d'installation complète

### 1️⃣ **Vérifier votre installation Supabase**

Connectez-vous à votre Supabase self-hosted et vérifiez que vous avez accès à :
- **Studio** : `https://studio.votre-domaine.com`
- **API** : `https://api.votre-domaine.com`

### 2️⃣ **Créer les tables de base de données**

Dans **Supabase Studio** → **SQL Editor**, exécutez ce script pour créer toutes les tables :

```sql
-- Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Table users (profils utilisateurs)
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text UNIQUE NOT NULL,
    full_name text,
    is_super_admin boolean DEFAULT false,
    subscription_status text DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled')),
    trial_started_at timestamptz DEFAULT now(),
    trial_ends_at timestamptz DEFAULT (now() + interval '7 days'),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Table services
CREATE TABLE IF NOT EXISTS services (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    price_ht numeric(10,2) DEFAULT 0,
    price_ttc numeric(10,2) DEFAULT 0,
    image_url text,
    description text DEFAULT '',
    duration_minutes integer DEFAULT 60,
    capacity integer DEFAULT 1,
    unit_name text,
    availability_hours jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Table clients
CREATE TABLE IF NOT EXISTS clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    firstname text NOT NULL,
    lastname text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, email)
);

-- Table bookings
CREATE TABLE IF NOT EXISTS bookings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    service_id uuid REFERENCES services(id) ON DELETE CASCADE NOT NULL,
    date date NOT NULL,
    time time NOT NULL,
    duration_minutes integer NOT NULL,
    quantity integer DEFAULT 1,
    client_name text NOT NULL,
    client_firstname text NOT NULL,
    client_email text NOT NULL,
    client_phone text NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'completed')),
    payment_amount numeric(10,2) DEFAULT 0,
    payment_link text,
    transactions jsonb DEFAULT '[]',
    booking_status text DEFAULT 'pending' CHECK (booking_status IN ('pending', 'confirmed', 'cancelled')),
    assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    custom_service_data jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Table business_settings
CREATE TABLE IF NOT EXISTS business_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    business_name text DEFAULT 'BookingFast',
    primary_color text DEFAULT '#3B82F6',
    secondary_color text DEFAULT '#8B5CF6',
    logo_url text,
    opening_hours jsonb DEFAULT '{
        "monday": {"ranges": [{"start": "08:00", "end": "18:00"}], "closed": false},
        "tuesday": {"ranges": [{"start": "08:00", "end": "18:00"}], "closed": false},
        "wednesday": {"ranges": [{"start": "08:00", "end": "18:00"}], "closed": false},
        "thursday": {"ranges": [{"start": "08:00", "end": "18:00"}], "closed": false},
        "friday": {"ranges": [{"start": "08:00", "end": "18:00"}], "closed": false},
        "saturday": {"ranges": [{"start": "09:00", "end": "17:00"}], "closed": false},
        "sunday": {"ranges": [{"start": "10:00", "end": "16:00"}], "closed": true}
    }',
    buffer_minutes integer DEFAULT 15,
    default_deposit_percentage integer DEFAULT 30,
    deposit_type text DEFAULT 'percentage' CHECK (deposit_type IN ('percentage', 'fixed_amount')),
    deposit_fixed_amount numeric(10,2) DEFAULT 20.00,
    minimum_booking_delay_hours integer DEFAULT 24,
    payment_link_expiry_minutes integer DEFAULT 30 CHECK (payment_link_expiry_minutes >= 5 AND payment_link_expiry_minutes <= 1440),
    email_notifications boolean DEFAULT true,
    brevo_enabled boolean DEFAULT false,
    brevo_api_key text,
    brevo_sender_email text,
    brevo_sender_name text DEFAULT 'BookingFast',
    stripe_enabled boolean DEFAULT false,
    stripe_public_key text CHECK (stripe_public_key IS NULL OR stripe_public_key ~ '^pk_(test_|live_)[a-zA-Z0-9]+$'),
    stripe_secret_key text CHECK (stripe_secret_key IS NULL OR stripe_secret_key ~ '^sk_(test_|live_)[a-zA-Z0-9]+$'),
    stripe_webhook_secret text CHECK (stripe_webhook_secret IS NULL OR stripe_webhook_secret ~ '^whsec_[a-zA-Z0-9]+$'),
    timezone text DEFAULT 'Europe/Paris' CHECK (timezone ~ '^[A-Za-z_]+/[A-Za-z_]+$' OR timezone = 'UTC'),
    enable_user_assignment boolean DEFAULT false,
    iframe_services jsonb DEFAULT '[]',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Table email_templates
CREATE TABLE IF NOT EXISTS email_templates (
    id text PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    description text DEFAULT '',
    subject text NOT NULL,
    html_content text DEFAULT '',
    text_content text DEFAULT '',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Table email_workflows
CREATE TABLE IF NOT EXISTS email_workflows (
    id text PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    description text DEFAULT '',
    trigger text NOT NULL,
    template_id text REFERENCES email_templates(id) NOT NULL,
    delay integer DEFAULT 0,
    active boolean DEFAULT true,
    conditions jsonb DEFAULT '[]',
    sent_count integer DEFAULT 0,
    success_rate integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Table team_members
CREATE TABLE IF NOT EXISTS team_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    email text NOT NULL,
    full_name text,
    role_name text DEFAULT 'employee',
    permissions jsonb DEFAULT '[]',
    is_active boolean DEFAULT true,
    invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    invited_at timestamptz DEFAULT now(),
    joined_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(owner_id, email),
    UNIQUE(owner_id, user_id)
);

-- Activer RLS sur toutes les tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour users
CREATE POLICY "Users can manage own profile" ON users
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Public can view basic user info for booking" ON users
    FOR SELECT USING (true);

-- Politiques RLS pour services
CREATE POLICY "Public can view services for booking" ON services
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own services" ON services
    FOR ALL USING (auth.uid() = user_id);

-- Politiques RLS pour clients
CREATE POLICY "Public can create clients" ON clients
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view clients for booking" ON clients
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own clients" ON clients
    FOR ALL USING (auth.uid() = user_id);

-- Politiques RLS pour bookings
CREATE POLICY "Public can create bookings" ON bookings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view bookings for availability" ON bookings
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own bookings" ON bookings
    FOR ALL USING (auth.uid() = user_id);

-- Politiques RLS pour business_settings
CREATE POLICY "Public can view business settings for booking" ON business_settings
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own business settings" ON business_settings
    FOR ALL USING (auth.uid() = user_id);

-- Politiques RLS pour email_templates
CREATE POLICY "Users can manage own email templates" ON email_templates
    FOR ALL USING (auth.uid() = user_id);

-- Politiques RLS pour email_workflows
CREATE POLICY "Users can manage own email workflows" ON email_workflows
    FOR ALL USING (auth.uid() = user_id);

-- Politiques RLS pour team_members
CREATE POLICY "Owners can manage their team members" ON team_members
    FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Team members can view their own info" ON team_members
    FOR SELECT USING (auth.uid() = user_id);

-- Triggers pour updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_settings_updated_at BEFORE UPDATE ON business_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_workflows_updated_at BEFORE UPDATE ON email_workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_services_user_id ON services(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date_time ON bookings(date, time);
CREATE INDEX IF NOT EXISTS idx_business_settings_user_id ON business_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON email_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_email_workflows_user_id ON email_workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_owner_id ON team_members(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

-- Fonction pour gérer les nouveaux utilisateurs
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO users (id, email, full_name, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        now(),
        now()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer automatiquement le profil utilisateur
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 3️⃣ **Déployer les Edge Functions**

Dans votre terminal, depuis le répertoire de votre projet Supabase :

```bash
# Se connecter à votre instance self-hosted
supabase login

# Lier votre projet local
supabase link --project-ref votre-project-ref

# Déployer toutes les Edge Functions
supabase functions deploy public-booking-data
supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhook
supabase functions deploy send-brevo-email
supabase functions deploy list-users
supabase functions deploy create-app-user
supabase functions deploy delete-app-user
supabase functions deploy invite-team-member
supabase functions deploy create-affiliate-account

# Vérifier le déploiement
supabase functions list
```

### 4️⃣ **Configurer les variables d'environnement**

Dans **Supabase Studio** → **Settings** → **Edge Functions**, ajoutez :

```env
SUPABASE_URL=https://api.votre-domaine.com
SUPABASE_SERVICE_ROLE_KEY=votre-service-role-key
STRIPE_SECRET_KEY=sk_test_votre_cle_stripe (optionnel)
STRIPE_WEBHOOK_SECRET=whsec_votre_webhook_secret (optionnel)
```

### 5️⃣ **Créer votre premier utilisateur admin**

Dans **Supabase Studio** → **Authentication** → **Users** :

1. Cliquez sur **"Add user"**
2. Entrez votre email et mot de passe
3. Cochez **"Email confirmed"**
4. Cliquez sur **"Create user"**

Puis dans **SQL Editor**, exécutez :

```sql
-- Marquer votre utilisateur comme super admin
UPDATE users 
SET is_super_admin = true 
WHERE email = 'votre-email@exemple.com';
```

### 6️⃣ **Tester la configuration**

1. **Test API** :
   ```bash
   curl https://api.votre-domaine.com/rest/v1/users \
     -H "apikey: votre-anon-key" \
     -H "Authorization: Bearer votre-anon-key"
   ```

2. **Test Edge Function** :
   ```bash
   curl https://api.votre-domaine.com/functions/v1/public-booking-data?user_id=votre-user-id \
     -H "Authorization: Bearer votre-anon-key"
   ```

### 7️⃣ **Configurer l'application**

Dans votre fichier `.env` :

```env
VITE_SUPABASE_URL=https://api.votre-domaine.com
VITE_SUPABASE_ANON_KEY=votre-anon-key
```

## 🔧 **Dépannage**

### **Erreur "table does not exist"**
- Exécutez le script SQL complet dans Studio
- Vérifiez que toutes les tables sont créées dans **Database** → **Tables**

### **Erreur "function does not exist"**
- Redéployez les Edge Functions avec `supabase functions deploy`
- Vérifiez dans **Edge Functions** que toutes les fonctions sont listées

### **Erreur d'authentification**
- Vérifiez que l'utilisateur existe dans **Authentication** → **Users**
- Vérifiez que le profil existe dans la table `users`
- Exécutez la requête UPDATE pour marquer comme super admin

### **Erreur de permissions**
- Vérifiez que RLS est activé sur toutes les tables
- Vérifiez que les politiques RLS sont créées

## 📞 **Support**

Si vous rencontrez des problèmes :

1. **Vérifiez les logs** dans **Edge Functions** → **Logs**
2. **Consultez la console** du navigateur (F12)
3. **Testez les APIs** avec curl ou Postman

Une fois ces étapes terminées, votre BookingFast sera entièrement fonctionnel avec votre Supabase self-hosted !