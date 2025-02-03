import React from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { SecuritySettings } from '../../components/settings/SecuritySettings';


export function Security() {

  return (
    <DashboardLayout>
      <div className="flex h-full">
        <div className="flex-1 overflow-auto p-6">
          <SecuritySettings />
        </div>
      </div>
    </DashboardLayout>
  );
}