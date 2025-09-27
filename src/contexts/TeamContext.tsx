import React, { createContext, useContext } from 'react';
import { useTeam } from '../hooks/useTeam';
import { TeamMember } from '../types/team';

interface TeamContextType {
  teamMembers: TeamMember[];
  userPermissions: string[];
  isOwner: boolean;
  loading: boolean;
  error: string | null;
  hasPermission: (permission: string) => boolean;
  inviteTeamMember: (memberData: any) => Promise<any>;
  updateMemberPermissions: (memberId: string, permissions: string[]) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  refetch: () => void;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const teamData = useTeam();

  return (
    <TeamContext.Provider value={teamData}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeamContext() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeamContext must be used within a TeamProvider');
  }
  return context;
}