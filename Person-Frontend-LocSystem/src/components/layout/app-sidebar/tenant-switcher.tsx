'use client';

import { Building2, Briefcase } from 'lucide-react';

import { useTenant } from '../../../components/providers/tenant-context';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '../../../components/ui/sidebar';

export function TenantSwitcher() {
  const { availableTenants, isLoading, canSwitchTenant } = useTenant();

  if (!canSwitchTenant) {
    return null;
  }

  if (availableTenants.length === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            className="animate-pulse bg-sidebar-accent/50 hover:bg-sidebar-accent/75"
            disabled
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-muted/70">
              <Briefcase className="size-4 animate-pulse" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold text-muted-foreground">
                Carregando...
              </span>
              <span className="truncate text-xs text-muted-foreground/70">
                Assessoria
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
            <Briefcase className="size-3" />
            <span className="font-medium">{availableTenants[0].name}</span>
          </div>
          <div className="scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent max-h-[168px] overflow-y-auto">
            {availableTenants.map((tenant) => (
              <div
                key={tenant.id}
                title={tenant.name}
                className="mx-1 flex cursor-default items-center gap-3 rounded-md border border-transparent p-2 hover:border-sidebar-border/50 hover:bg-sidebar-accent/50"
              >
                <div className="flex size-6 items-center justify-center rounded-lg border border-border bg-muted">
                  <Building2 className="size-3 text-black" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {tenant.wallet?.name || 'Carteira não definida'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
