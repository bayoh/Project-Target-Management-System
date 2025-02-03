
import React, { useState } from 'react';
import { Lock, Key, Shield, AlertTriangle, Clock } from 'lucide-react';

export function SecuritySettings() {
  const [passwordPolicy, setPasswordPolicy] = useState({
    minLength: 8,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    expiryDays: 90
  });

  const [sessionSettings, setSessionSettings] = useState({
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    lockoutDuration: 15
  });

  const [mfaSettings, setMfaSettings] = useState({
    required: false,
    allowedMethods: ['authenticator', 'sms']
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Security Settings</h2>
        <p className="mt-1 text-sm text-gray-500">
          Configure security policies and access controls
        </p>
      </div>

      {/* Password Policy */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Key className="h-6 w-6 text-blue-500" />
          <h3 className="text-lg font-medium text-gray-900">Password Policy</h3>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Minimum Length
              </label>
              <input
                type="number"
                value={passwordPolicy.minLength}
                onChange={(e) => setPasswordPolicy({
                  ...passwordPolicy,
                  minLength: parseInt(e.target.value)
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password Expiry (days)
              </label>
              <input
                type="number"
                value={passwordPolicy.expiryDays}
                onChange={(e) => setPasswordPolicy({
                  ...passwordPolicy,
                  expiryDays: parseInt(e.target.value)
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={passwordPolicy.requireUppercase}
                onChange={(e) => setPasswordPolicy({
                  ...passwordPolicy,
                  requireUppercase: e.target.checked
                })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Require uppercase letters</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={passwordPolicy.requireNumbers}
                onChange={(e) => setPasswordPolicy({
                  ...passwordPolicy,
                  requireNumbers: e.target.checked
                })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Require numbers</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={passwordPolicy.requireSpecialChars}
                onChange={(e) => setPasswordPolicy({
                  ...passwordPolicy,
                  requireSpecialChars: e.target.checked
                })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Require special characters</span>
            </label>
          </div>
        </div>
      </div>

      {/* Session Settings */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Clock className="h-6 w-6 text-blue-500" />
          <h3 className="text-lg font-medium text-gray-900">Session Settings</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Session Timeout (minutes)
            </label>
            <input
              type="number"
              value={sessionSettings.sessionTimeout}
              onChange={(e) => setSessionSettings({
                ...sessionSettings,
                sessionTimeout: parseInt(e.target.value)
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Max Login Attempts
            </label>
            <input
              type="number"
              value={sessionSettings.maxLoginAttempts}
              onChange={(e) => setSessionSettings({
                ...sessionSettings,
                maxLoginAttempts: parseInt(e.target.value)
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Lockout Duration (minutes)
            </label>
            <input
              type="number"
              value={sessionSettings.lockoutDuration}
              onChange={(e) => setSessionSettings({
                ...sessionSettings,
                lockoutDuration: parseInt(e.target.value)
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* MFA Settings */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="h-6 w-6 text-blue-500" />
          <h3 className="text-lg font-medium text-gray-900">Multi-Factor Authentication</h3>
        </div>

        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={mfaSettings.required}
              onChange={(e) => setMfaSettings({
                ...mfaSettings,
                required: e.target.checked
              })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Require MFA for all users</span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Allowed MFA Methods
            </label>
             ```tsx
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={mfaSettings.allowedMethods.includes('authenticator')}
                  onChange={(e) => setMfaSettings({
                    ...mfaSettings,
                    allowedMethods: e.target.checked
                      ? [...mfaSettings.allowedMethods, 'authenticator']
                      : mfaSettings.allowedMethods.filter(m => m !== 'authenticator')
                  })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Authenticator app</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={mfaSettings.allowedMethods.includes('sms')}
                  onChange={(e) => setMfaSettings({
                    ...mfaSettings,
                    allowedMethods: e.target.checked
                      ? [...mfaSettings.allowedMethods, 'sms']
                      : mfaSettings.allowedMethods.filter(m => m !== 'sms')
                  })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">SMS verification</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="button"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
