import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { 
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Printer,
  RefreshCw,
  Save,
  Share2,
  Clock,
  Calendar,
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  DollarSign,
  Target,
  Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import type { User } from '../../types/auth';
import type { Action } from '../../types/project';
import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet, 
  PDFDownloadLink,
  Font 
} from '@react-pdf/renderer';
import { reportApi } from '../../lib/api';
import toast from 'react-hot-toast';

interface Milestone {
  date: string;
  title: string;
  status: 'completed' | 'in_progress' | 'pending';
}

interface ActionReport {
  id: string;
  name: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'at_risk' | 'completed';
  milestones: Milestone[];
  keyMilestones: string[];
  issues: string[];
  jobsTarget: string;
  projectCost: string;
  lastUpdated: string;
  path?: string;
}

// Create styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica'
  },
  section: {
    margin: 10,
    padding: 10
  },
  header: {
    fontSize: 24,
    marginBottom: 20
  },
  subheader: {
    fontSize: 18,
    marginBottom: 10,
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    padding: 5,
    borderRadius: 4
  },
  text: {
    fontSize: 12,
    marginBottom: 5
  },
  milestone: {
    flexDirection: 'row',
    marginBottom: 5
  },
  milestoneDate: {
    width: 100,
    fontSize: 12
  },
  milestoneTitle: {
    flex: 1,
    fontSize: 12
  }
});

// PDF Document Component
const ActionReportPDF = ({ report }: { report: ActionReport }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.section}>
        <Text style={styles.header}>{report.name}</Text>
        <Text style={styles.text}>{report.description}</Text>
        {report.path && (
          <Text style={styles.text}>Path: {report.path}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.subheader}>Current Status</Text>
        {report.milestones.map((milestone, index) => (
          <View key={index} style={styles.milestone}>
            <Text style={styles.milestoneDate}>{milestone.date}</Text>
            <Text style={styles.milestoneTitle}>{milestone.title}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.subheader}>Key Milestones</Text>
        {report.keyMilestones.map((milestone, index) => (
          <Text key={index} style={styles.text}>• {milestone}</Text>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.subheader}>Issues/Comments</Text>
        {report.issues.length > 0 ? (
          report.issues.map((issue, index) => (
            <Text key={index} style={styles.text}>• {issue}</Text>
          ))
        ) : (
          <Text style={styles.text}>No active issues</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.subheader}>Jobs Target</Text>
        <Text style={styles.text}>{report.jobsTarget}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subheader}>Project Cost</Text>
        <Text style={styles.text}>{report.projectCost}</Text>
      </View>
    </Page>
  </Document>
);

export function ActionReports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [selectedActionId, setSelectedActionId] = useState<string>('');
  const [report, setReport] = useState<ActionReport | null>(null);

  useEffect(() => {
    loadActions();
  }, []);

  useEffect(() => {
    if (selectedActionId) {
      loadReport(selectedActionId);
    }
  }, [selectedActionId]);

  const loadActions = async () => {
    try {
      const data = await reportApi.getActions();
      setActions(data);
    } catch (err: any) {
      console.error('Error loading actions:', err);
      toast.error('Failed to load actions');
    } finally {
      setLoading(false);
    }
  };

  const loadReport = async (actionId: string) => {
    try {
      setLoading(true);
      const data = await reportApi.getActionReport(actionId);
      setReport(data);
    } catch (err: any) {
      console.error('Error loading report:', err);
      toast.error('Failed to load report');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'at_risk':
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case 'not_started':
        return <XCircle className="h-5 w-5 text-gray-500" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Action Reports</h1>
            <div className="mt-2 flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm text-gray-600">Completed</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-gray-600">In Progress</span>
              </div>
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-gray-600">At Risk</span>
              </div>
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Not Started</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <select
              value={selectedActionId}
              onChange={(e) => setSelectedActionId(e.target.value)}
              className="block w-96 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">Select an action</option>
              {actions.map((action) => (
                <option key={action.id} value={action.id}>
                  {action.intervention?.pathway?.cluster?.name && 
                    `${action.intervention.pathway.cluster.name} > ${action.intervention.pathway.name} > ${action.intervention.name} > `}
                  {action.name}
                </option>
              ))}
            </select>

            {report && (
              <PDFDownloadLink
                document={<ActionReportPDF report={report} />}
                fileName={`${report.name.toLowerCase().replace(/\s+/g, '-')}-report.pdf`}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                {({ blob, url, loading, error }) =>
                  loading ? (
                    'Generating PDF...'
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </>
                  )
                }
              </PDFDownloadLink>
            )}
          </div>
        </div>

        {error ? (
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        ) : report ? (
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6">
              {/* Current Status Timeline */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Current Status</h2>
                <div className="relative">
                  {/* Timeline Line */}
                  <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200"></div>
                  
                  {/* Milestones */}
                  <div className="relative flex justify-between">
                    {report.milestones.map((milestone, index) => (
                      <div key={index} className="flex flex-col items-center">
                        <div className="text-sm text-gray-500 mb-2">
                          {format(new Date(milestone.date), 'dd MMM yy')}
                        </div>
                        <div className={`w-4 h-4 rounded-full ${
                          milestone.status === 'completed' ? 'bg-green-500' :
                          milestone.status === 'in_progress' ? 'bg-blue-500' :
                          'bg-gray-300'
                        }`}></div>
                        <div className="text-sm text-gray-600 mt-2 w-24 text-center">
                          {milestone.title}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Key Milestones */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Key Milestones</h2>
                <ul className="list-disc pl-5 space-y-2">
                  {report.keyMilestones.map((milestone, index) => (
                    <li key={index} className="text-gray-600">{milestone}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-6">
              {/* Action Info */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-medium text-blue-700 bg-blue-50 p-2 rounded mb-4">
                  {report.name}
                </h2>
                <p className="text-gray-600">{report.description}</p>
                {report.path && (
                  <p className="mt-2 text-sm text-gray-500">Path: {report.path}</p>
                )}
              </div>

              {/* Issues/Comments */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-medium text-blue-700 bg-blue-50 p-2 rounded mb-4">
                  Issues/Comments
                </h2>
                {report.issues.length > 0 ? (
                  report.issues.map((issue, index) => (
                    <p key={index} className="text-gray-600 mb-2">{issue}</p>
                  ))
                ) : (
                  <p className="text-gray-600">No active issues</p>
                )}
              </div>

              {/* Jobs Target */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-medium text-blue-700 bg-blue-50 p-2 rounded mb-4">
                  Jobs Target
                </h2>
                <p className="text-gray-600">{report.jobsTarget}</p>
              </div>

              {/* Project Cost */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-medium text-blue-700 bg-blue-50 p-2 rounded mb-4">
                  Project Cost
                </h2>
                <p className="text-gray-600">{report.projectCost}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Report Selected</h3>
            <p className="mt-1 text-sm text-gray-500">
              Select an action from the dropdown above to view its report
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}