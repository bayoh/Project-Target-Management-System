import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Camera, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface SystemSettings {
  app_name: string;
  tagline: string;
  logo_url: string | null;
}

export function SystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>({
    app_name: 'Project Manager',
    tagline: 'Manage your projects efficiently',
    logo_url: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings(data);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      toast.error('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert([{
          id: 1, // Using a constant ID since we only need one row
          ...settings,
          updated_at: new Date().toISOString()
        }]);

      if (error) throw error;
      toast.success('Settings updated successfully');
      await loadSettings();
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    const fileSize = file.size / 1024 / 1024; // Convert to MB
    if (fileSize > 2) {
      toast.error('File size must be less than 2MB');
      return;
    }

    setUploading(true);
    try {
      // Upload image
      const fileExt = file.name.split('.').pop();
      const filePath = `system/logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('system')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('system')
        .getPublicUrl(filePath);

      // Update settings with new logo URL
      setSettings({ ...settings, logo_url: publicUrl });
      toast.success('Logo uploaded successfully');
    } catch (err) {
      console.error('Error uploading logo:', err);
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
        <p className="mt-1 text-sm text-gray-500">
          Configure your application's name, tagline, and branding.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow-sm rounded-lg p-6">
          {/* Logo Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logo
            </label>
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                  {settings.logo_url ? (
                    <img
                      src={settings.logo_url}
                      alt="Logo"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-gray-400">
                      <Camera className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <label
                  htmlFor="logo-upload"
                  className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-lg cursor-pointer hover:bg-gray-50"
                >
                  <Camera className="h-4 w-4 text-gray-600" />
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleLogoChange}
                    disabled={uploading}
                  />
                </label>
              </div>
              <div className="text-sm text-gray-500">
                <p>Upload your application logo</p>
                <p>Recommended size: 512x512px</p>
                <p>Max file size: 2MB</p>
              </div>
            </div>
          </div>

          {/* App Name */}
          <div className="space-y-4">
            <div>
              <label htmlFor="app_name" className="block text-sm font-medium text-gray-700">
                Application Name
              </label>
              <input
                type="text"
                id="app_name"
                value={settings.app_name}
                onChange={(e) => setSettings({ ...settings, app_name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
              />
            </div>

            {/* Tagline */}
            <div>
              <label htmlFor="tagline" className="block text-sm font-medium text-gray-700">
                Tagline
              </label>
              <input
                type="text"
                id="tagline"
                value={settings.tagline}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              <p className="mt-1 text-sm text-gray-500">
                A short description that appears below your application name
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || uploading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}