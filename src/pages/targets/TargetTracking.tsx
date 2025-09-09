import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTargets, useDeleteTarget, useUpdateTarget, TargetItem } from '../../hooks/useTargetQueries';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '../../components/ui/Modal';
import { 
  Target, 
  Edit3, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List,
  X,
  Save,
  Eye,
  Briefcase,
  Building2,
  Heart,
  GraduationCap,
  DollarSign,
  HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useActivityTracking } from '../../hooks/useActivityTracking';

const ITEMS_PER_PAGE = 10;

// Function to get category-specific icon and colors
const getCategoryConfig = (category: string) => {
  const configs = {
    'jobs': { icon: Briefcase, bg: 'bg-blue-100', text: 'text-blue-600' },
    'infrastructure': { icon: Building2, bg: 'bg-gray-100', text: 'text-gray-600' },
    'health and wellness': { icon: Heart, bg: 'bg-red-100', text: 'text-red-600' },
    'education and skills': { icon: GraduationCap, bg: 'bg-purple-100', text: 'text-purple-600' },
    'resource mobilization': { icon: DollarSign, bg: 'bg-green-100', text: 'text-green-600' },
    'other': { icon: HelpCircle, bg: 'bg-orange-100', text: 'text-orange-600' }
  };
  return configs[category as keyof typeof configs] || configs['other'];
};

