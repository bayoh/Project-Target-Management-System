import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { toast } from 'react-hot-toast';
import { useActivityTracking } from './useActivityTracking';

export interface SystemSettings {
  id: string;
  app_name: string;
  tagline: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SystemSettingsUpdate {
  app_name?: string;
  tagline?: string;
  logo_url?: string | null;
}

// Fetch system settings
export function useSystemSettings() {
  return useQuery({
    queryKey: queryKeys.systemSettings.settings(),
    queryFn: async (): Promise<SystemSettings | null> => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch system settings: ${error.message}`);
      }

      return data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
  });
}

// Update system settings
export function useUpdateSystemSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: SystemSettingsUpdate): Promise<SystemSettings> => {
      // Check if settings exist
      const { data: existingSettings } = await supabase
        .from('system_settings')
        .select('id')
        .single();

      let result;
      if (existingSettings) {
        // Update existing settings
        const { data, error } = await supabase
          .from('system_settings')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSettings.id)
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to update system settings: ${error.message}`);
        }
        result = data;
      } else {
        // Create new settings
        const { data, error } = await supabase
          .from('system_settings')
          .insert({
            app_name: updates.app_name || 'FCC App',
            tagline: updates.tagline || 'Welcome to our application',
            logo_url: updates.logo_url || null,
          })
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to create system settings: ${error.message}`);
        }
        result = data;
      }

      return result;
    },
    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.systemSettings.settings() });

      // Snapshot the previous value
      const previousSettings = queryClient.getQueryData<SystemSettings>(queryKeys.systemSettings.settings());

      // Optimistically update to the new value
      if (previousSettings) {
        queryClient.setQueryData<SystemSettings>(queryKeys.systemSettings.settings(), {
          ...previousSettings,
          ...updates,
          updated_at: new Date().toISOString(),
        });
      }

      return { previousSettings };
    },
    onError: (error, updates, context) => {
      // Rollback on error
      if (context?.previousSettings) {
        queryClient.setQueryData(queryKeys.systemSettings.settings(), context.previousSettings);
      }
      toast.error(`Failed to update settings: ${error.message}`);
    },
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.systemSettings.all });
      toast.success('Settings updated successfully!');
    },
  });
}

// Upload logo
export function useUploadLogo() {
  const queryClient = useQueryClient();
  const updateSettings = useUpdateSystemSettings();

  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;

      // Upload file to Supabase storage
      const { error: uploadError, data } = await supabase.storage
        .from('logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Failed to upload logo: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(data.path);

      return publicUrl;
    },
    onSuccess: async (logoUrl) => {
      // Update system settings with new logo URL
      await updateSettings.mutateAsync({ logo_url: logoUrl });
      
      // Invalidate logo cache specifically
      queryClient.invalidateQueries({ queryKey: queryKeys.systemSettings.logo() });
      
      toast.success('Logo uploaded successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to upload logo: ${error.message}`);
    },
  });
}

// Delete logo
export function useDeleteLogo() {
  const queryClient = useQueryClient();
  const updateSettings = useUpdateSystemSettings();
  const { trackDelete } = useActivityTracking();

  return useMutation({
    mutationFn: async (logoUrl: string): Promise<string> => {
      // Extract file path from URL
      const urlParts = logoUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];

      // Delete from storage
      const { error } = await supabase.storage
        .from('logos')
        .remove([fileName]);

      if (error) {
        throw new Error(`Failed to delete logo: ${error.message}`);
      }
      
      return fileName;
    },
    onSuccess: async (fileName, logoUrl) => {
      // Track the logo deletion
      trackDelete('system_logo', fileName, {
        logo_url: logoUrl,
        entity_type: 'system_settings'
      });
      
      // Update system settings to remove logo URL
      await updateSettings.mutateAsync({ logo_url: null });
      
      // Invalidate logo cache
      queryClient.invalidateQueries({ queryKey: queryKeys.systemSettings.logo() });
      
      toast.success('Logo deleted successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to delete logo: ${error.message}`);
    },
  });
}

// Get cached logo URL
export function useCachedLogo() {
  const { data: settings } = useSystemSettings();
  
  return useQuery({
    queryKey: queryKeys.systemSettings.logo(),
    queryFn: () => settings?.logo_url || null,
    enabled: !!settings,
    staleTime: 30 * 60 * 1000, // 30 minutes for logo caching
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}