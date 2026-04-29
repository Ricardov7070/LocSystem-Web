'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

import { useAuth } from './auth';

interface LegalAdvisory {
  id: string;
  name: string;
  wallet: {
    name: string;
  } | null;
}

interface TenantContextType {
  activeTenant: LegalAdvisory | null;
  availableTenants: LegalAdvisory[];
  setActiveTenant: (tenant: LegalAdvisory | null) => void;
  isLoading: boolean;
  canSwitchTenant: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeTenant, setActiveTenantState] = useState<LegalAdvisory | null>(null);
  const [availableTenants] = useState<LegalAdvisory[]>([]);
  const [isLoading] = useState(false);

  const canSwitchTenant = user?.role === 'AUDITOR';

  useEffect(() => {
    // TODO: Buscar assessorias via API quando o endpoint estiver disponível
    // api.get('/advisory-users/my-tenants').then(r => setAvailableTenants(r.data));
  }, [canSwitchTenant]);

  const setActiveTenant = (tenant: LegalAdvisory | null) => {
    setActiveTenantState(tenant);
    if (tenant) {
      localStorage.setItem('activeTenantId', tenant.id);
    } else {
      localStorage.removeItem('activeTenantId');
    }
  };

  return (
    <TenantContext.Provider
      value={{
        activeTenant,
        availableTenants,
        setActiveTenant,
        isLoading,
        canSwitchTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
