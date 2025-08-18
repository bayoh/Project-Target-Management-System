import React, { useState, useEffect } from 'react';

import { supabase } from '../../lib/supabase';
import { User, Camera, Loader2, UserCircle, Lock } from 'lucide-react';

interface ProfileData {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  avatar_url?: string;
}

interface FormData {
  full_name: string;
  email: string;
  phone: string;
  role: string;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function Profile() {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    email: '',
    phone: '',
    role: ''
  });
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        return;
      }

      const profileInfo = profile || {
        id: user.id,
        full_name: user.user_metadata?.full_name || '',
        email: user.email || '',
        phone: user.user_metadata?.phone || '',
        role: user.user_metadata?.role || 'user',
        avatar_url: user.user_metadata?.avatar_url
      };

      setProfileData(profileInfo);
      setFormData({
        full_name: profileInfo.full_name,
        email: profileInfo.email,
        phone: profileInfo.phone,
        role: profileInfo.role
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update or insert profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error('Error updating profile:', profileError);
        return;
      }

      // Update auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: formData.full_name,
          phone: formData.phone
        }
      });

      if (authError) {
        console.error('Error updating auth metadata:', authError);
      }

      await loadProfile();
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) {
        console.error('Error changing password:', error);
        alert('Error changing password: ' + error.message);
      } else {
        alert('Password updated successfully');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      console.error('Error changing password:', error);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error('Error uploading avatar:', uploadError);
        return;
      }

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          avatar_url: data.publicUrl,
          updated_at: new Date().toISOString()
        });

      if (updateError) {
        console.error('Error updating avatar URL:', updateError);
        return;
      }

      await loadProfile();
    } catch (error) {
      console.error('Error uploading avatar:', error);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Information Section */}
      <section aria-labelledby="profile-information-heading" className="bg-white shadow-lg rounded-xl overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex items-center space-x-3 mb-6 border-b border-gray-200 pb-4">
            <User className="h-5 w-5 text-gray-500" />
            <h1 id="profile-information-heading" className="text-lg font-semibold text-gray-900">Profile Information</h1>
          </div>

          {/* Profile Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 mb-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-semibold shadow-lg relative overflow-hidden">
                {formData.avatar_url ? (
                  <img
                    src={formData.avatar_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling.style.display = 'flex';
                    }}
                  />
                ) : (
                  formData.full_name?.charAt(0)?.toUpperCase() || 'U'
                )}
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  </div>
                )}
              </div>
              <label
                htmlFor="avatar-upload"
                className={`absolute -bottom-0.5 -right-0.5 bg-blue-600 rounded-full p-1.5 shadow-sm cursor-pointer hover:bg-blue-700 transition-all duration-200 hover:scale-105 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Camera className="h-3 w-3 text-white" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/png, image/jpeg, image/gif"
                  className="sr-only"
                  onChange={handleAvatarChange}
                  disabled={uploading}
                />
              </label>
            </div>

            {/* Basic Info */} 
            <div className="text-center sm:text-left flex-1">
              <h2 id="profile-information-heading" className="text-xl font-semibold text-gray-900">
                {formData.full_name || 'User Profile'}
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">{formData.email}</p>
              {formData.role && (
                  <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                      {formData.role.replace('_', ' ')}
                  </span>
              )}
            </div>
          </div>

          {/* Profile Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  id="full_name"
                  autoComplete="name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm placeholder-gray-400 transition-colors"
                  placeholder="Your full name"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm placeholder-gray-400 transition-colors"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-xs text-gray-500">(Optional)</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  autoComplete="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm placeholder-gray-400 transition-colors"
                  placeholder="+1 (555) 987-6543"
                />
              </div>
              
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <input
                  type="text"
                  id="role"
                  value={formData.role.replace('_', ' ').replace(/\w/g, l => l.toUpperCase())} // Format role for display
                  readOnly
                  className="block w-full rounded-lg border-gray-300 shadow-sm bg-gray-50 text-sm text-gray-600 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving || uploading}
                className="inline-flex items-center justify-center px-5 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-md"
              >
                {saving ? (
                  <><Loader2 className="animate-spin h-4 w-4 mr-2" />Saving...</>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Password Change Section */}
      <section aria-labelledby="password-heading" className="bg-white shadow-lg rounded-xl overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex items-center space-x-3 mb-6 border-b border-gray-200 pb-4">
            <Lock className="h-5 w-5 text-gray-500" />
            <h2 id="password-heading" className="text-lg font-semibold text-gray-900">Change Password</h2>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                id="current-password"
                autoComplete="current-password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm placeholder-gray-400 transition-colors"
                placeholder="Your current password"
                required
              />
               <p className="mt-1 text-xs text-gray-500">Required to change your password. If forgotten, use password reset.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  id="new-password"
                  autoComplete="new-password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm placeholder-gray-400 transition-colors"
                  placeholder="Minimum 8 characters"
                  required
                  minLength={8}
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirm-password"
                  autoComplete="new-password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm placeholder-gray-400 transition-colors"
                  placeholder="Re-enter new password"
                  required
                  minLength={8}
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={changingPassword}
                className="inline-flex items-center justify-center px-5 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-md"
              >
                {changingPassword ? (
                  <><Loader2 className="animate-spin h-4 w-4 mr-2" />Updating Password...</>
                ) : (
                  'Update Password'
                )}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}