import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Invoice, InvoiceItem } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function useInvoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = async () => {
    if (!user || !isSupabaseConfigured()) {
      setInvoices([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase!
        .from('invoices')
        .select(`
          *,
          client:clients(*),
          items:invoice_items(*)
        `)
        .eq('user_id', user.id)
        .order('invoice_date', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      console.error('Erreur chargement factures:', err);
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
    if (!user || !isSupabaseConfigured()) {
      throw new Error('Supabase non configuré');
    }

    try {
      setError(null);

      // Générer le numéro de facture
      const invoiceNumber = await generateInvoiceNumber();

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

      // Créer la facture
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

      if (invoiceError) throw invoiceError;

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

      const { error: itemsError } = await supabase!
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      // ✅ REFRESH AUTOMATIQUE APRÈS CRÉATION
      await fetchInvoices();
      
      return invoice;
    } catch (err) {
      console.error('Erreur création facture:', err);
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
    if (user) {
      fetchInvoices();
    }
  }, [user?.id]);

  return {
    invoices,
    loading,
    error,
    fetchInvoices,
    generateInvoiceNumber,
    createInvoice,
    updateInvoice,
    deleteInvoice
  };
}
