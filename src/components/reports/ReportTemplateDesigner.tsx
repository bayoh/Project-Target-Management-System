import React, { useState, useEffect } from 'react';
import { MouseSensor, TouchSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import type { ReportTemplate, ReportElement } from '../../types/reports';
import { ElementToolbox } from './designer/ElementToolbox';
import { DesignCanvas } from './designer/DesignCanvas';
import { PropertiesPanel } from './designer/PropertiesPanel';
import { PreviewModal } from './designer/PreviewModal';

const GRID_SIZE = 8;

interface Props {
  template: ReportTemplate;
  onChange: (template: ReportTemplate) => void;
}

export function ReportTemplateDesigner({ template, onChange }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<ReportElement | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 10 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    if (!active) return;

    const elementId = active.id as string;
    const element = template.layout.sections[0].elements.find(e => e.id === elementId);
    
    if (element) {
      const newX = Math.round((element.style.x + delta.x) / GRID_SIZE) * GRID_SIZE;
      const newY = Math.round((element.style.y + delta.y) / GRID_SIZE) * GRID_SIZE;

      updateElement(elementId, {
        style: {
          ...element.style,
          x: newX,
          y: newY,
        }
      });
    }

    setActiveId(null);
  };

  const handleResizeStart = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({ x: e.clientX, y: e.clientY });
    setSelectedElement(template.layout.sections[0].elements.find(el => el.id === elementId) || null);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing || !selectedElement) return;

    const deltaX = e.clientX - resizeStart.x;
    const deltaY = e.clientY - resizeStart.y;

    const newWidth = Math.max(50, Math.round((selectedElement.style.width + deltaX) / GRID_SIZE) * GRID_SIZE);
    const newHeight = Math.max(50, Math.round((selectedElement.style.height + deltaY) / GRID_SIZE) * GRID_SIZE);

    updateElement(selectedElement.id, {
      style: {
        ...selectedElement.style,
        width: newWidth,
        height: newHeight,
      }
    });

    setResizeStart({ x: e.clientX, y: e.clientY });
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, selectedElement]);

  const addElement = (type: string) => {
    const newElement: ReportElement = {
      id: crypto.randomUUID(),
      type: type as ReportElement['type'],
      content: '',
      style: {
        x: 0,
        y: 0,
        width: type === 'table' ? 600 : 200,
        height: type === 'table' ? 300 : 100,
      },
    };

    onChange({
      ...template,
      layout: {
        ...template.layout,
        sections: [
          {
            ...template.layout.sections[0],
            elements: [...template.layout.sections[0].elements, newElement],
          },
          ...template.layout.sections.slice(1),
        ],
      },
    });
  };

  const updateElement = (elementId: string, updates: Partial<ReportElement>) => {
    const newElements = template.layout.sections[0].elements.map((element) =>
      element.id === elementId ? { ...element, ...updates } : element
    );

    onChange({
      ...template,
      layout: {
        ...template.layout,
        sections: [
          {
            ...template.layout.sections[0],
            elements: newElements,
          },
          ...template.layout.sections.slice(1),
        ],
      },
    });
  };

  const removeElement = (elementId: string) => {
    if (selectedElement?.id === elementId) {
      setSelectedElement(null);
    }

    onChange({
      ...template,
      layout: {
        ...template.layout,
        sections: [
          {
            ...template.layout.sections[0],
            elements: template.layout.sections[0].elements.filter(e => e.id !== elementId),
          },
          ...template.layout.sections.slice(1),
        ],
      },
    });
  };

  return (
    <div className="flex h-full">
      <ElementToolbox
        onAddElement={addElement}
        onShowPreview={() => setShowPreviewModal(true)}
      />

      <DesignCanvas
        elements={template.layout.sections[0].elements}
        selectedElement={selectedElement}
        gridSize={GRID_SIZE}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onElementSelect={setSelectedElement}
        onElementUpdate={updateElement}
        onElementRemove={removeElement}
        onElementResize={handleResizeStart}
      />

      {selectedElement && (
        <PropertiesPanel
          element={selectedElement}
          onUpdate={(updates) => updateElement(selectedElement.id, updates)}
          onRemove={() => removeElement(selectedElement.id)}
        />
      )}

      <PreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        template={template}
      />
    </div>
  );
}