function TargetTracking() {
  const navigate = useNavigate();
  const { trackPageView } = useActivityTracking();

  const [currentPage, setCurrentPage] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [quickUpdateModal, setQuickUpdateModal] = useState<{ isOpen: boolean; target: TargetItem | null }>({ isOpen: false, target: null });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    trackPageView('Target Tracking');
  }, [trackPageView]);

  // Fetch all targets for client-side pagination
  const { data: allTargets, isLoading, isError, error } = useTargets();

  // Client-side pagination and filtering logic
  const { targets, totalCount, totalPages, filteredTargets } = useMemo(() => {
    const allTargetsData = allTargets ?? [];
    
    // Filter by selected category
    const filtered = selectedCategory 
      ? allTargetsData.filter(target => target.category === selectedCategory)
      : allTargetsData;
    
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedTargets = filtered.slice(startIndex, endIndex);
    
    return {
      targets: paginatedTargets,
      totalCount: filtered.length,
      totalPages: Math.ceil(filtered.length / ITEMS_PER_PAGE),
      filteredTargets: filtered
    };
  }, [allTargets, currentPage, selectedCategory]);

  const deleteTargetMutation = useDeleteTarget();
  const updateTargetMutation = useUpdateTarget();





  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleCategoryFilter = (category: string) => {
    if (selectedCategory === category) {
      // If clicking the same category, clear the filter
      setSelectedCategory(null);
    } else {
      // Set new category filter
      setSelectedCategory(category);
    }
    // Reset to first page when filtering
    setCurrentPage(0);
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
    return ['jobs', 'infrastructure', 'health and wellness', 'education and skills', 'resource mobilization', 'other'];
  }, []);

  const isJobTarget = (target: TargetItem) => target.category?.toLowerCase().includes('job');

  // Calculate metrics for dashboard cards by category
  const metrics = useMemo(() => {
    const categoryStats: Record<string, number> = {};
    
    // Initialize all categories with 0
    uniqueCategories.forEach(category => {
      categoryStats[category] = 0;
    });
    
    // Count targets by category using all targets data
    const allTargetsData = allTargets ?? [];
    allTargetsData.forEach((target: TargetItem) => {
      const category = target.category || 'Jobs';
      if (categoryStats.hasOwnProperty(category)) {
        categoryStats[category]++;
      }
    });
    
    return categoryStats;
  }, [allTargets, uniqueCategories]);

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
    <div className="space-y-6 p-4">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center mb-4 sm:mb-0">
              <Target className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Target Tracking</h1>
                <p className="text-sm text-gray-500">Monitor and manage your targets</p>
              </div>
            </div>
          </div>

          {/* Category Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
            {uniqueCategories.map((category) => {
              const count = metrics[category] || 0;
              const categoryConfig = getCategoryConfig(category);
              const IconComponent = categoryConfig.icon;
              const isSelected = selectedCategory === category;
              
              return (
                <div 
                  key={category} 
                  onClick={() => handleCategoryFilter(category)}
                  className={`bg-white rounded-lg shadow-sm p-4 flex items-center justify-between transition-all duration-300 hover:shadow-md cursor-pointer transform hover:scale-105 ${
                    isSelected ? 'ring-2 ring-blue-500 shadow-lg bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`p-1.5 ${isSelected ? 'bg-blue-100' : categoryConfig.bg} rounded-md`}>
                      <IconComponent className={`h-5 w-5 ${isSelected ? 'text-blue-600' : categoryConfig.text}`} />
                    </div>
                    <div className="ml-3">
                      <p className={`text-xs font-medium ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>{category.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</p>
                      <p className={`text-xl font-bold ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>{count}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="text-blue-600">
                      <X className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Filter Status */}
          {selectedCategory && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="text-blue-600 mr-2">
                    <Target className="h-5 w-5" />
                  </div>
                  <span className="text-blue-800 font-medium">
                    Showing {totalCount} targets in "{selectedCategory}" category
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory(null);
                    setCurrentPage(0);
                  }}
                  className="text-blue-600 border-blue-300 hover:bg-blue-100"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear Filter
                </Button>
              </div>
            </div>
          )}

        {/* Desktop Table View */}
        <div className="hidden md:block">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <TableHead className="font-semibold text-gray-900 py-4 px-6">Target Name</TableHead>
                  <TableHead className="font-semibold text-gray-900 py-4 px-6">Progress</TableHead>
                  {/* <TableHead className="font-semibold text-gray-900 py-4 px-6">Status</TableHead> */}
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
                            Target: {target.target_value.toLocaleString()} • {target.category?.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'Other'}
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
                      {/* <TableCell className="py-4 px-6">
                        <Badge 
                          className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all duration-200 ${
                            isCompleted 
                              ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200' 
                              : isAtRisk 
                              ? 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200'
                              : 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200'
                          }`}
                        >
                          {isCompleted ? 'Completed' : isAtRisk ? 'Off Track' : 'On Track'}
                        </Badge>
                      </TableCell> */}
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center justify-center space-x-2">
                          {target.action && target.action.intervention && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  onClick={() => navigate(`/interventions/${target.action!.intervention!.id}/actions/${target.action?.id}#targets`)}
                                  className="h-9 w-9 rounded-lg border-gray-300 hover:border-green-400 hover:bg-green-50 hover:text-green-600 transition-all duration-200 hover:shadow-md hover:scale-105"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="bg-gray-900 text-white text-xs px-2 py-1 rounded">
                                View Action
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                onClick={() => {
                                setQuickUpdateModal({ isOpen: true, target });
                                setFormErrors({});
                              }}
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
                      {isCompleted ? 'Completed' : isAtRisk ? 'Off Track' : 'On Track'}
                    </Badge>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 pt-2">
                    {target.action && target.action.intervention && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => navigate(`/interventions/${target.action!.intervention!.id}/actions/${target.action?.id}#targets`)}
                        className="flex-1 h-9 rounded-lg border-gray-300 hover:border-green-400 hover:bg-green-50 hover:text-green-600 transition-all duration-200 hover:shadow-md"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                                setQuickUpdateModal({ isOpen: true, target });
                                setFormErrors({});
                              }}
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
                      key={`current_value_${quickUpdateModal.target.id}`}
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
                          key={`women_current_${quickUpdateModal.target.id}`}
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
                          key={`youth_current_${quickUpdateModal.target.id}`}
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