import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { ReportTemplateDesigner } from '../../components/reports/ReportTemplateDesigner';
import { ChevronLeft, Save } from 'lucide-react';
import type { ReportTemplate } from '../../types/reports';
import { useReportTemplate, useCreateReportTemplate, useUpdateReportTemplate } from '../../hooks/useReportTemplateQueries';

export function EditTemplate() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: fetchedTemplate, isLoading } = useReportTemplate(id);
  const createTemplate = useCreateReportTemplate();
  const updateTemplate = useUpdateReportTemplate();

  const [template, setTemplate] = useState<ReportTemplate | null>(null);

  useEffect(() => {
    if (id) {
      setTemplate(fetchedTemplate ?? null);
    } else {
      setTemplate({
        id: crypto.randomUUID(),
        name: 'New Template',
        description: null,
        layout: {
          sections: [
            {
              id: crypto.randomUUID(),
              type: 'content',
              elements: [],
            },
          ],
        },
        created_by: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }, [id, fetchedTemplate]);

  const saving = createTemplate.isPending || updateTemplate.isPending;

  const handleSave = async () => {
    if (!template) return;

    try {
      if (id) {
        await updateTemplate.mutateAsync({
          id,
          name: template.name,
          description: template.description,
          layout: template.layout,
        });
      } else {
        await createTemplate.mutateAsync({
          id: template.id,
          name: template.name,
          description: template.description,
          layout: template.layout,
        });
      }
      navigate('/reports/templates');
    } catch (err) {
      console.error('Error saving template:', err);
    }
  };

  if (isLoading && id) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!template) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Template not found
          </h3>
          <div className="mt-6">
            <button
              onClick={() => navigate('/reports/templates')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Back to Templates
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
              onClick={() => navigate('/reports/templates')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </button>
            <div>
              <input
                type="text"
                value={template.name}
                onChange={(e) =>
                  setTemplate({ ...template, name: e.target.value })
                }
                className="text-2xl font-bold text-gray-900 border-none focus:ring-0 bg-transparent"
              />
              <input
                type="text"
                value={template.description || ''}
                onChange={(e) =>
                  setTemplate({ ...template, description: e.target.value })
                }
                placeholder="Add a description..."
                className="mt-1 text-sm text-gray-500 border-none focus:ring-0 bg-transparent"
              />
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Template'}
          </button>
        </div>

        <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden">
          <ReportTemplateDesigner
            template={template}
            onChange={setTemplate}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}