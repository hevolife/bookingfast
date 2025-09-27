export interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'dashboard' | 'calendar' | 'services' | 'admin' | 'emails' | 'financial';
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  granted_by: string;
  created_at: string;
  role?: Role;
}

// Permissions disponibles dans l'application
export const AVAILABLE_PERMISSIONS: Permission[] = [
  // Dashboard
  { id: 'view_dashboard', name: 'Voir le dashboard', description: 'Accès à la page dashboard', category: 'dashboard' },
  { id: 'view_revenue', name: 'Voir le chiffre d\'affaires', description: 'Voir les revenus et statistiques financières', category: 'financial' },
  { id: 'view_stats', name: 'Voir les statistiques', description: 'Accès aux métriques et graphiques', category: 'dashboard' },
  
  // Calendrier
  { id: 'view_calendar', name: 'Voir le planning', description: 'Accès au calendrier des réservations', category: 'calendar' },
  { id: 'create_booking', name: 'Créer des réservations', description: 'Ajouter de nouvelles réservations', category: 'calendar' },
  { id: 'edit_booking', name: 'Modifier des réservations', description: 'Modifier les réservations existantes', category: 'calendar' },
  { id: 'delete_booking', name: 'Supprimer des réservations', description: 'Supprimer des réservations', category: 'calendar' },
  { id: 'view_client_info', name: 'Voir infos clients', description: 'Accès aux informations des clients', category: 'calendar' },
  { id: 'view_bookings_list', name: 'Voir liste des réservations', description: 'Accès à la liste complète des réservations', category: 'calendar' },
  { id: 'view_clients_list', name: 'Voir liste des clients', description: 'Accès à la page de gestion des clients', category: 'calendar' },
  
  // Services
  { id: 'view_services', name: 'Voir les services', description: 'Accès à la liste des services', category: 'services' },
  { id: 'create_service', name: 'Créer des services', description: 'Ajouter de nouveaux services', category: 'services' },
  { id: 'edit_service', name: 'Modifier des services', description: 'Modifier les services existants', category: 'services' },
  { id: 'delete_service', name: 'Supprimer des services', description: 'Supprimer des services', category: 'services' },
  
  // Emails
  { id: 'view_emails', name: 'Voir les emails', description: 'Accès aux workflows email', category: 'emails' },
  { id: 'create_workflow', name: 'Créer des workflows', description: 'Créer des workflows email', category: 'emails' },
  { id: 'edit_workflow', name: 'Modifier des workflows', description: 'Modifier les workflows existants', category: 'emails' },
  { id: 'send_manual_email', name: 'Envoi manuel d\'emails', description: 'Envoyer des emails manuellement', category: 'emails' },
  
  // Administration
  { id: 'view_admin', name: 'Voir les réglages', description: 'Accès aux paramètres administrateur', category: 'admin' },
  { id: 'edit_business_settings', name: 'Modifier les paramètres', description: 'Modifier les paramètres de l\'entreprise', category: 'admin' },
  { id: 'manage_users', name: 'Gérer les utilisateurs', description: 'Créer et gérer les utilisateurs', category: 'admin' },
  { id: 'manage_roles', name: 'Gérer les rôles', description: 'Créer et gérer les rôles et permissions', category: 'admin' },
  
  // Financier
  { id: 'view_payments', name: 'Voir les paiements', description: 'Accès aux informations de paiement', category: 'financial' },
  { id: 'create_payment_link', name: 'Créer liens de paiement', description: 'Générer des liens de paiement', category: 'financial' },
  { id: 'manage_transactions', name: 'Gérer les transactions', description: 'Ajouter/modifier les transactions', category: 'financial' },
  
  // Super Admin
  { id: 'super_admin', name: 'Super Administration', description: 'Accès aux fonctionnalités de super admin', category: 'admin' }
];

// Rôles prédéfinis
export const DEFAULT_ROLES: Omit<Role, 'created_at' | 'updated_at'>[] = [
  {
    id: 'owner',
    name: 'Propriétaire',
    description: 'Accès complet à toutes les fonctionnalités',
    permissions: AVAILABLE_PERMISSIONS.map(p => p.id),
    is_default: false
  },
  {
    id: 'manager',
    name: 'Manager',
    description: 'Gestion complète sauf administration des utilisateurs',
    permissions: [
      'view_dashboard', 'view_revenue', 'view_stats',
      'view_calendar', 'create_booking', 'edit_booking', 'delete_booking', 'view_client_info', 'view_bookings_list',
      'view_clients_list',
      'view_services', 'create_service', 'edit_service', 'delete_service',
      'view_emails', 'create_workflow', 'edit_workflow', 'send_manual_email',
      'view_admin', 'edit_business_settings',
      'view_payments', 'create_payment_link', 'manage_transactions'
    ],
    is_default: false
  },
  {
    id: 'employee',
    name: 'Employé',
    description: 'Gestion des réservations et consultation',
    permissions: [
      'view_dashboard', 'view_stats',
      'view_calendar', 'create_booking', 'edit_booking', 'view_client_info', 'view_bookings_list',
      'view_clients_list',
      'view_services',
      'view_payments'
    ],
    is_default: true
  },
  {
    id: 'receptionist',
    name: 'Réceptionniste',
    description: 'Gestion des réservations et paiements',
    permissions: [
      'view_dashboard', 'view_stats',
      'view_calendar', 'create_booking', 'edit_booking', 'view_client_info', 'view_bookings_list',
      'view_clients_list',
      'view_services',
      'view_payments', 'create_payment_link', 'manage_transactions'
    ],
    is_default: false
  },
  {
    id: 'viewer',
    name: 'Consultation',
    description: 'Accès en lecture seule',
    permissions: [
      'view_dashboard',
      'view_calendar', 'view_client_info', 'view_bookings_list',
      'view_clients_list',
      'view_services'
    ],
    is_default: false
  }
];