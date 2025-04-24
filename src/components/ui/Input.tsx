import React from 'react';
import { cn } from '../../lib/utils';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement & HTMLTextAreaElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  showPasswordToggle?: boolean;
  rows?: number;
}

export function Input({
  className,
  type = 'text',
  label,
  error,
  icon,
  showPasswordToggle = false,
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  const inputType = showPassword ? 'text' : type;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        {type === 'textarea' ? (
          <textarea
          
            className={cn(
              'block w-full field-sizing-fixed rounded-md border border-gray-200 focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
              'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 pl-2 pt-1',
              icon && 'pl-10',
              error && 'border-red-300 focus:border-red-500 focus:ring-red-500',
              className
            )}
            rows={props.rows || 2}
            {...props}
          />
        ) : (
          <input
            type={inputType}
            className={cn(
              'block w-full rounded-md border border-gray-200 focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2',
              'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 pl-2',
              icon && 'pl-10',
              showPasswordToggle && 'pr-10',
              error && 'border-red-300 focus:border-red-500 focus:ring-red-500',
              className
            )}
            {...props}
          />
        )}
        {showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-gray-400" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400" />
            )}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}