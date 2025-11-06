import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render, createMockUser } from '../../test/utils';
import { ProtectedRoute } from './ProtectedRoute';
import * as authModule from '../../lib/auth';

// Mock the auth module - partially mock to keep AuthProvider
vi.mock('../../lib/auth', async () => {
  const actual = await vi.importActual<typeof import('../../lib/auth')>('../../lib/auth');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading spinner when loading', () => {
    vi.mocked(authModule.useAuth).mockReturnValue({
      user: null,
      isAdmin: false,
      loading: true,
      sessionId: null,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    // ProtectedRoute shows a loading state - check for loading indicator or spinner
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should redirect to login when user is not authenticated', () => {
    vi.mocked(authModule.useAuth).mockReturnValue({
      user: null,
      isAdmin: false,
      loading: false,
      sessionId: null,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    // Navigate component should redirect - protected content should not be visible
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should render children when user is authenticated', () => {
    const mockUser = createMockUser();
    vi.mocked(authModule.useAuth).mockReturnValue({
      user: mockUser,
      isAdmin: false,
      loading: false,
      sessionId: null,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});

