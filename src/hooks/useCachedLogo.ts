import { useSystemSettings } from './useSystemSettingsQueries';

/**
 * Hook to get the cached logo URL from system settings
 * This provides a convenient way to access the logo throughout the app
 * with automatic caching via TanStack Query
 */
export function useCachedLogo() {
  const { data: settings, isLoading, error } = useSystemSettings();
  
  return {
    logoUrl: settings?.logo_url || null,
    isLoading,
    error,
    hasLogo: Boolean(settings?.logo_url)
  };
}

/**
 * Hook to get cached app branding (name, tagline, logo)
 * Useful for headers, navigation, and other branding components
 */
export function useCachedBranding() {
  const { data: settings, isLoading, error } = useSystemSettings();
  
  return {
    appName: settings?.app_name || 'Project Manager',
    tagline: settings?.tagline || 'Manage your projects efficiently',
    logoUrl: settings?.logo_url || null,
    isLoading,
    error,
    hasLogo: Boolean(settings?.logo_url)
  };
}