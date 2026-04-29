import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { AuthProvider } from '../providers/auth';
import { TenantProvider } from '../providers/tenant-context';
import { SidebarProvider, SidebarInset } from '../ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { Dialoger } from '../dialog';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import CustomAlert from '../../hooks/useCustomAlert';

function ProtectedContent() {
  const { isChecking, alertInfo, clearAlert } = useRequireAuth();

  return (
    <>
      {alertInfo && (
        <div className="fixed top-4 right-4 z-[9999]">
          <CustomAlert
            message={alertInfo.message}
            type={alertInfo.type}
            onClose={clearAlert}
          />
        </div>
      )}
      {!isChecking && (
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <Suspense fallback={null}>
              <Outlet />
            </Suspense>
          </SidebarInset>
          <Dialoger />
        </SidebarProvider>
      )}
    </>
  );
}

export function AppLayout() {
  return (
    <AuthProvider>
      <TenantProvider>
        <ProtectedContent />
      </TenantProvider>
    </AuthProvider>
  );
}
