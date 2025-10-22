import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, UserPlus, Building2, Sparkles, Key, Gift, RotateCcw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AccessCodeRedemption } from './AccessCodeRedemption';
import { useAppVersion } from '../../hooks/useAppVersion';
import { ForgotPasswordModal } from './ForgotPasswordModal';

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSecretCode, setShowSecretCode] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  const { signIn, signUp, isAuthenticated } = useAuth();
  const { currentVersion } = useAppVersion();

  // Récupérer le code d'affiliation depuis l'URL
  const affiliateCode = searchParams.get('ref');

  // Afficher un message si c'est un lien d'affiliation
  const isAffiliateSignup = affiliateCode && !isLogin;

  // 🔥 CORRECTION : Rediriger si déjà authentifié
  useEffect(() => {
    if (isAuthenticated) {
      console.log('✅ LoginPage - Utilisateur déjà authentifié, redirection vers /dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Gérer le retour de confirmation d'email
  useEffect(() => {
    const type = searchParams.get('type');
    const accessToken = searchParams.get('access_token');
    
    if (type === 'signup' && accessToken) {
      console.log('✅ Email confirmé - redirection vers dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [searchParams, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    console.log('🔐 LoginPage - Tentative de connexion...', { email, isLogin });

    // Validation du mot de passe pour l'inscription
    if (!isLogin) {
      if (password !== confirmPassword) {
        setError('Les mots de passe ne correspondent pas');
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('Le mot de passe doit contenir au moins 6 caractères');
        setLoading(false);
        return;
      }
    }

    try {
      if (isLogin) {
        console.log('🔑 LoginPage - Appel signIn...');
        await signIn(email, password);
        console.log('✅ LoginPage - SignIn réussi, redirection vers /dashboard');
        // La redirection sera gérée par le useEffect qui surveille isAuthenticated
      } else {
        console.log('📝 LoginPage - Appel signUp...');
        await signUp(email, password);
        
        // Si c'est un lien d'affiliation, traiter le parrainage
        if (affiliateCode) {
          try {
            console.log('🎯 Traitement code d\'affiliation:', affiliateCode);
          } catch (affiliateError) {
            console.warn('⚠️ Erreur traitement affiliation:', affiliateError);
          }
        }
        
        setError('Compte créé avec succès ! Vérifiez votre email pour confirmer votre compte.');
        setIsLogin(true);
        setPassword('');
        setConfirmPassword('');
        return;
      }
    } catch (err) {
      console.error('❌ LoginPage - Erreur authentification:', err);
      let errorMessage = 'Une erreur est survenue';
      
      if (err instanceof Error) {
        if (err.message.includes('Invalid login credentials')) {
          errorMessage = 'Email ou mot de passe incorrect. Vérifiez vos identifiants.';
        } else if (err.message.includes('Email not confirmed')) {
          errorMessage = 'Veuillez confirmer votre email avant de vous connecter.';
        } else if (err.message.includes('Too many requests')) {
          errorMessage = 'Trop de tentatives. Veuillez patienter quelques minutes.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-20 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full opacity-10 animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo et titre */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl animate-glow">
            <Building2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            BookingFast
          </h1>
          <p className="text-gray-600 text-lg">
            {isLogin ? 'Connectez-vous à votre compte' : 'Créez votre compte'}
          </p>
        </div>

        {/* Formulaire */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/20">
          {/* Message d'affiliation */}
          {isAffiliateSignup && (
            <div className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-4 animate-fadeIn">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <Gift className="w-4 h-4 text-white" />
                </div>
                <h4 className="font-bold text-purple-800">🎉 Offre spéciale parrainage !</h4>
              </div>
              <div className="text-purple-700 text-sm space-y-1">
                <div>✨ <strong>15 jours d'essai gratuit</strong> au lieu de 7</div>
                <div>🎯 Code de parrainage: <span className="font-mono font-bold">{affiliateCode}</span></div>
                <div>💝 Offre exclusive via un lien de parrainage</div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h2 className="text-2xl font-bold text-gray-900">
              {isLogin ? 'Connexion' : 'Inscription'}
            </h2>
            <Sparkles className="w-5 h-5 text-purple-600" />
          </div>

          {error && (
            <div className={`mb-6 p-4 rounded-2xl border-2 animate-fadeIn ${
              error.includes('créé') || error.includes('Vérifiez votre email')
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center gap-2">
                {error.includes('créé') || error.includes('Vérifiez votre email') ? '✅' : '❌'}
                <span className="font-medium">{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  required
                  className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-2xl focus:ring-4 focus:ring-purple-200 focus:border-purple-500 transition-all duration-300 bg-white/80 backdrop-blur-sm"
                  placeholder="votre@email.com"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-12 pr-12 py-4 border border-gray-300 rounded-2xl focus:ring-4 focus:ring-purple-200 focus:border-purple-500 transition-all duration-300 bg-white/80 backdrop-blur-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {!isLogin && (
                <div className="text-xs text-gray-500 mt-1">
                  Minimum 6 caractères
                </div>
              )}
            </div>

            {/* Confirmation mot de passe (uniquement en mode inscription) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className={`w-full pl-12 pr-12 py-4 border rounded-2xl focus:ring-4 transition-all duration-300 bg-white/80 backdrop-blur-sm ${
                      confirmPassword && password !== confirmPassword
                        ? 'border-red-300 focus:ring-red-200 focus:border-red-500'
                        : 'border-gray-300 focus:ring-purple-200 focus:border-purple-500'
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <span>❌</span>
                    <span>Les mots de passe ne correspondent pas</span>
                  </div>
                )}
                {confirmPassword && password === confirmPassword && (
                  <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <span>✅</span>
                    <span>Les mots de passe correspondent</span>
                  </div>
                )}
              </div>
            )}

            {/* Bouton de soumission */}
            <button
              type="submit"
              disabled={loading || (!isLogin && password !== confirmPassword)}
              className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white py-4 px-6 rounded-2xl font-bold text-lg hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  {isLogin ? 'Connexion...' : 'Création...'}
                </>
              ) : (
                <>
                  {isLogin ? <LogIn className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
                  {isLogin ? 'Se connecter' : 'Créer le compte'}
                </>
              )}
            </button>
          </form>

          {/* Mot de passe oublié */}
          {isLogin && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-blue-600 hover:text-blue-800 font-medium hover:underline transition-all duration-300 flex items-center gap-2 mx-auto"
              >
                <RotateCcw className="w-4 h-4" />
                Mot de passe oublié ?
              </button>
            </div>
          )}

          {/* Toggle entre login/register */}
          <div className="mt-6 text-center">
            <div className="text-gray-600 mb-3">
              {isLogin ? "Vous n'avez pas de compte ?" : "Vous avez déjà un compte ?"}
            </div>
            <button
              type="button"
              onClick={toggleMode}
              className="text-purple-600 hover:text-purple-800 font-bold text-lg hover:underline transition-all duration-300"
            >
              {isLogin ? 'Créer un compte' : 'Se connecter'}
            </button>
          </div>

          {/* Code secret */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setShowSecretCode(!showSecretCode)}
              className="text-purple-600 hover:text-purple-800 font-medium hover:underline transition-all duration-300 flex items-center gap-2 mx-auto"
            >
              <Gift className="w-4 h-4" />
              J'ai un code secret
            </button>
          </div>

          {/* Formulaire code secret */}
          {showSecretCode && (
            <div className="mt-4">
              <AccessCodeRedemption 
                onSuccess={() => {
                  setShowSecretCode(false);
                  setTimeout(() => {
                    navigate('/dashboard', { replace: true });
                  }, 1500);
                }}
              />
            </div>
          )}
        </div>

        {/* Modal mot de passe oublié */}
        {showForgotPassword && (
          <ForgotPasswordModal
            isOpen={showForgotPassword}
            onClose={() => setShowForgotPassword(false)}
          />
        )}

        {/* Footer */}
        <div className="text-center mt-6 text-gray-500 text-sm">
          <p>© 2025 BookingFast - Système de réservation professionnel</p>
          {currentVersion && (
            <>
              <p className="text-xs text-gray-400 mt-1">
                Version {currentVersion.version} - Build {currentVersion.build}
              </p>
              {currentVersion.release_notes && (
                <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                  {currentVersion.release_notes}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
