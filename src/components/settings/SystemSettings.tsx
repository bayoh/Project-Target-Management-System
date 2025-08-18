import React, { useState, useEffect } from 'react';
import { Camera, Loader2, Trash2, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  useSystemSettings,
  useUpdateSystemSettings,
  useUploadLogo,
  useDeleteLogo,
  SystemSettingsType
} from '../../hooks/useSystemSettingsQueries';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { CachedImage } from '../ui/CachedImage';

export function SystemSettings() {
  const { data: settings, isLoading, error } = useSystemSettings();
  const updateSettings = useUpdateSystemSettings();
  const uploadLogo = useUploadLogo();
  const deleteLogo = useDeleteLogo();

  const [formData, setFormData] = useState({
    app_name: '',
    tagline: ''
  });

  // Update form data when settings are loaded
  useEffect(() => {
    if (settings) {
      setFormData({
        app_name: settings.app_name || 'Project Manager',
        tagline: settings.tagline || 'Manage your projects efficiently'
      });
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings.mutate(formData);
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    const fileSize = file.size / 1024 / 1024; // Convert to MB
    if (fileSize > 2) {
      toast.error('File size must be less than 2MB');
      return;
    }

    uploadLogo.mutate(file);
  };

  const handleDeleteLogo = () => {
    if (settings?.logo_url) {
      deleteLogo.mutate(settings.logo_url);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <p className="text-red-600 mb-2">Failed to load system settings</p>
          <button 
            onClick={() => window.location.reload()} 
            className="text-blue-600 hover:text-blue-800"
          >
            Try again
          </button>
        </div>
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
                  {settings?.logo_url ? (
                    <CachedImage
                      src={settings.logo_url}
                      alt="Application Logo"
                      className="w-full h-full"
                      fallback={
                        <div className="text-gray-400">
                          <Camera className="h-8 w-8" />
                        </div>
                      }
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
                    disabled={uploadLogo.isPending}
                  />
                </label>
              </div>
              <div className="space-y-3">
                <div className="text-sm text-gray-500">
                  <p>Upload your application logo</p>
                  <p>Recommended size: 512x512px</p>
                  <p>Max file size: 2MB</p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadLogo.isPending}
                    onClick={() => document.getElementById('logo-upload')?.click()}
                  >
                    {uploadLogo.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Logo
                      </>
                    )}
                  </Button>
                  {settings?.logo_url && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteLogo}
                      disabled={deleteLogo.isPending}
                      className="text-red-600 hover:text-red-700"
                    >
                      {deleteLogo.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Logo
                        </>
                      )}
                    </Button>
                  )}
                </div>
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
                value={formData.app_name}
                onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
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
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
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
            disabled={updateSettings.isPending || uploadLogo.isPending}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {updateSettings.isPending ? (
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