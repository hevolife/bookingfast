import React, { useState } from 'react';
import { Share2, Copy, Code, DollarSign, Users, TrendingUp, ExternalLink, Eye, Gift, Sparkles, Crown, Link } from 'lucide-react';
import { useAffiliate } from '../../hooks/useAffiliate';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { LoadingSpinner } from '../UI/LoadingSpinner';

export function AffiliateManagement() {
  const { affiliate, referrals, commissions, settings, loading, error, createAffiliateAccount, getAffiliateLink, getAffiliateHtmlCode } = useAffiliate();
  const [showHtmlModal, setShowHtmlModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);

  const copyToClipboard = async (text: string, type: 'link' | 'html') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'link') {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else {
        setCopiedHtml(true);
        setTimeout(() => setCopiedHtml(false), 2000);
      }
    } catch (err) {
      console.error('Erreur copie:', err);
      alert('Erreur lors de la copie');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getConversionRate = () => {
    if (!affiliate || affiliate.total_referrals === 0) return 0;
    return (affiliate.successful_conversions / affiliate.total_referrals) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }


  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center p-8 bg-red-50 rounded-2xl border border-red-200">
          <Share2 className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-red-800 mb-2">Erreur</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!affiliate) {
    return (
      <div className="space-y-6">
        <div className="text-center p-8 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-200">
          <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Share2 className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-purple-800 mb-4">Système d'Affiliation</h3>
          <p className="text-purple-600 mb-6 max-w-md mx-auto">
            Gagnez de l'argent en recommandant BookingPro ! Recevez 10% de commission mensuelle sur chaque client que vous parrainez.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-purple-300 rounded-xl p-4">
              <div className="text-2xl font-bold text-purple-600">10%</div>
              <div className="text-sm text-purple-700">Commission mensuelle</div>
            </div>
            <div className="bg-white border border-purple-300 rounded-xl p-4">
              <div className="text-2xl font-bold text-purple-600">15j</div>
              <div className="text-sm text-purple-700">Essai étendu</div>
            </div>
            <div className="bg-white border border-purple-300 rounded-xl p-4">
              <div className="text-2xl font-bold text-purple-600">∞</div>
              <div className="text-sm text-purple-700">Tant qu'ils payent</div>
            </div>
          </div>
          
          <Button
            onClick={createAffiliateAccount}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <Gift className="w-5 h-5" />
            Activer mon programme d'affiliation
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header avec statistiques */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Share2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-purple-800">Programme d'Affiliation</h2>
              <p className="text-purple-600">Code: <span className="font-mono font-bold">{affiliate.affiliate_code}</span></p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-purple-300 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{affiliate.total_referrals}</div>
              <div className="text-sm text-gray-600">Parrainages</div>
            </div>
            <div className="bg-white border border-purple-300 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{affiliate.successful_conversions}</div>
              <div className="text-sm text-gray-600">Conversions</div>
            </div>
            <div className="bg-white border border-purple-300 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{getConversionRate().toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Taux conversion</div>
            </div>
            <div className="bg-white border border-purple-300 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{affiliate.total_commissions.toFixed(2)}€</div>
              <div className="text-sm text-gray-600">Commissions</div>
            </div>
          </div>
        </div>

        {/* Outils de partage */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <Link className="w-6 h-6 text-blue-600" />
            Outils de Partage
          </h3>

          <div className="space-y-6">
            {/* Lien d'affiliation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Votre lien d'affiliation
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={getAffiliateLink()}
                  readOnly
                  className="flex-1 p-3 border border-gray-300 rounded-xl bg-gray-50 font-mono text-sm"
                />
                <Button
                  onClick={() => copyToClipboard(getAffiliateLink(), 'link')}
                  variant={copiedLink ? 'success' : 'secondary'}
                  className="flex items-center gap-2"
                >
                  {copiedLink ? (
                    <>
                      <Eye className="w-4 h-4" />
                      Copié !
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copier
                    </>
                  )}
                </Button>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Partagez ce lien pour gagner 10% de commission sur chaque abonnement
              </div>
            </div>

            {/* Code HTML */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Code HTML pour emails
                </label>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowHtmlModal(true)}
                    variant="secondary"
                    size="sm"
                  >
                    <Eye className="w-4 h-4" />
                    Aperçu
                  </Button>
                  <Button
                    onClick={() => copyToClipboard(getAffiliateHtmlCode(), 'html')}
                    variant={copiedHtml ? 'success' : 'primary'}
                    size="sm"
                  >
                    {copiedHtml ? (
                      <>
                        <Eye className="w-4 h-4" />
                        Copié !
                      </>
                    ) : (
                      <>
                        <Code className="w-4 h-4" />
                        Copier HTML
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <textarea
                value={getAffiliateHtmlCode()}
                readOnly
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-xl bg-gray-50 font-mono text-xs resize-none"
              />
              <div className="text-xs text-gray-500 mt-1">
                Code HTML prêt à coller dans vos emails avec votre lien d'affiliation
              </div>
            </div>
          </div>
        </div>

        {/* Commissions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Commissions en attente */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-orange-600" />
              Commissions en attente
            </h3>
            
            <div className="space-y-3">
              {commissions.filter(c => c.status === 'pending').slice(0, 5).map((commission, index) => (
                <div
                  key={commission.id}
                  className="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-200"
                >
                  <div>
                    <div className="font-medium text-orange-800">
                      {commission.referral?.referred_user?.email}
                    </div>
                    <div className="text-xs text-orange-600">
                      {commission.commission_month}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-orange-600">{commission.amount.toFixed(2)}€</div>
                    <div className="text-xs text-orange-500">En attente</div>
                  </div>
                </div>
              ))}
              
              {commissions.filter(c => c.status === 'pending').length === 0 && (
                <div className="text-center py-6 text-gray-500">
                  <DollarSign className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm">Aucune commission en attente</p>
                </div>
              )}
            </div>
          </div>

          {/* Parrainages récents */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              Parrainages récents
            </h3>
            
            <div className="space-y-3">
              {referrals.slice(0, 5).map((referral, index) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-200"
                >
                  <div>
                    <div className="font-medium text-green-800">
                      {referral.referred_user?.email}
                    </div>
                    <div className="text-xs text-green-600">
                      {formatDate(referral.created_at)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                      referral.conversion_date 
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {referral.conversion_date ? '✅ Converti' : '⏳ Essai'}
                    </div>
                  </div>
                </div>
              ))}
              
              {referrals.length === 0 && (
                <div className="text-center py-6 text-gray-500">
                  <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm">Aucun parrainage encore</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Résumé financier */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
          <h3 className="text-xl font-bold text-green-800 mb-4 flex items-center gap-3">
            <TrendingUp className="w-6 h-6" />
            Résumé Financier
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-green-300 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{affiliate.total_commissions.toFixed(2)}€</div>
              <div className="text-sm text-green-700">Total gagné</div>
            </div>
            <div className="bg-white border border-green-300 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{affiliate.pending_commissions.toFixed(2)}€</div>
              <div className="text-sm text-orange-700">En attente</div>
            </div>
            <div className="bg-white border border-green-300 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{affiliate.paid_commissions.toFixed(2)}€</div>
              <div className="text-sm text-blue-700">Payé</div>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <div className="text-sm text-green-700">
              💡 <strong>Commission :</strong> {settings?.commission_percentage || 10}% par mois • 
              <strong> Essai étendu :</strong> {settings?.extended_trial_days || 15} jours
            </div>
          </div>
        </div>

        {/* Guide d'utilisation */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200">
          <h3 className="text-lg font-bold text-blue-800 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Comment ça marche
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-blue-300 rounded-xl p-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm mb-3">
                1
              </div>
              <h4 className="font-bold text-blue-800 mb-2">Partagez votre lien</h4>
              <p className="text-blue-700 text-sm">Envoyez votre lien d'affiliation ou le code HTML à vos contacts</p>
            </div>
            
            <div className="bg-white border border-blue-300 rounded-xl p-4">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm mb-3">
                2
              </div>
              <h4 className="font-bold text-blue-800 mb-2">Ils s'inscrivent</h4>
              <p className="text-blue-700 text-sm">15 jours d'essai gratuit au lieu de 7 avec votre code</p>
            </div>
            
            <div className="bg-white border border-blue-300 rounded-xl p-4">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm mb-3">
                3
              </div>
              <h4 className="font-bold text-blue-800 mb-2">Vous gagnez</h4>
              <p className="text-blue-700 text-sm">10% de commission chaque mois tant qu'ils restent abonnés</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal aperçu HTML */}
      {showHtmlModal && (
        <Modal
          isOpen={showHtmlModal}
          onClose={() => setShowHtmlModal(false)}
          title="Aperçu du code HTML"
          size="lg"
        >
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div 
                dangerouslySetInnerHTML={{ __html: getAffiliateHtmlCode() }}
                className="max-w-md mx-auto"
              />
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowHtmlModal(false)}
                className="flex-1"
              >
                Fermer
              </Button>
              <Button
                onClick={() => copyToClipboard(getAffiliateHtmlCode(), 'html')}
                className="flex-1"
              >
                <Copy className="w-4 h-4" />
                Copier le code HTML
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
