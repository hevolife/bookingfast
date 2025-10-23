export interface User {
  id: string;
  email: string;
  full_name?: string;
  created_at?: string;
}

export interface Service {
  id: string;
  user_id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price_ht: number;
  price_ttc: number;
  capacity: number;
  image_url?: string;
  created_at?: string;
  unit_name?: string;
}

export interface Booking {
  id: string;
  user_id: string;
  service_id: string;
  date: string;
  time: string;
  duration_minutes: number;
  client_name: string;
  client_firstname?: string;
  client_email: string;
  client_phone?: string;
  total_amount: number;
  payment_status: 'pending' | 'partial' | 'completed' | 'failed' | 'refunded';
  payment_amount: number;
  booking_status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  created_at: string;
  quantity?: number;
  assigned_user_id?: string;
}

export interface Client {
  id: string;
  user_id: string;
  firstname: string;
  lastname: string;
  email: string;
  phone?: string;
  notes?: string;
  created_at: string;
  total_bookings?: number;
  total_spent?: number;
  last_booking_date?: string;
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
}

export interface BusinessSettings {
  id: string;
  user_id: string;
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
  multiply_deposit_by_services?: boolean;
  iframe_services?: string[];
  iframe_enable_team_selection?: boolean;
  enable_user_assignment?: boolean;
}

export interface PaymentLink {
  id: string;
  booking_id: string;
  stripe_payment_intent_id?: string;
  amount: number;
  status: 'pending' | 'completed' | 'expired' | 'failed';
  expires_at: string;
  created_at: string;
}

export interface Unavailability {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  reason?: string;
  created_at?: string;
  assigned_user_id?: string;
}

export interface TeamMember {
  id: string;
  owner_id: string;
  user_id: string;
  email: string;
  role_name: string;
  firstname?: string;
  lastname?: string;
  full_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface TeamInvitation {
  id: string;
  owner_id: string;
  email: string;
  role_name: string;
  status: 'pending' | 'accepted' | 'expired';
  expires_at: string;
  created_at: string;
}
