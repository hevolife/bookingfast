export interface User {
  id: string;
  email: string;
  full_name?: string;
  created_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  user_id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price_ttc: number;
  price_ht: number;
  capacity: number;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  unit_name?: string;
}

export interface TimeRange {
  start: string;
  end: string;
}

export interface DaySchedule {
  ranges: TimeRange[];
  closed: boolean;
}

export interface OpeningHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
  [key: string]: DaySchedule;
}

export interface BusinessSettings {
  id: string;
  user_id?: string;
  business_name: string;
  primary_color: string;
  secondary_color: string;
  opening_hours: OpeningHours;
  buffer_minutes: number;
  default_deposit_percentage: number;
  minimum_booking_delay_hours: number;
  payment_link_expiry_minutes: number;
  deposit_type: 'percentage' | 'fixed_amount';
  deposit_fixed_amount: number;
  email_notifications: boolean;
  brevo_enabled: boolean;
  brevo_api_key: string;
  brevo_sender_email: string;
  brevo_sender_name: string;
  stripe_enabled: boolean;
  stripe_public_key: string;
  stripe_secret_key: string;
  stripe_webhook_secret: string;
  timezone: string;
  tax_rate?: number;
  enable_user_assignment?: boolean;
  multiply_deposit_by_services?: boolean;
  iframe_services?: string[];
}

export interface Booking {
  id: string;
  user_id: string;
  client_id: string;
  service_id: string;
  date: string;
  time: string;
  duration_minutes: number;
  booking_status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  payment_status: 'unpaid' | 'partial' | 'paid';
  total_amount: number;
  paid_amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  quantity: number;
  assigned_user_id?: string;
  client?: Client;
  service?: Service;
  assigned_user?: User;
  transactions?: Transaction[];
  client_name: string;
  client_firstname: string;
  client_email: string;
  client_phone: string;
  payment_amount: number;
  custom_service_data?: {
    name: string;
    price: number;
    duration: number;
  };
}

export interface Transaction {
  id: string;
  booking_id?: string;
  amount: number;
  method: 'cash' | 'card' | 'transfer' | 'stripe';
  status: 'completed' | 'pending' | 'cancelled';
  note?: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  owner_id: string;
  user_id: string;
  email: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  full_name?: string;
  permissions: string[];
  role_name: string;
  is_active: boolean;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface TeamInvitation {
  id: string;
  owner_id: string;
  email: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  permissions: string[];
  role_name: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  invited_at: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  price: number;
  features: string[];
  icon: string;
  category: 'pos' | 'analytics' | 'marketing' | 'integration' | 'enterprise';
  is_active: boolean;
  requires_subscription?: boolean;
}

export interface UserPlugin {
  id: string;
  user_id: string;
  plugin_id: string;
  is_active: boolean;
  activated_at: string;
  expires_at?: string;
  settings?: Record<string, any>;
}

export interface POSProduct {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  price: number;
  stock_quantity: number;
  category?: string;
  barcode?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface POSSale {
  id: string;
  user_id: string;
  total_amount: number;
  payment_method: 'cash' | 'card' | 'transfer';
  items: POSSaleItem[];
  notes?: string;
  created_at: string;
}

export interface POSSaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface AffiliateLink {
  id: string;
  user_id: string;
  code: string;
  clicks: number;
  conversions: number;
  earnings: number;
  is_active: boolean;
  created_at: string;
}

export interface AffiliateCommission {
  id: string;
  affiliate_id: string;
  referred_user_id: string;
  amount: number;
  status: 'pending' | 'paid';
  created_at: string;
  paid_at?: string;
}
