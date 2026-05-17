import { Suspense, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { AuthProvider } from '../providers/auth';
import { TenantProvider } from '../providers/tenant-context';
import { SidebarProvider, SidebarInset } from '../ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { Dialoger } from '../dialog';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { useAuth } from '../providers/auth';
import CustomAlert from '../../hooks/useCustomAlert';
import Loading from '../ui/Loading';

function ProtectedContent() {
  const { isChecking, alertInfo, clearAlert } = useRequireAuth();
  const { signOutAlert, clearSignOutAlert } = useAuth();
  const [loginAlert, setLoginAlert] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('locsystem_login_alert');
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as { message?: string; type?: 'success' | 'error' | 'warning' | 'info' };
      if (parsed?.message) {
        setLoginAlert({
          message: parsed.message,
          type: parsed.type ?? 'success',
        });
      }
    } catch {
      // Ignora conteúdo inválido no storage
    } finally {
      sessionStorage.removeItem('locsystem_login_alert');
    }
  }, []);

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
      {signOutAlert && (
        <div className="fixed top-4 right-4 z-[9999]">
          <CustomAlert
            message={signOutAlert.message}
            type={signOutAlert.type}
            onClose={clearSignOutAlert}
          />
        </div>
      )}
      {loginAlert && (
        <div className="fixed top-4 right-4 z-[9999]">
          <CustomAlert
            message={loginAlert.message}
            type={loginAlert.type}
            onClose={() => setLoginAlert(null)}
          />
        </div>
      )}
      {isChecking && <Loading />}
      {!isChecking && (
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <Suspense fallback={<Loading />}>
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
