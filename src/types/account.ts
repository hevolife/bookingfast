export interface Account {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface AccountUser {
  id: string;
  account_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'manager' | 'member';
  permissions: string[];
  is_active: boolean;
  invited_by?: string;
  joined_at: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

export interface AccountPermission {
  id: string;
  name: string;
  description: string;
  category: 'dashboard' | 'calendar' | 'services' | 'admin' | 'emails' | 'financial' | 'clients';
}

// Permissions disponibles par catégorie
export const ACCOUNT_PERMISSIONS: AccountPermission[] = [
  // Dashboard
  { id: 'view_dashboard', name: 'Voir le dashboard', description: 'Accès à la page dashboard', category: 'dashboard' },
  { id: 'view_revenue', name: 'Voir le chiffre d\'affaires', description: 'Voir les revenus et statistiques financières', category: 'financial' },
  { id: 'view_stats', name: 'Voir les statistiques', description: 'Accès aux métriques et graphiques', category: 'dashboard' },
  
  // Calendrier
  { id: 'view_calendar', name: 'Voir le planning', description: 'Accès au calendrier des réservations', category: 'calendar' },
  { id: 'create_booking', name: 'Créer des réservations', description: 'Ajouter de nouvelles réservations', category: 'calendar' },
  { id: 'edit_booking', name: 'Modifier des réservations', description: 'Modifier les réservations existantes', category: 'calendar' },
  { id: 'edit_own_bookings', name: 'Modifier ses réservations', description: 'Modifier seulement ses réservations assignées', category: 'calendar' },
  { id: 'delete_booking', name: 'Supprimer des réservations', description: 'Supprimer des réservations', category: 'calendar' },
  { id: 'view_bookings_list', name: 'Voir liste des réservations', description: 'Accès à la liste complète des réservations', category: 'calendar' },
  
  // Services
  { id: 'view_services', name: 'Voir les services', description: 'Accès à la liste des services', category: 'services' },
  { id: 'create_service', name: 'Créer des services', description: 'Ajouter de nouveaux services', category: 'services' },
  { id: 'edit_service', name: 'Modifier des services', description: 'Modifier les services existants', category: 'services' },
  { id: 'delete_service', name: 'Supprimer des services', description: 'Supprimer des services', category: 'services' },
  
  // Clients
  { id: 'view_clients', name: 'Voir les clients', description: 'Accès à la liste des clients', category: 'clients' },
  { id: 'manage_clients', name: 'Gérer les clients', description: 'Créer, modifier et supprimer des clients', category: 'clients' },
  
  // Emails
  { id: 'view_emails', name: 'Voir les emails', description: 'Accès aux workflows email', category: 'emails' },
  { id: 'create_workflow', name: 'Créer des workflows', description: 'Créer des workflows email', category: 'emails' },
  { id: 'edit_workflow', name: 'Modifier des workflows', description: 'Modifier les workflows existants', category: 'emails' },
  { id: 'send_manual_email', name: 'Envoi manuel d\'emails', description: 'Envoyer des emails manuellement', category: 'emails' },
  
  // Administration
  { id: 'view_admin', name: 'Voir les réglages', description: 'Accès aux paramètres administrateur', category: 'admin' },
  { id: 'edit_business_settings', name: 'Modifier les paramètres', description: 'Modifier les paramètres de l\'entreprise', category: 'admin' },
  { id: 'manage_account_users', name: 'Gérer les utilisateurs', description: 'Créer et gérer les utilisateurs du compte', category: 'admin' },
  
  // Financier
  { id: 'view_payments', name: 'Voir les paiements', description: 'Accès aux informations de paiement', category: 'financial' },
  { id: 'create_payment_link', name: 'Créer liens de paiement', description: 'Générer des liens de paiement', category: 'financial' },
  { id: 'manage_transactions', name: 'Gérer les transactions', description: 'Ajouter/modifier les transactions', category: 'financial' }
];

// Rôles prédéfinis avec leurs permissions
export const ACCOUNT_ROLES = {
  owner: {
    name: 'Propriétaire',
    description: 'Accès complet à toutes les fonctionnalités',
    permissions: ACCOUNT_PERMISSIONS.map(p => p.id)
  },
  admin: {
    name: 'Administrateur',
    description: 'Gestion complète sauf gestion des utilisateurs',
    permissions: ACCOUNT_PERMISSIONS.filter(p => p.id !== 'manage_account_users').map(p => p.id)
  },
  manager: {
    name: 'Manager',
    description: 'Gestion des réservations et services',
    permissions: [
      'view_dashboard', 'view_revenue', 'view_stats',
      'view_calendar', 'create_booking', 'edit_booking', 'delete_booking', 'view_bookings_list',
      'view_services', 'create_service', 'edit_service', 'delete_service',
      'view_clients', 'manage_clients',
      'view_emails', 'create_workflow', 'edit_workflow', 'send_manual_email',
      'view_admin', 'edit_business_settings',
      'view_payments', 'create_payment_link', 'manage_transactions'
    ]
  },
  employee: {
    name: 'Employé',
    description: 'Gestion des réservations et consultation',
    permissions: [
      'view_dashboard', 'view_stats',
      'view_calendar', 'create_booking', 'edit_own_bookings', 'view_bookings_list',
      'view_services',
      'view_clients',
      'view_payments'
    ]
  },
  viewer: {
    name: 'Consultation',
    description: 'Accès en lecture seule',
    permissions: [
      'view_dashboard',
      'view_calendar', 'view_bookings_list',
      'view_services',
      'view_clients'
    ]
  }
};