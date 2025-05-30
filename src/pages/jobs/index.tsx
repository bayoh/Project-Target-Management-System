import React from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { JobsDashboard } from '../../components/dashboard/JobsDashboard';

export function Jobs() {
  return (
    <DashboardLayout>
      <div className="flex h-full">
        <div className="flex-1 overflow-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Actions Dashboard</h1>
            <p className="text-gray-500">Overview of job creation and action progress across all clusters</p>
          </div>
          <JobsDashboard />
        </div>
      </div>
    </DashboardLayout>
  );
}