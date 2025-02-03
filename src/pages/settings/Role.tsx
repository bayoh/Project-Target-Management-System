import React from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { RoleManagement } from '../../components/settings/RoleManagement';


export function Roles() {

  return (
    <DashboardLayout>
      <div className="flex h-full">
        <div className="flex-1 overflow-auto p-6">
          <RoleManagement />
        </div>
      </div>
    </DashboardLayout>
  );
}