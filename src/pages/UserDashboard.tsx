import React from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { UserDashboard} from '../components/dashboard/UserDashboard'


export function MyDashboard() {

  return (
    <DashboardLayout>
      <div className="flex h-full">
        <div className="flex-1 overflow-auto p-6">
          <UserDashboard />
        </div>
      </div>
    </DashboardLayout>
  );
}