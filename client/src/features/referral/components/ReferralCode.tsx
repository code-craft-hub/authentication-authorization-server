
import { useState } from 'react';
import { useAuth } from '@features/auth/hooks/useAuth';
import { Button } from '@components/atoms/Button';
import { Card } from '@components/molecules/Card';
import copy from 'copy-to-clipboard';
import toast from 'react-hot-toast';
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';

export const ReferralCode = () => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  
  const referralUrl = `${window.location.origin}/register?ref=${user?.referralCode}`;

  const handleCopy = (text: string) => {
    copy(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Your Referral Code</h3>
          <p className="text-sm text-gray-500">Share this code to earn rewards</p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <code className="text-lg font-mono font-semibold text-indigo-600">
              {user?.referralCode}
            </code>
          </div>
          <Button
            variant="outline"
            onClick={() => handleCopy(user?.referralCode || '')}
          >
            {copied ? (
              <CheckIcon className="h-5 w-5 text-green-600" />
            ) : (
              <ClipboardDocumentIcon className="h-5 w-5" />
            )}
          </Button>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Referral Link</p>
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
              <p className="text-sm text-gray-600 truncate">{referralUrl}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => handleCopy(referralUrl)}
            >
              {copied ? (
                <CheckIcon className="h-5 w-5 text-green-600" />
              ) : (
                <ClipboardDocumentIcon className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
