import React from 'react';
import { Search, X } from 'lucide-react';
import { Card } from './card';
import { Input } from './Input';
import { Select } from './Select';
import { Button } from './button';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  placeholder: string;
  options: FilterOption[];
  multiple?: boolean;
}

export interface FilterState {
  search: string;
  interventionId: string;
  leadId: string;
  status: string;
  intervention: string;
  lead: string;
  supportingStaff: string[];
  implementingPartners: string[];
  associatedProjects: string[];
  [key: string]: string | string[];
}

export interface FilterPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  filterConfigs: FilterConfig[];
  searchPlaceholder?: string;
  onClearFilters?: () => void;
}

export function FilterPanel({
  filters,
  onFiltersChange,
  filterConfigs,
  searchPlaceholder = 'Search...',
  onClearFilters
}: FilterPanelProps) {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleFilterChange = (key: string, value: string | string[]) => {
    const updatedFilters = { ...filters };
    (updatedFilters as any)[key] = value;
    
    // Handle special cases for intervention and lead filters
    if (key === 'interventionId') {
      updatedFilters.intervention = value ? 
        filterConfigs.find(config => config.key === 'interventionId')?.options.find(opt => opt.value === value)?.label || '' 
        : '';
    }
    if (key === 'leadId') {
      updatedFilters.lead = value ? 
        filterConfigs.find(config => config.key === 'leadId')?.options.find(opt => opt.value === value)?.label || '' 
        : '';
    }
    
    onFiltersChange(updatedFilters);
  };

  const handleClearFilters = () => {
    if (onClearFilters) {
      onClearFilters();
    } else {
      const clearedFilters: FilterState = {
        search: '',
        interventionId: '',
        leadId: '',
        status: '',
        intervention: '',
        lead: '',
        supportingStaff: [],
        implementingPartners: [],
        associatedProjects: []
      };
      filterConfigs.forEach(config => {
        (clearedFilters as any)[config.key] = config.multiple ? [] : '';
      });
      onFiltersChange(clearedFilters);
    }
  };

  const hasActiveFilters = () => {
    if (filters.search) return true;
    return filterConfigs.some(config => {
      const value = (filters as any)[config.key];
      return config.multiple ? 
        (Array.isArray(value) && value.length > 0) : 
        (value && value !== '');
    });
  };

  return (
    <Card className="mb-4 bg-white">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Filters</h3>
        </div>
        
        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Dynamic Filter Selects */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filterConfigs.map((config) => (
              <div key={config.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {config.label}
                </label>
                <Select
                  options={[
                    { value: '', label: config.placeholder },
                    ...config.options
                  ]}
                  value={config.multiple ? 
                    (Array.isArray((filters as any)[config.key]) ? (filters as any)[config.key] as string[] : []) :
                    ((filters as any)[config.key] as string)
                  }
                  onChange={(value: string | string[]) => {
                    if (config.multiple) {
                      handleFilterChange(config.key, Array.isArray(value) ? value : []);
                    } else {
                      handleFilterChange(config.key, Array.isArray(value) ? value[0] || '' : value);
                    }
                  }}
                  placeholder={config.placeholder}
                  multiple={config.multiple}
                />
              </div>
            ))}
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters() && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="text-gray-600 hover:text-gray-800"
              >
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}