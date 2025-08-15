// TypeScript types for TanStack Query responses
// These types ensure type safety for all query operations

// Base query response wrapper
export interface QueryResponse<T> {
  data: T;
  error: string | null;
  count?: number;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Filter types for different entities
export interface ProjectFilters {
  status?: string;
  search?: string;
  created_by?: string;
  date_range?: {
    start: string;
    end: string;
  };
}

export interface ClusterFilters {
  project_id?: string;
  status?: string;
  search?: string;
  priority?: string;
}

export interface PathwayFilters {
  cluster_id?: string;
  status?: string;
  search?: string;
  category?: string;
}

export interface InterventionFilters {
  pathway_id?: string;
  status?: string;
  search?: string;
  type?: string;
}

export interface ActionFilters {
  intervention_id?: string;
  status?: string;
  search?: string;
  assigned_to?: string;
  due_date?: string;
}

// Activity tracking types
export interface ActivityFilters {
  user_id?: string;
  entity_type?: string;
  action_type?: string;
  session_id?: string;
  entity_id?: string;
  date_range?: {
    start: string;
    end: string;
  };
}

export interface ActivitySession {
  session_id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  activity_count: number;
  duration_minutes?: number;
}

export interface ActivityMetrics {
  total_activities: number;
  unique_sessions: number;
  average_session_duration: number;
  most_active_day: string;
  activity_by_type: Record<string, number>;
  activity_by_entity: Record<string, number>;
}

export interface ActivitySummary {
  user_id: string;
  date: string;
  total_activities: number;
  session_count: number;
  total_duration_minutes: number;
  entities_accessed: string[];
  actions_performed: string[];
}

// Report-specific types
export interface ReportFilters {
  date_range?: {
    start: string;
    end: string;
  };
  entity_type?: string;
  status?: string;
  user_id?: string;
}

export interface ProjectStats {
  total: number;
  by_status: Record<string, number>;
  completion_rate: number;
  average_duration: number;
}

export interface ClusterStats {
  total: number;
  by_status: Record<string, number>;
  completion_rate: number;
  average_pathways: number;
}

export interface PathwayStats {
  total: number;
  by_status: Record<string, number>;
  completion_rate: number;
  average_interventions: number;
}

// Report types
export interface DashboardData {
  projects: {
    total: number;
    by_status: Record<string, number>;
    recent: unknown[];
  };
  clusters: {
    total: number;
    by_status: Record<string, number>;
    high_priority: unknown[];
  };
  pathways: {
    total: number;
    by_status: Record<string, number>;
    at_risk: unknown[];
  };
  interventions: {
    total: number;
    by_status: Record<string, number>;
    overdue: unknown[];
  };
  actions: {
    total: number;
    by_status: Record<string, number>;
    due_soon: unknown[];
  };
}

export interface AnalyticsData {
  type: string;
  period: string;
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor?: string;
      borderColor?: string;
    }[];
  };
  summary: {
    total: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
  };
}

export interface PerformanceMetrics {
  entity_type: string;
  time_range: string;
  metrics: {
    completion_rate: number;
    average_duration: number;
    success_rate: number;
    error_rate: number;
  };
  trends: {
    period: string;
    values: number[];
  }[];
}

// Job and target types
export interface JobFilters {
  status?: string;
  category?: string;
  subcategory?: string;
  search?: string;
  location?: string;
}

export interface TargetFilters {
  job_id?: string;
  status?: string;
  priority?: string;
  assigned_to?: string;
  due_date?: string;
  category?: string;
}

export interface TargetHistory {
  id: string;
  target_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
  changed_at: string;
  change_reason?: string;
}

// Issue types
export interface IssueFilters {
  status?: string;
  severity?: string;
  category?: string;
  assigned_to?: string;
  reported_by?: string;
  date_range?: {
    start: string;
    end: string;
  };
}

// Mutation types
export interface MutationContext {
  previousData?: unknown;
  optimisticData?: unknown;
}

export interface MutationOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables, context: MutationContext) => void;
  onError?: (error: Error, variables: TVariables, context: MutationContext) => void;
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables, context: MutationContext) => void;
}

// Error types
export interface QueryError {
  message: string;
  code?: string;
  details?: unknown;
  hint?: string;
}

// Cache invalidation types
export interface InvalidationOptions {
  exact?: boolean;
  refetchType?: 'active' | 'inactive' | 'all';
}

// Real-time subscription types
export interface SubscriptionOptions {
  table: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
}

// Query options extensions
export interface ExtendedQueryOptions {
  // Enable real-time subscriptions
  realtime?: boolean;
  // Custom garbage-collection time for this query
  gcTime?: number;
  // Custom stale time for this query
  staleTime?: number;
  // Enable optimistic updates
  optimistic?: boolean;
  // Background refetch interval
  refetchInterval?: number;
}