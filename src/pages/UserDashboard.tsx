import React, { useEffect } from 'react';

import { UserDashboard} from '../components/dashboard/UserDashboard'
import { useActivityTracking } from '../hooks/useActivityTracking';


export function MyDashboard() {
  const { trackPageView } = useActivityTracking();

  useEffect(() => {
    trackPageView('User Dashboard');
  }, []);

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-auto p-6">
        <UserDashboard />
      </div>
    </div>
  );
}