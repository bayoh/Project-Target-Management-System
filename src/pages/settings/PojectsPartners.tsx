import React from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { ProjectPartnerManagement } from '../../components/settings/ProjectPartnerManagement';

export function PojectsPartners() {
  return (
    <DashboardLayout>
      <div className="flex h-full">
        <div className="flex-1 overflow-auto p-6">
          <ProjectPartnerManagement />
        </div>
      </div>
    </DashboardLayout>
  );
}