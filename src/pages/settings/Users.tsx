import React from 'react';
import { UserManagement } from '../../components/settings/UserManagement';


export function Users() {

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-auto p-6">
        <UserManagement />
      </div>
    </div>
  );
}