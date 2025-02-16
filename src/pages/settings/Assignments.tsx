import React from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { AssignmentManagement } from '../../components/settings/AssignmentManagement';

export function Assignments() {
  return (
    <DashboardLayout>
      <div className="flex h-full">
        <div className="flex-1 overflow-auto p-6">
          <AssignmentManagement />
        </div>
      </div>
    </DashboardLayout>
  );
}