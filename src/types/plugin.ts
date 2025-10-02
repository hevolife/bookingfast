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
  plugin?: Plugin;
  stripe_subscription_id?: string;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  current_period_start?: string;
  current_period_end?: string;
  activated_features: string[];
  created_at: string;
  updated_at: string;
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

export interface TeamMemberPluginPermission {
  id: string;
  user_id: string;
  owner_id: string;
  plugin_id: string;
  can_access: boolean;
  created_at: string;
  updated_at: string;
}

export interface MemberAccessiblePlugin {
  plugin_id: string;
  plugin_name: string;
  plugin_slug: string;
  plugin_icon: string;
  plugin_category: string;
  owner_id: string;
  owner_email: string;
  can_access: boolean;
}

export interface TeamMemberPluginAccess {
  plugin_id: string;
  plugin_name: string;
  plugin_slug: string;
  plugin_icon: string;
  can_access: boolean;
}
