import React, { useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { UserDashboard} from '../components/dashboard/UserDashboard'
import { useActivityTracking } from '../hooks/useActivityTracking';


export function MyDashboard() {
  const { trackPageView } = useActivityTracking();

  useEffect(() => {
    trackPageView('User Dashboard');
  }, []);

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