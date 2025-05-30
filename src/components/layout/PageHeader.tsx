import React from 'react';
// import { Button } from '../ui/button'; // Assuming a Button component exists

interface PageHeaderAction {
  label: string;
  icon?: React.ElementType;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | null | undefined;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: PageHeaderAction[];
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, icon, actions }) => {
  return (
    <div className="mb-8 pb-6 border-b border-gray-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center mb-4 sm:mb-0">
          {icon && <div className="mr-4 text-gray-600 flex-shrink-0">{icon}</div>}
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">{title}</h1>
            {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
          </div>
        </div>
        {actions && actions.length > 0 && (
          <div className="flex flex-shrink-0 space-x-3 mt-4 sm:mt-0 sm:ml-4">
            {actions.map((action, index) => {
              const IconComponent = action.icon;
              return (
                <button
                  key={index}
                  onClick={action.onClick}
                //   variant={action.variant || 'default'}
                >
                  {IconComponent && <IconComponent className="mr-2 h-4 w-4" />}
                  {action.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};