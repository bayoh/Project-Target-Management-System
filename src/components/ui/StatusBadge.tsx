import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, List } from 'lucide-react';
import type { ProjectStatus } from '../../types/project';

/**
 * Props interface for the StatusBadge component
 */
export interface StatusBadgeProps {
  /** The status value to display */
  status: ProjectStatus;
  /** Optional custom className to apply additional styling */
  className?: string;
  /** Size of the status icon in pixels */
  iconSize?: number;
  /** Whether to show the status text alongside the icon */
  showText?: boolean;
}

/**
 * Configuration object for status colors and styling
 */
const STATUS_CONFIG: Record<ProjectStatus, { colors: string; icon: React.ElementType }> = {
  completed: {
    colors: 'bg-green-100 text-green-700',
    icon: CheckCircle2,
  },
  on_track: {
    colors: 'bg-blue-100 text-blue-700',
    icon: Clock,
  },
  off_track: {
    colors: 'bg-yellow-100 text-yellow-700',
    icon: AlertTriangle,
  },
  not_started: {
    colors: 'bg-gray-100 text-gray-700',
    icon: List,
  },
};

/**
 * Formats a status string for display by replacing underscores with spaces
 * and capitalizing each word
 * 
 * @param status - The status string to format
 * @returns The formatted status string
 */
const formatStatusText = (status: ProjectStatus): string => {
  return status.replace('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};

/**
 * StatusBadge Component
 * 
 * A reusable component that displays a status badge with an icon and optional text.
 * The component automatically applies appropriate colors and icons based on the status value.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <StatusBadge status="completed" />
 * 
 * // With custom styling and larger icon
 * <StatusBadge 
 *   status="off_track" 
 *   className="ml-2" 
 *   iconSize={16}
 *   showText={true}
 * />
 * 
 * // Without status text
 * <StatusBadge status="on_track" showText={false} />
 * ```
 * 
 * @param props - The component props
 * @returns A styled status badge component
 */
export function StatusBadge({
  status,
  className = '',
  iconSize = 12,
  showText = true,
}: StatusBadgeProps) {
  // Get the configuration for the current status, fallback to not_started
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.not_started;
  const StatusIcon = config.icon;

  return (
    <div 
      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${config.colors} ${className}`}
      role="status"
      aria-label={`Status: ${formatStatusText(status)}`}
    >
      <StatusIcon size={iconSize} className="mr-1 flex-shrink-0" />
      {showText && (
        <span className="truncate">
          {formatStatusText(status)}
        </span>
      )}
    </div>
  );
}

// Named export for flexibility
export { StatusBadge as default };