import React, { useState } from 'react';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { Palette, Save } from 'lucide-react';

interface PDFCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PDFColors {
  primary: string;
  accent: string;
  text: string;
}

export function PDFCustomizationModal({ isOpen, onClose }: PDFCustomizationModalProps) {
  const [colors, setColors] = useState<PDFColors>({
    primary: '#9333ea', // Purple
    accent: '#ec4899',  // Pink
    text: '#1f2937'     // Gray-800
  });

  const presetThemes = [
    {
      name: 'Violet & Rose (Défaut)',
      colors: { primary: '#9333ea', accent: '#ec4899', text: '#1f2937' }
    },
    {
      name: 'Bleu Professionnel',
      colors: { primary: '#2563eb', accent: '#0ea5e9', text: '#1e293b' }
    },
    {
      name: 'Vert Nature',
      colors: { primary: '#059669', accent: '#10b981', text: '#064e3b' }
    },
    {
      name: 'Orange Dynamique',
      colors: { primary: '#ea580c', accent: '#f59e0b', text: '#7c2d12' }
    },
    {
      name: 'Rouge Élégant',
      colors: { primary: '#dc2626', accent: '#f43f5e', text: '#7f1d1d' }
    },
    {
      name: 'Indigo Moderne',
      colors: { primary: '#4f46e5', accent: '#6366f1', text: '#312e81' }
    }
  ];

  const handleSave = () => {
    // Sauvegarder dans localStorage
    localStorage.setItem('pdfCustomColors', JSON.stringify(colors));
    alert('✅ Personnalisation enregistrée !');
    onClose();
  };

  const handleReset = () => {
    const defaultColors = { primary: '#9333ea', accent: '#ec4899', text: '#1f2937' };
    setColors(defaultColors);
    localStorage.removeItem('pdfCustomColors');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Personnaliser le design PDF" size="lg">
      <div className="space-y-6">
        {/* Aperçu */}
        <div className="bg-gradient-to-r from-gray-50 to-purple-50 rounded-xl p-6 border-2 border-purple-200">
          <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5 text-purple-600" />
            Aperçu des couleurs
          </h3>
          
          <div 
            className="rounded-xl p-6 mb-4 text-white"
            style={{ backgroundColor: colors.primary }}
          >
            <div className="text-2xl font-bold mb-2">FACTURE</div>
            <div className="text-sm opacity-90">F2025-0001</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div 
              className="rounded-lg p-4 text-white text-center font-bold"
              style={{ backgroundColor: colors.accent }}
            >
              Couleur d'accent
            </div>
            <div 
              className="rounded-lg p-4 text-center font-bold border-2"
              style={{ 
                color: colors.text,
                borderColor: colors.primary 
              }}
            >
              Texte principal
            </div>
          </div>
        </div>

        {/* Sélecteurs de couleurs */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Couleur principale (En-tête)
            </label>
            <div className="flex gap-3">
              <input
                type="color"
                value={colors.primary}
                onChange={(e) => setColors({ ...colors, primary: e.target.value })}
                className="w-20 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={colors.primary}
                onChange={(e) => setColors({ ...colors, primary: e.target.value })}
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono"
                placeholder="#9333ea"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Couleur d'accent (Total TTC)
            </label>
            <div className="flex gap-3">
              <input
                type="color"
                value={colors.accent}
                onChange={(e) => setColors({ ...colors, accent: e.target.value })}
                className="w-20 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={colors.accent}
                onChange={(e) => setColors({ ...colors, accent: e.target.value })}
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono"
                placeholder="#ec4899"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Couleur du texte
            </label>
            <div className="flex gap-3">
              <input
                type="color"
                value={colors.text}
                onChange={(e) => setColors({ ...colors, text: e.target.value })}
                className="w-20 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={colors.text}
                onChange={(e) => setColors({ ...colors, text: e.target.value })}
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono"
                placeholder="#1f2937"
              />
            </div>
          </div>
        </div>

        {/* Thèmes prédéfinis */}
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-3">
            Thèmes prédéfinis
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {presetThemes.map((theme) => (
              <button
                key={theme.name}
                type="button"
                onClick={() => setColors(theme.colors)}
                className="p-3 rounded-lg border-2 border-gray-200 hover:border-purple-500 transition-all text-left group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: theme.colors.primary }}
                  />
                  <div 
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: theme.colors.accent }}
                  />
                </div>
                <div className="text-sm font-medium text-gray-700 group-hover:text-purple-600">
                  {theme.name}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handleReset}
            className="flex-1"
          >
            Réinitialiser
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <Save className="w-4 h-4 mr-2" />
            Enregistrer
          </Button>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            💡 <strong>Astuce:</strong> Les couleurs seront appliquées à toutes vos futures factures PDF.
          </p>
        </div>
      </div>
    </Modal>
  );
}
