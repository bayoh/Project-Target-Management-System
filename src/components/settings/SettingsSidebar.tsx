import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Shield, Lock, Settings as SettingsIcon, Layout, Upload } from 'lucide-react';

interface SettingsSidebarProps {
  activeSection: string;
}

export function SettingsSidebar({ activeSection }: SettingsSidebarProps) {
  const navigate = useNavigate();

  const sections = [
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'roles', label: 'Role Management', icon: Shield },
    { id: 'security', label: 'Security Settings', icon: Lock },
    { id: 'system', label: 'System Settings', icon: Layout },
    { id: 'import', label: 'Data Import', icon: Upload },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center">
          <SettingsIcon className="h-6 w-6 text-gray-400" />
          <h2 className="ml-3 text-lg font-medium text-gray-900">Settings</h2>
        </div>
      </div>
      <nav className="p-4 space-y-1">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => navigate(`/settings?section=${section.id}`)}
              className={`
                w-full flex items-center px-4 py-2 text-sm font-medium rounded-md
                ${activeSection === section.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
              `}
            >
              <Icon className="h-5 w-5 mr-3" />
              {section.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}