export interface Service {
  id: string;
  user_id?: string;
  name: string;
  price_ht: number;
  price_ttc: number;
  image_url?: string;
  description: string;
  duration_minutes: number;
  capacity: number;
  unit_name?: string;
  availability_hours?: {
    [key: string]: {
      ranges: Array<{
        start: string;
        end: string;
      }>;
      closed: boolean;
    };
  };
  created_at?: string;
  updated_at?: string;
}

export interface Client {
  id: string;
  user_id?: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  created_at?: string;
  updated_at?: string;
}

export interface Transaction {
  id: string;
  amount: number;
  method: 'cash' | 'card' | 'transfer' | 'stripe';
  note: string;
  status?: 'pending' | 'completed' | 'cancelled';
  created_at: string;
}

export interface Booking {
  id: string;
  user_id?: string;
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
  payment_amount?: number;
  payment_link?: string;
  transactions?: Transaction[];
  booking_status: 'pending' | 'confirmed' | 'cancelled';
  custom_service_data?: {
    name: string;
    price: number;
    duration: number;
  } | null;
  created_at?: string;
  updated_at?: string;
  service?: Service;
}

export interface BusinessSettings {
  id: string;
  user_id?: string;
  business_name: string;
  primary_color: string;
  secondary_color: string;
  logo_url?: string;
  opening_hours: {
    [key: string]: {
      ranges: Array<{
        start: string;
        end: string;
      }>;
      closed: boolean;
    };
  };
  buffer_minutes: number;
  default_deposit_percentage: number;
  deposit_type: 'percentage' | 'fixed_amount';
  deposit_fixed_amount: number;
  minimum_booking_delay_hours: number;
  payment_link_expiry_minutes?: number;
  email_notifications: boolean;
  brevo_api_key?: string;
  brevo_sender_email?: string;
  brevo_sender_name?: string;
  brevo_enabled: boolean;
  stripe_enabled?: boolean;
  stripe_public_key?: string;
  stripe_secret_key?: string;
  stripe_webhook_secret?: string;
  timezone: string;
  created_at?: string;
  updated_at?: string;
  iframe_services?: string[]; // IDs des services visibles sur l'iframe
}

export interface TimeSlot {
  time: string;
  available: boolean;
  booking?: Booking;
}
