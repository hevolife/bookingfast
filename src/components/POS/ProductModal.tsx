import React, { useState, useEffect } from 'react';
import { X, Package, DollarSign, Hash, Clock, Palette } from 'lucide-react';
import { Modal } from '../UI/Modal';
import { POSProduct, POSCategory } from '../../types/pos';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: POSProduct | null;
  categories: POSCategory[];
  onSave: (product: Partial<POSProduct>) => Promise<void>;
  onDelete?: () => Promise<void>;
}

const COLORS = [
  { value: 'blue', label: 'Bleu', class: 'from-blue-500 to-cyan-500' },
  { value: 'green', label: 'Vert', class: 'from-green-500 to-emerald-500' },
  { value: 'red', label: 'Rouge', class: 'from-red-500 to-pink-500' },
  { value: 'purple', label: 'Violet', class: 'from-purple-500 to-pink-500' },
  { value: 'orange', label: 'Orange', class: 'from-orange-500 to-red-500' }
];

export function ProductModal({ isOpen, onClose, product, categories, onSave, onDelete }: ProductModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    cost: '',
    stock: '999',
    track_stock: false,
    duration_minutes: '',
    category_id: '',
    color: 'blue'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || '',
        price: product.price.toString(),
        cost: product.cost?.toString() || '',
        stock: product.stock.toString(),
        track_stock: product.track_stock,
        duration_minutes: product.duration_minutes?.toString() || '',
        category_id: product.category_id || '',
        color: product.color
      });
    } else {
      setFormData({
        name: '',
        description: '',
        price: '',
        cost: '',
        stock: '999',
        track_stock: false,
        duration_minutes: '',
        category_id: '',
        color: 'blue'
      });
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await onSave({
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        cost: formData.cost ? parseFloat(formData.cost) : 0,
        stock: parseInt(formData.stock),
        track_stock: formData.track_stock,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        category_id: formData.category_id || null,
        color: formData.color
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? 'Modifier le service' : 'Nouveau service'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Package className="w-4 h-4 inline mr-2" />
            Nom du service *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Ex: Coupe homme"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            rows={3}
            placeholder="Description du service..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="w-4 h-4 inline mr-2" />
              Prix de vente * (€)
            </label>
            <input
              type="number"
              required
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Coût (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Catégorie
          </label>
          <select
            value={formData.category_id}
            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Aucune catégorie</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="w-4 h-4 inline mr-2" />
            Durée (minutes)
          </label>
          <input
            type="number"
            min="0"
            value={formData.duration_minutes}
            onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Ex: 30"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.track_stock}
              onChange={(e) => setFormData({ ...formData, track_stock: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm font-medium text-gray-700">
              <Hash className="w-4 h-4 inline mr-2" />
              Suivre le stock
            </span>
          </label>
        </div>

        {formData.track_stock && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stock initial
            </label>
            <input
              type="number"
              min="0"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Palette className="w-4 h-4 inline mr-2" />
            Couleur
          </label>
          <div className="grid grid-cols-5 gap-2">
            {COLORS.map(color => (
              <button
                key={color.value}
                type="button"
                onClick={() => setFormData({ ...formData, color: color.value })}
                className={`h-12 rounded-xl bg-gradient-to-r ${color.class} ${
                  formData.color === color.value ? 'ring-4 ring-offset-2 ring-purple-500' : ''
                }`}
                title={color.label}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={saving}
              className="bg-red-100 text-red-700 px-6 py-3 rounded-xl font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
            >
              Supprimer
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
