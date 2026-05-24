import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login/Login";
import Register from "./components/Register/Register";
import ForgotPassword from "./components/ForgotPassword/ForgotPassword";
import { AppLayout } from "./components/layout/app-layout";
import Loading from "./components/ui/Loading";
import { hasRouteAccessByRole } from "./lib/auth/route-permissions";


const DashboardPage = lazy(() => import("./pages/dashboard"));
const ProfilePage = lazy(() => import("./pages/profile"));
const TwoFactorPage = lazy(() => import("./pages/two-factor"));
const VehiclesPage = lazy(() => import("./pages/vehicles"));
const OperatorsPage = lazy(() => import("./pages/operators"));
const OperatorDetailPage = lazy(() => import("./pages/operators/detail"));
const AdvisoryUsersPage = lazy(() => import("./pages/advisory-users"));
const AdvisoryUserDetailPage = lazy(() => import("./pages/advisory-users/detail"));
const MyDeputiesPage = lazy(() => import("./pages/my-deputies"));
const IncidencesPage = lazy(() => import("./pages/incidences"));
const IncidencesRetroactivePage = lazy(() => import("./pages/incidences/retroactive"));
const LegalAdvisoriesPage = lazy(() => import("./pages/legal-advisories"));
const LegalAdvisoryDetailPage = lazy(() => import("./pages/legal-advisories/detail"));
const CountiesPage = lazy(() => import("./pages/counties"));
const WalletsPage = lazy(() => import("./pages/wallets"));
const PricingPage = lazy(() => import("./pages/pricing"));
const VehicleAnnouncementsPage = lazy(() => import("./pages/vehicle-announcements"));
const SearchByCountyPage = lazy(() => import("./pages/search-by-county"));
const SessionsPage = lazy(() => import("./pages/sessions"));
const BanidosPage = lazy(() => import("./pages/banidos"));
const LogsPage = lazy(() => import("./pages/logs"));

type GuardedRouteProps = {
  path: string;
  element: React.ReactElement;
};

function GuardedRoute({ path, element }: GuardedRouteProps) {
  let userRole: string | undefined;

  try {
    const stored = localStorage.getItem("locsystem_user");
    userRole = stored ? (JSON.parse(stored) as { role?: string }).role : undefined;
  } catch {
    userRole = undefined;
  }

  if (!hasRouteAccessByRole(path, userRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return element;
}


const App: React.FC = () => {
  return (
    <Router>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/2fa" element={<TwoFactorPage />} />

          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<GuardedRoute path="/dashboard" element={<DashboardPage />} />} />
            <Route path="/profile" element={<GuardedRoute path="/profile" element={<ProfilePage />} />} />
            <Route path="/vehicles" element={<GuardedRoute path="/vehicles" element={<VehiclesPage />} />} />
            <Route path="/users/operators" element={<GuardedRoute path="/users/operators" element={<OperatorsPage />} />} />
            <Route path="/users/operators" element={<GuardedRoute path="/users/operators" element={<OperatorDetailPage />} />} />
            <Route path="/users/advisory-users" element={<GuardedRoute path="/users/advisory-users" element={<AdvisoryUsersPage />} />} />
            <Route path="/users/advisory-users/:id" element={<GuardedRoute path="/users/advisory-users" element={<AdvisoryUserDetailPage />} />} />
            <Route path="/users/my-deputies" element={<GuardedRoute path="/users/my-deputies" element={<MyDeputiesPage />} />} />
            <Route path="/incidences" element={<GuardedRoute path="/incidences" element={<IncidencesRetroactivePage />} />} />
            <Route path="/incidences-retroactive" element={<GuardedRoute path="/incidences-retroactive" element={<IncidencesPage />} />} />
            <Route path="/legal-advisories" element={<GuardedRoute path="/legal-advisories" element={<LegalAdvisoriesPage />} />} />
            <Route path="/legal-advisories/:id" element={<GuardedRoute path="/legal-advisories" element={<LegalAdvisoryDetailPage />} />} />
            <Route path="/counties" element={<GuardedRoute path="/counties" element={<CountiesPage />} />} />
            <Route path="/wallets" element={<GuardedRoute path="/wallets" element={<WalletsPage />} />} />
            <Route path="/pricing" element={<GuardedRoute path="/pricing" element={<PricingPage />} />} />
            <Route path="/vehicle-announcements" element={<GuardedRoute path="/vehicle-announcements" element={<VehicleAnnouncementsPage />} />} />
            <Route path="/search-by-county" element={<GuardedRoute path="/search-by-county" element={<SearchByCountyPage />} />} />
            <Route path="/sessions" element={<GuardedRoute path="/sessions" element={<SessionsPage />} />} />
            <Route path="/banidos" element={<GuardedRoute path="/banidos" element={<BanidosPage />} />} />
            <Route path="/logs" element={<GuardedRoute path="/logs" element={<LogsPage />} />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Suspense>
    </Router>
  );
};

export default App;


