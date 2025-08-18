import React from 'react';
import { DataImport } from '../../components/settings/DataImport';


export function Import() {

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-auto p-6">
        <DataImport />
      </div>
    </div>
  );
}