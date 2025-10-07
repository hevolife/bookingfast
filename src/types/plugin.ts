export interface Plugin {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  category: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  is_active: boolean;
  is_featured: boolean;
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
  created_at: string;
  updated_at: string;
}

export interface PluginSubscription {
  id: string;
  user_id: string;
  plugin_id: string;
  status: 'active' | 'trial' | 'cancelled' | 'expired';
  billing_cycle: 'monthly' | 'yearly';
  activated_features: string[];
  current_period_start: string;
  current_period_end: string;
  stripe_subscription_id?: string;
  created_at: string;
  updated_at: string;
  plugin?: Plugin;
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

export interface TeamMemberPluginAccess {
  plugin_id: string;
  plugin_name: string;
  plugin_slug: string;
  plugin_icon: string;
  can_access: boolean;
}
