import React, { useState } from 'react';
import { X, Plus, Trash2, Search, Package, Hash, Euro, Percent } from 'lucide-react';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { useClients } from '../../hooks/useClients';
import { useProducts } from '../../hooks/useProducts';
import { useInvoices } from '../../hooks/useInvoices';
import { Client, Product, InvoiceItem } from '../../types';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateInvoiceModal({ isOpen, onClose }: CreateInvoiceModalProps) {
  const { clients } = useClients();
  const { products } = useProducts();
  const { createInvoice, fetchInvoices } = useInvoices();

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [items, setItems] = useState<Partial<InvoiceItem>[]>([]);
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [loading, setLoading] = useState(false);

  const addItem = (product?: Product) => {
    const newItem: Partial<InvoiceItem> = {
      product_id: product?.id,
      description: product?.name || '',
      quantity: 1,
      unit_price_ht: product?.price_ht || 0,
      tva_rate: product?.tva_rate || 20,
      discount_percent: 0
    };
    setItems([...items, newItem]);
    setShowProductSearch(false);
    setSearchTerm('');
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    let subtotal_ht = 0;
    let total_tva = 0;

    items.forEach(item => {
      const itemTotal = (item.quantity || 0) * (item.unit_price_ht || 0);
      const discount = itemTotal * ((item.discount_percent || 0) / 100);
      const totalHT = itemTotal - discount;
      const tva = totalHT * ((item.tva_rate || 20) / 100);
      
      subtotal_ht += totalHT;
      total_tva += tva;
    });

    return {
      subtotal_ht,
      total_tva,
      total_ttc: subtotal_ht + total_tva
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClient) {
      alert('Veuillez sélectionner un client');
      return;
    }

    if (items.length === 0) {
      alert('Veuillez ajouter au moins un produit');
      return;
    }

    try {
      setLoading(true);

      await createInvoice(
        {
          client_id: selectedClient.id,
          invoice_date: invoiceDate,
          due_date: dueDate,
          status: 'draft',
          notes,
          payment_conditions: 'Paiement à réception de facture'
        },
        items
      );

      // ✅ REFRESH AUTOMATIQUE DE LA LISTE
      await fetchInvoices();

      alert('Facture créée avec succès !');
      onClose();
    } catch (error) {
      alert('Erreur lors de la création de la facture');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nouvelle facture" size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sélection client */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Client *
          </label>
          <select
            value={selectedClient?.id || ''}
            onChange={(e) => {
              const client = clients.find(c => c.id === e.target.value);
              setSelectedClient(client || null);
            }}
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            required
          >
            <option value="">Sélectionner un client</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.firstname} {client.lastname} - {client.email}
              </option>
            ))}
          </select>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Date de facture *
            </label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Date d'échéance *
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              required
            />
          </div>
        </div>

        {/* Produits */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-bold text-gray-700">
              Produits/Services *
            </label>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowProductSearch(!showProductSearch)}
              className="text-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </div>

          {/* Recherche produit */}
          {showProductSearch && (
            <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher un produit..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {filteredProducts.map(product => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addItem(product)}
                    className="w-full text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all"
                  >
                    <div className="font-medium text-gray-900">{product.name}</div>
                    <div className="text-sm text-gray-600">
                      {product.price_ht.toFixed(2)}€ HT - TVA {product.tva_rate}%
                    </div>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => addItem()}
                  className="w-full text-left p-3 bg-white rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-500 hover:bg-purple-50 transition-all"
                >
                  <div className="font-medium text-purple-600">+ Produit personnalisé</div>
                </button>
              </div>
            </div>
          )}

          {/* Liste des items - VERSION AMÉLIORÉE AVEC LABELS CLAIRS */}
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="p-4 bg-gradient-to-r from-gray-50 to-purple-50 rounded-xl border-2 border-purple-200">
                {/* Description */}
                <div className="mb-3">
                  <label className="flex items-center text-xs font-bold text-gray-700 mb-1">
                    <Package className="w-4 h-4 mr-1 text-purple-600" />
                    Description du produit/service
                  </label>
                  <input
                    type="text"
                    value={item.description || ''}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    placeholder="Ex: Entretien Jet ski Complet"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                {/* Grille des champs numériques */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {/* Quantité */}
                  <div>
                    <label className="flex items-center text-xs font-bold text-gray-700 mb-1">
                      <Hash className="w-4 h-4 mr-1 text-blue-600" />
                      Quantité
                    </label>
                    <input
                      type="number"
                      value={item.quantity || 1}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
                      placeholder="1"
                      min="0"
                      step="0.01"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center font-bold"
                      required
                    />
                  </div>

                  {/* Prix unitaire HT */}
                  <div>
                    <label className="flex items-center text-xs font-bold text-gray-700 mb-1">
                      <Euro className="w-4 h-4 mr-1 text-green-600" />
                      Prix unitaire HT
                    </label>
                    <input
                      type="number"
                      value={item.unit_price_ht || 0}
                      onChange={(e) => updateItem(index, 'unit_price_ht', parseFloat(e.target.value))}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-center font-bold"
                      required
                    />
                  </div>

                  {/* TVA */}
                  <div>
                    <label className="flex items-center text-xs font-bold text-gray-700 mb-1">
                      <Percent className="w-4 h-4 mr-1 text-orange-600" />
                      TVA (%)
                    </label>
                    <input
                      type="number"
                      value={item.tva_rate || 20}
                      onChange={(e) => updateItem(index, 'tva_rate', parseFloat(e.target.value))}
                      placeholder="20"
                      min="0"
                      step="0.01"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-center font-bold"
                      required
                    />
                  </div>

                  {/* Bouton supprimer */}
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="w-full p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-bold flex items-center justify-center gap-2"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Supprimer</span>
                    </button>
                  </div>
                </div>

                {/* Aperçu du total de la ligne */}
                <div className="mt-3 pt-3 border-t border-purple-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total ligne HT:</span>
                    <span className="font-bold text-purple-600">
                      {((item.quantity || 0) * (item.unit_price_ht || 0)).toFixed(2)}€
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {items.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>Aucun produit ajouté</p>
                <p className="text-sm">Cliquez sur "Ajouter" pour commencer</p>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            placeholder="Notes additionnelles..."
          />
        </div>

        {/* Totaux */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
          <div className="space-y-2">
            <div className="flex justify-between text-gray-700">
              <span>Sous-total HT:</span>
              <span className="font-bold">{totals.subtotal_ht.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>TVA:</span>
              <span className="font-bold">{totals.total_tva.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between text-xl font-black text-purple-600 pt-2 border-t-2 border-purple-300">
              <span>Total TTC:</span>
              <span>{totals.total_ttc.toFixed(2)}€</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={loading}
          >
            {loading ? 'Création...' : 'Créer la facture'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
