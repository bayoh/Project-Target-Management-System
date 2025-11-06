# API Documentation

This document describes the API functions available in the application. The API is organized into domain-specific modules.

## Table of Contents

- [User API](#user-api)
- [Project API](#project-api)
- [Report API](#report-api)
- [Jobs API](#jobs-api)

## User API

Located in `src/lib/api/users.ts`

### `userApi.getUsers()`

Get all users from the profiles table.

**Returns**: `Promise<User[]>`

**Example**:
```typescript
const users = await userApi.getUsers();
```

### `userApi.getUserById(userId: string)`

Get a user by their ID.

**Parameters**:
- `userId` (string): The user's unique identifier

**Returns**: `Promise<User>`

### `userApi.getProfile(userId: string)`

Get user profile information.

**Parameters**:
- `userId` (string): The user's unique identifier

**Returns**: `Promise<User>`

### `userApi.updateProfile(userId: string, data: UserUpdateData)`

Update user profile information.

**Parameters**:
- `userId` (string): The user's unique identifier
- `data` (UserUpdateData): Profile update data

**UserUpdateData Interface**:
```typescript
interface UserUpdateData {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  role?: 'super_admin' | 'leadership' | 'lead' | 'supporting_staff';
  status?: 'active' | 'inactive';
}
```

### `userApi.createUser(email: string, password: string, userData: UserUpdateData)`

Create a new user account.

**Parameters**:
- `email` (string): User email address
- `password` (string): User password
- `userData` (UserUpdateData): User profile data

**Returns**: `Promise<User>`

### `userApi.updateUserRole(userId: string, role: UserUpdateData['role'])`

Update a user's role.

**Parameters**:
- `userId` (string): The user's unique identifier
- `role`: The new role

### `userApi.searchUsers(query: string)`

Search users by email or full name.

**Parameters**:
- `query` (string): Search query string

**Returns**: `Promise<User[]>`

## Project API

Located in `src/lib/api/projects.ts`

### `projectApi.getClusters()`

Get all clusters with their pathways and interventions.

**Returns**: `Promise<Cluster[]>`

### `projectApi.getInterventions()`

Get all interventions with related pathway and cluster information.

**Returns**: `Promise<Intervention[]>`

### `projectApi.getInterventionById(id: string)`

Get a single intervention with all related data.

**Parameters**:
- `id` (string): Intervention ID

**Returns**: `Promise<Intervention>`

### `projectApi.createIntervention(intervention: Omit<Intervention, 'id' | 'created_at' | 'updated_at' | 'created_by'>)`

Create a new intervention.

**Parameters**:
- `intervention`: Intervention data (without auto-generated fields)

**Returns**: `Promise<Intervention>`

### `projectApi.updateIntervention(id: string, updates: Partial<Intervention>)`

Update an existing intervention.

**Parameters**:
- `id` (string): Intervention ID
- `updates`: Partial intervention data

**Returns**: `Promise<Intervention>`

### `projectApi.deleteIntervention(id: string)`

Delete an intervention and all related data.

**Parameters**:
- `id` (string): Intervention ID

**Returns**: `Promise<boolean>`

### `projectApi.getActions()`

Get all actions with related intervention, pathway, and cluster information.

**Returns**: `Promise<Action[]>`

### `projectApi.createAction(action: Omit<Action, 'id' | 'created_at' | 'updated_at' | 'created_by'>)`

Create a new action.

**Parameters**:
- `action`: Action data

**Returns**: `Promise<Action>`

### `projectApi.updateAction(id: string, updates: Partial<Action>)`

Update an existing action.

**Parameters**:
- `id` (string): Action ID
- `updates`: Partial action data

**Returns**: `Promise<Action>`

### `projectApi.deleteAction(id: string)`

Delete an action and all related data (achievements, issues, needs, comments, targets).

**Parameters**:
- `id` (string): Action ID

**Returns**: `Promise<void>`

### `projectApi.updateActionAssignment(actionIds: string[], leadId: string, supportingStaffIds?: string[])`

Bulk update action assignments.

**Parameters**:
- `actionIds` (string[]): Array of action IDs
- `leadId` (string): Lead user ID
- `supportingStaffIds` (string[], optional): Array of supporting staff IDs

## Report API

Located in `src/lib/api/reports.ts`

### `reportApi.getActionReport(params: ActionParams)`

Get comprehensive report data for an action.

**Parameters**:
```typescript
interface ActionParams {
  actionId: string;
  startDate: Date;
  endDate: Date;
}
```

**Returns**: `Promise<ActionReport>`

**ActionReport Structure**:
- `id`: Action ID
- `name`: Action name
- `description`: Action description
- `status`: Current status
- `lead`: Lead user name
- `supportingStaff`: Array of supporting staff
- `milestones`: Array of achievement milestones
- `keyMilestones`: Top 3 key milestones
- `issues`: Array of issues
- `needs`: Array of needs
- `comments`: Array of comments
- `otherTargets`: Non-job targets
- `jobsTarget`: Formatted job targets string
- `projectCost`: Formatted budget
- `lastUpdated`: Last update timestamp
- `path`: Hierarchical path (Cluster > Pathway > Intervention)

### `reportApi.getActions()`

Get all actions for dropdown selection in reports.

**Returns**: `Promise<Action[]>`

### `reportApi.getAllActionsIssues()`

Get all issues across all actions.

**Returns**: `Promise<Issue[]>`

## Jobs API

Located in `src/lib/api/jobs.ts`

### `jobsApi.getActionStats()`

Get statistics about action statuses.

**Returns**: `Promise<ActionStats>`

**ActionStats Interface**:
```typescript
interface ActionStats {
  total: number;
  completed: number;
  on_track: number;
  off_track: number;
  not_started: number;
}
```

### `jobsApi.getActionStatusByCluster()`

Get action statistics grouped by cluster.

**Returns**: `Promise<ClusterActionStats[]>`

**ClusterActionStats Interface**:
```typescript
interface ClusterActionStats extends ActionStats {
  id: string;
  name: string;
}
```

### `jobsApi.getJobsByCluster()`

Get job statistics grouped by cluster.

**Returns**: `Promise<ClusterJobStats[]>`

**ClusterJobStats Structure**:
- `id`: Cluster ID
- `name`: Cluster name
- `total_jobs`: Total job targets and current values
- `women_jobs`: Women-specific job targets and current values
- `youth_jobs`: Youth-specific job targets and current values

## Error Handling

All API functions throw errors that should be caught and handled appropriately. The application uses a centralized error handler (`src/lib/errorHandler.ts`) that:

- Maps Supabase error codes to user-friendly messages
- Shows toast notifications for errors
- Logs errors for debugging

## Type Definitions

Type definitions are located in `src/types/`:

- `project.ts`: Project-related types (Cluster, Pathway, Intervention, Action, Task)
- `auth.ts`: Authentication-related types
- `queries.ts`: Query filter and parameter types
- `reports.ts`: Report-related types

## Usage Examples

### Using with React Query

```typescript
import { useQuery } from '@tanstack/react-query';
import { projectApi } from '@/lib/api';

function useInterventions() {
  return useQuery({
    queryKey: ['interventions'],
    queryFn: () => projectApi.getInterventions(),
  });
}
```

### Using with Mutations

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectApi } from '@/lib/api';

function useCreateIntervention() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => projectApi.createIntervention(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interventions'] });
    },
  });
}
```

## Notes

- All API functions are async and return Promises
- Functions that modify data will automatically update timestamps
- Deletion functions cascade to related records
- File operations (upload/delete) handle storage cleanup automatically

