import React from 'react';
import { X, Calendar, Building, FolderOpen, Users, Target, DollarSign, FileText, Clock, Loader2, AlertCircle } from 'lucide-react';
import { Select } from './Select';
import { Input } from './Input'
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { executeQuery } from '../../lib/queries';
import type { Action, User, Intervention, ProjectStatus } from '../../types/project';

// Type guard for ProjectStatus
function isProjectStatus(value: string): value is ProjectStatus {
  return (
    value === 'not_started' ||
    value === 'in_progress' ||
    value === 'at_risk' ||
    value === 'completed'
  );
}

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (action: Partial<Action>) => void;
  action?: Partial<Action>;
  users: User[];
  interventions: Intervention[];
  title?: string;
}

export function ActionModal({
  isOpen,
  onClose,
  onSubmit,
  action,
  users,
  interventions,
  title = 'New Action'
}: ActionModalProps) {
  // Local state for managing options and UI states
  const [localState, setLocalState] = React.useState({
    selectedAssociatedProjects: [] as string[],
    selectedImplementingPartners: [] as string[],
    isSubmitting: false,
    hasUnsavedChanges: false
  });

  // Fetch associated projects with enhanced error handling
  const {
    data: associatedProjects = [],
    isLoading: isLoadingProjects,
    error: projectsError,
    refetch: refetchProjects
  } = useQuery({
    queryKey: ['associated_projects'],
    queryFn: async () => {
      try {
        const result = await executeQuery(async () =>
          supabase.from('associated_projects').select('*').order('name')
        );
        return result.data || [];
      } catch (error) {
        console.error('Error fetching associated projects:', error);
        throw error;
      }
    }
  });

  // Fetch implementing partners with enhanced error handling
  const {
    data: implementingPartners = [],
    isLoading: isLoadingPartners,
    error: partnersError,
    refetch: refetchPartners
  } = useQuery({
    queryKey: ['implementing_partners'],
    queryFn: async () => {
      try {
        const result = await executeQuery(async () =>
          supabase.from('implementing_partners').select('*').order('name')
        );
        return result.data || [];
      } catch (error) {
        console.error('Error fetching implementing partners:', error);
        throw error;
      }
    },
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const initialFormState: Partial<Action> = {
    code: '0',
    name: '',
    description: '',
    intervention_id: '',
    lead_id: '',
    status: 'not_started' as ProjectStatus,
    start_date: null,
    end_date: null,
    actual_startDate: null,
    actual_endDate: null,
    supporting_staff: [] as string[],
    budget: 0,
    associated_projects: [] as string[],
    implementing_partners: [] as string[]
  };
  

  const [formData, setFormData] = React.useState<Partial<Action>>(
    action || initialFormState
  );

  // Enhanced useEffect for form data and local state management
  React.useEffect(() => {
    if (action) {
      const actionData: Partial<Action> = {
        code: action.code ?? '0',
        name: action.name ?? '',
        description: action.description ?? '',
        intervention_id: action.intervention_id ?? '',
        lead_id: action.lead_id ?? '',
        status: (action.status ?? 'not_started') as ProjectStatus,
        start_date: action.start_date ?? null,
        end_date: action.end_date ?? null,
        actual_startDate: action.actual_startDate ?? null,
        actual_endDate: action.actual_endDate ?? null,
        supporting_staff: (action.supporting_staff ?? []) as string[],
        budget: action.budget ?? 0,
        associated_projects: (action.associated_projects ?? []) as string[],
        implementing_partners: (action.implementing_partners ?? []) as string[]
      };
      setFormData(actionData);
      
      // Update local state with selected values
      setLocalState(prev => ({
        ...prev,
        selectedAssociatedProjects: actionData.associated_projects ?? [],
        selectedImplementingPartners: actionData.implementing_partners ?? [],
        hasUnsavedChanges: false
      }));
    } else if (!isOpen) {
      setFormData(initialFormState);
      setLocalState({
        selectedAssociatedProjects: [],
        selectedImplementingPartners: [],
        isSubmitting: false,
        hasUnsavedChanges: false
      });
    }
  }, [action, isOpen]);

  // Track form changes for unsaved changes indicator
  React.useEffect(() => {
    if (isOpen && !localState.hasUnsavedChanges) {
      const hasChanges = JSON.stringify(formData) !== JSON.stringify(action || initialFormState);
      if (hasChanges) {
        setLocalState(prev => ({ ...prev, hasUnsavedChanges: true }));
      }
    }
  }, [formData, action, isOpen, localState.hasUnsavedChanges]);

  // Enhanced handlers with local state management
  const handleClose = () => {
    if (localState.hasUnsavedChanges) {
      const confirmClose = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmClose) return;
    }
    
    setFormData(initialFormState);
    setLocalState({
      selectedAssociatedProjects: [],
      selectedImplementingPartners: [],
      isSubmitting: false,
      hasUnsavedChanges: false
    });
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLocalState(prev => ({ ...prev, isSubmitting: true }));
    
    try {
      // Ensure selected values are properly synced with form data
      const finalFormData = {
        ...formData,
        associated_projects: localState.selectedAssociatedProjects,
        implementing_partners: localState.selectedImplementingPartners
      };
      
      // Sanitize payload by removing comments, needs, issues, tasks, and indicators
      const sanitizedFormData = { ...finalFormData };
      delete sanitizedFormData.comments;
      delete sanitizedFormData.needs;
      delete sanitizedFormData.issues;
      delete sanitizedFormData.tasks;
      delete sanitizedFormData.indicators;
      console.log(sanitizedFormData)
      
      await onSubmit(sanitizedFormData);
      
      // Reset local state on successful submission
      setLocalState({
        selectedAssociatedProjects: [],
        selectedImplementingPartners: [],
        isSubmitting: false,
        hasUnsavedChanges: false
      });
    } catch (error) {
      console.error('Error submitting action:', error);
      setLocalState(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  // Helper functions for managing selections
  const handleAssociatedProjectsChange = (selectedValues: string[]) => {
    setLocalState(prev => ({
      ...prev,
      selectedAssociatedProjects: selectedValues,
      hasUnsavedChanges: true
    }));
    setFormData(prev => ({ ...prev, associated_projects: selectedValues }));
  };

  const handleImplementingPartnersChange = (selectedValues: string[]) => {
    setLocalState(prev => ({
      ...prev,
      selectedImplementingPartners: selectedValues,
      hasUnsavedChanges: true
    }));
    setFormData(prev => ({ ...prev, implementing_partners: selectedValues }));
  };

  // Error retry handlers
  const handleRetryProjects = () => {
    refetchProjects();
  };

  const handleRetryPartners = () => {
    refetchPartners();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="relative transform overflow-visible rounded-xl bg-white/95 backdrop-blur-sm px-3 pb-3 pt-4 text-left shadow-2xl transition-all sm:my-4 sm:w-full sm:max-w-2xl sm:p-5 w-full mx-2 max-h-[95vh] flex flex-col border border-gray-200/50">
          <div className="absolute right-0 top-0 pr-3 pt-3">
            <button
              type="button"
              className="rounded-full bg-gray-100 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FolderOpen className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Basic Information */}
                  <div className="bg-gray-50/50 rounded-lg p-3 space-y-3">
                    <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                      Basic Information
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label='Code'
                        value={formData.code !== undefined ? String(formData.code) : ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          
                          // Allow empty string
                          if (value === '') {
                            setFormData({ ...formData, code: undefined });
                            return;
                          }
                          
                          // Validate format: digits, periods, and common symbols
                          const numericRegex = /^[\d\.\-_]+$/;
                          
                          if (numericRegex.test(value)) {
                            // Valid float format, store as string
                            setFormData({ ...formData, code: value });
                          }
                          // If invalid format, don't update the state (reject the input)
                        }}
                        required
                        type='text'
                        className="text-sm"
                      />
                      <Input
                        label='Name'
                        value={formData.name ?? ''}
                        onChange={(e) => setFormData({...formData, name: e.target.value })}
                        required
                        type='text'
                        className="text-sm"
                      />
                    </div>

                    <Input
                      label='Description'
                      value={formData.description ?? ''}
                      onChange={(e) => setFormData({...formData, description: e.target.value })}
                      required
                      type='textarea'
                      className="text-sm"
                    />
                  </div>
                  {/* Status & Assignment */}
                  <div className="bg-gray-50/50 rounded-lg p-3 space-y-3">
                    <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <div className="w-1 h-4 bg-green-500 rounded-full"></div>
                      Status & Assignment
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Status
                        </label>
                        <Select
                          options={[
                              { value: 'not_started', label: 'Not Started' },
                              { value: 'at_risk', label: 'On Going/Off Track' },
                              { value: 'in_progress', label: 'On Going/On Track' },
                              { value: 'completed', label: 'Completed' }
                            ]}
                          value={formData.status as string}
                          onChange={(value) => {
                            const v = Array.isArray(value) ? value[0] : value;
                            if (v === '') {
                              // If cleared, unset the status for Partial<Action>
                              setFormData({ ...formData, status: undefined });
                            } else if (isProjectStatus(v)) {
                              setFormData({ ...formData, status: v });
                            }
                          }}
                          placeholder="Select Status"
                          allowClear={false}
                          searchable
                          sortable
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Lead
                        </label>
                        <Select
                          options={users.map((user) => ({
                            value: user.id,
                            label: user.full_name || user.email || ''
                          }))}
                          value={formData.lead_id ?? ''}
                          onChange={(value) => {
                            const v = Array.isArray(value) ? value[0] : value;
                            setFormData({ ...formData, lead_id: v });
                          }}
                          placeholder="Select Lead"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Intervention
                      </label>
                      <Select
                        options={interventions.map((intervention) => ({
                          value: intervention.id,
                          label: intervention.name,
                          prefix: String(intervention.code)
                        }))}
                        value={formData.intervention_id ?? ''}
                        onChange={(value) => {
                          const v = Array.isArray(value) ? value[0] : value;
                          setFormData({ ...formData, intervention_id: v });
                        }}
                        placeholder="Select Intervention"
                        allowClear
                        searchable
                        sortable
                      />
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="bg-gray-50/50 rounded-lg p-3 space-y-3">
                    <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                      Timeline
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="start_date" className="block text-xs font-medium text-gray-600 mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          id="start_date"
                          className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm transition-colors"
                          value={formData.start_date ?? ''}
                          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        />
                      </div>

                      <div>
                        <label htmlFor="end_date" className="block text-xs font-medium text-gray-600 mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          id="end_date"
                          className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm transition-colors"
                          value={formData.end_date ?? ''}
                          onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        />
                      </div>
                    </div>

                    {(action || formData.status !== 'not_started') && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                        <div>
                          <label htmlFor="actual_start_date" className="block text-xs font-medium text-gray-600 mb-1">
                            Actual Start Date
                          </label>
                          <input
                            type="date"
                            id="actual_start_date"
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm transition-colors"
                            value={formData.actual_startDate ?? ''}
                            onChange={(e) => setFormData({ ...formData, actual_startDate: e.target.value })}
                          />
                        </div>

                        <div>
                          <label htmlFor="actual_end_date" className="block text-xs font-medium text-gray-600 mb-1">
                            Actual End Date
                          </label>
                          <input
                            type="date"
                            id="actual_end_date"
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm transition-colors"
                            value={formData.actual_endDate ?? ''}
                            onChange={(e) => setFormData({ ...formData, actual_endDate: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Budget & Resources */}
                  <div className="bg-gray-50/50 rounded-lg p-3 space-y-3">
                    <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <div className="w-1 h-4 bg-orange-500 rounded-full"></div>
                      Budget & Resources
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Budget
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm transition-colors"
                          value={formData.budget ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const parsed = val === '' ? null : parseFloat(val);
                            setFormData({ ...formData, budget: parsed === null || Number.isNaN(parsed) ? null : parsed });
                          }}
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Supporting Staff
                        </label>
                        <Select
                          options={users.map((user) => ({
                            value: user.id,
                            label: user.full_name || user.email || ''
                          }))}
                          value={formData.supporting_staff ?? []}
                          onChange={(value) => {
                            const v = Array.isArray(value) ? value : [value];
                            setFormData({ ...formData, supporting_staff: v });
                          }}
                          placeholder="Select Supporting Staff"
                          multiple
                          searchable
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          Implementing Partners
                          {isLoadingPartners && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                        </label>
                        {partnersError ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                              <AlertCircle className="h-4 w-4 text-red-500" />
                              <span className="text-xs text-red-600">Failed to load partners</span>
                              <button
                                type="button"
                                onClick={handleRetryPartners}
                                className="text-xs text-red-600 hover:text-red-800 underline"
                              >
                                Retry
                              </button>
                            </div>
                          </div>
                        ) : (
                          <Select
                            options={implementingPartners.map((partner) => ({
                              value: partner.id,
                              label: partner.name
                            }))}
                            value={localState.selectedImplementingPartners}
                            onChange={(value) => {
                              const v = Array.isArray(value) ? value : [value];
                              handleImplementingPartnersChange(v);
                            }}
                            placeholder={isLoadingPartners ? "Loading partners..." : "Select Implementing Partners"}
                            multiple
                            searchable
                            disabled={isLoadingPartners}
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                          <FolderOpen className="h-3 w-3" />
                          Associated Projects
                          {isLoadingProjects && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                        </label>
                        {projectsError ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                              <AlertCircle className="h-4 w-4 text-red-500" />
                              <span className="text-xs text-red-600">Failed to load projects</span>
                              <button
                                type="button"
                                onClick={handleRetryProjects}
                                className="text-xs text-red-600 hover:text-red-800 underline"
                              >
                                Retry
                              </button>
                            </div>
                          </div>
                        ) : (
                          <Select
                            options={associatedProjects.map((project) => ({
                              value: project.id,
                              label: project.name
                            }))}
                            value={localState.selectedAssociatedProjects}
                            onChange={(value) => {
                              const v = Array.isArray(value) ? value : [value];
                              handleAssociatedProjectsChange(v);
                            }}
                            placeholder={isLoadingProjects ? "Loading projects..." : "Select Associated Projects"}
                            multiple
                            searchable
                            disabled={isLoadingProjects}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Action Buttons */}
                  <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4 border-t border-gray-200">
                    {localState.hasUnsavedChanges && (
                      <div className="flex items-center gap-1 text-xs text-amber-600 mb-2 sm:mb-0">
                        <AlertCircle className="h-3 w-3" />
                        <span>You have unsaved changes</span>
                      </div>
                    )}
                    <button
                      type="button"
                      className="flex-1 sm:flex-none inline-flex justify-center items-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleClose}
                      disabled={localState.isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 sm:flex-none inline-flex justify-center items-center rounded-lg border border-transparent bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={localState.isSubmitting || isLoadingProjects || isLoadingPartners}
                    >
                      {localState.isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Saving...
                        </>
                      ) : (
                        'Save Action'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}