import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface SubscriptionStatusProps {
  pluginSlug: string;
}

export function SubscriptionStatus({ pluginSlug }: SubscriptionStatusProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<'active' | 'trial' | 'inactive' | 'loading'>('loading');

  useEffect(() => {
    async function checkSubscription() {
      if (!supabase || !user) {
        setStatus('inactive');
        return;
      }

      try {
        const { data } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', user.id)
          .eq('plugin_slug', pluginSlug)
          .in('status', ['active', 'trial'])
          .single();

        setStatus(data ? data.status : 'inactive');
      } catch (error) {
        setStatus('inactive');
      }
    }

    checkSubscription();
  }, [user, pluginSlug]);

  if (status === 'loading') {
    return null;
  }

  if (status === 'active') {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle className="w-4 h-4" />
        <span className="text-sm">Actif</span>
      </div>
    );
  }

  if (status === 'trial') {
    return (
      <div className="flex items-center gap-2 text-blue-600">
        <Clock className="w-4 h-4" />
        <span className="text-sm">Essai</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-gray-400">
      <XCircle className="w-4 h-4" />
      <span className="text-sm">Inactif</span>
    </div>
  );
}
