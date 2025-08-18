import React from 'react';
import { SecuritySettings } from '../../components/settings/SecuritySettings';


export function Security() {

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-auto p-6">
        <SecuritySettings />
      </div>
    </div>
  );
}