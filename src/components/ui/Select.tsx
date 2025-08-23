import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps {
  options: { value: string; label: string; prefix?: string }[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowClear?: boolean;
  sortable?: boolean;
  searchable?: boolean;
  multiple?: boolean;
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  className = '',
  disabled = false,
  allowClear = true,
  sortable = false,
  searchable = false,
  multiple = false
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const selectRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedValues = Array.isArray(value) ? value : [value];
  const selectedOptions = options.filter(option => selectedValues.includes(option.value));

  const filteredAndSortedOptions = React.useMemo(() => {
    let result = [...options];
    
    // Apply search filter
    if (searchable && searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(option => 
        option.label.toLowerCase().includes(query) ||
        (option.prefix?.toLowerCase().includes(query) || false)
      );
    }

    // Apply sorting
    if (sortable) {
      result.sort((a, b) => {
        const compareA = a.label.toLowerCase();
        const compareB = b.label.toLowerCase();
        return sortOrder === 'asc' 
          ? compareA.localeCompare(compareB)
          : compareB.localeCompare(compareA);
      });
    }

    return result;
  }, [options, searchQuery, sortOrder, searchable, sortable]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      ref={selectRef}
      className={`relative ${className}`}
    >
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between px-4 py-2 text-left
          bg-white border rounded-lg shadow-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-blue-500 cursor-pointer'}
          transition-colors duration-200
        `}
        disabled={disabled}
      >
        <span className={`block truncate ${selectedOptions.length === 0 ? 'text-gray-500' : 'text-gray-900'}`}>
          {selectedOptions.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selectedOptions.map((option) => (
                <span key={option.value} className="inline-flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded">
                  {option.prefix && <span className="text-gray-500">{option.prefix}</span>}
                  <span>{option.label}</span>
                  {multiple && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        const newValue = selectedValues.filter(v => v !== option.value);
                        onChange(multiple ? newValue : newValue[0] || '');
                      }}
                      className="ml-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      ×
                    </span>
                  )}
                </span>
              ))}
            </div>
          ) : (
            placeholder
          )}
        </span>
        <div className="flex items-center gap-2">
          {allowClear && selectedOptions.length > 0 && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-1 hover:bg-gray-100 rounded-full cursor-pointer"
            >
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          )}
          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="
          absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg
          max-h-60 overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100
        ">
          {(searchable || sortable) && (
            <div className="sticky top-0 bg-white border-b border-gray-200 p-2 space-y-2">
              {searchable && (
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-1 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              {sortable && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-900"
                >
                  <span>Sort {sortOrder === 'asc' ? '↓' : '↑'}</span>
                </button>
              )}
            </div>
          )}
          {filteredAndSortedOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                const newValue = multiple
                  ? selectedValues.includes(option.value)
                    ? selectedValues.filter(v => v !== option.value)
                    : [...selectedValues, option.value]
                  : option.value;
                onChange(newValue);
                if (!multiple) setIsOpen(false);
              }}
              className={`
                w-full px-4 py-2 text-left hover:bg-blue-50
                ${selectedValues.includes(option.value) ? 'bg-blue-50 text-blue-600' : 'text-gray-900'}
                transition-colors duration-150
              `}
            >
              {option.prefix ? (
                <span className="flex items-center gap-2">
                  <span className="text-gray-500">{option.prefix}</span>
                  <span>{option.label}</span>
                </span>
              ) : (
                option.label
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}