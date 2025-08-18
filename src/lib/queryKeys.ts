// Query key factories for consistent cache key management
// This ensures we have a centralized way to manage all query keys

export const queryKeys = {
  // Authentication queries
  auth: {
    all: ['auth'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
    session: () => [...queryKeys.auth.all, 'session'] as const,
    permissions: (userId: string) => [...queryKeys.auth.all, 'permissions', userId] as const,
    users: () => [...queryKeys.auth.all, 'users'] as const,
    profile: (userId: string) => [...queryKeys.auth.all, 'profile', userId] as const,
  },

  // User queries
  users: {
    all: ['users'] as const,
    list: (search?: string) => [...queryKeys.users.all, 'list', search] as const,
  },

  // Project-related queries
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.projects.lists(), filters] as const,
    details: () => [...queryKeys.projects.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.projects.details(), id] as const,
    issues: () => [...queryKeys.projects.all, 'issues'] as const,
    interventions: () => [...queryKeys.projects.all, 'interventions'] as const,
    actions: () => [...queryKeys.projects.all, 'actions'] as const,
    clusters: () => [...queryKeys.projects.all, 'clusters'] as const,
  },

  // Cluster queries
  clusters: {
    all: ['clusters'] as const,
    lists: () => [...queryKeys.clusters.all, 'list'] as const,
    list: (projectId: string, filters?: Record<string, unknown>) => 
      [...queryKeys.clusters.lists(), projectId, filters] as const,
    details: () => [...queryKeys.clusters.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.clusters.details(), id] as const,
    pathways: (clusterId: string) => [...queryKeys.clusters.detail(clusterId), 'pathways'] as const,
  },

  // Pathway queries
  pathways: {
    all: ['pathways'] as const,
    lists: () => [...queryKeys.pathways.all, 'list'] as const,
    list: (clusterId: string, filters?: Record<string, unknown>) => 
      [...queryKeys.pathways.lists(), clusterId, filters] as const,
    byCluster: (clusterId: string) => [...queryKeys.pathways.lists(), clusterId] as const,
    details: () => [...queryKeys.pathways.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.pathways.details(), id] as const,
    interventions: (pathwayId: string) => [...queryKeys.pathways.detail(pathwayId), 'interventions'] as const,
  },

  // Intervention queries
  interventions: {
    all: ['interventions'] as const,
    lists: () => [...queryKeys.interventions.all, 'list'] as const,
    list: (pathwayId: string, filters?: Record<string, unknown>) => 
      [...queryKeys.interventions.lists(), pathwayId, filters] as const,
    details: () => [...queryKeys.interventions.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.interventions.details(), id] as const,
    actions: (interventionId: string) => [...queryKeys.interventions.detail(interventionId), 'actions'] as const,
  },

  // Action queries
  actions: {
    all: ['actions'] as const,
    lists: () => [...queryKeys.actions.all, 'list'] as const,
    list: (interventionId: string, filters?: Record<string, unknown>) => 
      [...queryKeys.actions.lists(), interventionId, filters] as const,
    details: () => [...queryKeys.actions.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.actions.details(), id] as const,
  },

  // Report queries
  reports: {
    all: ['reports'] as const,
    analytics: (filters?: Record<string, unknown>) => [...queryKeys.reports.all, 'analytics', filters] as const,
    dashboard: (filters?: Record<string, unknown>) => [...queryKeys.reports.all, 'dashboard', filters] as const,
    performance: (filters?: Record<string, unknown>) => 
      [...queryKeys.reports.all, 'performance', filters] as const,
    activitySummary: (filters?: Record<string, unknown>) => 
      [...queryKeys.reports.all, 'activitySummary', filters] as const,
    templates: {
      all: () => [...queryKeys.reports.all, 'templates'] as const,
      lists: () => [...queryKeys.reports.templates.all(), 'list'] as const,
      list: (filters?: Record<string, unknown>) => [...queryKeys.reports.templates.lists(), filters] as const,
      details: () => [...queryKeys.reports.templates.all(), 'detail'] as const,
      detail: (id: string) => [...queryKeys.reports.templates.details(), id] as const,
    },
    generated: {
      all: () => [...queryKeys.reports.all, 'generated'] as const,
      lists: () => [...queryKeys.reports.generated.all(), 'list'] as const,
      list: (filters?: Record<string, unknown>) => [...queryKeys.reports.generated.lists(), filters] as const,
      byIntervention: (interventionId: string) => [...queryKeys.reports.generated.all(), 'intervention', interventionId] as const,
      details: () => [...queryKeys.reports.generated.all(), 'detail'] as const,
      detail: (id: string) => [...queryKeys.reports.generated.details(), id] as const,
    },
  },

  // User activity queries
  activities: {
    all: ['activities'] as const,
    lists: () => [...queryKeys.activities.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.activities.all, 'list', filters] as const,
    paginated: (page: number, limit: number, filters?: Record<string, unknown>) =>
      [...queryKeys.activities.all, 'paginated', page, limit, filters] as const,
    sessions: (filters?: Record<string, unknown>) => [...queryKeys.activities.all, 'sessions', filters] as const,
    currentSession: () => [...queryKeys.activities.all, 'currentSession'] as const,
    metrics: (filters?: Record<string, unknown>) => [...queryKeys.activities.all, 'metrics', filters] as const,
  },

  // Jobs and targets
  jobs: {
    all: ['jobs'] as const,
    lists: () => [...queryKeys.jobs.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.jobs.lists(), filters] as const,
    details: () => [...queryKeys.jobs.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.jobs.details(), id] as const,
  },

  targets: {
    all: ['targets'] as const,
    lists: () => [...queryKeys.targets.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.targets.lists(), filters] as const,
    details: () => [...queryKeys.targets.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.targets.details(), id] as const,
    history: (targetId: string) => [...queryKeys.targets.detail(targetId), 'history'] as const,
    summary: (filters?: Record<string, unknown>) => [...queryKeys.targets.all, 'summary', filters] as const,
    recent: (filters?: Record<string, unknown>) => [...queryKeys.targets.all, 'recent', filters] as const,
    filterOptions: () => [...queryKeys.targets.all, 'filterOptions'] as const,
  },

  // Issues
  issues: {
    all: ['issues'] as const,
    lists: () => [...queryKeys.issues.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.issues.lists(), filters] as const,
    details: () => [...queryKeys.issues.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.issues.details(), id] as const,
  },

  // Dashboard queries
  dashboard: {
    all: ['dashboard'] as const,
    userItems: (userId?: string) => [...queryKeys.dashboard.all, 'userItems', userId] as const,
    adminData: () => [...queryKeys.dashboard.all, 'adminData'] as const,
  },

  // Admin queries
  admin: {
    all: ['admin'] as const,
    userActivity: () => [...queryKeys.admin.all, 'userActivity'] as const,
    userDetail: (userId: string) => [...queryKeys.admin.all, 'userDetail', userId] as const,
  },

  // System settings queries
  systemSettings: {
    all: ['systemSettings'] as const,
    settings: () => [...queryKeys.systemSettings.all, 'settings'] as const,
    logo: () => [...queryKeys.systemSettings.all, 'logo'] as const,
  },


};

