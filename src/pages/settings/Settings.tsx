import React, { useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { SettingsSidebar } from '../../components/settings/SettingsSidebar';
import { UserManagement } from '../../components/settings/UserManagement';
import { RoleManagement } from '../../components/settings/RoleManagement';
import { SecuritySettings } from '../../components/settings/SecuritySettings';
import { SystemSettings } from '../../components/settings/SystemSettings';
import { DataImport } from '../../components/settings/DataImport';
import { useLocation } from 'react-router-dom';
import { useActivityTracking } from '../../hooks/useActivityTracking';

export function Settings() {
  const { trackPageView } = useActivityTracking();
  const location = useLocation();
  const section = new URLSearchParams(location.search).get('section') || 'users';

  useEffect(() => {
    trackPageView(`Settings - ${section}`);
  }, [section]);

  const renderSection = () => {
    switch (section) {
      case 'users':
        return <UserManagement />;
      case 'roles':
        return <RoleManagement />;
      case 'security':
        return <SecuritySettings />;
      case 'system':
        return <SystemSettings />;
      case 'import':
        return <DataImport />;
      default:
        return <UserManagement />;
    }
  };

  return (
    <DashboardLayout>
      <div className="flex h-full">
        <SettingsSidebar activeSection={section} />
        <div className="flex-1 overflow-auto p-6">
          {renderSection()}
        </div>
      </div>
    </DashboardLayout>
  );
}