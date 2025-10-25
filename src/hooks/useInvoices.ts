import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Invoice, InvoiceItem } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function useInvoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // ✅ AJOUT : Clé de refresh

  const fetchInvoices = async () => {
    console.log('🔄 fetchInvoices appelé, user:', user?.id);
    
    if (!user || !isSupabaseConfigured()) {
      console.log('❌ Pas de user ou Supabase non configuré');
      setInvoices([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('📡 Requête Supabase en cours...');
      const { data, error } = await supabase!
        .from('invoices')
        .select(`
          *,
          client:clients(*),
          items:invoice_items(*)
        `)
        .eq('user_id', user.id)
        .order('invoice_date', { ascending: false });

      if (error) {
        console.error('❌ Erreur Supabase:', error);
        throw error;
      }
      
      console.log('✅ Factures récupérées:', data?.length, 'factures');
      console.log('📋 Détail des factures:', data?.map(inv => inv.invoice_number));
      
      // ✅ CORRECTION : Créer un NOUVEAU tableau pour forcer le re-render
      setInvoices([...(data || [])]);
      
      // ✅ AJOUT : Incrémenter la clé de refresh pour forcer le re-render
      setRefreshKey(prev => prev + 1);
      console.log('🔑 RefreshKey incrémenté');
    } catch (err) {
      console.error('❌ Erreur chargement factures:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const generateInvoiceNumber = async (): Promise<string> => {
    if (!user || !isSupabaseConfigured()) {
      return `F${new Date().getFullYear()}-0001`;
    }

    try {
      const { data, error } = await supabase!
        .rpc('generate_invoice_number', { p_user_id: user.id });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Erreur génération numéro:', err);
      const year = new Date().getFullYear();
      const count = invoices.filter(inv => 
        inv.invoice_date.startsWith(year.toString())
      ).length + 1;
      return `F${year}-${count.toString().padStart(4, '0')}`;
    }
  };

  const createInvoice = async (invoiceData: Partial<Invoice>, items: Partial<InvoiceItem>[]): Promise<Invoice> => {
    console.log('🆕 createInvoice appelé');
    
    if (!user || !isSupabaseConfigured()) {
      throw new Error('Supabase non configuré');
    }

    try {
      setError(null);

      // Générer le numéro de facture
      const invoiceNumber = await generateInvoiceNumber();
      console.log('📝 Numéro de facture généré:', invoiceNumber);

      // Calculer les totaux
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

      const total_ttc = subtotal_ht + total_tva;

      console.log('💰 Totaux calculés - HT:', subtotal_ht, 'TVA:', total_tva, 'TTC:', total_ttc);

      // Créer la facture
      console.log('📤 Insertion facture en base...');
      const { data: invoice, error: invoiceError } = await supabase!
        .from('invoices')
        .insert({
          ...invoiceData,
          user_id: user.id,
          invoice_number: invoiceNumber,
          subtotal_ht,
          total_tva,
          total_ttc
        })
        .select()
        .single();

      if (invoiceError) {
        console.error('❌ Erreur insertion facture:', invoiceError);
        throw invoiceError;
      }

      console.log('✅ Facture créée:', invoice.id);

      // Créer les lignes de facture
      const invoiceItems = items.map(item => {
        const itemTotal = (item.quantity || 0) * (item.unit_price_ht || 0);
        const discount = itemTotal * ((item.discount_percent || 0) / 100);
        const totalHT = itemTotal - discount;
        const tva = totalHT * ((item.tva_rate || 20) / 100);
        const totalTTC = totalHT + tva;

        return {
          ...item,
          invoice_id: invoice.id,
          total_ht: totalHT,
          total_tva: tva,
          total_ttc: totalTTC
        };
      });

      console.log('📤 Insertion items en base...');
      const { error: itemsError } = await supabase!
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) {
        console.error('❌ Erreur insertion items:', itemsError);
        throw itemsError;
      }

      console.log('✅ Items créés');

      // ✅ REFRESH AUTOMATIQUE APRÈS CRÉATION
      console.log('🔄 Appel fetchInvoices pour refresh...');
      await fetchInvoices();
      console.log('✅ Refresh terminé');
      
      return invoice;
    } catch (err) {
      console.error('❌ Erreur création facture:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      throw err;
    }
  };

  const updateInvoice = async (invoiceId: string, updates: Partial<Invoice>): Promise<void> => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase non configuré');
    }

    try {
      setError(null);

      const { error } = await supabase!
        .from('invoices')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId);

      if (error) throw error;
      
      // ✅ REFRESH AUTOMATIQUE APRÈS UPDATE
      await fetchInvoices();
    } catch (err) {
      console.error('Erreur mise à jour facture:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      throw err;
    }
  };

  const deleteInvoice = async (invoiceId: string): Promise<void> => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase non configuré');
    }

    try {
      setError(null);

      const { error } = await supabase!
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (error) throw error;
      
      // ✅ REFRESH AUTOMATIQUE APRÈS DELETE
      await fetchInvoices();
    } catch (err) {
      console.error('Erreur suppression facture:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      throw err;
    }
  };

  useEffect(() => {
    console.log('🎯 useEffect useInvoices, user:', user?.id);
    if (user) {
      fetchInvoices();
    }
  }, [user?.id]);

  return {
    invoices,
    loading,
    error,
    refreshKey, // ✅ AJOUT : Exposer la clé de refresh
    fetchInvoices,
    generateInvoiceNumber,
    createInvoice,
    updateInvoice,
    deleteInvoice
  };
}
