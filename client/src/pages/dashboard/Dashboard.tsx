
import { useAuth } from '@features/auth/hooks/useAuth';
import { useReferralStats } from '@features/referral/hooks/useReferralStats';
import { Card } from '@components/molecules/Card';
import { LoadingSpinner } from '@components/atoms/Spinner';
import { ReferralCode } from '@features/referral/components/ReferralCode';
import {
  UserGroupIcon,
  CurrencyDollarIcon,
  TrophyIcon,
  FireIcon,
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { user } = useAuth();
  const { data: stats, isLoading } = useReferralStats();

  const statCards = [
    {
      name: 'Total Credits',
      value: user?.credits || 0,
      icon: CurrencyDollarIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Total Referrals',
      value: stats?.totalReferrals || 0,
      icon: UserGroupIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Total Earnings',
      value: `${stats?.totalEarnings || 0} credits`,
      icon: TrophyIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      name: 'Next Milestone',
      value: stats?.nextMilestone ? `${stats.referralsToNextMilestone} more` : 'None',
      icon: FireIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.displayName || user?.email}! 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here's what's happening with your account today.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <Card key={stat.name} padding="md">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 rounded-md p-3 ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {stat.name}
                      </dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        {stat.value}
                      </dd>
                    </dl>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ReferralCode />

            {stats?.nextMilestone && (
              <Card>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Milestone Progress</h3>
                    <p className="text-sm text-gray-500">
                      Reach {stats.nextMilestone} referrals for a 3x bonus!
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium text-gray-700">
                        {stats.totalReferrals} / {stats.nextMilestone}
                      </span>
                      <span className="text-gray-500">
                        {Math.round((stats.totalReferrals / stats.nextMilestone) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min((stats.totalReferrals / stats.nextMilestone) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Only {stats.referralsToNextMilestone} more referral{stats.referralsToNextMilestone !== 1 ? 's' : ''} to go!
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;