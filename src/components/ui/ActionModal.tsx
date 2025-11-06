import React from 'react';
import { X, Building, FolderOpen, Users, DollarSign, Loader2, AlertCircle } from 'lucide-react';
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
    value === 'on_track' ||
    value === 'off_track' ||
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

  const initialFormState: Partial<Action> = React.useMemo(() => ({
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
  }), []);
  

  const [formData, setFormData] = React.useState<Partial<Action>>(
    action || initialFormState
  );

  // Store the initial form state when modal opens or action changes
  const [initialFormStateRef, setInitialFormStateRef] = React.useState<Partial<Action>>(
    action || initialFormState
  );

  // Auto-generate code toggle: when true, the Code field is generated from intervention
  const [autoGenerateCode, setAutoGenerateCode] = React.useState(true);
  // Enhanced useEffect for form data and local state management
  React.useEffect(() => {
    if (action) {
      // Preserve original values exactly as they are (including null/undefined)
      // This ensures accurate comparison for unsaved changes detection
      const actionData: Partial<Action> = {
        code: action.code ?? undefined,
        name: action.name ?? '',
        description: action.description ?? null,
        intervention_id: action.intervention_id ?? '',
        lead_id: action.lead_id ?? null,
        status: (action.status ?? 'not_started') as ProjectStatus,
        start_date: action.start_date ?? null,
        end_date: action.end_date ?? null,
        actual_startDate: action.actual_startDate ?? null,
        actual_endDate: action.actual_endDate ?? null,
        supporting_staff: (action.supporting_staff ?? []) as string[],
        budget: action.budget ?? null,
        associated_projects: (action.associated_projects ?? []) as string[],
        implementing_partners: (action.implementing_partners ?? []) as string[]
      };
      setFormData(actionData);
      
      // Store the initial state for comparison - use a deep copy to prevent reference issues
      setInitialFormStateRef(JSON.parse(JSON.stringify(actionData)));
      
      // Update local state with selected values
      setLocalState(prev => ({
        ...prev,
        selectedAssociatedProjects: actionData.associated_projects ?? [],
        selectedImplementingPartners: actionData.implementing_partners ?? [],
        hasUnsavedChanges: false
      }));
    } else if (!isOpen) {
      setFormData(initialFormState);
      setInitialFormStateRef(initialFormState);
      setLocalState({
        selectedAssociatedProjects: [],
        selectedImplementingPartners: [],
        isSubmitting: false,
        hasUnsavedChanges: false
      });
    } else if (isOpen && !action) {
      // When opening for new action, set initial state
      // Reset form data to initial state
      setFormData(initialFormState);
      setInitialFormStateRef(initialFormState);
      setLocalState(prev => ({
        ...prev,
        hasUnsavedChanges: false
      }));
    }
  }, [action, isOpen, initialFormState]);

  // Track form changes for unsaved changes indicator
  // Only check for changes after the form has been initialized and modal is open
  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    // Skip comparison if initialFormStateRef hasn't been initialized yet
    // This prevents false positives when the form is first loading
    if (!initialFormStateRef || Object.keys(initialFormStateRef).length === 0) {
      return;
    }

    // Helper function to normalize values for comparison
    const normalizeValue = (value: unknown): unknown => {
      if (value === null || value === undefined || value === '') {
        return null;
      }
      if (Array.isArray(value)) {
        return value.length === 0 ? null : [...value].sort();
      }
      // Normalize dates - ensure consistent string format
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        return value.split('T')[0]; // Remove time portion if present
      }
      return value;
    };

    // Helper function to compare form data objects
    const compareFormData = (a: Partial<Action>, b: Partial<Action>): boolean => {
      const fieldsToCompare: (keyof Action)[] = [
        'name',
        'description',
        'intervention_id',
        'lead_id',
        'status',
        'start_date',
        'end_date',
        'actual_startDate',
        'actual_endDate',
        'supporting_staff',
        'budget',
        'associated_projects',
        'implementing_partners'
      ];

      for (const field of fieldsToCompare) {
        const aValue = normalizeValue(a[field]);
        const bValue = normalizeValue(b[field]);
        
        if (JSON.stringify(aValue) !== JSON.stringify(bValue)) {
          return false;
        }
      }

      // For code, only compare if auto-generate is disabled OR if it's an edit (action exists)
      // If auto-generate is enabled and it's a new action, ignore code changes
      if (!autoGenerateCode || action) {
        const aCode = normalizeValue(a.code);
        const bCode = normalizeValue(b.code);
        if (JSON.stringify(aCode) !== JSON.stringify(bCode)) {
          return false;
        }
      }

      return true;
    };

    const hasChanges = !compareFormData(formData, initialFormStateRef);
    
    if (hasChanges !== localState.hasUnsavedChanges) {
      setLocalState(prev => ({ ...prev, hasUnsavedChanges: hasChanges }));
    }
  }, [formData, initialFormStateRef, isOpen, autoGenerateCode, action, localState.hasUnsavedChanges]);

  // Auto-generate action code when intervention changes (and auto-generation is enabled)
  React.useEffect(() => {
    let isCancelled = false;
    let abortController: AbortController | null = null;

    const generateCode = async () => {
      // Early return if auto-generate is disabled
      if (!autoGenerateCode) {
        return;
      }

      // Skip code generation when editing an existing action
      // Only auto-generate for new actions
      if (action) {
        return;
      }

      const interventionId = formData.intervention_id;
      
      // Clear code if no intervention selected
      if (!interventionId) {
        if (!isCancelled) {
          setFormData(prev => ({ ...prev, code: undefined }));
        }
        return;
      }

      // Find selected intervention
      const selectedIntervention = interventions.find(i => i.id === interventionId);
      
      // Validate intervention exists and has a valid code
      if (!selectedIntervention) {
        return;
      }

      // Validate intervention code is valid (not null, undefined, or empty)
      const interventionCode = selectedIntervention.code;
      if (interventionCode === null || interventionCode === undefined) {
        console.warn('Intervention code is null or undefined, cannot generate action code');
        return;
      }

      const interventionCodeStr = String(interventionCode).trim();
      
      // Validate intervention code is not empty after conversion
      if (interventionCodeStr === '' || interventionCodeStr === 'null' || interventionCodeStr === 'undefined') {
        console.warn('Invalid intervention code format, cannot generate action code');
        return;
      }

      // Create abort controller for this request
      abortController = new AbortController();

      try {
        // Query database for latest action code
        const { data: latest, error: latestError } = await supabase
          .from('actions')
          .select('id, code, created_at')
          .eq('intervention_id', interventionId)
          .order('created_at', { ascending: false })
          .limit(1);

        // Check if request was cancelled
        if (isCancelled) {
          return;
        }

        // Handle database errors
        if (latestError) {
          console.error('Error fetching latest action code:', latestError);
          // Fallback to sequence 1 on error
          if (!isCancelled) {
            const fallbackCode = `${interventionCodeStr}.1`;
            setFormData(prev => ({ ...prev, code: fallbackCode }));
            // Update initialFormStateRef for new actions to prevent false unsaved changes
            if (!action) {
              setInitialFormStateRef(prev => ({ ...prev, code: fallbackCode }));
            }
          }
          return;
        }

        // Validate query result
        if (!latest || !Array.isArray(latest) || latest.length === 0) {
          // No existing actions, start with sequence 1
          if (!isCancelled) {
            const generated = `${interventionCodeStr}.1`;
            setFormData(prev => ({ ...prev, code: generated }));
            // Update initialFormStateRef for new actions to prevent false unsaved changes
            if (!action) {
              setInitialFormStateRef(prev => ({ ...prev, code: generated }));
            }
          }
          return;
        }

        const latestAction = latest[0];
        if (!latestAction) {
          // No action found, start with sequence 1
          if (!isCancelled) {
            const generated = `${interventionCodeStr}.1`;
            setFormData(prev => ({ ...prev, code: generated }));
            // Update initialFormStateRef for new actions to prevent false unsaved changes
            if (!action) {
              setInitialFormStateRef(prev => ({ ...prev, code: generated }));
            }
          }
          return;
        }

        // Get and validate latest code
        const latestCode = latestAction.code;
        
        // Handle null, undefined, or empty codes
        if (!latestCode || latestCode === null || latestCode === undefined) {
          if (!isCancelled) {
            const generated = `${interventionCodeStr}.1`;
            setFormData(prev => ({ ...prev, code: generated }));
            // Update initialFormStateRef for new actions to prevent false unsaved changes
            if (!action) {
              setInitialFormStateRef(prev => ({ ...prev, code: generated }));
            }
          }
          return;
        }

        const lastCodeStr = String(latestCode).trim();
        
        // Skip if code is empty or invalid
        if (lastCodeStr === '' || lastCodeStr === 'null' || lastCodeStr === 'undefined') {
          if (!isCancelled) {
            const generated = `${interventionCodeStr}.1`;
            setFormData(prev => ({ ...prev, code: generated }));
            // Update initialFormStateRef for new actions to prevent false unsaved changes
            if (!action) {
              setInitialFormStateRef(prev => ({ ...prev, code: generated }));
            }
          }
          return;
        }

        // Check if code follows expected pattern: {interventionCode}.{sequence}
        const expectedPrefix = `${interventionCodeStr}.`;
        if (!lastCodeStr.startsWith(expectedPrefix)) {
          // Code doesn't match pattern, start fresh with sequence 1
          if (!isCancelled) {
            const generated = `${interventionCodeStr}.1`;
            setFormData(prev => ({ ...prev, code: generated }));
            // Update initialFormStateRef for new actions to prevent false unsaved changes
            if (!action) {
              setInitialFormStateRef(prev => ({ ...prev, code: generated }));
            }
          }
          return;
        }

        // Parse sequence number from code
        const parts = lastCodeStr.split('.');
        if (parts.length < 2) {
          // Invalid format, start fresh
          if (!isCancelled) {
            const generated = `${interventionCodeStr}.1`;
            setFormData(prev => ({ ...prev, code: generated }));
            // Update initialFormStateRef for new actions to prevent false unsaved changes
            if (!action) {
              setInitialFormStateRef(prev => ({ ...prev, code: generated }));
            }
          }
          return;
        }

        const seqStr = parts[parts.length - 1];
        
        // Validate sequence string is not empty
        if (!seqStr || seqStr.trim() === '') {
          if (!isCancelled) {
            const generated = `${interventionCodeStr}.1`;
            setFormData(prev => ({ ...prev, code: generated }));
            // Update initialFormStateRef for new actions to prevent false unsaved changes
            if (!action) {
              setInitialFormStateRef(prev => ({ ...prev, code: generated }));
            }
          }
          return;
        }

        // Parse sequence as integer
        const seq = parseInt(seqStr.trim(), 10);
        
        // Validate sequence is a valid positive integer
        if (Number.isNaN(seq) || seq < 1 || !Number.isInteger(seq)) {
          // Invalid sequence, start fresh
          if (!isCancelled) {
            const generated = `${interventionCodeStr}.1`;
            setFormData(prev => ({ ...prev, code: generated }));
            // Update initialFormStateRef for new actions to prevent false unsaved changes
            if (!action) {
              setInitialFormStateRef(prev => ({ ...prev, code: generated }));
            }
          }
          return;
        }

        // Calculate next sequence (increment by 1)
        const nextSeq = seq + 1;
        
        // Validate next sequence is still a valid positive integer
        if (nextSeq < 1 || !Number.isInteger(nextSeq)) {
          // Overflow or invalid, fallback to 1
          console.warn('Sequence overflow detected, resetting to 1');
          if (!isCancelled) {
            const generated = `${interventionCodeStr}.1`;
            setFormData(prev => ({ ...prev, code: generated }));
            // Update initialFormStateRef for new actions to prevent false unsaved changes
            if (!action) {
              setInitialFormStateRef(prev => ({ ...prev, code: generated }));
            }
          }
          return;
        }

        // Generate new code
        const generated = `${interventionCodeStr}.${nextSeq}`;
        
        // Final validation: ensure generated code is not empty
        if (!generated || generated.trim() === '') {
          console.error('Generated code is empty, this should not happen');
          return;
        }

        // Update form data only if not cancelled
        if (!isCancelled) {
          setFormData(prev => ({ ...prev, code: generated }));
          // Update initialFormStateRef for new actions to prevent false unsaved changes
          if (!action) {
            setInitialFormStateRef(prev => ({ ...prev, code: generated }));
          }
        }
      } catch (err) {
        // Log error for debugging
        console.error('Error generating action code:', err);
        
        // Fallback to sequence 1 on any error
        if (!isCancelled && selectedIntervention) {
          const interventionCode = selectedIntervention.code;
          if (interventionCode !== null && interventionCode !== undefined) {
            const interventionCodeStr = String(interventionCode).trim();
            if (interventionCodeStr && interventionCodeStr !== 'null' && interventionCodeStr !== 'undefined') {
              const fallbackCode = `${interventionCodeStr}.1`;
              setFormData(prev => ({ ...prev, code: fallbackCode }));
              // Update initialFormStateRef for new actions to prevent false unsaved changes
              if (!action) {
                setInitialFormStateRef(prev => ({ ...prev, code: fallbackCode }));
              }
            }
          }
        }
      } finally {
        // Cleanup abort controller
        abortController = null;
      }
    };

    // Execute code generation
    generateCode();

    // Cleanup function to cancel in-flight requests
    return () => {
      isCancelled = true;
      if (abortController) {
        abortController.abort();
      }
    };
  }, [formData.intervention_id, autoGenerateCode, interventions, action]);

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
      // Removed: delete sanitizedFormData.indicators; // property does not exist on Action
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

                    <div className="sm:col-span-6 flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="auto-generate-action-code"
                        checked={autoGenerateCode}
                        onChange={(e) => setAutoGenerateCode(e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                      <label htmlFor="auto-generate-action-code" className="text-xs sm:text-sm font-medium text-gray-700">
                        Auto-generate code from selected intervention
                      </label>
                    </div>
                    
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
                          const numericRegex = /^[\d.\-_]+$/;
                          
                          if (numericRegex.test(value)) {
                            // Valid float format, store as string
                            setFormData({ ...formData, code: value });
                          }
                          // If invalid format, don't update the state (reject the input)
                        }}
                        required
                        type='text'
                        className="text-sm"
                        disabled={autoGenerateCode}
                        placeholder="e.g., 2.12.1"
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
                              { value: 'off_track', label: 'On Going/Off Track' },
                              { value: 'on_track', label: 'On Going/On Track' },
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