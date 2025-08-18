import React from 'react';
import { ProjectPartnerManagement } from '../../components/settings/ProjectPartnerManagement';

export function PojectsPartners() {
  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-auto p-6">
        <ProjectPartnerManagement />
      </div>
    </div>
  );
}