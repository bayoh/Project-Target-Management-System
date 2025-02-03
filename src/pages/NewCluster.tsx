import React from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { MultiStepClusterForm } from '../components/forms/MultiStepClusterForm';

export function NewCluster() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New Cluster</h1>
            <p className="mt-1 text-sm text-gray-500">
              Create a new cluster with its pathways, interventions, actions, and tasks.
            </p>
          </div>

          <div className="bg-white shadow-sm rounded-lg p-6">
            <MultiStepClusterForm />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}