import React from 'react';
import { RoleManagement } from '../../components/settings/RoleManagement';


export function Roles() {

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-auto p-6">
        <RoleManagement />
      </div>
    </div>
  );
}