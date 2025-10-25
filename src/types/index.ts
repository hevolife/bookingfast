export interface Transaction {
  id: string;
  amount: number;
  method: 'cash' | 'card' | 'check' | 'transfer' | 'stripe' | 'other';
  note?: string;
  status?: 'pending' | 'completed' | 'cancelled';
  date?: string;
  created_at?: string;
  stripe_session_id?: string;
  payment_link_id?: string;
}

export interface Booking {
  id: string;
  user_id: string;
  service_id: string;
  service?: Service;
  date: string;
  time: string;
  duration_minutes: number;
  quantity: number;
  client_name: string;
  client_firstname: string;
  client_email: string;
  client_phone: string;
  total_amount: number;
  payment_status: 'pending' | 'partial' | 'paid' | 'completed';
  payment_amount?: number;
  deposit_amount?: number;
  transactions?: Transaction[];
  created_at: string;
  booking_status?: 'pending' | 'confirmed' | 'cancelled';
  assigned_user_id?: string | null;
  notes?: string | null;
  google_calendar_event_id?: string | null;
  stripe_session_id?: string | null;
  payment_link?: string | null;
  custom_service_data?: {
    name: string;
    price: number;
    duration: number;
  } | null;
}

export interface Service {
  id: string;
  user_id: string;
  name: string;
  description: string;
  price_ht: number;
  price_ttc: number;
  duration_minutes: number;
  capacity: number;
  unit_name?: string;
  image_url?: string;
  created_at: string;
}

export interface Client {
  id: string;
  user_id?: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  created_at?: string;
}

export interface User {
  id: string;
  email: string;
  subscription_tier: 'starter' | 'pro';
  subscription_status: 'active' | 'cancelled' | 'trialing';
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
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
  deposit_type: 'percentage' | 'fixed';
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
  multiply_deposit_by_services: boolean;
  enable_user_assignment?: boolean;
  iframe_enable_team_selection?: boolean;
  iframe_services?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Plugin {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  is_active: boolean;
  created_at: string;
}

export interface UserPlugin {
  id: string;
  user_id: string;
  plugin_id: string;
  plugin_slug: string;
  status: 'active' | 'cancelled' | 'trialing';
  is_trial: boolean;
  trial_ends_at: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  owner_id: string;
  user_id: string;
  email: string;
  firstname?: string;
  lastname?: string;
  full_name?: string;
  role_name: string;
  is_active: boolean;
  restricted_visibility: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentLink {
  id: string;
  user_id: string;
  booking_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'expired' | 'cancelled';
  payment_url: string | null;
  expires_at: string;
  paid_at: string | null;
  stripe_session_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailWorkflow {
  id: string;
  user_id: string;
  name: string;
  trigger_event: 'booking_created' | 'booking_updated' | 'booking_cancelled' | 'booking_status_changed' | 'payment_link_created' | 'payment_received';
  is_active: boolean;
  send_to_client: boolean;
  send_to_owner: boolean;
  email_subject: string;
  email_body: string;
  created_at: string;
  updated_at: string;
}

export interface Unavailability {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  reason?: string;
  assigned_user_id?: string | null;
  created_at: string;
}

// 🆕 Types pour le système de facturation
export interface Product {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  price_ht: number;
  price_ttc: number;
  tva_rate: number;
  unit: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id?: string;
  description: string;
  quantity: number;
  unit_price_ht: number;
  tva_rate: number;
  discount_percent: number;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  client_id: string;
  client?: Client;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  subtotal_ht: number;
  total_tva: number;
  total_ttc: number;
  notes?: string;
  payment_conditions: string;
  sent_at?: string;
  paid_at?: string;
  items?: InvoiceItem[];
  created_at: string;
  updated_at: string;
}

export interface CompanyInfo {
  id: string;
  user_id: string;
  company_name: string;
  legal_form?: string;
  siret?: string;
  tva_number?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  country: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  bank_name?: string;
  iban?: string;
  bic?: string;
  created_at: string;
  updated_at: string;
}
