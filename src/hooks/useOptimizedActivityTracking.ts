import { useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Performance monitoring interface
interface PerformanceMetrics {
  totalLogs: number;
  successfulLogs: number;
  failedLogs: number;
  averageLatency: number;
  circuitBreakerTrips: number;
  debouncedCalls: number;
}

// Activity log entry interface
interface ActivityLogEntry {
  user_id: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: Record<string, any>;
  timestamp: string;
  session_id?: string;
  ip_address?: string;
}

// Circuit breaker states
type CircuitBreakerState = 'closed' | 'open' | 'half-open';

// Debounce configuration
interface DebounceConfig {
  delay: number;
  maxWait: number;
}

// Default configurations
const DEFAULT_DEBOUNCE_CONFIG: DebounceConfig = {
  delay: 300, // 300ms debounce delay
  maxWait: 1000 // Maximum 1 second wait
};

const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,
  resetTimeout: 30000, // 30 seconds
  halfOpenMaxCalls: 3
};

const BATCH_CONFIG = {
  maxSize: 20,
  flushInterval: 2000 // 2 seconds
};

class OptimizedActivityLogger {
  private batch: ActivityLogEntry[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private circuitBreakerState: CircuitBreakerState = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private halfOpenCalls = 0;
  private metrics: PerformanceMetrics = {
    totalLogs: 0,
    successfulLogs: 0,
    failedLogs: 0,
    averageLatency: 0,
    circuitBreakerTrips: 0,
    debouncedCalls: 0
  };
  private latencySum = 0;
  private sessionId: string | null = null;
  private ipAddress: string | null = null;

  constructor(private queryClient: ReturnType<typeof useQueryClient>) {
    this.initializeSession();
  }

  private async initializeSession() {
    try {
      // Get or create session
      const { data: session } = await supabase
        .from('user_sessions')
        .select('session_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .eq('ended_at', null)
        .single();

      this.sessionId = session?.session_id || crypto.randomUUID();
      
      // Get IP address (non-blocking)
      this.getIPAddress();
    } catch (error) {
      console.warn('Failed to initialize session:', error);
      this.sessionId = crypto.randomUUID();
    }
  }

  private async getIPAddress() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      this.ipAddress = data.ip;
    } catch (error) {
      // Fallback to local IP detection or use placeholder
      this.ipAddress = 'unknown';
    }
  }

