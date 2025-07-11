import React from 'react';
import { X } from 'lucide-react';
import { Select } from './Select';
import { Input } from './Input'
import type { Action, User, Intervention } from '../../types/project';

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
  const initialFormState = {
    code: '',
    name: '',
    description: '',
    intervention_id: '',
    lead_id: '',
    status: 'not_started',
    start_date: '',
    end_date: '',
    actual_startDate: '',
    actual_endDate: ''
  };

  const [formData, setFormData] = React.useState<Partial<Action>>(
    action || initialFormState
  );

  React.useEffect(() => {
    if (action) {
      setFormData({
        code: action.code || 0,
        name: action.name || '',
        description: action.description || '',
        intervention_id: action.intervention_id || '',
        lead_id: action.lead_id || '',
        status: action.status || 'not_started',
        start_date: action.start_date || null,
        end_date: action.end_date || null,
        actual_startDate: action.actual_startDate || null,
        actual_endDate: action.actual_endDate || null
      });
    } else if (!isOpen) {
      setFormData(initialFormState);
    }
  }, [action, isOpen]);

  const handleClose = () => {
    setFormData(initialFormState);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="relative transform overflow-visible rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 w-full mx-4 max-h-[90vh] flex flex-col">
          <div className="absolute right-0 top-0 pr-4 pt-4">
            <button
              type="button"
              className="rounded-md bg-white text-gray-400 hover:text-gray-500"
              onClick={onClose}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <h3 className="text-lg font-medium leading-6 text-gray-900">{title}</h3>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <Input
                  label='Code'
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value })}
                  required
                  type='text'
                  />
                    {/* <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Code
                    </label>
                    <input
                      type="text"
                      id="code"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    /> */}
                  </div>
                  <div>
                    <Input
                    label='Name'
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value })}
                    required
                    type='text'
                    />
                    {/* <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    /> */}
                  </div>

                  <div>
                    <Input
                    label='Description'
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value })}
                    required
                    type='textarea'
                    
                    />
                    {/* <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      id="description"
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    /> */}
                  </div>
                  <div>
                    <label htmlFor="intervention" className="block text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <Select
                      options={[
                          { value: 'not_started', label: 'Not Started' },
                          { value: 'at_risk', label: 'On Going/Off Track' },
                          { value: 'in_progress', label: 'On Going/On Track' },
                          { value: 'completed', label: 'Completed' }
                        ]}
                      value={formData.status}
                      onChange={(value) => setFormData({ ...formData, status: value })}
                      placeholder="Select Status"
                      allowClear
                      searchable
                      sortable
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
                        Start Date
                      </label>
                      <input
                        type="date"
                        id="start_date"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      />
                    </div>

                    <div>
                      <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
                        End Date
                      </label>
                      <input
                        type="date"
                        id="end_date"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      />
                    </div>
                  </div>

                  {(action || formData.status !== 'not_started') && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="actual_start_date" className="block text-sm font-medium text-gray-700">
                          Actual Start Date
                        </label>
                        <input
                          type="date"
                          id="actual_start_date"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          value={formData.actual_startDate}
                          onChange={(e) => setFormData({ ...formData, actual_startDate: e.target.value })}
                        />
                      </div>

                      <div>
                        <label htmlFor="actual_end_date" className="block text-sm font-medium text-gray-700">
                          Actual End Date
                        </label>
                        <input
                          type="date"
                          id="actual_end_date"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          value={formData.actual_endDate}
                          onChange={(e) => setFormData({ ...formData, actual_endDate: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label htmlFor="intervention" className="block text-sm font-medium text-gray-700">
                      Intervention
                    </label>
                    <Select
                      options={interventions.map((intervention) => ({
                        value: intervention.id,
                        label: intervention.name,
                        prefix: intervention.code
                      }))}
                      value={formData.intervention_id}
                      onChange={(value) => setFormData({ ...formData, intervention_id: value })}
                      placeholder="Select Intervention"
                      allowClear
                      searchable
                      sortable
                    />
                  </div>

                  <div>
                    <label htmlFor="lead" className="block text-sm font-medium text-gray-700">
                      Lead
                    </label>
                    <Select
                      options={users.map((user) => ({
                        value: user.id,
                        label: user.full_name || user.email || ''
                      }))}
                      value={formData.lead_id}
                      onChange={(value) => setFormData({ ...formData, lead_id: value })}
                      placeholder="Select Lead"
                    />
                  </div>
                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                      onClick={onClose}
                    >
                      Cancel
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