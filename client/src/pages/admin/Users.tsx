
import { useState } from 'react';
import { UserTable } from '@features/admin/components/UserTable';
import { Card } from '@components/molecules/Card';
import { Input } from '@components/atoms/Input';
import { Button } from '@components/atoms/Button';
import { useAppDispatch } from '@store';
import { setFilters, resetFilters } from '@features/admin/store/adminSlice';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@utils/helpers/constants';

const Users = () => {
  const [search, setSearch] = useState('');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleSearch = () => {
    dispatch(setFilters({ search, page: 1 }));
  };

  const handleReset = () => {
    setSearch('');
    dispatch(resetFilters());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage all users and their permissions
          </p>
        </div>
      </div>

      <Card>
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              leftIcon={<MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />}
            />
          </div>
          <Button onClick={handleSearch}>Search</Button>
          <Button variant="outline" onClick={handleReset}>Reset</Button>
        </div>

        <UserTable onViewUser={(id) => navigate(ROUTES.ADMIN_USER_DETAILS.replace(':id', id))} />
      </Card>
    </div>
  );
};

export default Users;