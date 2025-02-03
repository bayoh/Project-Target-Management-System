import React from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { DataImport } from '../../components/settings/DataImport';


export function Import() {

  return (
    <DashboardLayout>
      <div className="flex h-full">
        <div className="flex-1 overflow-auto p-6">
          <DataImport />
        </div>
      </div>
    </DashboardLayout>
  );
}