  private isCircuitBreakerOpen(): boolean {
    if (this.circuitBreakerState === 'open') {
      if (Date.now() - this.lastFailureTime > CIRCUIT_BREAKER_CONFIG.resetTimeout) {
        this.circuitBreakerState = 'half-open';
        this.halfOpenCalls = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  private handleSuccess() {
    this.failureCount = 0;
    this.metrics.successfulLogs++;
    
    if (this.circuitBreakerState === 'half-open') {
      this.circuitBreakerState = 'closed';
    }
  }

  private handleFailure() {
    this.failureCount++;
    this.metrics.failedLogs++;
    this.lastFailureTime = Date.now();

    if (this.circuitBreakerState === 'half-open') {
      this.circuitBreakerState = 'open';
      this.metrics.circuitBreakerTrips++;
    } else if (this.failureCount >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
      this.circuitBreakerState = 'open';
      this.metrics.circuitBreakerTrips++;
    }
  }

  async logActivity(entry: Omit<ActivityLogEntry, 'timestamp' | 'session_id' | 'ip_address'>) {
    // Circuit breaker check
    if (this.isCircuitBreakerOpen()) {
      console.warn('Activity logging circuit breaker is open, skipping log');
      return;
    }

    if (this.circuitBreakerState === 'half-open') {
      this.halfOpenCalls++;
      if (this.halfOpenCalls > CIRCUIT_BREAKER_CONFIG.halfOpenMaxCalls) {
        this.circuitBreakerState = 'open';
        this.metrics.circuitBreakerTrips++;
        return;
      }
    }

    const activityEntry: ActivityLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      session_id: this.sessionId,
      ip_address: this.ipAddress
    };

    this.batch.push(activityEntry);
    this.metrics.totalLogs++;

    // Auto-flush if batch is full
    if (this.batch.length >= BATCH_CONFIG.maxSize) {
      await this.flushBatch();
    } else {
      this.scheduleBatchFlush();
    }
  }

  private scheduleBatchFlush() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(() => {
      this.flushBatch();
    }, BATCH_CONFIG.flushInterval);
  }

  private async flushBatch() {
    if (this.batch.length === 0) return;

    const startTime = performance.now();
    const batchToFlush = [...this.batch];
    this.batch = [];

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    try {
      const { error } = await supabase
        .from('user_activities')
        .insert(batchToFlush);

      if (error) throw error;

      const latency = performance.now() - startTime;
      this.latencySum += latency;
      this.metrics.averageLatency = this.latencySum / this.metrics.successfulLogs;
      
      this.handleSuccess();
      
      // Selective query invalidation instead of invalidating all queries
      this.invalidateRelevantQueries(batchToFlush);
    } catch (error) {
      console.error('Failed to flush activity batch:', error);
      this.handleFailure();
      
      // Re-add failed entries to batch for retry (with limit)
      if (this.batch.length < BATCH_CONFIG.maxSize) {
        this.batch.unshift(...batchToFlush.slice(0, BATCH_CONFIG.maxSize - this.batch.length));
      }
    }
  }

  private invalidateRelevantQueries(activities: ActivityLogEntry[]) {
    // Only invalidate specific queries based on the activities logged
    const entityTypes = new Set(activities.map(a => a.entity_type).filter(Boolean));
    const userIds = new Set(activities.map(a => a.user_id));

    // Invalidate activity metrics only if needed
    if (activities.length > 0) {
      this.queryClient.invalidateQueries({ queryKey: ['activity-metrics'] });
    }

    // Invalidate user-specific queries only for affected users
    userIds.forEach(userId => {
      this.queryClient.invalidateQueries({ 
        queryKey: ['user-activities', userId],
        exact: false 
      });
    });

    // Invalidate entity-specific queries only for affected entity types
    entityTypes.forEach(entityType => {
      this.queryClient.invalidateQueries({ 
        queryKey: ['activities', entityType],
        exact: false 
      });
    });
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getCircuitBreakerState(): CircuitBreakerState {
    return this.circuitBreakerState;
  }

  async forceFlush() {
    await this.flushBatch();
  }

  cleanup() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    // Flush any remaining activities
    this.flushBatch();
  }
}

// Debounced function wrapper
function createDebouncedFunction<T extends (...args: any[]) => void>(
  func: T,
  config: DebounceConfig = DEFAULT_DEBOUNCE_CONFIG
): T & { cancel: () => void; flush: () => void } {
  let timeoutId: NodeJS.Timeout | null = null;
  let maxTimeoutId: NodeJS.Timeout | null = null;
  let lastCallTime = 0;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;

  const debouncedFunc = function (this: any, ...args: Parameters<T>) {
    lastArgs = args;
    lastThis = this;
    const now = Date.now();

    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Set up max wait timeout if this is the first call in a series
    if (!maxTimeoutId) {
      lastCallTime = now;
      maxTimeoutId = setTimeout(() => {
        if (lastArgs) {
          func.apply(lastThis, lastArgs);
          lastArgs = null;
          lastThis = null;
        }
        maxTimeoutId = null;
      }, config.maxWait);
    }

    // Set up regular debounce timeout
    timeoutId = setTimeout(() => {
      if (maxTimeoutId) {
        clearTimeout(maxTimeoutId);
        maxTimeoutId = null;
      }
      if (lastArgs) {
        func.apply(lastThis, lastArgs);
        lastArgs = null;
        lastThis = null;
      }
      timeoutId = null;
    }, config.delay);
  } as T & { cancel: () => void; flush: () => void };

  debouncedFunc.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (maxTimeoutId) {
      clearTimeout(maxTimeoutId);
      maxTimeoutId = null;
    }
    lastArgs = null;
    lastThis = null;
  };

  debouncedFunc.flush = () => {
    if (lastArgs) {
      if (timeoutId) clearTimeout(timeoutId);
      if (maxTimeoutId) clearTimeout(maxTimeoutId);
      func.apply(lastThis, lastArgs);
      timeoutId = null;
      maxTimeoutId = null;
      lastArgs = null;
      lastThis = null;
    }
  };

  return debouncedFunc;
}

