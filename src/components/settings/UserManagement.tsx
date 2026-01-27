import React, { useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Filter, Edit2, Trash2, AlertTriangle, DatabaseBackup, Key } from 'lucide-react';
import { UserForm } from './UserForm';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';
import { userApi } from '../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { executeQuery } from '../../lib/queries';
import { useActivityTracking } from '../../hooks/useActivityTracking';

interface User {
  id: string;
  email: string;
  full_name: string;
  password: string;
  role: 'super_admin' | 'leadership' | 'lead' | 'supporting_staff';
  status: 'active' | 'inactive';
  last_sign_in_at: string | null;
}

export function UserManagement() {
  const { trackCreate, trackUpdate, trackDelete } = useActivityTracking();
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showResetPasswordConfirm, setShowResetPasswordConfirm] = useState<string | null>(null);
  const [resetPasswordLink, setResetPasswordLink] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Fetch users using TanStack Query
  const { data: users = [], isLoading: loading, error } = useQuery({
    queryKey: queryKeys.auth.users(),
    queryFn: () => userApi.getUsers(),
  });

  // User creation mutation
  const createUserMutation = useMutation({
    mutationFn: (userData: Partial<User>) => userApi.createUser(
      userData.email!,
      userData.password!,
      {
        full_name: userData.full_name,
        role: userData.role,
        status: 'active'
      }
    ),
    onSuccess: async (data, userData) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.users() });

      // Track user creation
      await trackCreate('user', data.id, {
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role
      });

      setShowUserForm(false);
      setEditingUser(null);
    },
    onError: (err: any) => {
      console.error('Error creating user:', err);
      throw err;
    },
  });

  // User update mutation
  const updateUserMutation = useMutation({
    mutationFn: async (userData: Partial<User>) => {
      if (!editingUser) throw new Error('No user being edited');

      // Update profile data
      await userApi.updateProfile(editingUser.id, {
        full_name: userData.full_name,
        role: userData.role,
        status: userData.status
      });

      // Prepare auth update data
      const authUpdateData: any = {
        email: userData.email,
        user_metadata: {
          role: userData.role,
          status: userData.status
        }
      };

      // Include password if provided (not empty)
      if (userData.password && userData.password.trim() !== '') {
        authUpdateData.password = userData.password;
      }

      // Update auth user data via Edge Function
      const { error: edgeError } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'update_auth',
          userId: editingUser.id,
          authUpdateData
        }
      });

      if (edgeError) throw edgeError;
    },
    onSuccess: async (data, userData) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.users() });

      // Track user update
      if (editingUser) {
        await trackUpdate('user', editingUser.id, {
          email: userData.email,
          full_name: userData.full_name,
          role: userData.role,
          status: userData.status
        });
      }

      setShowUserForm(false);
      setEditingUser(null);
    },
    onError: (err: any) => {
      console.error('Error updating user:', err);
      throw err;
    },
  });

  const handleUserSubmit = async (userData: Partial<User>) => {
    if (editingUser) {
      await updateUserMutation.mutateAsync(userData);
    } else {
      await createUserMutation.mutateAsync(userData);
    }
  };

  // User deletion mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await userApi.deleteUser(userId);
    },
    onSuccess: async (data, userId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.users() });

      // Track user deletion
      await trackDelete('user', userId, {
        action: 'deleted'
      });

      setShowDeleteConfirm(null);
    },
    onError: (err: any) => {
      console.error('Error deleting user:', err);
    },
  });

  const handleDeleteUser = async (userId: string) => {
    await deleteUserMutation.mutateAsync(userId);
  };

  // Password reset mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await userApi.resetPassword(userId);
    },
    onSuccess: async (data, userId) => {
      // Show the reset link to the admin
      setResetPasswordLink(data.resetLink);
      setShowResetPasswordConfirm(null);

      // Track password reset
      await trackUpdate('user', userId, {
        action: 'password_reset'
      });
    },
    onError: (err: any) => {
      console.error('Error resetting password:', err);
    },
  });

  const handleResetPassword = async (userId: string) => {
    await resetPasswordMutation.mutateAsync(userId);
  };

  const formatRole = (role: string | null) => {
    if (!role) return 'Unknown';
    return role.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch =
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        <button
          onClick={() => {
            setEditingUser(null);
            setShowUserForm(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-md p-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="all">All Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="leadership">Leadership</option>
          <option value="lead">Lead</option>
          <option value="supporting_staff">Supporting Staff</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md p-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
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
                Last Login
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.full_name}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {formatRole(user.role)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                    }`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => {
                        setEditingUser(user);
                        setShowUserForm(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                      title="Edit user"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setShowResetPasswordConfirm(user.id)}
                      className="text-green-600 hover:text-green-900"
                      title="Reset password"
                    >
                      <Key className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(user.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete user"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-sm font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}
      </div>

      {/* User Form Modal */}
      {showUserForm && (
        <UserForm
          user={editingUser}
          onSubmit={handleUserSubmit}
          onCancel={() => {
            setShowUserForm(false);
            setEditingUser(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={Boolean(showDeleteConfirm)}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => showDeleteConfirm && handleDeleteUser(showDeleteConfirm)}
        title="Delete User"
        message="Are you sure you want to permanently delete this user? This action cannot be undone and will remove all their data."
        confirmLabel="Delete"
        type="danger"
      />

      {/* Reset Password Confirmation */}
      <ConfirmationDialog
        isOpen={Boolean(showResetPasswordConfirm)}
        onClose={() => setShowResetPasswordConfirm(null)}
        onConfirm={() => showResetPasswordConfirm && handleResetPassword(showResetPasswordConfirm)}
        title="Reset Password"
        message="Are you sure you want to generate a password reset link for this user?"
        confirmLabel="Generate Reset Link"
        type="warning"
      />

      {/* Reset Link Display */}
      {resetPasswordLink && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Password Reset Link Generated</h3>
            <p className="text-sm text-gray-500 mb-4">
              Share this link with the user. They can use it to set a new password:
            </p>
            <div className="bg-gray-50 p-3 rounded border border-gray-200 mb-4">
              <code className="text-sm break-all">{resetPasswordLink}</code>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(resetPasswordLink);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Copy Link
              </button>
              <button
                onClick={() => setResetPasswordLink(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}