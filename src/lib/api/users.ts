import { supabase } from '../supabase';

export interface UserUpdateData {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  role?: 'super_admin' | 'leadership' | 'lead' | 'supporting_staff';
  status?: 'active' | 'inactive';
}

export const userApi = {
  // Get all users
  async getUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('email');

    if (error) throw error;
    return data;
  },

  // Get user by ID
  async getUserById(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  // Get user profile
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  // Update user profile
  async updateProfile(userId: string, data: UserUpdateData) {
    const { error } = await supabase
      .from('profiles')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
  },

  // Update user email
  async updateEmail(newEmail: string) {
    const { error } = await supabase.auth.updateUser({
      email: newEmail
    });

    if (error) throw error;
  },

  // Update user password
  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
  },

  // Create new user
  async createUser(email: string, password: string, userData: UserUpdateData) {
    const { data, error } = await supabase.functions.invoke('manage-users', {
      body: {
        action: 'create',
        email,
        password,
        userData: {
          full_name: userData.full_name,
          role: userData.role,
          status: userData.status
        }
      }
    });

    // Check for errors in the response data first
    if (data?.error) {
      throw new Error(data.error);
    }

    // Handle FunctionInvokeError (network errors, etc.)
    if (error) {
      throw new Error(error.message || 'Failed to create user');
    }

    return data.user;
  },

  // Update user role
  async updateUserRole(userId: string, role: UserUpdateData['role']) {
    // Update auth user metadata
    const { error: authError } = await supabase.auth.admin.updateUserById(
      userId,
      { user_metadata: { role } }
    );

    if (authError) throw authError;

    // Update user profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        role,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (profileError) throw profileError;
  },

  // Update user status (activate/deactivate)
  async updateUserStatus(userId: string, status: UserUpdateData['status']) {
    const { error } = await supabase
      .from('profiles')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
  },

  // Get user activity
  async getUserActivity(userId: string) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data;
  },

  // Search users
  async searchUsers(query: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
      .order('email');

    if (error) throw error;
    return data;
  },

  // Get users by role
  async getUsersByRole(role: UserUpdateData['role']) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', role)
      .order('email');

    if (error) throw error;
    return data;
  },

  // Get active users
  async getActiveUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('status', 'active')
      .order('email');

    if (error) throw error;
    return data;
  },

  // Delete user
  async deleteUser(userId: string) {
    const { data, error } = await supabase.functions.invoke('manage-users', {
      body: {
        action: 'delete',
        userId
      }
    });

    // Check for errors in the response data first
    if (data?.error) {
      throw new Error(data.error);
    }

    // Handle FunctionInvokeError (network errors, etc.)
    if (error) {
      throw new Error(error.message || 'Failed to delete user');
    }

    return data;
  },

  // Reset user password
  async resetPassword(userId: string) {
    const { data, error } = await supabase.functions.invoke('manage-users', {
      body: {
        action: 'reset_password',
        userId
      }
    });

    // Check for errors in the response data first
    if (data?.error) {
      throw new Error(data.error);
    }

    // Handle FunctionInvokeError (network errors, etc.)
    if (error) {
      throw new Error(error.message || 'Failed to reset password');
    }

    return data;
  }
};

