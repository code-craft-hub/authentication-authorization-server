
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useSearchParams } from 'react-router-dom';
import { Input } from '@components/atoms/Input';
import { Button } from '@components/atoms/Button';
import { useRegister } from '../hooks/useRegister';
import { ROUTES } from '@utils/helpers/constants';
import { EnvelopeIcon, LockClosedIcon, UserIcon, TicketIcon } from '@heroicons/react/24/outline';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  referralCode: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterForm = () => {
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref');
  
  const { mutate: register, isPending } = useRegister();
  
  const { register: registerField, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      referralCode: referralCode || '',
    },
  });

  const onSubmit = (data: RegisterFormData) => {
    const { confirmPassword, ...registerData } = data;
    register(registerData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="First name"
          type="text"
          placeholder="John"
          leftIcon={<UserIcon className="h-5 w-5 text-gray-400" />}
          error={errors.firstName?.message}
          {...registerField('firstName')}
        />

        <Input
          label="Last name"
          type="text"
          placeholder="Doe"
          leftIcon={<UserIcon className="h-5 w-5 text-gray-400" />}
          error={errors.lastName?.message}
          {...registerField('lastName')}
        />
      </div>

      <Input
        label="Email address"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        leftIcon={<EnvelopeIcon className="h-5 w-5 text-gray-400" />}
        error={errors.email?.message}
        {...registerField('email')}
      />

      <Input
        label="Password"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        leftIcon={<LockClosedIcon className="h-5 w-5 text-gray-400" />}
        error={errors.password?.message}
        {...registerField('password')}
      />

      <Input
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        leftIcon={<LockClosedIcon className="h-5 w-5 text-gray-400" />}
        error={errors.confirmPassword?.message}
        {...registerField('confirmPassword')}
      />

      {referralCode && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <p className="text-sm text-indigo-800">
            🎉 You've been invited! Referral code applied: <span className="font-mono font-semibold">{referralCode}</span>
          </p>
        </div>
      )}

      <Input
        label="Referral code (optional)"
        type="text"
        placeholder="Enter referral code"
        leftIcon={<TicketIcon className="h-5 w-5 text-gray-400" />}
        error={errors.referralCode?.message}
        {...registerField('referralCode')}
      />

      <Button type="submit" fullWidth isLoading={isPending}>
        Create account
      </Button>

      <div className="text-center text-sm">
        <span className="text-gray-600">Already have an account? </span>
        <Link to={ROUTES.LOGIN} className="font-medium text-indigo-600 hover:text-indigo-500">
          Sign in
        </Link>
      </div>
    </form>
  );
};