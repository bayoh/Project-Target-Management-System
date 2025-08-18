import React from 'react';
import { AssignmentManagement } from '../../components/settings/AssignmentManagement';

export function Assignments() {
  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-auto p-6">
        <AssignmentManagement />
      </div>
    </div>
  );
}