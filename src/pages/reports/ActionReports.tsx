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
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  DollarSign,
  Target,
  Loader2,
  SpeechIcon,
  HandCoinsIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { User } from '../../types/auth';
import type { Action } from '../../types/project';
import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet, 
  PDFDownloadLink,
  Image
} from '@react-pdf/renderer';
import { reportApi, projectApi } from '../../lib/api';
import { userApi } from '../../lib/api';
import toast from 'react-hot-toast';
import { ImageSlider } from '../../components/imageSlider/index.tsx';
import { Calendar } from '../../components/ui/Calendar.tsx';
import { List, ListItem } from '../../components/ui/List.tsx';
import { Select } from '../../components/ui/Select.tsx';
import { format, formatDate, formatDistance, formatRelative, subDays } from 'date-fns'

interface Milestone {
  date: string;
  title: string;
  status: 'completed' | 'ongoing/ontrack' | 'ongoing/offtrack'| 'pending';
}

interface ActionReport {
  id: string;
  name: string;
  description: string;
  status: 'completed' | 'ongoing/ontrack' | 'ongoing/offtrack'| 'pending';
  milestones: Milestone[];
  keyMilestones: string[];
  needs: [];
  comments: [];
  issues: [];
  jobsTarget: string;
  projectCost: string;
  lastUpdated: string;
  path?: string;
  otherTargets: []
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
  },
  smallText: {
    fontSize: 10,
    color: '#6B7280'
  },
  boldText: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  statusBadge: {
    padding: 4,
    borderRadius: 4,
    marginLeft: 5
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
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10
  }
});

// Helper function for status colors
const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return '#22C55E';
    case 'in_progress':
      return '#3B82F6';
    case 'at_risk':
      return '#F59E0B';
    case 'not_started':
      return '#6B7280';
    default:
      return '#6B7280';
  }
};

// PDF Document Component


