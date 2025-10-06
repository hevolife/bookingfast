export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Client {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  created_at?: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price_ttc: number;
  price_ht: number;
  capacity: number;
  color: string;
  user_id: string;
  created_at: string;
  unit_name?: string;
}

export interface Transaction {
  id: string;
  amount: number;
  method: 'cash' | 'card' | 'check' | 'transfer' | 'stripe';
  note?: string;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
}

export interface Booking {
  id: string;
  service_id: string;
  date: string;
  time: string;
  duration_minutes: number;
  quantity: number;
  client_name: string;
  client_firstname: string;
  client_email: string;
  client_phone: string;
  total_amount: number;
  payment_status: 'pending' | 'partial' | 'completed';
  payment_amount: number;
  payment_link?: string;
  transactions: Transaction[];
  user_id: string;
  created_at: string;
  booking_status: 'pending' | 'confirmed' | 'cancelled';
  assigned_user_id?: string | null;
  notes?: string | null;
  service?: Service;
  custom_service_data?: {
    name: string;
    price: number;
    duration: number;
  } | null;
  google_calendar_event_id?: string | null;
}

export interface BusinessSettings {
  id: string;
  user_id: string;
  business_name: string;
  primary_color: string;
  secondary_color: string;
  opening_hours: {
    [key: string]: {
      ranges: Array<{ start: string; end: string }>;
      closed: boolean;
    };
  };
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
  multiply_deposit_by_services?: boolean;
  enable_user_assignment?: boolean;
  google_calendar_enabled?: boolean;
  google_calendar_id?: string | null;
  google_calendar_sync_status?: 'disconnected' | 'connected' | 'error';
}

export interface TeamMember {
  id: string;
  owner_id: string;
  user_id: string;
  email: string;
  role: 'admin' | 'member';
  is_active: boolean;
  created_at: string;
  user?: {
    email: string;
  };
}

export interface Plugin {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  price: number;
  features: string[];
  is_active: boolean;
}

export interface UserPlugin {
  id: string;
  user_id: string;
  plugin_id: string;
  plugin_slug: string;
  is_active: boolean;
  activated_at: string;
  expires_at?: string;
}

export interface Affiliate {
  id: string;
  user_id: string;
  affiliate_code: string;
  commission_rate: number;
  total_referrals: number;
  total_earnings: number;
  created_at: string;
}

export interface AffiliateReferral {
  id: string;
  affiliate_id: string;
  referred_user_id: string;
  commission_amount: number;
  status: 'pending' | 'paid';
  created_at: string;
}
