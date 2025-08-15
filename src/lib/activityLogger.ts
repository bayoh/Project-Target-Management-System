import { supabase } from './supabase';

export type ActivityActionType = 'login' | 'logout' | 'create' | 'update' | 'delete' | 'view';

export type EntityType = 
  | 'cluster'
  | 'pathway'
  | 'intervention'
  | 'action'
  | 'task'
  | 'indicator'
  | 'indicator_report'
  | 'user'
  | 'help_section'
  | 'help_content'
  | 'navigation';

export interface ActivityLogEntry {
  action_type: ActivityActionType;
  entity_type?: EntityType | null;
  entity_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface SessionData {
  login_time?: string;
  logout_time?: string;
  ip_address?: string;
  user_agent?: string;
  is_active?: boolean;
}

// Shape used when inserting into user_activity_logs
interface ActivityDBInsert {
  user_id: string;
  action_type: ActivityActionType;
  entity_type: EntityType | null;
  entity_id: string | null;
  session_id: string | null;
  ip_address: string | null;
  user_agent: string;
  metadata: Record<string, unknown>;
  activity_timestamp: string;
}

class ActivityLogger {
  private currentSessionId: string | null = null;
  private batchQueue: ActivityDBInsert[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_DELAY = 2000; // 2 seconds
  private cachedIP: string | null = null;
  private ipCacheExpiry: number = 0;
  private readonly IP_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  private isProcessingBatch = false;
  private failedRequestCount = 0;
  private readonly MAX_FAILED_REQUESTS = 5;

  /**
   * Log a single activity
   */
  async logActivity(entry: ActivityLogEntry): Promise<void> {
    try {
      // Circuit breaker: stop logging if too many failures
      if (this.failedRequestCount >= this.MAX_FAILED_REQUESTS) {
        console.warn('Activity logging disabled due to repeated failures');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const logEntry: ActivityDBInsert = {
        user_id: user.id,
        action_type: entry.action_type,
        entity_type: entry.entity_type || null,
        entity_id: entry.entity_id || null,
        session_id: this.currentSessionId,
        ip_address: this.getCachedIP(),
        user_agent: navigator.userAgent,
        metadata: entry.metadata || {},
        activity_timestamp: new Date().toISOString()
      };

      // Add to batch queue for performance
      this.batchQueue.push(logEntry);
      
      // Process batch if it reaches the size limit
      if (this.batchQueue.length >= this.BATCH_SIZE) {
        await this.flushActivities();
      } else {
        // Set timeout to process batch after delay
        this.scheduleBatchProcessing();
      }
    } catch (error) {
      console.error('Failed to log activity:', error);
      this.failedRequestCount++;
      // Don't throw error to avoid disrupting user operations
    }
  }

  /**
   * Log multiple activities at once
   */
  async logBatchActivities(entries: ActivityLogEntry[]): Promise<void> {
    for (const entry of entries) {
      await this.logActivity(entry);
    }
  }

  /**
   * Start a new user session
   */
  async startSession(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const sessionData = {
        user_id: user.id,
        login_time: new Date().toISOString(),
        ip_address: null, // Will be updated asynchronously
        user_agent: navigator.userAgent,
        is_active: true
      };

      const { data, error } = await supabase
        .from('user_sessions')
        .insert(sessionData)
        .select('id')
        .single();

      if (error) throw error;

      this.currentSessionId = data.id;
      
      // Update IP address asynchronously (non-blocking)
      this.updateSessionIP(data.id);
      
      // Log the login activity
      await this.logActivity({ action_type: 'login' });
      
      return data.id;
    } catch (error) {
      console.error('Failed to start session:', error);
      return null;
    }
  }

  /**
   * End the current user session
   */
  async endSession(): Promise<void> {
    try {
      if (!this.currentSessionId) return;

      // Log the logout activity first
      await this.logActivity({ action_type: 'logout' });
      
      // Process any remaining batch items
      await this.flushActivities();

      // Update session record
      await supabase
        .from('user_sessions')
        .update({
          logout_time: new Date().toISOString(),
          is_active: false
        })
        .eq('id', this.currentSessionId);

      this.currentSessionId = null;
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * Process the batch queue
   */
  async flushActivities(): Promise<void> {
    if (this.batchQueue.length === 0 || this.isProcessingBatch) return;

    this.isProcessingBatch = true;
    
    try {
      const batch = [...this.batchQueue];
      this.batchQueue = [];
      
      // Clear any pending timeout
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout);
        this.batchTimeout = null;
      }

      const { error } = await supabase
        .from('user_activity_logs')
        .insert(batch);

      if (error) {
        console.error('Failed to insert activity batch:', error);
        this.failedRequestCount++;
        
        // Only retry if we haven't exceeded max failures
        if (this.failedRequestCount < this.MAX_FAILED_REQUESTS) {
          // Re-add failed items to queue for retry (limit to prevent memory issues)
          const retryBatch = batch.slice(0, Math.min(batch.length, 50));
          this.batchQueue.unshift(...retryBatch);
        }
      } else {
        // Reset failure count on success
        this.failedRequestCount = 0;
      }
    } catch (error) {
      console.error('Failed to process activity batch:', error);
      this.failedRequestCount++;
    } finally {
      this.isProcessingBatch = false;
    }
  }

  /**
   * Schedule batch processing with timeout
   */
  private scheduleBatchProcessing(): void {
    if (this.batchTimeout) return; // Already scheduled

    this.batchTimeout = setTimeout(async () => {
      await this.flushActivities();
    }, this.BATCH_DELAY);
  }

  /**
   * Update session IP address asynchronously
   */
  private async updateSessionIP(sessionId: string): Promise<void> {
    try {
      // Trigger IP fetch if not cached
      if (!this.cachedIP || Date.now() >= this.ipCacheExpiry) {
        await this.fetchAndCacheIP();
      }
      
      if (this.cachedIP) {
        await supabase
          .from('user_sessions')
          .update({ ip_address: this.cachedIP })
          .eq('id', sessionId);
      }
    } catch (error) {
      // Silently fail - IP is not critical
      console.debug('Failed to update session IP:', error);
    }
  }

  /**
   * Get cached IP address or fetch if expired
   */
  private getCachedIP(): string | null {
    const now = Date.now();
    
    // Return cached IP if still valid
    if (this.cachedIP && now < this.ipCacheExpiry) {
      return this.cachedIP;
    }
    
    // Fetch IP asynchronously (non-blocking)
    this.fetchAndCacheIP();
    
    // Return cached IP even if expired (better than null)
    return this.cachedIP;
  }

  /**
   * Fetch and cache IP address asynchronously
   */
  private async fetchAndCacheIP(): Promise<void> {
    try {
      // Use a timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch('https://api.ipify.org?format=json', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const data = await response.json();
      if (data.ip) {
        this.cachedIP = data.ip;
        this.ipCacheExpiry = Date.now() + this.IP_CACHE_DURATION;
      }
    } catch (error) {
      // Silently fail - IP is not critical
      console.debug('Failed to fetch IP address:', error);
    }
  }

  /**
   * Cleanup resources used by the logger
   */
  async cleanup(): Promise<void> {
    // If there's a pending batch, process it before cleaning up
    if (this.batchQueue.length > 0) {
      await this.flushActivities();
    }
    
    // Clear any scheduled batch processing
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    
    // Reset state
    this.currentSessionId = null;
    this.batchQueue = [];
    this.isProcessingBatch = false;
    this.failedRequestCount = 0;
    this.cachedIP = null;
    this.ipCacheExpiry = 0;
  }

}


export const activityLogger = new ActivityLogger();

// Convenience functions for common activities
export const logActivity = {
  // Entity CRUD operations
  create: (entityType: EntityType, entityId: string, metadata?: Record<string, unknown>) => 
    activityLogger.logActivity({ action_type: 'create', entity_type: entityType, entity_id: entityId, metadata }),
  
  update: (entityType: EntityType, entityId: string, metadata?: Record<string, unknown>) => 
    activityLogger.logActivity({ action_type: 'update', entity_type: entityType, entity_id: entityId, metadata }),
  
  delete: (entityType: EntityType, entityId: string, metadata?: Record<string, unknown>) => 
    activityLogger.logActivity({ action_type: 'delete', entity_type: entityType, entity_id: entityId, metadata }),
  
  view: (entityType: EntityType, entityId?: string, metadata?: Record<string, unknown>) => 
    activityLogger.logActivity({ action_type: 'view', entity_type: entityType, entity_id: entityId, metadata }),
  
  // Session management
  login: () => activityLogger.logActivity({ action_type: 'login' }),
  logout: () => activityLogger.logActivity({ action_type: 'logout' })
};

// Hook for React components
export const useActivityLogger = () => {
  return {
    logActivity: activityLogger.logActivity.bind(activityLogger),
    logBatchActivities: activityLogger.logBatchActivities.bind(activityLogger),
    startSession: activityLogger.startSession.bind(activityLogger),
    endSession: activityLogger.endSession.bind(activityLogger),
    getCurrentSessionId: activityLogger.getCurrentSessionId.bind(activityLogger),
    log: logActivity
  };
};

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    activityLogger.cleanup();
  });
}