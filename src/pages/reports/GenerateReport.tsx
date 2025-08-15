import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { ReportGenerator } from '../../components/reports/ReportGenerator';
import { ChevronLeft } from 'lucide-react';
import type { ReportTemplate } from '../../types/reports';
import type { Intervention } from '../../types/project';
import { useReportTemplate } from '../../hooks/useReportTemplateQueries';
import { useInterventionDetail } from '../../hooks/useInterventionQueries';

export function GenerateReport() {
  const { templateId, interventionId } = useParams();
  const navigate = useNavigate();

  // Fetch template via hook
  const { data: template, isLoading: templateLoading } = useReportTemplate(templateId);

  // Fetch intervention details via new hook
  const {
    data: intervention,
    isLoading: interventionLoading,
    error: interventionError,
  } = useInterventionDetail(interventionId);

  const loading = templateLoading || interventionLoading;
  const error = interventionError ? (interventionError instanceof Error ? interventionError.message : 'Failed to load data') : null;

  const handleSave = () => {
    navigate('/reports');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !template || !intervention) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {error || 'Template or intervention not found'}
          </h3>
          <div className="mt-6">
            <button
              onClick={() => navigate('/reports')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Back to Reports
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/reports')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              {(template as ReportTemplate).name} - {(intervention as Intervention).name
              }
            </h1>
          </div>
        </div>

        <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden">
          <ReportGenerator
            template={template as ReportTemplate}
            data={intervention}
            interventionId={interventionId!}
            onSave={handleSave}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}