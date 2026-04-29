import { SidebarProvider, SidebarInset } from '../components/ui/sidebar';
import { AppSidebar } from '../components/layout/app-sidebar';
import { Outlet } from 'react-router-dom';

export function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}