import React from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { UserManagement } from '../../components/settings/UserManagement';


export function Users() {

  return (
    <DashboardLayout>
      <div className="flex h-full">
        <div className="flex-1 overflow-auto p-6">
          <UserManagement />
        </div>
      </div>
    </DashboardLayout>
  );
}