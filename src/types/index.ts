export interface Booking {
  id: string;
  client_id: string;
  service_id: string;
  team_member_id?: string;
  start_time: string;
  end_time: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  duration: number;
  price_ht: number;
  price_ttc: number;
  tax_rate: number;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  user_id: string;
  team_id: string;
  role: 'owner' | 'admin' | 'member';
  full_name: string;
  email: string;
  created_at: string;
}

export interface Plugin {
  slug: string;
  name: string;
  description: string;
  icon: string;
  price: number;
  features: string[];
  is_active: boolean;
}

export interface PluginPermission {
  id: string;
  team_id: string;
  plugin_slug: string;
  allowed_roles: string[];
  created_at: string;
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  price_ht: number;
  price_ttc: number;
  tax_rate: number;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  user_id: string;
  total_ht: number;
  total_ttc: number;
  tax_amount: number;
  payment_method: 'cash' | 'card' | 'transfer';
  status: 'completed' | 'pending' | 'cancelled';
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price_ht: number;
  unit_price_ttc: number;
  tax_rate: number;
  subtotal_ht: number;
  subtotal_ttc: number;
}
