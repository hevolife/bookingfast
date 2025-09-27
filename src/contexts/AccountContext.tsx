import React, { createContext, useContext } from 'react';
import { useAccount } from '../hooks/useAccount';
import { Account, AccountUser } from '../types/account';

interface AccountContextType {
  account: Account | null;
  accountUsers: AccountUser[];
  userPermissions: string[];
  isOwner: boolean;
  loading: boolean;
  error: string | null;
  hasPermission: (permission: string) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  createAccountUser: (userData: any) => Promise<any>;
  updateUserPermissions: (userId: string, permissions: string[]) => Promise<void>;
  removeAccountUser: (userId: string) => Promise<void>;
  refetch: () => void;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const accountData = useAccount();

  return (
    <AccountContext.Provider value={accountData}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccountContext() {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccountContext must be used within an AccountProvider');
  }
  return context;
}