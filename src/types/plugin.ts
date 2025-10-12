export interface Plugin {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  category: string;
  base_price: number;
  features: PluginFeature[];
  is_active: boolean;
  is_featured: boolean;
  stripe_payment_link?: string;
  stripe_price_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PluginFeature {
  id: string;
  name: string;
  description: string;
  included: boolean;
  price?: number;
}

export interface PluginSubscription {
  id: string;
  user_id: string;
  plugin_id: string;
  stripe_subscription_id?: string;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  is_trial?: boolean;
  trial_ends_at?: string;
  current_period_start?: string;
  current_period_end?: string;
  activated_features: string[];
  created_at: string;
  updated_at: string;
  plugin?: Plugin;
}

export interface PluginConfiguration {
  id: string;
  user_id: string;
  plugin_id: string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface UserPlugin {
  plugin_id: string;
  plugin_name: string;
  plugin_slug: string;
  plugin_icon: string;
  plugin_category: string;
  activated_features: string[];
  settings: Record<string, any>;
}
