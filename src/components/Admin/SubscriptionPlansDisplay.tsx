import React, { useState } from 'react';
import { Check, Crown, Zap, Star } from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly?: number;
  features: string[];
  max_bookings_per_month?: number;
  team_members_allowed: boolean;
  custom_services_allowed: boolean;
}

interface SubscriptionPlansDisplayProps {
  plans: SubscriptionPlan[];
  currentTier?: string;
  onSubscribe: (planId: string, billingPeriod: 'monthly' | 'yearly') => void;
}

export function SubscriptionPlansDisplay({ plans, currentTier, onSubscribe }: SubscriptionPlansDisplayProps) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const getPrice = (plan: SubscriptionPlan) => {
    if (billingPeriod === 'yearly' && plan.price_yearly) {
      return plan.price_yearly;
    }
    return plan.price_monthly;
  };

  const getSavings = (plan: SubscriptionPlan) => {
    if (!plan.price_yearly) return 0;
    const yearlyTotal = plan.price_monthly * 12;
    return yearlyTotal - plan.price_yearly;
  };

  const hasPremiumPlan = plans.some(p => p.price_yearly);

  return (
    <div className="space-y-6">
      {/* Toggle Mensuel/Annuel */}
      {hasPremiumPlan && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
              billingPeriod === 'monthly'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-105'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Mensuel
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 relative ${
              billingPeriod === 'yearly'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-105'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Annuel
            <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
              -17%
            </span>
          </button>
        </div>
      )}

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = currentTier === plan.id;
          const isPremium = plan.id === 'premium';
          const price = getPrice(plan);
          const savings = getSavings(plan);
          const showYearlyOption = billingPeriod === 'yearly' && plan.price_yearly;

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-6 transition-all duration-300 ${
                isPremium
                  ? 'bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300 shadow-xl scale-105'
                  : 'bg-white border-2 border-gray-200 hover:border-purple-200 shadow-lg'
              }`}
            >
              {/* Badge Premium */}
              {isPremium && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 rounded-full text-sm font-bold flex items-center gap-2">
                    <Crown className="w-4 h-4" />
                    Recommandé
                  </div>
                </div>
              )}

              {/* En-tête */}
              <div className="text-center mb-6">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                  isPremium
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600'
                    : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                }`}>
                  {isPremium ? (
                    <Crown className="w-8 h-8 text-white" />
                  ) : (
                    <Zap className="w-8 h-8 text-white" />
                  )}
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-4xl font-bold text-gray-900">
                    {price.toFixed(2)}€
                  </span>
                  <span className="text-gray-600">
                    /{billingPeriod === 'yearly' ? 'an' : 'mois'}
                  </span>
                </div>

                {showYearlyOption && savings > 0 && (
                  <div className="mt-2 text-green-600 font-semibold text-sm">
                    💰 Économisez {savings.toFixed(2)}€/an
                  </div>
                )}
              </div>

              {/* Fonctionnalités */}
              <div className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isPremium
                        ? 'bg-purple-100'
                        : 'bg-blue-100'
                    }`}>
                      <Check className={`w-3 h-3 ${
                        isPremium ? 'text-purple-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Limitations */}
              {plan.max_bookings_per_month && (
                <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm font-medium">
                    ⚠️ Maximum {plan.max_bookings_per_month} réservations/mois
                  </p>
                </div>
              )}

              {/* Bouton d'action */}
              <button
                onClick={() => onSubscribe(plan.id, billingPeriod)}
                disabled={isCurrentPlan}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
                  isCurrentPlan
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : isPremium
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-xl hover:scale-105'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:shadow-xl hover:scale-105'
                }`}
              >
                {isCurrentPlan ? (
                  <>
                    <Check className="w-5 h-5 inline mr-2" />
                    Plan Actuel
                  </>
                ) : (
                  <>
                    <Star className="w-5 h-5 inline mr-2" />
                    Choisir ce plan
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
