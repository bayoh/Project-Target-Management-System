import React, { useState, useMemo } from 'react';
import { usePaginatedTargets, useDeleteTarget, useUpdateTarget, TargetItem, TargetFilters } from '../../hooks/useTargetQueries';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '../../components/ui/Modal';
import { 
  Target, 
  Edit3, 
  Trash2, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List,
  X,
  Save
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useActivityTracking } from '../../hooks/useActivityTracking';

const ITEMS_PER_PAGE = 10;

function TargetTracking() {
  const { trackPageView } = useActivityTracking();
  const [filters, setFilters] = useState<TargetFilters>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [quickUpdateModal, setQuickUpdateModal] = useState<{ isOpen: boolean; target: TargetItem | null }>({ isOpen: false, target: null });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');

  React.useEffect(() => {
    trackPageView('Target Tracking');
  }, [trackPageView]);

  const { data: paginatedData, isLoading, isError, error } = usePaginatedTargets(
    filters,
    {
      page: currentPage + 1,
      limit: ITEMS_PER_PAGE,
    }
  );

  const { targets, totalCount } = useMemo(() => ({
    targets: paginatedData?.data ?? [],
    totalCount: paginatedData?.count ?? 0,
  }), [paginatedData]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const deleteTargetMutation = useDeleteTarget();
  const updateTargetMutation = useUpdateTarget();

  const handleFilterChange = (filterName: keyof TargetFilters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
    setCurrentPage(0);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setFilters(prev => ({ ...prev, searchTerm: value }));
    setCurrentPage(0);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDeleteTarget = async (targetId: string) => {
    const toastId = toast.loading('Deleting target...');
    try {
      await deleteTargetMutation.mutateAsync(targetId);
      toast.success('Target deleted successfully', { id: toastId });
    } catch (error) {
      toast.error('Failed to delete target', { id: toastId });
      console.error('Delete error:', error);
    }
  };

  const confirmDelete = (targetId: string, targetName: string) => {
    if (window.confirm(`Are you sure you want to delete "${targetName}"? This action cannot be undone.`)) {
      handleDeleteTarget(targetId);
    }
  };

  const validateForm = (formData: FormData, target: TargetItem) => {
    const errors: Record<string, string> = {};
    
    const currentValue = Number(formData.get('current_value'));
    if (isNaN(currentValue) || currentValue < 0) {
      errors.current_value = 'Current value must be a valid positive number';
    }
    if (currentValue > target.target_value) {
      errors.current_value = 'Current value cannot exceed target value';
    }
    
    if (isJobTarget(target)) {
      const womenCurrent = Number(formData.get('women_current'));
      const youthCurrent = Number(formData.get('youth_current'));
      
      if (isNaN(womenCurrent) || womenCurrent < 0) {
        errors.women_current = 'Women current value must be a valid positive number';
      }
      if (isNaN(youthCurrent) || youthCurrent < 0) {
        errors.youth_current = 'Youth current value must be a valid positive number';
      }
      
      if (womenCurrent + youthCurrent > currentValue) {
        errors.women_current = 'Women + Youth values cannot exceed total current value';
        errors.youth_current = 'Women + Youth values cannot exceed total current value';
      }
    }
    
    return errors;
  };

  const handleUpdateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!quickUpdateModal.target) return;

    const formData = new FormData(e.currentTarget);
    const errors = validateForm(formData, quickUpdateModal.target);
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Please fix the validation errors');
      return;
    }
    
    setFormErrors({});
    const toastId = toast.loading('Updating target...');
    try {
      const updates = {
        id: quickUpdateModal.target.id,
        current_value: Number(formData.get('current_value')),
        women_current: Number(formData.get('women_current')),
        youth_current: Number(formData.get('youth_current')),
      };
      
      await updateTargetMutation.mutateAsync(updates);
      toast.success('Target updated successfully', { id: toastId });
      setQuickUpdateModal({ isOpen: false, target: null });
    } catch (error) {
      toast.error('Failed to update target', { id: toastId });
      console.error('Update error:', error);
    }
  };

  const uniqueCategories = useMemo(() => {
    // This should be fetched from the server in a real app
    return ['Category A', 'Category B', 'Category C'];
  }, []);

  const isJobTarget = (target: TargetItem) => target.category?.toLowerCase().includes('job');

  // Calculate metrics for dashboard cards
  const metrics = useMemo(() => {
    const total = targets.length;
    const completed = targets.filter(t => (t.current_value / t.target_value) >= 1).length;
    const atRisk = targets.filter(t => {
      const progress = t.current_value / t.target_value;
      return progress < 0.5 && progress > 0;
    }).length;
    const notStarted = targets.filter(t => t.current_value === 0).length;
    
    return { total, completed, atRisk, notStarted };
  }, [targets]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading targets</h3>
          <p className="text-sm text-gray-500">{error?.message || 'An unexpected error occurred'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center mb-4 sm:mb-0">
              <Target className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Target Tracking</h1>
                <p className="text-sm text-gray-500">Monitor and manage your targets</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Grid
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <List className="h-4 w-4 mr-2" />
                Table
              </Button>
            </div>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between transition-all duration-300 hover:shadow-md">
              <div className="flex items-center">
                <div className="p-1.5 bg-blue-100 rounded-md">
                  <Target className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-500">Total Targets</p>
                  <p className="text-xl font-bold text-gray-900">{metrics.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between transition-all duration-300 hover:shadow-md">
              <div className="flex items-center">
                <div className="p-1.5 bg-green-100 rounded-md">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-500">Completed</p>
                  <p className="text-xl font-bold text-gray-900">{metrics.completed}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between transition-all duration-300 hover:shadow-md">
              <div className="flex items-center">
                <div className="p-1.5 bg-yellow-100 rounded-md">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-500">At Risk</p>
                  <p className="text-xl font-bold text-gray-900">{metrics.atRisk}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between transition-all duration-300 hover:shadow-md">
              <div className="flex items-center">
                <div className="p-1.5 bg-gray-100 rounded-md">
                  <Clock className="h-5 w-5 text-gray-600" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-500">Not Started</p>
                  <p className="text-xl font-bold text-gray-900">{metrics.notStarted}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 space-y-3 lg:space-y-0">
              <h2 className="text-lg font-semibold text-gray-900">Search & Filters</h2>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search targets..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9 pr-3 py-2 w-full sm:w-64 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    aria-label="Search targets"
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="px-4 py-2 text-blue-600 border-blue-300 hover:bg-blue-50 hover:border-blue-400 text-sm"
                  aria-label="Open advanced filters"
                >
                  <Filter className="h-4 w-4 mr-1" />
                  Filters
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label 
                  htmlFor="category-filter" 
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Category
                </label>
                <Select
                  id="category-filter"
                  options={[
                    { value: '', label: 'All Categories' },
                    ...uniqueCategories.map(category => ({ value: category, label: category }))
                  ]}
                  value={filters.category || ''}
                  onChange={(value) => handleFilterChange('category', value as string)}
                  placeholder="Select Category"
                  className="w-full text-sm"
                  aria-label="Filter by category"
                />
              </div>
              <div>
                <label 
                  htmlFor="status-filter" 
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Status
                </label>
                <Select
                  id="status-filter"
                  options={[
                    { value: '', label: 'All Statuses' },
                    { value: 'not_started', label: 'Not Started' },
                    { value: 'in_progress', label: 'In Progress' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'at_risk', label: 'At Risk' }
                  ]}
                  value={filters.searchTerm || ''}
                  onChange={(value) => handleFilterChange('searchTerm', value as string)}
                  placeholder="Select Status"
                  className="w-full text-sm"
                  aria-label="Filter by progress status"
                />
              </div>
              <div className="flex items-end">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 text-sm border border-dashed border-gray-300 hover:border-gray-400"
                  aria-label="Clear all filters"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>

        {/* Desktop Table View */}
        <div className="hidden md:block">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <TableHead className="font-semibold text-gray-900 py-4 px-6">Target Name</TableHead>
                  <TableHead className="font-semibold text-gray-900 py-4 px-6">Progress</TableHead>
                  <TableHead className="font-semibold text-gray-900 py-4 px-6">Status</TableHead>
                  <TableHead className="font-semibold text-gray-900 py-4 px-6 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {targets.map((target) => {
                  const progressPercentage = Math.round((target.current_value / target.target_value) * 100);
                  const isCompleted = progressPercentage >= 100;
                  const isAtRisk = progressPercentage < 50;
                  
                  return (
                    <TableRow 
                      key={target.id} 
                      className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 border-b border-gray-100 group"
                    >
                      <TableCell className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 group-hover:text-blue-900 transition-colors duration-200">
                            {target.description}
                          </span>
                          <span className="text-sm text-gray-500 mt-1">
                            Target: {target.target_value.toLocaleString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">
                              {target.current_value.toLocaleString()} / {target.target_value.toLocaleString()}
                            </span>
                            <span className={`text-sm font-bold ${
                              isCompleted ? 'text-green-600' : 
                              isAtRisk ? 'text-red-600' : 'text-blue-600'
                            }`}>
                              {progressPercentage}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                            <div 
                              className={`h-3 rounded-full transition-all duration-500 ease-out ${
                                isCompleted ? 'bg-gradient-to-r from-green-500 to-green-600' :
                                isAtRisk ? 'bg-gradient-to-r from-red-500 to-red-600' :
                                'bg-gradient-to-r from-blue-500 to-indigo-600'
                              } shadow-sm`}
                              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                            >
                              <div className="h-full w-full rounded-full bg-gradient-to-t from-transparent to-white opacity-30"></div>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <Badge 
                          className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all duration-200 ${
                            isCompleted 
                              ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200' 
                              : isAtRisk 
                              ? 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200'
                              : 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200'
                          }`}
                        >
                          {isCompleted ? 'Completed' : isAtRisk ? 'At Risk' : 'In Progress'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center justify-center space-x-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                onClick={() => setQuickUpdateModal({ isOpen: true, target })}
                                className="h-9 w-9 rounded-lg border-gray-300 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 hover:shadow-md hover:scale-105"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="bg-gray-900 text-white text-xs px-2 py-1 rounded">
                              Quick Update
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                onClick={() => confirmDelete(target.id, target.description)}
                                className="h-9 w-9 rounded-lg border-gray-300 hover:border-red-400 hover:bg-red-50 hover:text-red-600 transition-all duration-200 hover:shadow-md hover:scale-105"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="bg-gray-900 text-white text-xs px-2 py-1 rounded">
                              Delete Target
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:hidden">
          {targets.map((target) => {
            const progressPercentage = Math.round((target.current_value / target.target_value) * 100);
            const isCompleted = progressPercentage >= 100;
            const isAtRisk = progressPercentage < 50;
            
            return (
              <div 
                key={target.id} 
                className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:border-blue-300"
              >
                <div className="space-y-4">
                  {/* Header */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900 text-lg leading-tight">
                      {target.description}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Target: {target.target_value.toLocaleString()}
                    </p>
                  </div>
                  
                  {/* Progress Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Progress
                      </span>
                      <span className={`text-lg font-bold ${
                        isCompleted ? 'text-green-600' : 
                        isAtRisk ? 'text-red-600' : 'text-blue-600'
                      }`}>
                        {progressPercentage}%
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                      <div 
                        className={`h-3 rounded-full transition-all duration-500 ease-out ${
                          isCompleted ? 'bg-gradient-to-r from-green-500 to-green-600' :
                          isAtRisk ? 'bg-gradient-to-r from-red-500 to-red-600' :
                          'bg-gradient-to-r from-blue-500 to-indigo-600'
                        } shadow-sm`}
                        style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                      >
                        <div className="h-full w-full rounded-full bg-gradient-to-t from-transparent to-white opacity-30"></div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      {target.current_value.toLocaleString()} / {target.target_value.toLocaleString()}
                    </div>
                  </div>
                  
                  {/* Status Badge */}
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-700 mr-2">Status:</span>
                    <Badge 
                      className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                        isCompleted 
                          ? 'bg-green-100 text-green-800 border-green-200' 
                          : isAtRisk 
                          ? 'bg-red-100 text-red-800 border-red-200'
                          : 'bg-blue-100 text-blue-800 border-blue-200'
                      }`}
                    >
                      {isCompleted ? 'Completed' : isAtRisk ? 'At Risk' : 'In Progress'}
                    </Badge>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center space-x-3 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setQuickUpdateModal({ isOpen: true, target })}
                      className="flex-1 h-9 rounded-lg border-gray-300 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 hover:shadow-md"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Update
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => confirmDelete(target.id, target.description)}
                      className="flex-1 h-9 rounded-lg border-gray-300 hover:border-red-400 hover:bg-red-50 hover:text-red-600 transition-all duration-200 hover:shadow-md"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2">
              <div className="flex-1 flex justify-between sm:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1}
                >
                  Next
                </Button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{currentPage * ITEMS_PER_PAGE + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min((currentPage + 1) * ITEMS_PER_PAGE, totalCount)}
                    </span>{' '}
                    of <span className="font-medium">{totalCount}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 0}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                    >
                      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      // Calculate the starting page for the pagination window
                      const startPage = Math.max(0, Math.min(currentPage - 2, totalPages - 5));
                      const pageNum = startPage + i;
                      
                      // Only render if pageNum is within valid range
                      if (pageNum >= totalPages) return null;
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className="relative inline-flex items-center px-4 py-2 border text-sm font-medium"
                        >
                          {pageNum + 1}
                        </Button>
                      );
                    }).filter(Boolean)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages - 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                    >
                      <ChevronRight className="h-5 w-5" aria-hidden="true" />
                    </Button>
                  </nav>
                </div>
              </div>
            </div>
          )}

        {quickUpdateModal.isOpen && quickUpdateModal.target && (
          <Modal open={quickUpdateModal.isOpen} onOpenChange={(open) => setQuickUpdateModal({ isOpen: open, target: null })}>
            <ModalContent>
              <ModalHeader>
                <ModalTitle>Quick Update: {quickUpdateModal.target.description}</ModalTitle>
                <ModalDescription>Update the values for this target.</ModalDescription>
              </ModalHeader>
              <form onSubmit={handleUpdateSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Input 
                      name="current_value" 
                      label={`Current Value (Target: ${quickUpdateModal.target.target_value})`}
                      defaultValue={quickUpdateModal.target.current_value} 
                      type="number" 
                      min="0"
                      max={quickUpdateModal.target.target_value}
                      step="0.01"
                      required
                      error={formErrors.current_value}
                      placeholder="Enter current progress value"
                    />
                  </div>
                  {isJobTarget(quickUpdateModal.target) && (
                    <>
                      <div className="space-y-2">
                        <Input 
                          name="women_current" 
                          label="Women Current Value"
                          defaultValue={quickUpdateModal.target.women_current} 
                          type="number" 
                          min="0"
                          step="0.01"
                          error={formErrors.women_current}
                          placeholder="Enter current value for women"
                        />
                      </div>
                      <div className="space-y-2">
                        <Input 
                          name="youth_current" 
                          label="Youth Current Value"
                          defaultValue={quickUpdateModal.target.youth_current} 
                          type="number" 
                          min="0"
                          step="0.01"
                          error={formErrors.youth_current}
                          placeholder="Enter current value for youth"
                        />
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <p className="text-sm text-blue-700">
                          <strong>Note:</strong> Women + Youth values should not exceed the total current value.
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <ModalFooter>
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => {
                      setQuickUpdateModal({ isOpen: false, target: null });
                      setFormErrors({});
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    Save Changes
                  </Button>
                </ModalFooter>
              </form>
            </ModalContent>
          </Modal>
        )}
      </div>
    );
}

export default TargetTracking;