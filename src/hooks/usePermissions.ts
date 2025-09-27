import { useTeam } from './useTeam';

export function usePermissions() {
  const { 
    userPermissions, 
    loading, 
    hasPermission, 
    hasAllPermissions, 
    hasAnyPermission 
  } = useTeam();

  const getAccessibleNavItems = () => {
    const navItems = [
      { id: 'dashboard', permission: 'view_dashboard' },
      { id: 'calendar', permission: 'view_calendar' },
      { id: 'services', permission: 'view_services' },
      { id: 'emails', permission: 'view_emails' },
      { id: 'admin', permission: 'view_admin' }
    ];

    if (userPermissions.length === 0) {
      return navItems;
    }
    
    return navItems.filter(item => hasPermission(item.permission));
  };

  return {
    userPermissions,
    loading,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    getAccessibleNavItems
  };
}