
import { Navigate } from 'react-router-dom';
import { useAuth } from '@features/auth/hooks/useAuth';
import { LoginForm } from '@features/auth/components/LoginForm';
import { GoogleAuthButton } from '@features/auth/components/GoogleAuthButton';
import { ROUTES, APP_CONFIG } from '@utils/helpers/constants';

const Login = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Welcome back to {APP_CONFIG.APP_NAME}
          </p>
        </div>

        <div className="mt-8 bg-white py-8 px-6 shadow rounded-lg sm:px-10">
          <LoginForm />

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <GoogleAuthButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;