
import React from 'react';
import { Shield, Check } from 'lucide-react';

const ROLE_PERMISSIONS = {
  super_admin: {
    name: 'Super Admin',
    description: 'Full system access with ability to manage all users and settings',
    permissions: [
      'Manage users and roles',
      'Access all system settings',
      'View and modify all data',
      'Manage system configuration',
      'Access audit logs',
      'Manage integrations'
    ]
  },
  leadership: {
    name: 'Leadership',
    description: 'Access to reports, dashboards, and team management',
    permissions: [
      'View all reports and dashboards',
      'Manage team assignments',
      'View project progress',
      'Access analytics',
      'Generate reports'
    ]
  },
  lead: {
    name: 'Lead',
    description: 'Team management and project-level access',
    permissions: [
      'Manage assigned projects',
      'Create and edit tasks',
      'Assign team members',
      'Track project progress',
      'Generate project reports'
    ]
  },
  supporting_staff: {
    name: 'Supporting Staff',
    description: 'Basic access to assigned tasks and features',
    permissions: [
      'View assigned tasks',
      'Update task status',
      'Submit reports',
      'View relevant project data'
    ]
  }
};

export function RoleManagement() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Role Management</h2>
        <p className="mt-1 text-sm text-gray-500">
          Define and manage user roles and their associated permissions
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Object.entries(ROLE_PERMISSIONS).map(([role, details]) => (
          <div
            key={role}
            className="bg-white rounded-lg shadow-sm border p-6 space-y-4"
          >
            <div className="flex items-center space-x-3">
              <Shield className={`h-6 w-6 ${
                role === 'super_admin' ? 'text-purple-500' :
                role === 'leadership' ? 'text-blue-500' :
                role === 'lead' ? 'text-green-500' :
                'text-gray-500'
              }`} />
              <h3 className="text-lg font-medium text-gray-900">{details.name}</h3>
            </div>

            <p className="text-sm text-gray-500">{details.description}</p>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Permissions</h4>
              <ul className="space-y-2">
                {details.permissions.map((permission, index) => (
                  <li key={index} className="flex items-center text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    {permission}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}