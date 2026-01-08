import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Input } from '@components/atoms/Input';
import { Button } from '@components/atoms/Button';
import { useLogin } from '../hooks/useLogin';
import { ROUTES } from '@utils/helpers/constants';
import { EnvelopeIcon, LockClosedIcon } from '@heroicons/react/24/outline';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginForm = () => {
  const { mutate: login, isPending } = useLogin();
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormData) => {
    login(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Input
        label="Email address"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        leftIcon={<EnvelopeIcon className="h-5 w-5 text-gray-400" />}
        error={errors.email?.message}
        {...register('email')}
      />

      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        leftIcon={<LockClosedIcon className="h-5 w-5 text-gray-400" />}
        error={errors.password?.message}
        {...register('password')}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
            Remember me
          </label>
        </div>

        <Link to={ROUTES.FORGOT_PASSWORD} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
          Forgot password?
        </Link>
      </div>

      <Button type="submit" fullWidth isLoading={isPending}>
        Sign in
      </Button>

      <div className="text-center text-sm">
        <span className="text-gray-600">Don't have an account? </span>
        <Link to={ROUTES.REGISTER} className="font-medium text-indigo-600 hover:text-indigo-500">
          Sign up
        </Link>
      </div>
    </form>
  );
};