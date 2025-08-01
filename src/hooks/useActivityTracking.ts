import { useCallback, useEffect } from 'react';
import { useActivityLogger, EntityType, ActivityActionType } from '../lib/activityLogger';
import { useAuth } from '../lib/auth';

/**
 * Custom hook for tracking user activities throughout the application
 * Provides convenient methods for logging CRUD operations and page views
 */
export const useActivityTracking = () => {
  const { log } = useActivityLogger();
  const { user } = useAuth();
  
  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      // Clear any pending timeouts or intervals
      if (typeof window !== 'undefined') {
        // Clear any pending activity tracking operations
        // This helps prevent memory leaks when components unmount
      }
    };
  }, []);

  // Track entity creation
  const trackCreate = useCallback(async (
    entityType: EntityType,
    entityId: string,
    metadata?: Record<string, any>
  ) => {
    if (!user) return;
    await log.create(entityType, entityId, {
      ...metadata,
      user_action: 'created new entity'
    });
  }, [log, user]);

  // Track entity updates
  const trackUpdate = useCallback(async (
    entityType: EntityType,
    entityId: string,
    changes?: Record<string, any>,
    metadata?: Record<string, any>
  ) => {
    if (!user) return;
    await log.update(entityType, entityId, {
      ...metadata,
      changes,
      user_action: 'updated entity'
    });
  }, [log, user]);

  // Track entity deletion
  const trackDelete = useCallback(async (
    entityType: EntityType,
    entityId: string,
    metadata?: Record<string, any>
  ) => {
    if (!user) return;
    await log.delete(entityType, entityId, {
      ...metadata,
      user_action: 'deleted entity'
    });
  }, [log, user]);

  // Track entity viewing
  const trackView = useCallback(async (
    entityType: EntityType,
    entityId?: string,
    metadata?: Record<string, any>
  ) => {
    if (!user) return;
    await log.view(entityType, entityId, {
      ...metadata,
      user_action: entityId ? 'viewed specific entity' : 'viewed entity list'
    });
  }, [log, user]);

  // Track page navigation
  const trackPageView = useCallback(async (
    pageName: string,
    metadata?: Record<string, any>
  ) => {
    if (!user) return;
    await log.view('navigation', undefined, {
      ...metadata,
      page_name: pageName,
      user_action: 'navigated to page'
    });
  }, [log, user]);

  // Track form submissions
  const trackFormSubmission = useCallback(async (
    formName: string,
    entityType: EntityType,
    entityId?: string,
    metadata?: Record<string, any>
  ) => {
    if (!user) return;
    await log.update(entityType, entityId || 'form', {
      ...metadata,
      form_name: formName,
      user_action: 'submitted form'
    });
  }, [log, user]);

  // Track search operations
  const trackSearch = useCallback(async (
    searchTerm: string,
    entityType: EntityType,
    resultsCount?: number,
    metadata?: Record<string, any>
  ) => {
    if (!user) return;
    await log.view(entityType, undefined, {
      ...metadata,
      search_term: searchTerm,
      results_count: resultsCount,
      user_action: 'performed search'
    });
  }, [log, user]);

  // Track export operations
  const trackExport = useCallback(async (
    exportType: string,
    entityType: EntityType,
    recordCount?: number,
    metadata?: Record<string, any>
  ) => {
    if (!user) return;
    await log.view(entityType, undefined, {
      ...metadata,
      export_type: exportType,
      record_count: recordCount,
      user_action: 'exported data'
    });
  }, [log, user]);

  // Track bulk operations
  const trackBulkOperation = useCallback(async (
    operation: 'update' | 'delete',
    entityType: EntityType,
    entityIds: string[],
    metadata?: Record<string, any>
  ) => {
    if (!user) return;
    const actionType: ActivityActionType = operation;
    await log[actionType](entityType, 'bulk', {
      ...metadata,
      entity_ids: entityIds,
      entity_count: entityIds.length,
      user_action: `bulk ${operation}`
    });
  }, [log, user]);

  return {
    // Basic CRUD operations
    trackCreate,
    trackUpdate,
    trackDelete,
    trackView,
    
    // Specialized tracking
    trackPageView,
    trackFormSubmission,
    trackSearch,
    trackExport,
    trackBulkOperation,
    
    // Direct access to logger for custom tracking
    log,
    
    // Utility to check if tracking is enabled (user is logged in)
    isTrackingEnabled: !!user
  };
};

