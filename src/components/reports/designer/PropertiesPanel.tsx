import React from 'react';
import { Trash2 } from 'lucide-react';
import type { ReportElement } from '../../../types/reports';
import { TableConfig } from '../TableConfig';

interface PropertiesPanelProps {
  element: ReportElement;
  onUpdate: (updates: Partial<ReportElement>) => void;
  onRemove: () => void;
}

export function PropertiesPanel({ element, onUpdate, onRemove }: PropertiesPanelProps) {
  if (!element) return null;

  return (
    <div className="w-64 bg-gray-50 p-4 border-l">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">Properties</h3>
        <button
          onClick={onRemove}
          className="p-1 text-red-500 hover:text-red-700 rounded-md hover:bg-red-50"
          title="Delete element"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {element.type === 'table' ? (
        <TableConfig
          config={element.tableConfig || {
            dataSource: {
              table: '',
              columns: [],
            },
            style: {
              borders: true,
              striped: false,
              hover: true,
            },
          }}
          onChange={(newConfig) => {
            onUpdate({
              tableConfig: newConfig,
              dataMapping: {
                source: 'intervention',
                table: newConfig.dataSource.table,
              },
            });
          }}
        />
      ) : (
        <div className="space-y-4">
          {/* Position and Size Controls */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Position X</label>
            <input
              type="number"
              value={element.style.x}
              onChange={(e) => onUpdate({
                style: { ...element.style, x: parseInt(e.target.value) }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          {/* Additional properties based on element type */}
          {element.type === 'text' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Font Size</label>
                <input
                  type="number"
                  value={element.style.fontSize || 16}
                  onChange={(e) => onUpdate({
                    style: { ...element.style, fontSize: parseInt(e.target.value) }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Color</label>
                <input
                  type="color"
                  value={element.style.color || '#000000'}
                  onChange={(e) => onUpdate({
                    style: { ...element.style, color: e.target.value }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </>
          )}

          {element.type === 'data' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Data Field</label>
              <select
                value={element.dataMapping?.field || ''}
                onChange={(e) => onUpdate({
                  dataMapping: {
                    source: 'intervention',
                    field: e.target.value,
                  }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Select field</option>
                <option value="name">Name</option>
                <option value="description">Description</option>
                <option value="status">Status</option>
                <option value="start_date">Start Date</option>
                <option value="end_date">End Date</option>
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}