import React from 'react';
import { SystemSettings } from '../../components/settings/SystemSettings';


export function System() {

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-auto p-6">
        <SystemSettings />
      </div>
    </div>
  );
}