export function ActionReports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [selectedActionId, setSelectedActionId] = useState<string>('');
  const [report, setReport] = useState<ActionReport | null>(null);
  const [leads, setLeads] = useState<User[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');  
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [selectedWeeks, setSelectedWeeks] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCalendarOpen, setCalendarOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  const ActionReportPDF = ({ report }: { report: ActionReport} ) => (

    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Section */}
        <View style={[styles.section, { borderBottom: 1, borderColor: '#e5e7eb', paddingBottom: 20 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={styles.header}>{report?.name}</Text>
            <Text style={styles.text}>Created At: {new Date().toDateString()}</Text>
          </View>
          {report?.path && (
            <Text style={[styles.text, { color: '#4B5563' }]}>Path: {report?.path}</Text>
          )}
          <View style={[styles.flexRow, { marginTop: 10, marginBottom: 10 }]}>
            <Text style={styles.boldText}>Status: </Text>
            <Text style={[styles.text, { color: getStatusColor(report?.status) }]}>{report?.status}</Text>
          </View>
          <View style={[styles.flexRow, { marginBottom: 10 }]}>
            <Text style={styles.boldText}>Lead: </Text>
            <Text style={styles.text}>{report?.lead}</Text>
          </View>
          <View style={[styles.flexRow, { marginBottom: 10 }]}>
            <Text style={styles.boldText}>Supporting Staff: </Text>
            <Text style={styles.text}>{users.filter(user => report?.supporting_staffs.includes(user.id)).map(user => user.full_name).join(', ')}</Text>
          </View>
          <Text style={[styles.text, { marginTop: 10 }]}>{report?.description}</Text>
        </View>
  
        {/* Progress Section */}
        <View style={[styles.section, { backgroundColor: '#F9FAFB' }]}>
          <View style={{ flexDirection: 'row', gap: 20 }}>
  
            <View style={{ flex: 1 }}>
              <Text style={[styles.subheader, { marginBottom: 15 }]}>Achievements</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                <View style={styles.card}>
                  <Text style={styles.smallText}>Jobs Target</Text>
                  <View style={styles.flexRow}>
                    <Text style={[styles.boldText, { fontSize: 12 }]}>{report?.jobsTarget}</Text>
                  </View>
                </View>
                <View style={styles.card}>
                  <Text style={styles.smallText}>Project Cost</Text>
                  <View style={styles.flexRow}>
                    <Text style={[styles.boldText, { fontSize: 14 }]}>{report?.projectCost}</Text>
                  </View>
                </View>
              </View> 
              {report?.milestones.length > 0 && (
                <View style={styles.card}>
                  <Text style={[styles.boldText, { marginBottom: 10 }]}>Key Achievements</Text>
                  {report.milestones.map((milestone, index) => (
                    <View key={index} style={styles.card}>
                      <View style={styles.flexRow}>
                        <Text key={index} style={[styles.text, { fontSize: 12 }]}>{milestone.title}</Text>
                        <Text style={[styles.milestoneDate, {fontSize: 12}]}>{milestone.date}</Text>
                      </View> 
                </View>
                  ))}
                </View>
  
              )}
              {report?.otherTargets.length > 0 && (
                <View style={styles.card}>
                  <Text style={[styles.boldText, { marginBottom: 10 }]}>Other Targets</Text>
                  {report.otherTargets.map((target, index) => (
                    <View key={index} style={[styles.card]}>
                    <View>
                      <View>
                        <Text style={[styles.text, {fontSize: 12}]}>{target.metric}</Text>
                        <Text style={[styles.text, {fontSize: 12}]}>Progess: {target.current_value} / {target.target_value}</Text>
                      </View>
                      <View>
                        <View 
                          
                          style={{ width: `${(target.current_value / target.target_value) * 100}%` }}
                        ></View>
                      </View>
                      <Text style={[styles.text]}>Last Updated: {formatRelative(subDays(target.last_updated, 3), new Date())}</Text>
                    </View>
                  </View>
                   
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>
  
        {/* Issues & Needs Section */}
        <View style={styles.section}>
          <Text style={[styles.subheader, { marginBottom: 15 }]}>Issues & Needs</Text>
          
          {/* Issues */}
          <Text style={[styles.boldText, { marginBottom: 10 }]}>Issues</Text>
          {report?.issues.length > 0 ? (
            <View style={{ gap: 10, marginBottom: 20 }}>
              {report.issues.map((issue, index) => (
                <View key={index} style={styles.card}>
                  <View style={styles.flexRow}>
                    <Text style={[styles.statusBadge, { backgroundColor: getStatusColor(issue.status) + '20', color: getStatusColor(issue.status) }]}>
                      {issue.status}
                    </Text>
                    {issue.severity && (
                      <Text style={[styles.smallText, { marginLeft: 10 }]}>Severity: {issue.severity}</Text>
                    )}
                  </View>
                  <Text style={[styles.text, { marginTop: 5 }]}>{issue.description}</Text>
                  {issue.resolution_steps && (
                    <Text style={[styles.smallText, { marginTop: 5 }]}>Resolution: {issue.resolution_steps}</Text>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.text, { marginBottom: 20 }]}>No active issues</Text>
          )}
  
          {/* Needs */}
          <Text style={[styles.boldText, { marginBottom: 10 }]}>Needs</Text>
          {report?.needs.length > 0 ? (
            <View style={{ gap: 10 }}>
              {report.needs.map((need, index) => (
                <View key={index} style={styles.card}>
                  <View style={styles.flexRow}>
                    <Text style={styles.smallText}>{need.date_identified}</Text>
                    {need.date_fulfilled && (
                      <Text style={[styles.smallText, { color: '#22C55E' }]}>Fulfilled: {need.date_fulfilled}</Text>
                    )}
                  </View>
                  <Text style={[styles.text, { marginTop: 5 }]}>{need.description}</Text>
                  {need.resource_requirements && (
                    <Text style={[styles.smallText, { marginTop: 5 }]}>Requirements: {need.resource_requirements}</Text>
                  )}
                  {need.budget_impact && (
                    <Text style={[styles.smallText, { marginTop: 5 }]}>Budget Impact: ${need.budget_impact}</Text>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.text}>No resource needs</Text>
          )}
        </View >
        <View style={styles.section}>
          <Text style={[styles.subheader, { marginBottom: 15 }]}>Photos</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {report?.milestones?.length > 0 && report.milestones.flatMap(milestone => milestone?.images || []).map((image, index) => (
              <View key={index} style={{ width: 300, height: 300, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' }}>
                <Image
                  source={{ uri: image }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </View> 
            ))
            }
          </View>
        </View>
      </Page>
    </Document>
  );

  useEffect(() => {
    loadLeads();
    getAllUsers();
  }, []);

  useEffect(() => {
    if (selectedLeadId) {
      loadActions();
    } else {
      setActions([]);
      setSelectedActionId('');
      setReport(null);
    }
  }, [selectedLeadId]);

  // useEffect(() => {
  //   if (selectedActionId) {
  //     loadReport(selectedActionId);
  //   }
  // }, [selectedActionId]);

  const loadLeads = async () => {
    try {
      const data = await userApi.getUsersByRole('lead');
      setLeads(data);
    } catch (err: any) {
      console.error('Error loading leads:', err);
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const getAllUsers = async () => {
    try {
      const data = await userApi.getUsers();
      setUsers(data);
    } catch (err: any) {
      console.error('Error loading leads:', err);
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const loadActions = async () => {
    try {
      const data = await projectApi.getActions();
      // Filter actions for selected lead
      const filteredActions = selectedLeadId
        ? data.filter(action => action.lead_id === selectedLeadId && action.status !== 'not_started' )
        : data;
      setActions(filteredActions);
    } catch (err: any) {
      console.error('Error loading actions:', err);
      toast.error('Failed to load actions');
    } finally {
      setLoading(false);
    }
  };

  const getDateRangeFromWeeks = (weeks: string) => {
    if (!weeks) return { start: null, end: null };
    
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (parseInt(weeks) * 7));
    return { start, end };
  };

  const loadReport = async (actionId: string) => {
    try {
      setLoading(true);
      let params: any = { actionId };
      
      // Add date range to params if selected
      if (dateRange.start && dateRange.end) {
        params.startDate = dateRange.start.toISOString();
        params.endDate = dateRange.end.toISOString();
      }
      console.log(params)
      const data = await reportApi.getActionReport(params);
      console.log(data)
      if (!data) {
        throw new Error('Failed to load report data');
      }

      // Filter achievements, issues, comments, and needs based on date range
      if (dateRange.start && dateRange.end) {
        const startDate = dateRange.start;
        const endDate = dateRange.end;
        
        // Filter issues within date range
        data.issues = data.issues?.filter(issue => {
          const issueDate = new Date(issue.created_at);
          const issueIdentifiedDate = issue.date_identified ? new Date(issue.date_identified) : null;
          const isWithinDateRange = (issueDate >= startDate && issueDate <= endDate) || 
                                  (issueIdentifiedDate && issueIdentifiedDate >= startDate && issueIdentifiedDate <= endDate);
          // const isUnresolved = issue.status !== 'resolved' && issue.status !== 'closed';
          return isWithinDateRange;
        }) || [];

        // data.issues = data.issues?.filter(issue => {
        //   const issueDate = new Date(issue.date_identified);
        //   return (issueDate >= startDate && issueDate <= endDate) || issue.date_resolved === null;
        // }) || [];

        // Filter comments within date range
        // data.comments = data.comments?.filter(comment => {
        //   const commentDate = new Date(comment.created_at);
        //   return commentDate >= startDate && commentDate <= endDate;
        // }) || [];

        // Filter needs within date range
        data.needs = data.needs?.filter(need => {
          const needDate = new Date(need.date_identified);
          const dateFulfiled =  new Date(need.date_fulfilled);
          return (needDate >= startDate && needDate <= endDate) || (dateFulfiled && dateFulfiled >=startDate && dateFulfiled <= endDate || dateFulfiled === null) ;
        }) || [];

        // Filter milestones within date range
        data.milestones = data.milestones?.filter(milestone => {
          const milestoneDate = new Date(milestone.date);
          return milestoneDate >= startDate && milestoneDate <= endDate;
        }) || [];

      }
      
      // Transform action data into report format
      const selectedAction = actions.find(action => action.id === actionId);
      console.log(data)
      if (!selectedAction) {
        throw new Error('Selected action not found');
      }

      const reportData: ActionReport = {
        id: data.id,
        name: data.name,
        description: data.description || '',
        status: data.status,
        lead: users.find(user => user.id === selectedAction.lead_id)?.full_name || '',
        supporting_staffs: data.supportingStaff || [],
        milestones: data.milestones?.map(m => ({
          date: format(new Date(m.date), 'dd/MM/yyyy'),
          title: m.title || '',
          status: m.status || '',
          images: m.images || []
        })) || [],
        keyMilestones: data.key_milestones || [],
        issues: data.issues || [],
        needs: data.needs || [],
        comments: data.comments,
        jobsTarget: data.jobsTarget?.toString() || '0',
        otherTargets: data.otherTargets || [],
        projectCost: data.projectCost|| '0',
        lastUpdated: format(new Date(data.lastUpdated), 'dd/MM/yyyy HH:mm'),
        path: data.path
      };
      console.log(reportData)
      setReport(reportData);
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

  const handleGenerateReport = async () => {
    if (!selectedLeadId || !selectedActionId) return;
    setIsGenerating(true);
    try {
      await loadReport(selectedActionId);
      // const reportData = await reportApi.generateReport(selectedActionId);
      // setReport(reportData);
    } catch (error) {
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-2">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Action Reports</h1>
        </div>

        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="space-y-4">
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
  <div className="w-full">
    <label htmlFor="lead" className="block text-sm font-medium text-gray-700 mb-2">
      Select Lead
    </label>
    <Select
      options={leads.map(lead => ({ value: lead.id, label: lead.full_name || lead.email || '' }))}
      value={selectedLeadId}
      onChange={(value) => {
        if (typeof value === 'string') {
          setSelectedLeadId(value);
        }
      }}
      sortable
      searchable
      placeholder="Select Lead"
      className="w-full"
      disabled={loading}
    />
  </div>

  <div className="w-full">
    <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700 mb-2">
      Date Range
    </label>
    <button
      onClick={() => setCalendarOpen(true)}
      className="w-full px-4 py-2 text-left rounded-lg border border-gray-200 shadow-sm hover:border-blue-300 focus:border-blue-500 focus:ring-blue-500 text-sm transition-colors"
    >
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-gray-500" />
        {(dateRange.start && dateRange.end) ? (
          <span className="text-gray-900 truncate">
            {format(dateRange.start, 'dd/MM/yyyy')} - {format(dateRange.end, 'dd/MM/yyyy')}
          </span>
        ) : (
          <span className="text-gray-500">Select a date range</span>
        )}
      </div>
    </button>
    
    <div className="relative">
      <Calendar
        selectionType="range" 
        isOpen={isCalendarOpen}
        onClose={() => setCalendarOpen(false)}
        onSelect={(selection) => {
          if (typeof selection === 'object' && 'start' in selection) {
            setDateRange(selection);
            setCalendarOpen(false);
          }
        }} 
      />
    </div>
  </div>

  <div className="w-full">
    <label htmlFor="action" className="block text-sm font-medium text-gray-700 mb-2">
      Select Action
    </label>
    <Select
      options={actions
        .sort((a, b) => {
          const codeA = String(a.code || '');
          const codeB = String(b.code || '');
          return codeA.localeCompare(codeB);
        })
        .map(action => ({ 
          value: action.id, 
          label: action.name, 
          prefix: action.code 
        }))}
      value={selectedActionId}
      onChange={(value)=> typeof value === 'string' && setSelectedActionId(value)}
      placeholder="Select Action"
      className="w-full"
      searchable
      disabled={!selectedLeadId}
    />
  </div>

  <div className="w-full flex items-end">
    <button
      onClick={handleGenerateReport}
      disabled={!selectedLeadId || !selectedActionId || isGenerating}
      className={`
        w-full px-4 py-2 rounded-lg font-medium
        focus:outline-none focus:ring-2 focus:ring-blue-500
        ${(!selectedLeadId || !selectedActionId || isGenerating)
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'}
        transition-colors duration-200
      `}
    >
      {isGenerating ? 'Generating...' : 'Generate Report'}
    </button>
  </div>
</div>

            {loading && (
              <div className="flex items-center justify-center py-8 bg-white rounded-lg border border-gray-100 shadow-sm">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                <span className="ml-3 text-sm font-medium text-gray-600">Loading report...</span>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 p-6 mb-8">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-red-800">Error Loading Report</h3>
                    <div className="mt-2 text-sm text-red-700">{error}</div>
                  </div>
                </div>
              </div>
            )}

            {report && (
              <div className="mt-6 space-y-2">
                <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                  {/* Header Section */}
                  <div className="p-4 sm:p-6 md:p-8 border-b border-gray-100">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-6 mb-4 sm:mb-6">
                      <div className="w-full sm:w-auto space-y-2">
                        <h2 className="text-2xl sm:text-2xl md:text-3xl font-bold text-gray-900 break-words">{report.name}</h2>
                        {report.path && (
                          <div className="text-xs sm:text-sm text-gray-600 flex items-center gap-2 flex-wrap">
                            <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="break-all">Path: {report.path}</span>
                          </div>
                        )}
                      </div>
                      <div className='space-y-2 sm:space-y-3 w-full sm:w-auto'>
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
                          <span className="flex items-center gap-1 sm:gap-2">
                            Status: <span className="capitalize">{report.status}</span> {getStatusIcon(report.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600">
                          <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="break-words">Lead: {report.lead}</span>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600">
                          <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="break-words">Supporting Staff: {users.filter(user => report.supporting_staffs.includes(user.id)).map(user => user.full_name).join(', ')}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed break-words">{report.description}</p>
                  </div>
                
                  {/* Progress Section */}
                  <div className="p-4 md:p-8 bg-gray-50 border-b border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                      <div>
                        <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-4 md:mb-6">Achievements</h3>
                        <div className="space-y-3 md:space-y-4">
                          {report.milestones.map((milestone, index) => (
                            <div key={index} className="flex items-start gap-3 md:gap-4 bg-white p-3 md:p-4 rounded-lg border border-gray-100 hover:border-blue-200 transition-colors">
                              {getStatusIcon(milestone.status)}
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-gray-900 text-sm md:text-base truncate">{milestone.title}</div>
                                <div className="text-xs md:text-sm text-gray-500 mt-1">{milestone.date}</div>
                              </div>
                            </div>
                          ))}
                          <div className="mt-4">
                            <ImageSlider images={report.milestones.flatMap(milestone => milestone?.images || [])} />
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-4 md:mb-6 mt-6 md:mt-0">Progress</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
                          <div className="bg-white p-4 md:p-5 rounded-lg border border-gray-100 hover:border-blue-200 transition-colors">
                            <div className="text-xs md:text-sm font-medium text-gray-600">Jobs Target</div>
                            <div className="mt-2 md:mt-3 flex items-center">
                              <Target className="h-4 md:h-5 w-4 md:w-5 text-blue-500 mr-2 md:mr-3" />
                              <p className="text-xl md:text-md sm:text-sm font-bold text-gray-900">{report.jobsTarget}</p>
                            </div>
                          </div>
                          <div className="bg-white p-4 md:p-5 rounded-lg border border-gray-100 hover:border-green-200 transition-colors">
                            <div className="text-xs md:text-sm font-medium text-gray-600">Action Budget</div>
                            <div className="mt-2 md:mt-3 flex items-center">
                              <DollarSign className="h-4 md:h-5 w-4 md:w-5 text-green-500 mr-2 md:mr-3" />
                              <span className="text-xl md:text-md sm:text-sm font-bold text-gray-900">{report.projectCost}</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white p-4 md:p-5 rounded-lg border border-gray-100 mb-4 md:mb-6">
                          <div className="text-xs md:text-sm font-medium text-gray-600 mb-3 md:mb-4">Other Targets</div>
                          <div className="space-y-3 md:space-y-4">
                            {report.otherTargets.map((target, index) => (
                              <ListItem key={index} icon={<Target className="h-3 md:h-4 w-3 md:w-4 text-blue-500" />}>
                                <div className="flex-1 space-y-2">
                                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                                    <p className="text-xs md:text-sm font-medium text-gray-700">{target.metric}</p>
                                    <p className="text-xs md:text-sm text-gray-600">{target.current_value} / {target.target_value}</p>
                                  </div>
                                  <div className="h-1.5 md:h-2 w-full rounded-full bg-gray-100">
                                    <div 
                                      className="h-full rounded-full bg-blue-500 transition-all duration-300" 
                                      style={{ width: `${(target.current_value / target.target_value) * 100}%` }}
                                    ></div>
                                  </div>
                                  <p className="text-xs text-gray-500 text-right">{formatRelative(subDays(target.last_updated, 3), new Date())}</p>
                                </div>
                              </ListItem>
                            ))}
                          </div>
                        </div>
                        {report.keyMilestones.length > 0 && (
                          <div className="bg-white p-4 md:p-5 rounded-lg border border-gray-100">
                            <h4 className="text-xs md:text-sm font-medium text-gray-900 mb-2 md:mb-3">Key Milestones</h4>
                            <ul className="list-disc pl-4 md:pl-5 space-y-1.5 md:space-y-2">
                              {report.keyMilestones.map((milestone, index) => (
                                <li key={index} className="text-xs md:text-sm text-gray-700">{milestone}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                
                  {/* Issues Section */}
                  <div className="p-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6">Issues</h3>
                    {report.issues.length > 0 ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-4 gap-6 px-4 text-sm font-medium text-gray-600">
                          <div className="col-span-2">Description</div>
                          <div>Status</div>
                          <div>Severity</div>
                        </div>
                        {report.issues.map((issue, index) => (
                          <div 
                            key={index} 
                            className="bg-white p-5 rounded-lg border border-gray-100 hover:border-amber-200 transition-colors"
                          >
                            <div className="flex items-start gap-4">
                              <div className="flex-shrink-0">
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                              </div>
                              <div className="flex-1 grid grid-cols-4 gap-6">
                                <div className="col-span-2">
                                  <p className="text-sm text-gray-700">{issue.description}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Identified on: {format(new Date(issue.date_identified), 'MMM d, yyyy')}
                                  </p>
                                </div>
                                <div className="flex items-center">
                                  <span className={`
                                    inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                    ${issue.status === 'resolved' ? 'bg-green-100 text-green-800' : 
                                      issue.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
                                      'bg-gray-100 text-gray-800'}
                                  `}>
                                    {issue.status}
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <span className={`
                                    inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                    ${issue.severity === 'high' ? 'bg-red-100 text-red-800' : 
                                      issue.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                                      'bg-green-100 text-green-800'}
                                  `}>
                                    {issue.severity}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500">No reported issues for the selected week</p>
                      </div>
                    )}
                  </div>

                  {/* Needs Section */}
                  <div className="p-8 border-t border-gray-100">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6">Needs</h3>
                    {report.needs.length > 0 ? (
                      <div className="space-y-6">
                      <div className="grid grid-cols-4 gap-6 px-4 text-sm font-medium text-gray-600">
                        <div className="col-span-2">Description</div>
                        <div>Status</div>
                        <div>Budget</div>
                      </div>
                      <List className="space-y-4">
                        {report.needs.map((need, index) => (
                          <div 
                          key={index} 
                          className="bg-white p-5 rounded-lg border border-gray-100 hover:border-amber-200 transition-colors"
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                              <HandCoinsIcon className="h-5 w-5 text-amber-500" />
                            </div>
                            <div className="flex-1 grid grid-cols-4 gap-6">
                              <div className="col-span-2">
                                <p className="text-sm text-gray-700">{need.description}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Identified on: {format(new Date(need.date_identified), 'MMM d, yyyy')}
                                </p>
                              </div>
                              <div className="flex items-center">
                                <span className={`
                                  inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                  ${need.date_fulfilled && 'Fullfiled' ? 'bg-green-100 text-green-800' : 
                                    need.date_fulfilled == null && 'Not Fulfilled' ? 'bg-blue-100 text-blue-800' : 
                                    'bg-gray-100 text-gray-800'}
                                `}>
                                  {need.date_fulfilled ? 'Fullfiled' : 'Not Fulfilled'}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <span className={`
                                  inline-flex items-center px-2.5 py-0.5 rounded-full text-md font-medium`}>
                                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(need.budget_impact || 0)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        ))}
                      </List>
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500">No reported needs for the selected week</p>
                      </div>
                    )}
              
                  </div>

                  <div className="p-6 border-t border-gray-100">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Comments</h3>
                    {report.needs.length > 0 ? (
                      <List>
                        {report.comments.map((comment, index) => (
                          <ListItem icon={<SpeechIcon className="h-5 w-5 text-blue-500 mt-0.5" />} key={index}>
                            <p className="text-md font-medium text-gray-800">{comment.content}</p>
                            <div className="flex-1 grid grid-cols-2 justify-items-end gap-0">
                              <div className='flex justify-self-end'><p className="text-sm text-gray-600"></p></div>
                              <p className="text-sm text-gray-600"> {users.find(user => user.id == comment.created_by)?.full_name} @ {formatDate(comment.created_at, "do MMMM yyyy h:maa")}</p> 
                            </div>
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <p className="text-gray-500">No comments here</p>
                    )}
                  </div>
              </div>
            </div>)}
            </div>
              <PDFDownloadLink
                document={<ActionReportPDF report={report} />}
                fileName={`${report?.name}-report.pdf`}
                
                className="inline-flex items-center mt-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                {({ blob, url, loading, error }) =>
                  loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Preparing PDF...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download Report
                    </>
                  )
                }
              </PDFDownloadLink>

            </div>
          </div>
          </div>
              
        </DashboardLayout>
      );
    }