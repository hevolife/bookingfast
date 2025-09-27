import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Users, 
  CreditCard, 
  Mail, 
  Clock, 
  Star, 
  CheckCircle, 
  ArrowRight, 
  Play,
  Building2,
  Smartphone,
  Globe,
  Zap,
  Shield,
  TrendingUp,
  Heart,
  Award,
  Target,
  Sparkles,
  Settings
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function LandingPage() {
  const navigate = useNavigate();
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const features = [
    {
      icon: Calendar,
      title: "Planning Intelligent",
      description: "Gérez vos créneaux avec un calendrier intuitif et des notifications automatiques",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: CreditCard,
      title: "Paiements Sécurisés",
      description: "Encaissez en ligne avec Stripe, générez des liens de paiement instantanés",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: Mail,
      title: "Emails Automatiques",
      description: "Confirmations, rappels et suivis envoyés automatiquement à vos clients",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: Users,
      title: "Gestion Clients",
      description: "Base de données clients complète avec historique des réservations",
      color: "from-orange-500 to-red-500"
    }
  ];

  const testimonials = [
    {
      name: "Marie Dubois",
      business: "Salon de beauté",
      text: "BookingPro a révolutionné ma gestion ! Plus de double réservations, paiements automatiques. Je recommande !",
      rating: 5,
      avatar: "M"
    },
    {
      name: "Thomas Martin",
      business: "Coach sportif",
      text: "Interface intuitive, clients ravis. Le système de rappels automatiques a réduit mes no-shows de 80% !",
      rating: 5,
      avatar: "T"
    },
    {
      name: "Sophie Laurent",
      business: "Thérapeute",
      text: "Parfait pour mon cabinet ! Les liens de paiement facilitent tout. Support client exceptionnel.",
      rating: 5,
      avatar: "S"
    }
  ];

  const stats = [
    { number: "10,000+", label: "Réservations gérées", icon: Calendar },
    { number: "500+", label: "Professionnels satisfaits", icon: Users },
    { number: "99.9%", label: "Temps de disponibilité", icon: Shield },
    { number: "24/7", label: "Support client", icon: Heart }
  ];

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  BookingFast
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">Système de réservation professionnel</p>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-6">
              <button onClick={() => scrollToSection('features')} className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                Fonctionnalités
              </button>
              <button onClick={() => scrollToSection('pricing')} className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                Tarifs
              </button>
              <button onClick={() => scrollToSection('testimonials')} className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                Témoignages
              </button>
            </div>

            <button
              onClick={() => navigate('/dashboard')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg font-medium"
            >
              Commencer
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-20 animate-float"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="mb-6">
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Révolutionnez votre
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent relative inline-block">
                    Gestion de Réservations
                    <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full animate-pulse"></div>
                  </span>
                </h1>
              </div>
              
              <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
                La solution complète pour gérer vos rendez-vous, encaisser vos paiements et fidéliser vos clients.
                <span className="block mt-2 text-base sm:text-lg text-purple-600 font-medium">
                  ✨ Simple, puissant, professionnel
                </span>
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-2xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-2xl font-bold text-base sm:text-lg flex items-center gap-2 sm:gap-3 group"
                >
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-12 transition-transform" />
                  Essai gratuit 7 jours
                  <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform" />
                </button>
                
                <button
                  onClick={() => scrollToSection('demo')}
                  className="bg-white/80 backdrop-blur-sm text-purple-600 px-6 sm:px-8 py-3 sm:py-4 rounded-2xl hover:bg-white transition-all duration-300 transform hover:scale-105 shadow-xl font-bold text-base sm:text-lg flex items-center gap-2 sm:gap-3 border border-purple-200"
                >
                  <Play className="w-5 h-5 sm:w-6 sm:h-6" />
                  Voir la démo
                </button>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-wrap justify-center items-center gap-8 text-gray-500 text-sm">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-500" />
                  <span>Sécurisé SSL</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-500" />
                  <span>RGPD Conforme</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span>Support 24/7</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {stats.map((stat, index) => (
              <div
                key={index}
                className={`bg-white/80 backdrop-blur-sm rounded-2xl p-6 text-center shadow-xl border border-white/20 transform hover:scale-105 transition-all duration-300 animate-fadeIn`}
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{stat.number}</div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-6">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Une suite complète d'outils professionnels pour transformer votre activité
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Feature showcase */}
            <div className="space-y-6 sm:space-y-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-4 sm:gap-6 p-4 sm:p-6 rounded-2xl transition-all duration-500 cursor-pointer transform hover:scale-105 ${
                    currentFeature === index
                      ? 'bg-gradient-to-r from-white to-blue-50 shadow-2xl border-2 border-blue-200'
                      : 'bg-white/80 shadow-lg hover:shadow-xl border border-gray-200'
                  }`}
                  onClick={() => setCurrentFeature(index)}
                >
                  <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-white bg-gradient-to-r ${feature.color} shadow-lg flex-shrink-0`}>
                    <feature.icon className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">{feature.title}</h3>
                    <p className="text-gray-600 text-sm sm:text-base">{feature.description}</p>
                  </div>
                  {currentFeature === index && (
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse flex-shrink-0"></div>
                  )}
                </div>
              ))}
            </div>

            {/* Demo mockup */}
            <div className="relative">
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-4 sm:p-8 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="bg-white rounded-2xl overflow-hidden shadow-xl">
                  {/* Mockup header */}
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white/20 rounded-lg flex items-center justify-center">
                      <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="text-white font-bold text-sm sm:text-base">BookingPro Dashboard</div>
                  </div>
                  
                  {/* Mockup content */}
                  <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-green-50 rounded-xl border border-green-200">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-500 rounded-xl flex items-center justify-center text-white">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-green-800 text-sm sm:text-base">Réservation confirmée</div>
                        <div className="text-xs sm:text-sm text-green-600">Marie D. - Massage 14h30</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white">
                        <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-blue-800 text-sm sm:text-base">Paiement reçu</div>
                        <div className="text-xs sm:text-sm text-blue-600">80.00€ - Stripe</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-purple-50 rounded-xl border border-purple-200">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500 rounded-xl flex items-center justify-center text-white">
                        <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-purple-800 text-sm sm:text-base">Email envoyé</div>
                        <div className="text-xs sm:text-sm text-purple-600">Confirmation automatique</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating elements */}
              <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-2xl animate-bounce shadow-xl">
                ✓
              </div>
              <div className="absolute -bottom-2 -left-2 sm:-bottom-4 sm:-left-4 w-10 h-10 sm:w-16 sm:h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white animate-pulse shadow-xl">
                <Star className="w-5 h-5 sm:w-8 sm:h-8" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="demo" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-6">
              Comment ça marche ?
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              En 3 étapes simples, transformez votre façon de gérer les réservations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Configurez vos services",
                description: "Ajoutez vos prestations, tarifs et créneaux horaires en quelques clics",
                icon: Settings,
                color: "from-blue-500 to-cyan-500"
              },
              {
                step: "2", 
                title: "Vos clients réservent",
                description: "Interface intuitive pour vos clients, paiement sécurisé intégré",
                icon: Calendar,
                color: "from-purple-500 to-pink-500"
              },
              {
                step: "3",
                title: "Tout est automatisé",
                description: "Confirmations, rappels, paiements... Concentrez-vous sur votre métier !",
                icon: Zap,
                color: "from-green-500 to-emerald-500"
              }
            ].map((step, index) => (
              <div
                key={index}
                className={`relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105 animate-fadeIn border border-gray-100`}
                style={{ animationDelay: `${index * 300}ms` }}
              >
                {/* Step number */}
                <div className={`absolute -top-6 left-8 w-12 h-12 bg-gradient-to-r ${step.color} rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                  {step.step}
                </div>
                
                <div className={`w-16 h-16 bg-gradient-to-r ${step.color} rounded-2xl flex items-center justify-center mx-auto mb-6 mt-4`}>
                  <step.icon className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">{step.title}</h3>
                <p className="text-gray-600 text-center leading-relaxed">{step.description}</p>
                
                {/* Connection line */}
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-1 bg-gradient-to-r from-gray-300 to-gray-400 rounded-full"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-6">
              Pourquoi choisir BookingPro ?
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Rejoignez des centaines de professionnels qui ont déjà transformé leur activité
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: TrendingUp,
                title: "Augmentez vos revenus",
                description: "Réduisez les no-shows de 80% avec les rappels automatiques et les acomptes en ligne",
                color: "from-green-500 to-emerald-500"
              },
              {
                icon: Clock,
                title: "Gagnez du temps",
                description: "Automatisez la gestion des rendez-vous, confirmations et paiements",
                color: "from-blue-500 to-cyan-500"
              },
              {
                icon: Heart,
                title: "Fidélisez vos clients",
                description: "Expérience client premium avec interface moderne et paiements fluides",
                color: "from-purple-500 to-pink-500"
              },
              {
                icon: Smartphone,
                title: "Accessible partout",
                description: "Application web responsive, fonctionne sur tous les appareils",
                color: "from-orange-500 to-red-500"
              },
              {
                icon: Shield,
                title: "Sécurité maximale",
                description: "Données chiffrées, paiements sécurisés par Stripe, conformité RGPD",
                color: "from-indigo-500 to-purple-500"
              },
              {
                icon: Target,
                title: "Support expert",
                description: "Équipe dédiée pour vous accompagner dans votre réussite",
                color: "from-pink-500 to-red-500"
              }
            ].map((benefit, index) => (
              <div
                key={index}
                className={`bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105 animate-fadeIn border border-gray-100`}
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className={`w-16 h-16 bg-gradient-to-r ${benefit.color} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
                  <benefit.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">{benefit.title}</h3>
                <p className="text-gray-600 text-center leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-6">
              Tarifs transparents
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Commencez gratuitement, évoluez selon vos besoins
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Plan Mensuel */}
            <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-gray-200 hover:border-blue-400 transition-all duration-300 transform hover:scale-105">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Plan Mensuel</h3>
                <div className="text-5xl font-bold text-blue-600 mb-2">59,99€</div>
                <div className="text-gray-600">par mois</div>
              </div>

              <div className="space-y-4 mb-8">
                {[
                  'Réservations illimitées',
                  'Gestion des clients',
                  'Paiements en ligne',
                  'Workflows email',
                  'Support email'
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate('/dashboard')}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-4 px-6 rounded-2xl font-bold text-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Essai gratuit 7 jours
              </button>
            </div>

            {/* Plan Annuel */}
            <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-purple-400 hover:border-purple-600 transition-all duration-300 transform hover:scale-105 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                  🎉 Économisez 17%
                </span>
              </div>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Plan Annuel</h3>
                <div className="text-5xl font-bold text-purple-600 mb-2">499,99€</div>
                <div className="text-gray-600">par an</div>
                <div className="text-sm text-green-600 font-medium mt-2">
                  Soit 41,67€/mois
                </div>
              </div>

              <div className="space-y-4 mb-8">
                {[
                  'Tout du plan mensuel',
                  '2 mois gratuits',
                  'Support prioritaire',
                  'Fonctionnalités avancées',
                  'Accès aux bêtas'
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate('/login')}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-6 rounded-2xl font-bold text-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Commencer maintenant
              </button>
            </div>
          </div>

          {/* Guarantee */}
          <div className="text-center mt-12">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 max-w-2xl mx-auto">
              <div className="flex items-center justify-center gap-2 mb-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h4 className="text-lg font-bold text-green-800">Garantie 30 jours</h4>
              </div>
              <p className="text-green-700">
                Satisfait ou remboursé. Annulez votre abonnement à tout moment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-6">
              Ils nous font confiance
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Découvrez pourquoi des centaines de professionnels choisissent BookingFast
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className={`bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105 animate-fadeIn`}
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.business}</div>
                  </div>
                </div>
                
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                
                <p className="text-gray-700 italic leading-relaxed">"{testimonial.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 animate-shimmer"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-2xl sm:text-4xl font-bold text-white mb-6">
            Prêt à transformer votre activité ?
          </h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Rejoignez des centaines de professionnels qui ont déjà choisi BookingFast
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-white text-purple-600 px-8 py-4 rounded-2xl hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 shadow-2xl font-bold text-lg flex items-center gap-3 group"
            >
              <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
              Commencer gratuitement
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <div className="text-white/80 text-sm">
              ✓ Aucune carte bancaire requise
              <br />
              ✓ Configuration en 5 minutes
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">BookingFast</h3>
                  <p className="text-gray-400 text-sm">Système de réservation professionnel</p>
                </div>
              </div>
              <p className="text-gray-400 leading-relaxed max-w-md">
                La solution complète pour gérer vos réservations, automatiser vos paiements et fidéliser vos clients.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">Fonctionnalités</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>Planning intelligent</li>
                <li>Paiements en ligne</li>
                <li>Emails automatiques</li>
                <li>Gestion clients</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>Documentation</li>
                <li>Tutoriels vidéo</li>
                <li>Support 24/7</li>
                <li>Formation gratuite</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p className="text-sm">&copy; 2025 BookingFast. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}