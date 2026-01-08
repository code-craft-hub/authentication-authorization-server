import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '@utils/helpers/constants';
import { ProtectedRoute } from '@components/molecules/ProtectedRoute';
import { AdminRoute } from '@components/molecules/AdminRoute';
import { LoadingSpinner } from '@components/atoms/Spinner';

// Lazy load pages for code splitting
const HomePage = lazy(() => import('@pages/public/Home'));
const LoginPage = lazy(() => import('@pages/public/Login'));
const RegisterPage = lazy(() => import('@pages/public/Register'));
const ForgotPasswordPage = lazy(() => import('@pages/public/ForgotPassword'));
const NotFoundPage = lazy(() => import('@pages/public/NotFound'));

const DashboardPage = lazy(() => import('@pages/dashboard/Dashboard'));
const ProfilePage = lazy(() => import('@pages/dashboard/Profile'));
const ReferralsPage = lazy(() => import('@pages/dashboard/Referrals'));
const CreditsPage = lazy(() => import('@pages/dashboard/Credits'));
const SettingsPage = lazy(() => import('@pages/dashboard/Settings'));

const AdminDashboardPage = lazy(() => import('@pages/admin/AdminDashboard'));
const UsersPage = lazy(() => import('@pages/admin/Users'));
const UserDetailsPage = lazy(() => import('@pages/admin/UserDetails'));
const AuditLogsPage = lazy(() => import('@pages/admin/AuditLogs'));

// Suspense wrapper for lazy loaded components
const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense
    fallback={
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    }
  >
    {children}
  </Suspense>
);

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path={ROUTES.HOME}
        element={
          <SuspenseWrapper>
            <HomePage />
          </SuspenseWrapper>
        }
      />
      <Route
        path={ROUTES.LOGIN}
        element={
          <SuspenseWrapper>
            <LoginPage />
          </SuspenseWrapper>
        }
      />
      <Route
        path={ROUTES.REGISTER}
        element={
          <SuspenseWrapper>
            <RegisterPage />
          </SuspenseWrapper>
        }
      />
      <Route
        path={ROUTES.FORGOT_PASSWORD}
        element={
          <SuspenseWrapper>
            <ForgotPasswordPage />
          </SuspenseWrapper>
        }
      />

      {/* Protected Dashboard Routes */}
      <Route element={<ProtectedRoute />}>
        <Route
          path={ROUTES.DASHBOARD}
          element={
            <SuspenseWrapper>
              <DashboardPage />
            </SuspenseWrapper>
          }
        />
        <Route
          path={ROUTES.PROFILE}
          element={
            <SuspenseWrapper>
              <ProfilePage />
            </SuspenseWrapper>
          }
        />
        <Route
          path={ROUTES.REFERRALS}
          element={
            <SuspenseWrapper>
              <ReferralsPage />
            </SuspenseWrapper>
          }
        />
        <Route
          path={ROUTES.CREDITS}
          element={
            <SuspenseWrapper>
              <CreditsPage />
            </SuspenseWrapper>
          }
        />
        <Route
          path={ROUTES.SETTINGS}
          element={
            <SuspenseWrapper>
              <SettingsPage />
            </SuspenseWrapper>
          }
        />
      </Route>

      {/* Admin Routes */}
      <Route element={<AdminRoute />}>
        <Route
          path={ROUTES.ADMIN}
          element={
            <SuspenseWrapper>
              <AdminDashboardPage />
            </SuspenseWrapper>
          }
        />
        <Route
          path={ROUTES.ADMIN_USERS}
          element={
            <SuspenseWrapper>
              <UsersPage />
            </SuspenseWrapper>
          }
        />
        <Route
          path={ROUTES.ADMIN_USER_DETAILS}
          element={
            <SuspenseWrapper>
              <UserDetailsPage />
            </SuspenseWrapper>
          }
        />
        <Route
          path={ROUTES.ADMIN_AUDIT_LOGS}
          element={
            <SuspenseWrapper>
              <AuditLogsPage />
            </SuspenseWrapper>
          }
        />
      </Route>

      {/* 404 Not Found */}
      <Route
        path="*"
        element={
          <SuspenseWrapper>
            <NotFoundPage />
          </SuspenseWrapper>
        }
      />
    </Routes>
  );
};

