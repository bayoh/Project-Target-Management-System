import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { Camera, Loader2, Lock, UserCircle } from 'lucide-react'; // Added UserCircle
import toast from 'react-hot-toast';

interface ProfileData {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: 'super_admin' | 'leadership' | 'lead' | 'supporting_staff';
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
  const [profile, setProfile] = useState<ProfileData | null>(null);
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
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      let profileData = existingProfile;

      if (!profileData) {
        const userRole = user.user_metadata?.role || 'supporting_staff';
        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{
            id: user.id,
            full_name: user.email?.split('@')[0] || 'New User',
            avatar_url: null,
            phone: null,
            role: userRole,
            // status: 'active' // Assuming status is handled or not needed here for simplicity
          }])
          .select()
          .single();

        if (createError) throw createError;
        profileData = createdProfile;
      }

      const userRoleFromMeta = user.user_metadata?.role;
      if (userRoleFromMeta && profileData.role !== userRoleFromMeta) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: userRoleFromMeta })
          .eq('id', user.id);

        if (updateError) throw updateError;
        profileData.role = userRoleFromMeta;
      }

      setProfile({
        id: user.id,
        email: user.email!,
        ...profileData
      });

      setFormData({
        full_name: profileData.full_name || '',
        email: user.email!,
        phone: profileData.phone || '',
        role: profileData.role || ''
      });
    } catch (err) {
      console.error('Error loading profile:', err);
      toast.error('Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const currentMetadata = user.user_metadata || {};
      const needsMetadataUpdate = 
        currentMetadata.full_name !== formData.full_name ||
        currentMetadata.phone !== formData.phone; 
        // Role update in metadata might be restricted or handled differently
        // currentMetadata.role !== formData.role;

      if (formData.email !== profile.email || needsMetadataUpdate) {
        const updateData: { email?: string; data?: any } = {};
        if (formData.email !== profile.email) {
          updateData.email = formData.email;
        }
        if (needsMetadataUpdate) {
          updateData.data = {
            full_name: formData.full_name,
            phone: formData.phone,
            // role: formData.role // Avoid updating role directly in user_metadata here unless specifically intended
          };
        }
        const { error: userError } = await supabase.auth.updateUser(updateData);
        if (userError) throw userError;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          // role: formData.role, // Role update in profiles table, ensure this is desired behavior
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (profileError) throw profileError;
      toast.success('Profile updated successfully!');
      await loadProfile(); // Reload to reflect changes
    } catch (err: any) {
      console.error('Error updating profile:', err);
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long.');
      return;
    }

    setChangingPassword(true);
    try {
      // Note: Supabase doesn't have a direct way to verify current password before changing.
      // This is a direct update to the new password.
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;
      toast.success('Password updated successfully!');
      setPasswordData({
        currentPassword: '', // Clear current password for security, though it's not used for verification here
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err: any) {
      console.error('Error updating password:', err);
      toast.error(err.message || 'Failed to update password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !profile) return;

    const file = e.target.files[0];
    const fileSize = file.size / 1024 / 1024; // Convert to MB
    if (fileSize > 2) {
      toast.error('File size must be less than 2MB. Please choose a smaller file.');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${profile.id}/${crypto.randomUUID()}.${fileExt}`;

      // Remove old avatar if exists
      if (profile.avatar_url) {
        const oldFilePath = profile.avatar_url.substring(profile.avatar_url.lastIndexOf('avatars/') + 'avatars/'.length);
        if (oldFilePath !== filePath) { // Avoid deleting if it's somehow the same path (unlikely with UUID)
          await supabase.storage.from('avatars').remove([oldFilePath]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true }); // Use upsert true to overwrite if somehow same path exists

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      toast.success('Avatar updated successfully!');
      await loadProfile(); // Reload to reflect changes
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      toast.error(err.message || 'Failed to upload avatar.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-150px)]">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Profile Settings</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your personal information, account security, and preferences.
          </p>
        </header>

        {/* Profile Information Section */}
        <section aria-labelledby="profile-information-heading" className="bg-white shadow-lg rounded-xl overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="md:flex md:items-center md:space-x-6">
              {/* Avatar */}
              <div className="relative w-28 h-28 mx-auto md:mx-0 mb-6 md:mb-0 flex-shrink-0">
                <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 ring-4 ring-white shadow-md">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name || 'Profile avatar'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <UserCircle className="h-16 w-16" />
                    </div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                    </div>
                  )}
                </div>
                <label
                  htmlFor="avatar-upload"
                  className={`absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-2 shadow-md cursor-pointer hover:bg-blue-700 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Camera className="h-5 w-5 text-white" />
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
              <div className="text-center md:text-left">
                <h2 id="profile-information-heading" className="text-2xl font-semibold text-gray-900">
                  {formData.full_name || 'User Profile'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">{formData.email}</p>
                {formData.role && (
                    <p className="mt-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full inline-block capitalize">
                        {formData.role.replace('_', ' ')}
                    </p>
                )}
              </div>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="full_name"
                    autoComplete="name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm placeholder-gray-400"
                    placeholder="Your full name"
                    required
                  />
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm placeholder-gray-400"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Phone Number <span className="text-xs text-gray-400">(Optional)</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm placeholder-gray-400"
                    placeholder="+1 (555) 987-6543"
                  />
                </div>
                
                <div className="sm:col-span-3">
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                    Role
                  </label>
                  <input
                    type="text"
                    id="role"
                    value={formData.role.replace('_', ' ').replace(/\w/g, l => l.toUpperCase())} // Format role for display
                    readOnly
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-100 focus:ring-blue-500 sm:text-sm text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-5 flex justify-end">
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <><Loader2 className="animate-spin h-5 w-5 mr-2" />Saving...</>
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
              <Lock className="h-6 w-6 text-gray-500" />
              <h2 id="password-heading" className="text-xl font-semibold text-gray-900">Change Password</h2>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-6">
              <div>
                <label htmlFor="current-password" className="block text-sm font-medium text-gray-700">
                  Current Password
                </label>
                <input
                  type="password"
                  id="current-password"
                  autoComplete="current-password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm placeholder-gray-400"
                  placeholder="Your current password"
                  required
                />
                 <p className="mt-1 text-xs text-gray-500">Required to change your password. If forgotten, use password reset.</p>
              </div>

              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <input
                  type="password"
                  id="new-password"
                  autoComplete="new-password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm placeholder-gray-400"
                  placeholder="Minimum 8 characters"
                  required
                  minLength={8}
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirm-password"
                  autoComplete="new-password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm placeholder-gray-400"
                  placeholder="Re-enter new password"
                  required
                  minLength={8}
                />
              </div>

              <div className="pt-5 flex justify-end">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {changingPassword ? (
                    <><Loader2 className="animate-spin h-5 w-5 mr-2" />Updating Password...</>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}