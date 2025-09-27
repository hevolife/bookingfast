@@ .. @@
   const redeemAccessCode = async (code: string) => {
     if (!isSupabaseConfigured()) throw new Error('Supabase non configuré');
     if (!currentUser) throw new Error('Utilisateur non connecté');
     
     try {
       console.log('🔄 Utilisation du code:', code);
       
       // Vérifier que le code existe et est actif
       const { data: accessCode, error: codeError } = await supabase
         .from('access_codes')
         .select('*')
         .eq('code', code.toUpperCase())
         .eq('is_active', true)
         .single();

       if (codeError || !accessCode) {
         throw new Error('Code d\'accès invalide ou expiré');
       }

       console.log('✅ Code trouvé:', accessCode.code);

       // Vérifier si le code n'a pas déjà été utilisé par cet utilisateur
       const { data: existingRedemption } = await supabase
         .from('code_redemptions')
         .select('id')
         .eq('code_id', accessCode.id)
         .eq('user_id', currentUser.id)
         .single();

       if (existingRedemption) {
         throw new Error('Ce code a déjà été utilisé par votre compte');
       }

       // Vérifier si le code n'a pas atteint sa limite d'utilisation
       if (accessCode.current_uses >= accessCode.max_uses) {
         throw new Error('Ce code a atteint sa limite d\'utilisation');
       }

       // Vérifier si le code n'a pas expiré
       if (accessCode.expires_at && new Date(accessCode.expires_at) < new Date()) {
         throw new Error('Ce code a expiré');
       }

       // Calculer la date de fin d'accès
       let accessGrantedUntil = null;
       if (accessCode.access_type !== 'lifetime') {
         const now = new Date();
         switch (accessCode.access_type) {
           case 'days':
             accessGrantedUntil = new Date(now.getTime() + (accessCode.access_duration || 0) * 24 * 60 * 60 * 1000);
             break;
           case 'weeks':
             accessGrantedUntil = new Date(now.getTime() + (accessCode.access_duration || 0) * 7 * 24 * 60 * 60 * 1000);
             break;
           case 'months':
             accessGrantedUntil = new Date(now.getTime() + (accessCode.access_duration || 0) * 30 * 24 * 60 * 60 * 1000);
             break;
         }
       }

       // Créer l'entrée de rédemption
       const { error: redemptionError } = await supabaseClient
         .from('code_redemptions')
         .insert({
           code_id: accessCode.id,
           user_id: currentUser.id,
           access_granted_until: accessGrantedUntil?.toISOString()
         });

       if (redemptionError) throw redemptionError;

       // Mettre à jour le statut de l'utilisateur selon le type de code
-      let newSubscriptionStatus = 'active';
-      let newTrialEndsAt = null;
+      let newSubscriptionStatus = currentUser.subscription_status || 'trial';
+      let newTrialEndsAt = null;
       
       if (accessCode.access_type === 'lifetime') {
         // Accès à vie
         newSubscriptionStatus = 'active';
         newTrialEndsAt = null; // Pas de limite
         console.log('🎯 Code à vie utilisé - accès permanent accordé');
       } else {
-        // Accès temporaire
-        newSubscriptionStatus = 'trial'; // Garder en trial mais avec une nouvelle date de fin
+        // Accès temporaire - étendre l'essai ou maintenir l'abonnement actif
+        if (currentUser.subscription_status === 'active') {
+          // Si déjà abonné, garder le statut actif
+          newSubscriptionStatus = 'active';
+        } else {
+          // Sinon, étendre l'essai
+          newSubscriptionStatus = 'trial';
+        }
         newTrialEndsAt = accessGrantedUntil?.toISOString() || null;
         console.log('⏰ Code temporaire utilisé - accès jusqu\'au:', newTrialEndsAt);
       }
       
       const userUpdates: any = {
         subscription_status: newSubscriptionStatus,
-        trial_ends_at: newTrialEndsAt,
+        trial_ends_at: newSubscriptionStatus === 'active' ? null : newTrialEndsAt,
         updated_at: new Date().toISOString()
       };

       console.log('🔄 Mise à jour utilisateur avec:', userUpdates);
       
       const { error: userError } = await supabase
         .from('users')
         .update(userUpdates)
         .eq('id', currentUser.id);

       if (userError) {
         console.error('❌ Erreur mise à jour utilisateur:', userError);
         throw userError;
       }
       
       console.log('✅ Statut utilisateur mis à jour');
       
       // Forcer le rechargement des données utilisateur
       console.log('🔄 Rechargement des données utilisateur...');
       const { data: updatedUserData, error: refreshError } = await supabase
         .from('users')
         .select('*')
         .eq('id', currentUser.id)
         .single();
       
       if (!refreshError && updatedUserData) {
         console.log('✅ Données utilisateur rechargées:', {
           subscription_status: updatedUserData.subscription_status,
           trial_ends_at: updatedUserData.trial_ends_at
         });
       }
       
       // Incrémenter le compteur d'utilisation du code
       const { error: updateError } = await supabase
         .from('access_codes')
         .update({
           current_uses: accessCode.current_uses + 1,
           updated_at: new Date().toISOString()
         })
         .eq('id', accessCode.id);

       if (updateError) throw updateError;

       // Recharger toutes les données pour refléter les changements
       await fetchAllData();
       
       console.log('✅ Code utilisé avec succès');
       return true;
     } catch (err) {
       console.error('❌ Erreur utilisation code d\'accès:', err);
       throw err;
     }
   };