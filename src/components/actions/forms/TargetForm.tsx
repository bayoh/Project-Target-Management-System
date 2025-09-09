import React, { useState, useEffect } from 'react';
import { AlertCircle, Target, TrendingUp, Users, Briefcase } from 'lucide-react';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Button } from '../../ui/button';
import { toast } from 'react-hot-toast';

interface TargetFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  target?: {
    description: string;
    metric: string;
    baseline_value: number;
    target_value: number;
    current_value: number;
    category?: string;
    women_target?: number;
    women_current?: number;
    youth_target?: number;
    youth_current?: number;
    job_subcategory?: string;
  };
}

interface ValidationErrors {
  baseline_value?: string;
  target_value?: string;
  current_value?: string;
  women_target?: string;
  women_current?: string;
  youth_target?: string;
  youth_current?: string;
  job_subcategory?: string;
  general?: string;
}

export function TargetForm({ onSubmit, onCancel, target }: TargetFormProps) {
  const [formData, setFormData] = useState({
    description: target?.description || '',
    metric: target?.metric || (target?.category === 'jobs' ? 'Number of Jobs' : ''),
    baseline_value: target?.baseline_value?.toString() || '',
    target_value: target?.target_value?.toString() || '',
    current_value: target?.current_value?.toString() || '',
    category: target?.category || '',
    women_target: target?.women_target?.toString() || '',
    women_current: target?.women_current?.toString() || '',
    youth_target: target?.youth_target?.toString() || '',
    youth_current: target?.youth_current?.toString() || '',
    job_subcategory: target?.job_subcategory || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isFormValid, setIsFormValid] = useState(false);

  // Validation functions
  const validateNumber = (value: string, fieldName: string): string | null => {
    if (value === '') return null; // Allow empty values
    const num = parseFloat(value);
    if (isNaN(num)) {
      return `${fieldName} must be a valid number`;
    }
    if (num < 0) {
      return `${fieldName} cannot be negative`;
    }
    return null;
  };

  const validateTargetConstraints = (): ValidationErrors => {
    const errors: ValidationErrors = {};
    
    // Parse numerical values
    const baseline = parseFloat(formData.baseline_value) || 0;
    const target = parseFloat(formData.target_value) || 0;
    const current = parseFloat(formData.current_value) || 0;
    const womenTarget = parseFloat(formData.women_target) || 0;
    const womenCurrent = parseFloat(formData.women_current) || 0;
    const youthTarget = parseFloat(formData.youth_target) || 0;
    const youthCurrent = parseFloat(formData.youth_current) || 0;

    // Validate individual numbers
    const baselineError = validateNumber(formData.baseline_value, 'Baseline value');
    if (baselineError) errors.baseline_value = baselineError;

    const targetError = validateNumber(formData.target_value, 'Target value');
    if (targetError) errors.target_value = targetError;

    const currentError = validateNumber(formData.current_value, 'Current value');
    if (currentError) errors.current_value = currentError;

    // Validate target > baseline
    if (formData.target_value && formData.baseline_value && !targetError && !baselineError) {
      if (target <= baseline) {
        errors.target_value = 'Target value must be greater than baseline value';
      }
    }

    // Validate current <= target
    if (formData.current_value && formData.target_value && !currentError && !targetError) {
      if (current > target) {
        errors.current_value = 'Current value cannot exceed target value';
      }
    }

    // Job-specific validations
    if (formData.category === 'jobs') {
      // Women's target validation
      const womenTargetError = validateNumber(formData.women_target, "Women's target");
      if (womenTargetError) {
        errors.women_target = womenTargetError;
      } else if (formData.women_target && formData.target_value && !targetError) {
        if (womenTarget > target) {
          errors.women_target = "Women's target cannot exceed main target value";
        }
      }

      // Women's current validation
      const womenCurrentError = validateNumber(formData.women_current, "Women's current");
      if (womenCurrentError) {
        errors.women_current = womenCurrentError;
      } else if (formData.women_current && formData.women_target && !womenTargetError) {
        if (womenCurrent > womenTarget) {
          errors.women_current = "Women's current cannot exceed women's target";
        }
        if (womenCurrent > current) {
          errors.women_current = 'Current women jobs cannot exceed total current jobs';
        }
      }

      // Youth target validation
      const youthTargetError = validateNumber(formData.youth_target, 'Youth target');
      if (youthTargetError) {
        errors.youth_target = youthTargetError;
      } else if (formData.youth_target && formData.target_value && !targetError) {
        if (youthTarget > target) {
          errors.youth_target = 'Youth target cannot exceed main target value';
        }

      }

      // Youth current validation
      const youthCurrentError = validateNumber(formData.youth_current, 'Youth current');
      if (youthCurrentError) {
        errors.youth_current = youthCurrentError;
      } else if (formData.youth_current && formData.youth_target && !youthTargetError) {
        if (youthCurrent > youthTarget) {
          errors.youth_current = 'Youth current cannot exceed youth target';
        }
        if (youthCurrent > current) {
          errors.youth_current = 'Current youth jobs cannot exceed total current jobs';
        }
      }

      // Validate sum constraints for job targets
      if (formData.women_target && formData.youth_target && formData.target_value && 
          !womenTargetError && !youthTargetError && !targetError) {
        if (womenTarget + youthTarget > target) {
          errors.general = 'Combined women and youth targets cannot exceed main target value';
        }
      }

      // Validate sum constraints for job current values
      if (formData.women_current && formData.youth_current && formData.current_value && 
          !womenCurrentError && !youthCurrentError && !currentError) {
        if (womenCurrent > current) {
          errors.general = 'Current women jobs cannot exceed total current jobs';
        }

        if (youthCurrent > current) {
          errors.general = 'Current youth jobs cannot exceed total current jobs';
        }
      }

      // Validate job_subcategory is required for jobs
      if (!formData.job_subcategory) {
        errors.job_subcategory = 'Job type is required when category is jobs';
      }
    }

    return errors;
  };

  // Effect to set default metric when category changes to jobs
  useEffect(() => {
    if (formData.category === 'jobs' && !formData.metric) {
      setFormData(prev => ({ ...prev, metric: 'Number of Jobs' }));
    }
  }, [formData.category]);

  // Real-time validation effect
  useEffect(() => {
    const errors = validateTargetConstraints();
    setValidationErrors(errors);
    
    // Check if form is valid (no errors and required fields filled)
    const hasErrors = Object.keys(errors).length > 0;
    const requiredFieldsFilled = formData.description && formData.metric && 
                                formData.baseline_value && formData.target_value && 
                                formData.category &&
                                (formData.category !== 'jobs' || formData.job_subcategory);
    
    setIsFormValid(!hasErrors && requiredFieldsFilled);
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate form before submission
    const errors = validateTargetConstraints();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error('Please fix validation errors before submitting');
      return;
    }

    // Check required fields
    if (!formData.description || !formData.metric || !formData.baseline_value || 
        !formData.target_value || !formData.category ||
        (formData.category === 'jobs' && !formData.job_subcategory)) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      // Parse numerical values
      const targetData = {
        ...formData,
        baseline_value: parseFloat(formData.baseline_value) || 0,
        target_value: parseFloat(formData.target_value) || 0,
        current_value: parseFloat(formData.current_value) || 0,
        women_target: formData.women_target ? parseFloat(formData.women_target) : null,
        women_current: formData.women_current ? parseFloat(formData.women_current) : null,
        youth_target: formData.youth_target ? parseFloat(formData.youth_target) : null,
        youth_current: formData.youth_current ? parseFloat(formData.youth_current) : null,
        job_subcategory: formData.job_subcategory
      };

      await onSubmit(targetData);
      toast.success('Target saved successfully');
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Error display component
  const ErrorMessage = ({ error }: { error?: string }) => {
    if (!error) return null;
    return (
      <div className="flex items-center gap-1 text-red-600 text-sm mt-1">
        <AlertCircle className="h-4 w-4" />
        <span>{error}</span>
      </div>
    );
  };

  // const isJobTarget = formData.category === 'jobs';

  // const categoryOptions = [
  //   { value: '', label: 'Select a category' },
  //   { value: 'jobs', label: 'Jobs' },
  //   { value: 'other', label: 'Others' },
  // ];

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="flex items-start gap-3">
            <div className="p-1 bg-red-100 dark:bg-red-900/30 rounded">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        </div>
      )}

      {validationErrors.general && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <ErrorMessage error={validationErrors.general} />
        </div>
      )}

    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6 p-1 md:p-0">

      <div className="space-y-2">
        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
          <Briefcase className="inline h-4 w-4 mr-1" />
          Category *
        </label>
        <Select
          options={[
            { value: 'jobs', label: 'Jobs' },
            { value: 'infrastructure', label: 'Infrastructure' },
            { value: 'health_wellness', label: 'Health and Wellness' },
            { value: 'education_skills', label: 'Education and Skills' },
            { value: 'resource_mobilization', label: 'Resource mobilization' },
            { value: 'other', label: 'Other' }
          ]}
          value={formData.category}
          onChange={(value) => setFormData({ ...formData, category: value as any })}
          placeholder="Select a category"
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          <Target className="inline h-4 w-4 mr-1" />
          Description *
        </label>
        <Input
          id="description"
          type="text"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe the target..."
          required
          className="h-10"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="metric" className="block text-sm font-medium text-gray-700">
          <TrendingUp className="inline h-4 w-4 mr-1" />
          Metric *
        </label>
        <Input
          id="metric"
          type="text"
          value={formData.metric}
          onChange={(e) => setFormData({ ...formData, metric: e.target.value })}
          placeholder="e.g., Number of jobs created"
          required
          className="h-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label htmlFor="baseline_value" className="block text-sm font-medium text-gray-700">
            Baseline Value *
          </label>
          <Input
            id="baseline_value"
            type="number"
            value={formData.baseline_value}
            onChange={(e) => setFormData({ ...formData, baseline_value: e.target.value })}
            placeholder="0"
            required
            className={`h-10 ${validationErrors.baseline_value ? 'border-red-500 focus:border-red-500' : ''}`}
          />
          <ErrorMessage error={validationErrors.baseline_value} />
        </div>

        <div className="space-y-2">
          <label htmlFor="target_value" className="block text-sm font-medium text-gray-700">
            <Target className="inline h-4 w-4 mr-1 text-green-500" />
            Target Value *
          </label>
          <Input
            id="target_value"
            type="number"
            value={formData.target_value}
            onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
            placeholder="100"
            required
            className={`h-10 ${validationErrors.target_value ? 'border-red-500 focus:border-red-500' : ''}`}
          />
          <ErrorMessage error={validationErrors.target_value} />
        </div>

        <div className="space-y-2">
          <label htmlFor="current_value" className="block text-sm font-medium text-gray-700">
            <TrendingUp className="inline h-4 w-4 mr-1 text-blue-500" />
            Current Value
          </label>
          <Input
            id="current_value"
            type="number"
            value={formData.current_value}
            onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
            placeholder="50"
            className={`h-10 ${validationErrors.current_value ? 'border-red-500 focus:border-red-500' : ''}`}
          />
          <ErrorMessage error={validationErrors.current_value} />
        </div>
      </div>

      {formData.category === 'jobs' && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-600" />
              Job Target Details
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="job_subcategory" className="block text-sm font-medium text-gray-700">
                  Job Type *
                </label>
                <Select
                  options={[
                    { value: 'direct', label: 'Direct' },
                    { value: 'indirect', label: 'Indirect' }
                  ]}
                  value={formData.job_subcategory}
                  onChange={(value) => setFormData({ ...formData, job_subcategory: value as string })}
                  placeholder="Select job type"
                  className={`w-full ${validationErrors.job_subcategory ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                <ErrorMessage error={validationErrors.job_subcategory} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="women_target" className="block text-sm font-medium text-gray-700">
                    <Users className="inline h-4 w-4 mr-1 text-pink-500" />
                    Women's Target Jobs
                  </label>
                  <Input
                    id="women_target"
                    type="number"
                    value={formData.women_target}
                    onChange={(e) => setFormData({ ...formData, women_target: e.target.value })}
                    placeholder="0"
                    className={`h-10 ${validationErrors.women_target ? 'border-red-500 focus:border-red-500' : ''}`}
                  />
                  <ErrorMessage error={validationErrors.women_target} />
                </div>

                <div className="space-y-2">
                  <label htmlFor="women_current" className="block text-sm font-medium text-gray-700">
                    <Users className="inline h-4 w-4 mr-1 text-pink-500" />
                    Women's Current Jobs
                  </label>
                  <Input
                    id="women_current"
                    type="number"
                    value={formData.women_current}
                    onChange={(e) => setFormData({ ...formData, women_current: e.target.value })}
                    placeholder="0"
                    className={`h-10 ${validationErrors.women_current ? 'border-red-500 focus:border-red-500' : ''}`}
                  />
                  <ErrorMessage error={validationErrors.women_current} />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="youth_target" className="block text-sm font-medium text-gray-700">
                    <Users className="inline h-4 w-4 mr-1 text-purple-500" />
                    Youth Target Jobs
                  </label>
                  <Input
                    id="youth_target"
                    type="number"
                    value={formData.youth_target}
                    onChange={(e) => setFormData({ ...formData, youth_target: e.target.value })}
                    placeholder="0"
                    className={`h-10 ${validationErrors.youth_target ? 'border-red-500 focus:border-red-500' : ''}`}
                  />
                  <ErrorMessage error={validationErrors.youth_target} />
                </div>

                <div className="space-y-2">
                  <label htmlFor="youth_current" className="block text-sm font-medium text-gray-700">
                    <Users className="inline h-4 w-4 mr-1 text-purple-500" />
                    Youth Current Jobs
                  </label>
                  <Input
                    id="youth_current"
                    type="number"
                    value={formData.youth_current}
                    onChange={(e) => setFormData({ ...formData, youth_current: e.target.value })}
                    placeholder="0"
                    className={`h-10 ${validationErrors.youth_current ? 'border-red-500 focus:border-red-500' : ''}`}
                  />
                  <ErrorMessage error={validationErrors.youth_current} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        <Button type="button" variant="outline" onClick={onCancel} className="sm:w-auto w-full">
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={loading || !isFormValid} 
          className="sm:w-auto w-full"
        >
          {loading ? 'Saving...' : 'Save Target'}
        </Button>
      </div>
    </form>
    </div>
  );
}