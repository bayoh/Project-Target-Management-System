import React from 'react';
import { cn } from '../../lib/utils';

interface ListItemProps {
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

interface ListProps {
  children: React.ReactNode;
  className?: string;
}

export function ListItem({ icon, children, onClick, className }: ListItemProps) {
  const baseClasses = cn(
    'flex items-center gap-3 px-4 py-3 text-sm text-gray-700',
    'transition-colors duration-200',
    'hover:bg-gray-50',
    onClick && 'cursor-pointer hover:text-gray-900',
    className
  );

  return (
    <li
      onClick={onClick}
      className={baseClasses}
    >
      {icon && (
        <span className="flex-shrink-0 w-5 h-5 text-gray-400">
          {icon}
        </span>
      )}
      <span className="flex-grow">{children}</span>
    </li>
  );
}

export function List({ children, className }: ListProps) {
  return (
    <ul className={cn(
      'divide-y divide-gray-200 rounded-lg border border-gray-200',
      'bg-white shadow-sm',
      'sm:rounded-xl',
      className
    )}>
      {children}
    </ul>
  );
}