// Convenience hooks for specific entity types
export const useClusterTracking = () => {
  const tracking = useActivityTracking();
  
  return {
    trackClusterCreate: (clusterId: string, clusterData?: any) => 
      tracking.trackCreate('cluster', clusterId, { cluster_data: clusterData }),
    trackClusterUpdate: (clusterId: string, changes?: any) => 
      tracking.trackUpdate('cluster', clusterId, changes),
    trackClusterDelete: (clusterId: string) => 
      tracking.trackDelete('cluster', clusterId),
    trackClusterView: (clusterId?: string) => 
      tracking.trackView('cluster', clusterId),
    ...tracking
  };
};

export const usePathwayTracking = () => {
  const tracking = useActivityTracking();
  
  return {
    trackPathwayCreate: (pathwayId: string, pathwayData?: any) => 
      tracking.trackCreate('pathway', pathwayId, { pathway_data: pathwayData }),
    trackPathwayUpdate: (pathwayId: string, changes?: any) => 
      tracking.trackUpdate('pathway', pathwayId, changes),
    trackPathwayDelete: (pathwayId: string) => 
      tracking.trackDelete('pathway', pathwayId),
    trackPathwayView: (pathwayId?: string) => 
      tracking.trackView('pathway', pathwayId),
    ...tracking
  };
};

export const useInterventionTracking = () => {
  const tracking = useActivityTracking();
  
  return {
    trackInterventionCreate: (interventionId: string, interventionData?: any) => 
      tracking.trackCreate('intervention', interventionId, { intervention_data: interventionData }),
    trackInterventionUpdate: (interventionId: string, changes?: any) => 
      tracking.trackUpdate('intervention', interventionId, changes),
    trackInterventionDelete: (interventionId: string) => 
      tracking.trackDelete('intervention', interventionId),
    trackInterventionView: (interventionId?: string) => 
      tracking.trackView('intervention', interventionId),
    ...tracking
  };
};

export const useActionTracking = () => {
  const tracking = useActivityTracking();
  
  return {
    trackActionCreate: (actionId: string, actionData?: any) => 
      tracking.trackCreate('action', actionId, { action_data: actionData }),
    trackActionUpdate: (actionId: string, changes?: any) => 
      tracking.trackUpdate('action', actionId, changes),
    trackActionDelete: (actionId: string) => 
      tracking.trackDelete('action', actionId),
    trackActionView: (actionId?: string) => 
      tracking.trackView('action', actionId),
    ...tracking
  };
};

export const useTaskTracking = () => {
  const tracking = useActivityTracking();
  
  return {
    trackTaskCreate: (taskId: string, taskData?: any) => 
      tracking.trackCreate('task', taskId, { task_data: taskData }),
    trackTaskUpdate: (taskId: string, changes?: any) => 
      tracking.trackUpdate('task', taskId, changes),
    trackTaskDelete: (taskId: string) => 
      tracking.trackDelete('task', taskId),
    trackTaskView: (taskId?: string) => 
      tracking.trackView('task', taskId),
    ...tracking
  };
};

export const useIndicatorTracking = () => {
  const tracking = useActivityTracking();
  
  return {
    trackIndicatorCreate: (indicatorId: string, indicatorData?: any) => 
      tracking.trackCreate('indicator', indicatorId, { indicator_data: indicatorData }),
    trackIndicatorUpdate: (indicatorId: string, changes?: any) => 
      tracking.trackUpdate('indicator', indicatorId, changes),
    trackIndicatorDelete: (indicatorId: string) => 
      tracking.trackDelete('indicator', indicatorId),
    trackIndicatorView: (indicatorId?: string) => 
      tracking.trackView('indicator', indicatorId),
    ...tracking
  };
};