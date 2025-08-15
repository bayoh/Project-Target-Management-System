import { useCallback, useEffect, useRef } from 'react';
import { optimizedActivityLogger, useOptimizedActivityLogger } from '../lib/optimizedActivityLogger';
import { ActivityActionType, EntityType } from '../lib/activityLogger';

// Extended EntityType to include new types for comprehensive tracking
type ExtendedEntityType = EntityType | 'navigation' | 'form_submission' | 'search' | 'ui_interaction' | 'error' | 'performance_metric';

// Mock useAuth hook - replace with your actual auth hook
const useAuth = () => {
  // This should be replaced with your actual useAuth implementation
  return { user: null }; // Placeholder
};

/**
 * Optimized Activity Tracking Hook with Performance Enhancements
 * 
 * Key improvements:
 * - Smart batching and deduplication
 * - Debounced tracking for rapid actions
 * - Background processing
 * - Memory leak prevention
 * - Performance monitoring
 * - Graceful degradation
 */

interface TrackingOptions {
  debounce?: boolean;
  immediate?: boolean;
  metadata?: Record<string, any>;
}

interface PerformanceStats {
  totalActivities: number;
  deduplicatedActivities: number;
  averageProcessingTime: number;
  errorRate: number;
}

export const useOptimizedActivityTracking = () => {
  const { user } = useAuth();
  const logger = useOptimizedActivityLogger();
  
  // Performance tracking
  const performanceRef = useRef({
    totalActivities: 0,
    deduplicatedActivities: 0,
    processingTimes: [] as number[],
    errors: 0
  });
  
  // Debounce timers for different activity types
  const debounceTimers = useRef(new Map<string, NodeJS.Timeout>());
  
  // Activity deduplication cache
  const activityCache = useRef(new Map<string, number>());
  
  // Component mount tracking
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Clear any pending debounce timers
      for (const timer of debounceTimers.current.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  /**
   * Generic activity tracking with performance monitoring
   */
  const trackActivity = useCallback(async (
    actionType: ActivityActionType,
    entityType?: ExtendedEntityType,
    entityId?: string,
    options: TrackingOptions = {}
  ) => {
    if (!user || !isMountedRef.current) return;
    
    const startTime = performance.now();
    
    try {
      // Create activity key for deduplication
      const activityKey = `${actionType}-${entityType}-${entityId}-${Math.floor(Date.now() / 30000)}`; // 30-second window
      
      // Check for recent duplicate
      const lastTracked = activityCache.current.get(activityKey);
      const now = Date.now();
      
      if (lastTracked && (now - lastTracked) < 30000) { // 30-second deduplication
        performanceRef.current.deduplicatedActivities++;
        return;
      }
      
      // Update cache
      activityCache.current.set(activityKey, now);
      
      // Clean up old cache entries periodically
      if (activityCache.current.size > 100) {
        const cutoff = now - 300000; // 5 minutes
        for (const [key, timestamp] of activityCache.current.entries()) {
          if (timestamp < cutoff) {
            activityCache.current.delete(key);
          }
        }
      }
      
      // Handle debouncing for specific activity types
      if (options.debounce && (actionType === 'view' || entityType === 'navigation')) {
        const debounceKey = `${actionType}-${entityType}-${entityId}`;
        
        // Clear existing timer
        const existingTimer = debounceTimers.current.get(debounceKey);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }
        
        // Set new debounced timer
        const timer = setTimeout(async () => {
          if (isMountedRef.current) {
            const baseEntityType = ['navigation', 'form_submission', 'search', 'ui_interaction', 'error', 'performance_metric'].includes(entityType as string)
              ? 'navigation' // Coerce to a valid EntityType
              : entityType as EntityType;
            
            await logger.logActivity({
              action_type: actionType,
              entity_type: baseEntityType,
              entity_id: entityId || null,
              metadata: {
                ...options.metadata || {},
                extended_entity_type: entityType
              }
            });
          }
          debounceTimers.current.delete(debounceKey);
        }, 1000); // 1-second debounce
        
        debounceTimers.current.set(debounceKey, timer);
        return;
      }
      
      // Log activity immediately or with standard batching
      // Convert extended entity types to base types for the logger
      const baseEntityType = ['navigation', 'form_submission', 'search', 'ui_interaction', 'error', 'performance_metric'].includes(entityType as string)
        ? 'navigation' // Coerce to a valid EntityType
        : entityType as EntityType;
      
      await logger.logActivity({
        action_type: actionType,
        entity_type: baseEntityType,
        entity_id: entityId || null,
        metadata: {
          ...options.metadata || {},
          extended_entity_type: entityType // Store the extended type in metadata
        }
      });
      
      // Update performance metrics
      performanceRef.current.totalActivities++;
      const processingTime = performance.now() - startTime;
      performanceRef.current.processingTimes.push(processingTime);
      
      // Keep only recent processing times for average calculation
      if (performanceRef.current.processingTimes.length > 100) {
        performanceRef.current.processingTimes = performanceRef.current.processingTimes.slice(-50);
      }
      
    } catch (error) {
      console.error('Failed to track activity:', error);
      performanceRef.current.errors++;
    }
  }, [user, logger]);

  /**
   * Track CRUD operations with smart defaults
   */
  const trackCreate = useCallback((entityType: ExtendedEntityType, entityId: string, metadata?: Record<string, any>) => {
    return trackActivity('create', entityType, entityId, { metadata, immediate: true });
  }, [trackActivity]);

  const trackUpdate = useCallback((entityType: ExtendedEntityType, entityId: string, metadata?: Record<string, any>) => {
    return trackActivity('update', entityType, entityId, { metadata, immediate: true });
  }, [trackActivity]);

  const trackDelete = useCallback((entityType: ExtendedEntityType, entityId: string, metadata?: Record<string, any>) => {
    return trackActivity('delete', entityType, entityId, { metadata, immediate: true });
  }, [trackActivity]);

  /**
   * Track view operations with debouncing
   */
  const trackView = useCallback((entityType: ExtendedEntityType, entityId?: string, metadata?: Record<string, any>) => {
    return trackActivity('view', entityType, entityId, { metadata, debounce: true });
  }, [trackActivity]);

  /**
   * Track page views with enhanced metadata
   */
  const trackPageView = useCallback((pageName: string, metadata?: Record<string, any>) => {
    return trackActivity('view', 'navigation', pageName, { 
      metadata: { ...metadata, page_name: pageName },
      debounce: true 
    });
  }, [trackActivity]);

  /**
   * Track form submissions with detailed metadata
   */
  const trackFormSubmission = useCallback((formName: string, entityType: ExtendedEntityType, entityId?: string, metadata?: Record<string, any>) => {
    return trackActivity('update', entityType, entityId, { 
      metadata: { ...metadata, form_name: formName, submission: true },
      immediate: true
    });
  }, [trackActivity]);

  /**
   * Track search queries with performance data
   */
  const trackSearch = useCallback((query: string, metadata?: Record<string, any>) => {
    return trackActivity('view', 'search', query, { 
      metadata: { ...metadata, query },
      debounce: true 
    });
  }, [trackActivity]);

  /**
   * Track UI interactions for usability analysis
   */
  const trackInteraction = useCallback((interactionType: string, component: string, metadata?: Record<string, any>) => {
    return trackActivity('view', 'ui_interaction', component, { 
      metadata: { ...metadata, interaction_type: interactionType },
      debounce: true 
    });
  }, [trackActivity]);

  /**
   * Track application errors for debugging
   */
  const trackError = useCallback((error: Error, componentStack?: string, metadata?: Record<string, any>) => {
    return trackActivity('create', 'error', error.message, { 
      metadata: { ...metadata, error: error.toString(), stack: error.stack, componentStack },
      immediate: true 
    });
  }, [trackActivity]);

  /**
   * Track performance metrics for optimization
   */
  const trackPerformance = useCallback((metricName: string, value: number, metadata?: Record<string, any>) => {
    return trackActivity('create', 'performance_metric', metricName, { 
      metadata: { ...metadata, metric_name: metricName, value },
      immediate: true 
    });
  }, [trackActivity]);

  /**
   * Get current performance statistics
   */
  const getPerformanceStats = useCallback((): PerformanceStats => {
    const { totalActivities, deduplicatedActivities, processingTimes, errors } = performanceRef.current;
    
    const averageProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
      : 0;
    
    const errorRate = totalActivities > 0 ? errors / totalActivities : 0;
    
    return {
      totalActivities,
      deduplicatedActivities,
      averageProcessingTime,
      errorRate
    };
  }, []);

  /**
   * Flush pending activities (useful before navigation)
   */
  const flushActivities = useCallback(async () => {
    try {
      // Clear all debounce timers and execute immediately
      for (const timer of debounceTimers.current.values()) {
        clearTimeout(timer);
      }
      debounceTimers.current.clear();
      
      // Flush the logger
      await logger.flush();
    } catch (error) {
      console.error('Failed to flush activities:', error);
    }
  }, [logger]);

  /**
   * Start session tracking
   */
  const startSession = useCallback(async () => {
    try {
      const sessionId = await logger.startSession();
      if (sessionId) {
        await trackActivity('login', undefined, undefined, { 
          metadata: { session_id: sessionId },
          immediate: true 
        });
      }
      return sessionId;
    } catch (error) {
      console.error('Failed to start session:', error);
      return null;
    }
  }, [logger, trackActivity]);

  /**
   * End session tracking
   */
  const endSession = useCallback(async () => {
    try {
      await trackActivity('logout', undefined, undefined, { immediate: true });
      await flushActivities();
      await logger.endSession();
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }, [logger, trackActivity, flushActivities]);

  /**
   * Setup automatic session management
   */
  useEffect(() => {
    if (user) {
      startSession();
    }
    
    return () => {
      if (user) {
        endSession();
      }
    };
  }, [user]); // Only depend on user, not the functions to avoid re-running

  /**
   * Setup cleanup on component unmount
   */
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      
      // Clear all debounce timers
      for (const timer of debounceTimers.current.values()) {
        clearTimeout(timer);
      }
      debounceTimers.current.clear();
      
      // Clear activity cache
      activityCache.current.clear();
    };
  }, []);

  /**
   * Setup page visibility handling
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Flush activities when page becomes hidden
        flushActivities();
      }
    };
    
    const handleBeforeUnload = () => {
      // Flush activities before page unload
      flushActivities();
    };
    
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [flushActivities]);

  /**
   * Performance monitoring effect
   */
  useEffect(() => {
    const interval = setInterval(() => {
      const stats = getPerformanceStats();
      const loggerMetrics = logger.getMetrics();
      
      // Log performance metrics periodically
      console.debug('Activity Tracking Performance:', {
        ...stats,
        loggerMetrics
      });
      
      // Track performance metrics as activities
      if (stats.totalActivities > 0) {
        trackPerformance('activity_tracking_error_rate', stats.errorRate * 100, { unit: '%' });
        trackPerformance('activity_tracking_avg_processing_time', stats.averageProcessingTime, { unit: 'ms' });
        trackPerformance('activity_tracking_deduplication_rate', 
          (stats.deduplicatedActivities / stats.totalActivities) * 100, { unit: '%' });
      }
    }, 5 * 60 * 1000); // Every 5 minutes
    
    return () => clearInterval(interval);
  }, [getPerformanceStats, logger, trackPerformance]);

  return {
    // Core tracking functions
    trackCreate,
    trackUpdate,
    trackDelete,
    trackView,
    trackPageView,
    trackFormSubmission,
    trackSearch,
    trackInteraction,
    trackError,
    trackPerformance,
    
    // Session management
    startSession,
    endSession,
    
    // Utility functions
    flushActivities,
    getPerformanceStats,
    
    // Raw activity tracking for custom use cases
    trackActivity,
    
    // Performance monitoring
    isTracking: !!user,
    performanceStats: getPerformanceStats()
  };
};

// Export convenience hook for backward compatibility
export const useActivityTracking = useOptimizedActivityTracking;

// Export performance monitoring hook
export const useActivityTrackingPerformance = () => {
  const { getPerformanceStats } = useOptimizedActivityTracking();
  return getPerformanceStats();
};