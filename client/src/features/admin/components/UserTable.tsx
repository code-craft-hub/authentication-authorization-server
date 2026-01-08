
import { useState } from 'react';
import { Badge } from '@components/atoms/Badge';
import { Button } from '@components/atoms/Button';
import { LoadingSpinner } from '@components/atoms/Spinner';
import { useUsers } from '../hooks/useUsers';
import { useAppSelector, useAppDispatch } from '@store';
import { setFilters } from '../store/adminSlice';
import { format } from 'date-fns';
import { EyeIcon, TrashIcon, UserMinusIcon, NoSymbolIcon } from '@heroicons/react/24/outline';

export const UserTable = ({ onViewUser }: { onViewUser: (userId: string) => void }) => {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((state) => state.admin.filters);
  const { data, isLoading } = useUsers(filters);

  const handlePageChange = (page: number) => {
    dispatch(setFilters({ page }));
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, 'success' | 'info' | 'warning'> = {
      USER: 'info',
      ADMIN: 'warning',
      SUPER_ADMIN: 'danger',
    };
    return <Badge variant={variants[role] || 'default'}>{role}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
      ACTIVE: 'success',
      SUSPENDED: 'warning',
      BANNED: 'danger',
      PENDING_VERIFICATION: 'default',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Credits
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.data.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-indigo-600 font-semibold">
                          {user.displayName?.[0] || user.email[0]}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{user.displayName || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getRoleBadge(user.role)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(user.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.credits}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onViewUser(user.id)}
                  >
                    <EyeIcon className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
          <div className="flex-1 flex justify-between sm:hidden">
            <Button
              onClick={() => handlePageChange(filters.page! - 1)}
              disabled={!data.pagination.hasPrev}
              variant="outline"
            >
              Previous
            </Button>
            <Button
              onClick={() => handlePageChange(filters.page! + 1)}
              disabled={!data.pagination.hasNext}
              variant="outline"
            >
              Next
            </Button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{(filters.page! - 1) * filters.limit! + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(filters.page! * filters.limit!, data.pagination.total)}
                </span>{' '}
                of <span className="font-medium">{data.pagination.total}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      page === filters.page
                        ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
