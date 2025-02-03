import React from 'react';
import { Monitor, Tablet, Smartphone, X } from 'lucide-react';
import type { ReportTemplate } from '../../../types/reports';
import { ReportGenerator } from '../ReportGenerator';

interface PreviewDevice {
  id: string;
  name: string;
  icon: typeof Monitor;
  width: number;
}

const PREVIEW_DEVICES: PreviewDevice[] = [
  { id: 'desktop', name: 'Desktop', icon: Monitor, width: 1280 },
  { id: 'tablet', name: 'Tablet', icon: Tablet, width: 768 },
  { id: 'mobile', name: 'Mobile', icon: Smartphone, width: 375 }
];

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: ReportTemplate;
}

export function PreviewModal({ isOpen, onClose, template }: PreviewModalProps) {
  const [previewDevice, setPreviewDevice] = React.useState<PreviewDevice>(PREVIEW_DEVICES[0]);
  const previewData = {
    name: 'Sample Intervention',
    description: 'This is a sample intervention for preview purposes.',
    status: 'in_progress',
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    budget: 50000,
    lead: { email: 'john.doe@example.com' },
    // Add more sample data as needed
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-gray-500 bg-opacity-75">
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            <div className="pointer-events-auto w-screen max-w-4xl">
              <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                  <div className="flex items-center space-x-4">
                    <h2 className="text-lg font-medium text-gray-900">Preview</h2>
                    <div className="flex border rounded-md p-1 bg-gray-50">
                      {PREVIEW_DEVICES.map((device) => (
                        <button
                          key={device.id}
                          onClick={() => setPreviewDevice(device)}
                          className={`flex items-center px-3 py-1.5 rounded ${
                            previewDevice.id === device.id
                              ? 'bg-white shadow text-blue-600'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                          title={device.name}
                        >
                          <device.icon className="h-4 w-4" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 px-6 py-4">
                  <div 
                    className="bg-white rounded-lg shadow-sm mx-auto transition-all duration-300"
                    style={{ width: previewDevice.width }}
                  >
                    <ReportGenerator
                      template={template}
                      data={previewData}
                      interventionId="preview"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}