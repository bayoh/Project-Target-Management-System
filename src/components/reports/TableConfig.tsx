import React from 'react';
import { TableIcon, GripVertical, Plus, Trash2, Settings } from 'lucide-react';
import type { TableConfig } from '../../types/reports';

interface TableConfigProps {
  config: TableConfig;
  onChange: (config: TableConfig) => void;
}

const DATA_SOURCES = [
  { table: 'interventions', label: 'Interventions' },
  { table: 'actions', label: 'Actions' },
  { table: 'tasks', label: 'Tasks' },
  { table: 'indicators', label: 'Indicators' },
  { table: 'indicator_reports', label: 'Indicator Reports' },
];

const COLUMN_FIELDS = {
  interventions: [
    { field: 'name', label: 'Name' },
    { field: 'description', label: 'Description' },
    { field: 'status', label: 'Status' },
    { field: 'start_date', label: 'Start Date' },
    { field: 'end_date', label: 'End Date' },
    { field: 'budget', label: 'Budget' },
  ],
  actions: [
    { field: 'name', label: 'Name' },
    { field: 'description', label: 'Description' },
    { field: 'status', label: 'Status' },
    { field: 'start_date', label: 'Start Date' },
    { field: 'end_date', label: 'End Date' },
  ],
  tasks: [
    { field: 'title', label: 'Title' },
    { field: 'description', label: 'Description' },
    { field: 'status', label: 'Status' },
    { field: 'due_date', label: 'Due Date' },
  ],
  indicators: [
    { field: 'name', label: 'Name' },
    { field: 'description', label: 'Description' },
    { field: 'type', label: 'Type' },
    { field: 'target_value', label: 'Target Value' },
    { field: 'target_date', label: 'Target Date' },
    { field: 'unit', label: 'Unit' },
  ],
  indicator_reports: [
    { field: 'report_date', label: 'Report Date' },
    { field: 'quantitative_value', label: 'Quantitative Value' },
    { field: 'qualitative_value', label: 'Qualitative Value' },
  ],
};

export function TableConfig({ config, onChange }: TableConfigProps) {
  // Ensure config has required structure
  const safeConfig: TableConfig = {
    dataSource: {
      table: config.dataSource?.table || '',
      columns: config.dataSource?.columns || [],
      pagination: config.dataSource?.pagination || { enabled: false, pageSize: 10 }
    },
    style: config.style || {
      borders: true,
      striped: false,
      hover: true
    }
  };

  const handleDataSourceChange = (table: string) => {
    onChange({
      ...safeConfig,
      dataSource: {
        table,
        columns: [],
        pagination: safeConfig.dataSource.pagination
      }
    });
  };

  const handleColumnChange = (index: number, updates: Partial<TableConfig['dataSource']['columns'][0]>) => {
    const newColumns = [...safeConfig.dataSource.columns];
    newColumns[index] = { ...newColumns[index], ...updates };
    onChange({
      ...safeConfig,
      dataSource: {
        ...safeConfig.dataSource,
        columns: newColumns,
      },
    });
  };

  const addColumn = () => {
    onChange({
      ...safeConfig,
      dataSource: {
        ...safeConfig.dataSource,
        columns: [
          ...safeConfig.dataSource.columns,
          { field: '', header: '', width: 150, align: 'left', format: 'text' },
        ],
      },
    });
  };

  const removeColumn = (index: number) => {
    const newColumns = safeConfig.dataSource.columns.filter((_, i) => i !== index);
    onChange({
      ...safeConfig,
      dataSource: {
        ...safeConfig.dataSource,
        columns: newColumns,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Data Source Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Data Source
        </label>
        <select
          value={safeConfig.dataSource.table}
          onChange={(e) => handleDataSourceChange(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="">Select a data source</option>
          {DATA_SOURCES.map((source) => (
            <option key={source.table} value={source.table}>
              {source.label}
            </option>
          ))}
        </select>
      </div>

      {/* Column Configuration */}
      {safeConfig.dataSource.table && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Columns
            </label>
            <button
              type="button"
              onClick={addColumn}
              className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Column
            </button>
          </div>

          <div className="space-y-3">
            {safeConfig.dataSource.columns.map((column, index) => (
              <div
                key={index}
                className="flex items-center space-x-2 bg-gray-50 p-2 rounded-lg"
              >
                <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                
                <select
                  value={column.field || ''}
                  onChange={(e) => handleColumnChange(index, { 
                    field: e.target.value,
                    header: COLUMN_FIELDS[safeConfig.dataSource.table as keyof typeof COLUMN_FIELDS]
                      .find(f => f.field === e.target.value)?.label || ''
                  })}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">Select field</option>
                  {COLUMN_FIELDS[safeConfig.dataSource.table as keyof typeof COLUMN_FIELDS]?.map((field) => (
                    <option key={field.field} value={field.field}>
                      {field.label}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={column.header || ''}
                  onChange={(e) => handleColumnChange(index, { header: e.target.value })}
                  placeholder="Header"
                  className="w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />

                <select
                  value={column.align || 'left'}
                  onChange={(e) => handleColumnChange(index, { align: e.target.value as any })}
                  className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>

                <select
                  value={column.format || 'text'}
                  onChange={(e) => handleColumnChange(index, { format: e.target.value as any })}
                  className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="text">Text</option>
                  <option value="date">Date</option>
                  <option value="number">Number</option>
                  <option value="currency">Currency</option>
                </select>

                <input
                  type="number"
                  value={column.width || 150}
                  onChange={(e) => handleColumnChange(index, { width: parseInt(e.target.value) })}
                  placeholder="Width"
                  className="w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />

                <button
                  type="button"
                  onClick={() => removeColumn(index)}
                  className="p-1 text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table Style */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Table Style
          </label>
          <Settings className="h-4 w-4 text-gray-400" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={safeConfig.style.borders}
                onChange={(e) => onChange({
                  ...safeConfig,
                  style: {
                    ...safeConfig.style,
                    borders: e.target.checked,
                  },
                })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Show Borders</span>
            </label>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={safeConfig.style.striped}
                onChange={(e) => onChange({
                  ...safeConfig,
                  style: {
                    ...safeConfig.style,
                    striped: e.target.checked,
                  },
                })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Striped Rows</span>
            </label>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={safeConfig.style.hover}
                onChange={(e) => onChange({
                  ...safeConfig,
                  style: {
                    ...safeConfig.style,
                    hover: e.target.checked,
                  },
                })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Hover Effect</span>
            </label>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={safeConfig.dataSource.pagination.enabled}
                onChange={(e) => onChange({
                  ...safeConfig,
                  dataSource: {
                    ...safeConfig.dataSource,
                    pagination: {
                      enabled: e.target.checked,
                      pageSize: safeConfig.dataSource.pagination.pageSize,
                    },
                  },
                })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Enable Pagination</span>
            </label>
          </div>
        </div>

        {safeConfig.dataSource.pagination.enabled && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">
              Rows per page
            </label>
            <select
              value={safeConfig.dataSource.pagination.pageSize}
              onChange={(e) => onChange({
                ...safeConfig,
                dataSource: {
                  ...safeConfig.dataSource,
                  pagination: {
                    ...safeConfig.dataSource.pagination,
                    pageSize: parseInt(e.target.value),
                  },
                },
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}