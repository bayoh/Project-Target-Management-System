import React, { useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { 
  Plus,
  FileText,
  Filter,
  Download,
  Calendar,
  ChevronRight,
  AlertTriangle,
  Settings,
  Eye,
  BarChart2,
  ClipboardList
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useActivityTracking } from '../../hooks/useActivityTracking';
import { useReportTemplates } from '../../hooks/useReportTemplateQueries';

export function Reports() {
  const { trackPageView } = useActivityTracking();
  const navigate = useNavigate();

  // Use TanStack Query hook for templates (for future sections that list templates)
  const { isLoading } = useReportTemplates();

  useEffect(() => {
    trackPageView('Reports');
  }, [trackPageView]);

  const reportTypes = [
    {
      title: 'Action Reports',
      description: 'Detailed activity summaries and progress tracking for actions',
      icon: ClipboardList,
      path: '/reports/actions',
      color: 'bg-blue-500'
    },
    // {
    //   title: 'Template Reports',
    //   description: 'Generate custom reports using predefined templates',
    //   icon: FileText,
    //   path: '/reports/templates',
    //   color: 'bg-green-500'
    // }
  ];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <button
            onClick={() => navigate('/reports/templates/new')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </button>
        </div> */}

        {/* Report Types Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-1 lg:grid-cols-1 mt-20">
          {reportTypes.map((type) => (
            <div
              key={type.path}
              onClick={() => navigate(type.path)}
              className="relative bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="p-6">
                <div className="flex items-center">
                  <div className={`p-3 ${type.color} rounded-lg text-white`}>
                    <type.icon className="h-6 w-6" />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-medium text-gray-900">
                      {type.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {type.description}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Reports */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          {/* <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Reports</h2>
          </div> */}
          <div className="divide-y divide-gray-200">
            {/* Template listing section is intentionally commented out for now. */}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}