// Helper function to invalidate related queries
export const invalidationPatterns = {
  // When a project is updated, invalidate all related data
  project: (projectId: string) => [
    queryKeys.projects.detail(projectId),
    queryKeys.clusters.list(projectId),
    queryKeys.reports.dashboard(),
  ],

  // When a cluster is updated, invalidate pathways and reports
  cluster: (clusterId: string, projectId: string) => [
    queryKeys.clusters.detail(clusterId),
    queryKeys.pathways.list(clusterId),
    queryKeys.projects.detail(projectId),
    queryKeys.reports.dashboard(),
  ],

  // When a pathway is updated, invalidate interventions and parent cluster
  pathway: (pathwayId: string, clusterId: string, projectId: string) => [
    queryKeys.pathways.detail(pathwayId),
    queryKeys.interventions.list(pathwayId),
    queryKeys.clusters.detail(clusterId),
    queryKeys.projects.detail(projectId),
  ],

  // When an intervention is updated, invalidate actions and parent pathway
  intervention: (interventionId: string, pathwayId: string, clusterId: string) => [
    queryKeys.interventions.detail(interventionId),
    queryKeys.actions.list(interventionId),
    queryKeys.pathways.detail(pathwayId),
    queryKeys.clusters.detail(clusterId),
  ],

  // When an action is updated, invalidate parent intervention
  action: (actionId: string, interventionId: string, pathwayId: string) => [
    queryKeys.actions.detail(actionId),
    queryKeys.interventions.detail(interventionId),
    queryKeys.pathways.detail(pathwayId),
  ],
};