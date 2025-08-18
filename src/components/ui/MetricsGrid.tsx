import React from 'react';
import { Card, CardContent } from './card';
import { Target, CheckCircle2, Clock, AlertTriangle, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface MetricItem {
  id: string;
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  onClick?: () => void;
}

export interface MetricsGridProps {
  metrics: MetricItem[];
  className?: string;
}

export function MetricsGrid({ metrics, className }: MetricsGridProps) {
  return (
    <div className={cn(
      "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 lg:gap-4 mb-5 lg:mb-6",
      className
    )}>
      {metrics.map((metric) => {
        const IconComponent = metric.icon;
        return (
          <Card
            key={metric.id}
            className="bg-white cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
            onClick={metric.onClick}
          >
            <CardContent className="p-3">
              <div className="flex items-center">
                <div className={cn(
                  "p-2 rounded-lg shadow-sm",
                  metric.gradient
                )}>
                  <IconComponent className="h-4 w-4 text-white" />
                </div>
                <div className="ml-2.5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {metric.label}
                  </p>
                  <h3 className="text-base font-bold text-gray-900">
                    {metric.value}
                  </h3>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Predefined metric configurations for common use cases
export const createActionMetrics = (
  totalActions: number,
  statusCounts: {
    completed: number;
    in_progress: number;
    at_risk: number;
    not_started: number;
  },
  onFilterChange: (status: string) => void
): MetricItem[] => [
  {
    id: 'total',
    label: 'Total Actions',
    value: totalActions,
    icon: Target,
    gradient: 'bg-gradient-to-br from-blue-500 to-blue-600',
    onClick: () => onFilterChange('')
  },
  {
    id: 'completed',
    label: 'Completed',
    value: statusCounts.completed,
    icon: CheckCircle2,
    gradient: 'bg-gradient-to-br from-green-500 to-green-600',
    onClick: () => onFilterChange('completed')
  },
  {
    id: 'in_progress',
    label: 'On Track',
    value: statusCounts.in_progress,
    icon: Clock,
    gradient: 'bg-gradient-to-br from-blue-500 to-blue-600',
    onClick: () => onFilterChange('in_progress')
  },
  {
    id: 'at_risk',
    label: 'Off Track',
    value: statusCounts.at_risk,
    icon: AlertTriangle,
    gradient: 'bg-gradient-to-br from-amber-500 to-amber-600',
    onClick: () => onFilterChange('at_risk')
  },
  {
    id: 'not_started',
    label: 'Not Started',
    value: statusCounts.not_started,
    icon: X,
    gradient: 'bg-gradient-to-br from-gray-500 to-gray-600',
    onClick: () => onFilterChange('not_started')
  }
];