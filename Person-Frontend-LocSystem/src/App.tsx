import React, { lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login/Login";
import Register from "./components/Register/Register";
import ForgotPassword from "./components/ForgotPassword/ForgotPassword";
import { AppLayout } from "./components/layout/app-layout";


const DashboardPage = lazy(() => import("./pages/dashboard"));
const ProfilePage = lazy(() => import("./pages/profile"));
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


const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/vehicles" element={<VehiclesPage />} />
          <Route path="/users/operators" element={<OperatorsPage />} />
          <Route path="/users/operators" element={<OperatorDetailPage />} />
          <Route path="/users/advisory-users" element={<AdvisoryUsersPage />} />
          <Route path="/users/advisory-users" element={<AdvisoryUserDetailPage />} />
          <Route path="/users/my-deputies" element={<MyDeputiesPage />} />
          <Route path="/incidences" element={<IncidencesPage />} />
          <Route path="/incidences-retroactive" element={<IncidencesRetroactivePage />} />
          <Route path="/legal-advisories" element={<LegalAdvisoriesPage />} />
          <Route path="/legal-advisories" element={<LegalAdvisoryDetailPage />} />
          <Route path="/counties" element={<CountiesPage />} />
          <Route path="/wallets" element={<WalletsPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/vehicle-announcements" element={<VehicleAnnouncementsPage />} />
          <Route path="/search-by-county" element={<SearchByCountyPage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/banidos" element={<BanidosPage />} />
          <Route path="/logs" element={<LogsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
};

export default App;


