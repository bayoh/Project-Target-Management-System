import React from 'react';
import { Plus, FileText, Edit2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useReportTemplates, useDeleteReportTemplate } from '../../hooks/useReportTemplateQueries';

export function ReportTemplates() {
  const navigate = useNavigate();
  const { data: templates, isLoading } = useReportTemplates();
  const deleteTemplate = useDeleteReportTemplate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Report Templates</h1>
          <button
            onClick={() => navigate('/reports/templates/new')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(templates || []).map((template) => (
            <div
              key={template.id}
              className="bg-white overflow-hidden shadow rounded-lg"
            >
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <h3 className="ml-2 text-lg font-medium text-gray-900">
                      {template.name}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => navigate(`/reports/templates/${template.id}/edit`)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => deleteTemplate.mutate(template.id)}
                      className="text-red-400 hover:text-red-500"
                      disabled={deleteTemplate.isPending}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                {template.description && (
                  <p className="mt-1 text-sm text-gray-500">
                    {template.description}
                  </p>
                )}
                <div className="mt-4">
                  <button
                    onClick={() => navigate(`/reports/templates/${template.id}`)}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    View Template
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {(templates || []).length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No templates
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new report template.
            </p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/reports/templates/new')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </button>
            </div>
          </div>
        )}
      </div>
  );
}