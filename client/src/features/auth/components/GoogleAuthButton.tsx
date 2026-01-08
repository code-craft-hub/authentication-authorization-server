
import { useEffect, useRef } from 'react';
import { Button } from '@components/atoms/Button';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { APP_CONFIG } from '@utils/helpers/constants';

export const GoogleAuthButton = () => {
  const { mutate: googleAuth, isPending } = useGoogleAuth();
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load Google Identity Services
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: APP_CONFIG.GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
        });

        if (buttonRef.current) {
          window.google.accounts.id.renderButton(
            buttonRef.current,
            {
              theme: 'outline',
              size: 'large',
              width: buttonRef.current.offsetWidth,
              text: 'continue_with',
            }
          );
        }
      }
    };

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleCredentialResponse = (response: any) => {
    googleAuth({ idToken: response.credential });
  };

  return (
    <div>
      <div ref={buttonRef} className="w-full" />
      {isPending && (
        <div className="mt-2 text-center text-sm text-gray-600">
          Authenticating with Google...
        </div>
      )}
    </div>
  );
};