export function useOptimizedActivityTracking() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const loggerRef = useRef<OptimizedActivityLogger | null>(null);
  const metricsRef = useRef<PerformanceMetrics>({
    totalLogs: 0,
    successfulLogs: 0,
    failedLogs: 0,
    averageLatency: 0,
    circuitBreakerTrips: 0,
    debouncedCalls: 0
  });

  // Initialize logger
  useEffect(() => {
    if (user && !loggerRef.current) {
      loggerRef.current = new OptimizedActivityLogger(queryClient);
    }
    return () => {
      if (loggerRef.current) {
        loggerRef.current.cleanup();
      }
    };
  }, [user, queryClient]);

  // Base logging function (non-blocking)
  const logActivity = useCallback(async (
    action: string,
    entityType?: string,
    entityId?: string,
    details?: Record<string, any>
  ) => {
    if (!user || !loggerRef.current) return;

    // Fire and forget - don't await to avoid blocking UI
    loggerRef.current.logActivity({
      user_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details
    }).catch(error => {
      console.warn('Activity logging failed:', error);
    });
  }, [user]);

  // Debounced logging functions for rapid actions
  const debouncedLogActivity = useCallback(
    createDebouncedFunction((action: string, entityType?: string, entityId?: string, details?: Record<string, any>) => {
      metricsRef.current.debouncedCalls++;
      logActivity(action, entityType, entityId, details);
    }),
    [logActivity]
  );

  // CRUD operations (debounced)
  const trackCreate = useCallback((entityType: string, entityId: string, details?: Record<string, any>) => {
    debouncedLogActivity('create', entityType, entityId, details);
  }, [debouncedLogActivity]);

  const trackUpdate = useCallback((entityType: string, entityId: string, details?: Record<string, any>) => {
    debouncedLogActivity('update', entityType, entityId, details);
  }, [debouncedLogActivity]);

  const trackDelete = useCallback((entityType: string, entityId: string, details?: Record<string, any>) => {
    debouncedLogActivity('delete', entityType, entityId, details);
  }, [debouncedLogActivity]);

  const trackView = useCallback((entityType: string, entityId: string, details?: Record<string, any>) => {
    debouncedLogActivity('view', entityType, entityId, details);
  }, [debouncedLogActivity]);

  // Page navigation (immediate logging)
  const trackPageView = useCallback((page: string, details?: Record<string, any>) => {
    logActivity('page_view', 'page', page, details);
  }, [logActivity]);

  // Form interactions (debounced)
  const trackFormSubmit = useCallback((formType: string, details?: Record<string, any>) => {
    debouncedLogActivity('form_submit', 'form', formType, details);
  }, [debouncedLogActivity]);

  // Search actions (heavily debounced)
  const trackSearch = useCallback(
    createDebouncedFunction((query: string, entityType?: string, details?: Record<string, any>) => {
      logActivity('search', entityType || 'general', query, { query, ...details });
    }, { delay: 500, maxWait: 2000 }),
    [logActivity]
  );

  // Export actions (immediate)
  const trackExport = useCallback((exportType: string, entityType?: string, details?: Record<string, any>) => {
    logActivity('export', entityType, exportType, details);
  }, [logActivity]);

  // Bulk operations (immediate)
  const trackBulkOperation = useCallback((operation: string, entityType: string, count: number, details?: Record<string, any>) => {
    logActivity('bulk_operation', entityType, operation, { count, ...details });
  }, [logActivity]);

  // Performance monitoring
  const getPerformanceMetrics = useCallback(() => {
    const loggerMetrics = loggerRef.current?.getMetrics() || metricsRef.current;
    return {
      ...loggerMetrics,
      debouncedCalls: metricsRef.current.debouncedCalls,
      circuitBreakerState: loggerRef.current?.getCircuitBreakerState() || 'closed'
    };
  }, []);

  // Force flush for critical operations
  const forceFlush = useCallback(async () => {
    if (loggerRef.current) {
      await loggerRef.current.forceFlush();
    }
  }, []);

  return {
    // Core tracking functions
    trackCreate,
    trackUpdate,
    trackDelete,
    trackView,
    trackPageView,
    trackFormSubmit,
    trackSearch,
    trackExport,
    trackBulkOperation,
    
    // Utility functions
    logActivity,
    getPerformanceMetrics,
    forceFlush,
    
    // Debounced function controls
    cancelPendingLogs: () => {
      debouncedLogActivity.cancel();
      trackSearch.cancel();
    },
    flushPendingLogs: () => {
      debouncedLogActivity.flush();
      trackSearch.flush();
    }
  };
}

// Convenience hooks for specific entity types
export function useClusterTracking() {
  const tracking = useOptimizedActivityTracking();
  
  return {
    trackClusterCreate: (clusterId: string, details?: Record<string, any>) => 
      tracking.trackCreate('cluster', clusterId, details),
    trackClusterUpdate: (clusterId: string, details?: Record<string, any>) => 
      tracking.trackUpdate('cluster', clusterId, details),
    trackClusterDelete: (clusterId: string, details?: Record<string, any>) => 
      tracking.trackDelete('cluster', clusterId, details),
    trackClusterView: (clusterId: string, details?: Record<string, any>) => 
      tracking.trackView('cluster', clusterId, details),
    ...tracking
  };
}

export function usePathwayTracking() {
  const tracking = useOptimizedActivityTracking();
  
  return {
    trackPathwayCreate: (pathwayId: string, details?: Record<string, any>) => 
      tracking.trackCreate('pathway', pathwayId, details),
    trackPathwayUpdate: (pathwayId: string, details?: Record<string, any>) => 
      tracking.trackUpdate('pathway', pathwayId, details),
    trackPathwayDelete: (pathwayId: string, details?: Record<string, any>) => 
      tracking.trackDelete('pathway', pathwayId, details),
    trackPathwayView: (pathwayId: string, details?: Record<string, any>) => 
      tracking.trackView('pathway', pathwayId, details),
    ...tracking
  };
}

export default useOptimizedActivityTracking;