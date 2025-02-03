import React from 'react';
import { Type, Image, Table, BarChart, Clock, Database, Eye } from 'lucide-react';

const ELEMENT_TYPES = [
  { type: 'text', icon: Type, label: 'Text' },
  { type: 'image', icon: Image, label: 'Image' },
  { type: 'table', icon: Table, label: 'Table' },
  { type: 'chart', icon: BarChart, label: 'Chart' },
  { type: 'status', icon: Clock, label: 'Status' },
  { type: 'data', icon: Database, label: 'Data Field' },
];

interface ElementToolboxProps {
  onAddElement: (type: string) => void;
  onShowPreview: () => void;
}

export function ElementToolbox({ onAddElement, onShowPreview }: ElementToolboxProps) {
  return (
    <div className="w-64 bg-gray-50 p-4 border-r">
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-4">Elements</h3>
          <div className="grid grid-cols-2 gap-2">
            {ELEMENT_TYPES.map((elementType) => (
              <button
                key={elementType.type}
                onClick={() => onAddElement(elementType.type)}
                className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-100"
              >
                <elementType.icon className="h-6 w-6 mb-2" />
                <span className="text-sm">{elementType.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-4">Preview</h3>
          <button
            onClick={onShowPreview}
            className="w-full flex items-center justify-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Eye className="h-4 w-4 mr-2" />
            Show Preview
          </button>
        </div>
      </div>
    </div>
  );
}