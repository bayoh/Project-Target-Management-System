import React from 'react';
import { DndContext, closestCenter, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import type { ReportElement } from '../../../types/reports';
import { DraggableElement } from './DraggableElement';

interface DesignCanvasProps {
  elements: ReportElement[];
  selectedElement: ReportElement | null;
  gridSize: number;
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onElementSelect: (element: ReportElement) => void;
  onElementUpdate: (elementId: string, updates: Partial<ReportElement>) => void;
  onElementRemove: (elementId: string) => void;
  onElementResize: (e: React.MouseEvent, elementId: string) => void;
}

export function DesignCanvas({
  elements,
  selectedElement,
  gridSize,
  onDragStart,
  onDragEnd,
  onElementSelect,
  onElementUpdate,
  onElementRemove,
  onElementResize,
}: DesignCanvasProps) {
  return (
    <div className="flex-1 p-8 bg-white">
      <div className="max-w-4xl mx-auto bg-white shadow-sm border rounded-lg min-h-[1056px] relative">
        <DndContext
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          {elements.map((element) => (
            <DraggableElement
              key={element.id}
              element={element}
              onResize={onElementResize}
              onRemove={onElementRemove}
              isSelected={selectedElement?.id === element.id}
              onSelect={() => onElementSelect(element)}
              updateElement={onElementUpdate}
            />
          ))}

          {/* Grid Lines */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="w-full h-full" style={{
              backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)',
              backgroundSize: `${gridSize}px ${gridSize}px`
            }} />
          </div>
        </DndContext>
      </div>
    </div>
  );
}