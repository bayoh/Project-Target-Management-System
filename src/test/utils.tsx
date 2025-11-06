import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../lib/auth';
import type { User } from '@supabase/supabase-js';
import type { Cluster, Pathway, Intervention, Action } from '../types/project';

// Create a test query client with default options for testing
const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
};

// Custom render function with all providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  initialEntries?: string[];
  user?: User | null;
}

const AllTheProviders = ({
  children,
  queryClient: providedQueryClient,
  initialEntries = ['/'],
  user,
}: {
  children: React.ReactNode;
  queryClient?: QueryClient;
  initialEntries?: string[];
  user?: User | null;
}) => {
  const queryClient = providedQueryClient || createTestQueryClient();

  // Mock AuthProvider for testing
  const mockAuthContext = {
    user: user || null,
    isAdmin: user?.user_metadata?.role === 'admin' || user?.user_metadata?.role === 'super_admin' || false,
    loading: false,
    sessionId: null,
  };

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  {
    queryClient,
    initialEntries,
    user,
    ...renderOptions
  }: CustomRenderOptions = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AllTheProviders
      queryClient={queryClient}
      initialEntries={initialEntries}
      user={user}
    >
      {children}
    </AllTheProviders>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Re-export everything from @testing-library/react
export * from '@testing-library/react';
export { customRender as render };

// Mock data factories
export const createMockUser = (overrides?: Partial<User>): User => {
  return {
    id: overrides?.id || 'test-user-id',
    email: overrides?.email || 'test@example.com',
    created_at: overrides?.created_at || new Date().toISOString(),
    app_metadata: overrides?.app_metadata || {},
    user_metadata: {
      role: 'user',
      ...overrides?.user_metadata,
    },
    aud: 'authenticated',
    confirmation_sent_at: null,
    recovery_sent_at: null,
    email_confirmed_at: new Date().toISOString(),
    invited_at: null,
    action_link: null,
    last_sign_in_at: new Date().toISOString(),
    phone: null,
    confirmed_at: new Date().toISOString(),
    ...overrides,
  } as User;
};

export const createMockCluster = (overrides?: Partial<Cluster>): Cluster => {
  return {
    id: overrides?.id || 'test-cluster-id',
    name: overrides?.name || 'Test Cluster',
    code: overrides?.code || 1,
    description: overrides?.description || 'Test cluster description',
    created_by: overrides?.created_by || 'test-user-id',
    created_at: overrides?.created_at || new Date().toISOString(),
    updated_at: overrides?.updated_at || new Date().toISOString(),
    ...overrides,
  };
};

export const createMockPathway = (overrides?: Partial<Pathway>): Pathway => {
  return {
    id: overrides?.id || 'test-pathway-id',
    cluster_id: overrides?.cluster_id || 'test-cluster-id',
    name: overrides?.name || 'Test Pathway',
    code: overrides?.code || 1,
    description: overrides?.description || 'Test pathway description',
    created_by: overrides?.created_by || 'test-user-id',
    created_at: overrides?.created_at || new Date().toISOString(),
    updated_at: overrides?.updated_at || new Date().toISOString(),
    ...overrides,
  };
};

export const createMockIntervention = (overrides?: Partial<Intervention>): Intervention => {
  return {
    id: overrides?.id || 'test-intervention-id',
    pathway_id: overrides?.pathway_id || 'test-pathway-id',
    name: overrides?.name || 'Test Intervention',
    code: overrides?.code || 1,
    description: overrides?.description || 'Test intervention description',
    status: overrides?.status || 'not_started',
    start_date: overrides?.start_date || null,
    end_date: overrides?.end_date || null,
    budget: overrides?.budget || null,
    lead_id: overrides?.lead_id || null,
    created_by: overrides?.created_by || 'test-user-id',
    created_at: overrides?.created_at || new Date().toISOString(),
    updated_at: overrides?.updated_at || new Date().toISOString(),
    ...overrides,
  };
};

export const createMockAction = (overrides?: Partial<Action>): Action => {
  return {
    id: overrides?.id || 'test-action-id',
    intervention_id: overrides?.intervention_id || 'test-intervention-id',
    name: overrides?.name || 'Test Action',
    code: overrides?.code || '1.1',
    description: overrides?.description || 'Test action description',
    status: overrides?.status || 'not_started',
    start_date: overrides?.start_date || null,
    end_date: overrides?.end_date || null,
    actual_startDate: overrides?.actual_startDate || null,
    actual_endDate: overrides?.actual_endDate || null,
    lead_id: overrides?.lead_id || null,
    supporting_staff: overrides?.supporting_staff || [],
    issues: overrides?.issues || [],
    needs: overrides?.needs || [],
    comments: overrides?.comments || [],
    budget: overrides?.budget || null,
    associated_projects: overrides?.associated_projects || [],
    implementing_partners: overrides?.implementing_partners || [],
    created_by: overrides?.created_by || 'test-user-id',
    created_at: overrides?.created_at || new Date().toISOString(),
    updated_at: overrides?.updated_at || new Date().toISOString(),
    ...overrides,
  };
};

// Mock Supabase helpers
export const createMockSupabaseResponse = <T,>(data: T, error: unknown = null) => {
  return {
    data: { data, error },
    error,
  };
};

export const createMockSupabaseError = (message: string, code?: string) => {
  return {
    message,
    code: code || 'UNKNOWN_ERROR',
    details: null,
    hint: null,
  };
};

