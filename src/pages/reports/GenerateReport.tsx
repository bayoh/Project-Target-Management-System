import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { ReportGenerator } from '../../components/reports/ReportGenerator';
import { ChevronLeft, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { ReportTemplate } from '../../types/reports';
import type { Intervention } from '../../types/project';

export function GenerateReport() {
  const { templateId, interventionId } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<ReportTemplate | null>(null);
  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [templateId, interventionId]);

  const loadData = async () => {
    try {
      const [templateData, interventionData] = await Promise.all([
        supabase
          .from('report_templates')
          .select('*')
          .eq('id', templateId)
          .single(),
        supabase
          .from('interventions')
          .select(`
            *,
            pathway:pathways(name),
            lead:users_view!interventions_lead_id_fkey(email),
            objectives:intervention_objectives(id, description),
            resources:intervention_resources(id, name, quantity, unit, acquired),
            success_criteria:intervention_success_criteria(
              id, description, target_value, target_unit, current_value
            ),
            actions(
              *,
              tasks(*),
              indicators(
                *,
                reports:indicator_reports(*)
              )
            )
          `)
          .eq('id', interventionId)
          .single(),
      ]);

      if (templateData.error) throw templateData.error;
      if (interventionData.error) throw interventionData.error;

      setTemplate(templateData.data);
      setIntervention(interventionData.data);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load template or intervention data');
    } finally {
      setLoading(false);
    }
  };

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

  if (!template || !intervention) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Template or intervention not found
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
              {template.name} - {intervention.name}
            </h1>
          </div>
        </div>

        <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden">
          <ReportGenerator
            template={template}
            data={intervention}
            interventionId={interventionId!}
            onSave={handleSave}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}