import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { executeQuery } from '../lib/queries';
import { activityLogger } from '../lib/activityLogger';
import type { QueryResponse } from '../types/queries';

// Session query
export const useSession = () => {
  return useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// User profile query
export const useUserProfile = (userId?: string) => {
  return useQuery({
    queryKey: queryKeys.auth.profile(userId),
    queryFn: async () => {
      if (!userId) return null;
      const result = await executeQuery(
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
      );
      return result.data;
    },
    enabled: !!userId,
  });
};

// Login mutation
export const useLogin = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      // Invalidate auth queries
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
      
      // Start activity session
      if (data.user) {
        await activityLogger.startSession(data.user.id);
      }
    },
  });
};

// Signup mutation
export const useSignup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ email, password, metadata }: { 
      email: string; 
      password: string; 
      metadata?: Record<string, any>;
    }) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      // Invalidate auth queries
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
      
      // Start activity session if user is confirmed
      if (data.user && !data.user.email_confirmed_at) {
        await activityLogger.startSession(data.user.id);
      }
    },
  });
};

// Logout mutation
export const useLogout = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      // End activity session before logout
      await activityLogger.endSession();
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: async () => {
      // Clear all queries
      queryClient.clear();
    },
  });
};

// Reset password mutation
export const useResetPassword = () => {
  return useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    },
  });
};

// Update password mutation
export const useUpdatePassword = () => {
  return useMutation({
    mutationFn: async ({ password }: { password: string }) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
  });
};

// Helper hook for auth state
export const useAuthState = () => {
  const session = useSession();
  
  return {
    user: session.data?.user || null,
    isLoading: session.isLoading,
    isAuthenticated: !!session.data?.user,
    session: session.data,
  };
};