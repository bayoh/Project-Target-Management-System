import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Lock, ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSystemSettings } from '../../hooks/useSystemSettingsQueries';

export function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const navigate = useNavigate();
  const { data: settings } = useSystemSettings();

  useEffect(() => {
    // Check if user has a valid session for password recovery
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Allow password recovery and signed in states
      if (event === "SIGNED_OUT" || (!session && event !== "PASSWORD_RECOVERY")) {
        navigate('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage({
        type: 'error',
        text: 'Passwords do not match',
      });
      return;
    }

    if (password.length < 6) {
      setMessage({
        type: 'error',
        text: 'Password must be at least 6 characters long',
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
    
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) throw error;

    setMessage({
      type: 'success',
      text: 'Password has been updated successfully! You will be redirected to login in a few seconds.',
    });

    // Clear the form
    setPassword('');
    setConfirmPassword('');

    // Redirect to login after successful password update
    setTimeout(() => {
      navigate('/login');
    }, 3000);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="text-center mb-8">
            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt={settings.app_name || 'Logo'}
                className="h-12 w-auto mx-auto mb-6"
              />
            ) : (
              <div className="flex justify-center mb-6">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
                  <Shield className="h-8 w-8 text-white" />
                </div>
              </div>
            )}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Update Password
            </h1>
            <p className="text-gray-600">
              Please enter your new password to complete the reset process.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handlePasswordUpdate}>
            {message && (
              <div
                className={`rounded-lg p-4 ${message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
              >
                <div
                  className={`text-sm ${message.type === 'success' ? 'text-green-700' : 'text-red-700'}`}
                >
                  {message.text}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirm-password"
                    name="confirm-password"
                    type="password"
                    required
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? 'Updating password...' : 'Update Password'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}