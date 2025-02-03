import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Database, Activity, TableIcon, X, GripVertical, Maximize as ArrowsMaximize, Trash2 } from 'lucide-react';
import type { ReportElement } from '../../../types/reports';

interface DraggableElementProps {
  element: ReportElement;
  onResize: (e: React.MouseEvent, id: string) => void;
  onRemove: (id: string) => void;
  isSelected: boolean;
  onSelect: () => void;
  updateElement: (id: string, updates: Partial<ReportElement>) => void;
}

export function DraggableElement({ 
  element, 
  onResize, 
  onRemove, 
  isSelected, 
  onSelect, 
  updateElement 
}: DraggableElementProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: element.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const renderElementContent = () => {
    switch (element.type) {
      case 'text':
        return (
          <div className="w-full h-full">
            <textarea
              value={element.content}
              onChange={(e) =>
                updateElement(element.id, { content: e.target.value })
              }
              className="w-full h-full resize-none border-none focus:ring-0"
              style={{
                fontSize: element.style.fontSize,
                fontWeight: element.style.fontWeight,
                color: element.style.color,
              }}
            />
          </div>
        );

      case 'data':
        return (
          <div className="flex items-center justify-center h-full border-2 border-dashed border-gray-300 rounded">
            <Database className="h-6 w-6 text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">
              {element.dataMapping?.field || 'Select data field'}
            </span>
          </div>
        );

      case 'chart':
        return (
          <div className="flex items-center justify-center h-full border-2 border-dashed border-gray-300 rounded">
            <Activity className="h-6 w-6 text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">
              {element.chartConfig?.type || 'Configure chart'}
            </span>
          </div>
        );

      case 'table':
        return (
          <div className="flex items-center justify-center h-full border-2 border-dashed border-gray-300 rounded">
            <TableIcon className="h-6 w-6 text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">
              {element.dataMapping?.table || 'Select data table'}
            </span>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`absolute p-2 border rounded group ${
        isSelected ? 'border-blue-500' : 'border-gray-200'
      }`}
      style={{
        ...style,
        left: element.style.x,
        top: element.style.y,
        width: element.style.width,
        height: element.style.height,
        touchAction: 'none',
      }}
      onClick={onSelect}
    >
      {/* Drag Handle */}
      <div 
        className="absolute top-0 left-0 p-1 opacity-0 group-hover:opacity-100 bg-white border border-gray-200 rounded-bl cursor-move"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>

      {/* Delete Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(element.id);
        }}
        className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 bg-white border border-gray-200 rounded-bl text-red-500 hover:text-red-700"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {/* Resize Handle */}
      <div
        className="absolute bottom-0 right-0 p-1 opacity-0 group-hover:opacity-100 cursor-se-resize bg-white border border-gray-200 rounded-tl"
        onMouseDown={(e) => onResize(e, element.id)}
      >
        <ArrowsMaximize className="h-4 w-4 text-gray-400" />
      </div>

      {renderElementContent()}
    </div>
  );
}