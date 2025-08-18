import React from 'react';
import { CircuitBreaker } from './CircuitBreaker';
import { PerformanceMonitor } from './PerformanceMonitor';
import { ErrorBoundary } from './ErrorBoundary';
import { OptimizedUserActivity } from './OptimizedUserActivity';
import { useOptimizedActivityTracking } from '../hooks/useOptimizedActivityTracking';

/**
 * Example component demonstrating how to integrate all the optimized
 * activity tracking components together for maximum performance and reliability.
 */
export const OptimizedActivityExample: React.FC = () => {
  const { trackPageView, trackSearch, getPerformanceMetrics } = useOptimizedActivityTracking();

  React.useEffect(() => {
    // Track page view when component mounts
    trackPageView('/admin/user-activity-optimized', {
      section: 'admin',
      feature: 'optimized-activity-tracking'
    });
  }, [trackPageView]);

  const handleSearch = (query: string) => {
    trackSearch(query, {
      section: 'user-activity',
      resultsCount: 0 // This would be the actual results count
    });
  };

  const performanceMetrics = getPerformanceMetrics();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Performance Monitor - Shows in development mode */}
      <PerformanceMonitor compact className="fixed bottom-4 right-4 z-50" />
      
      {/* Main Content with Error Boundary and Circuit Breaker */}
      <ErrorBoundary
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Something went wrong
              </h2>
              <p className="text-gray-600 mb-4">
                The activity tracking system encountered an error.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Reload Page
              </button>
            </div>
          </div>
        }
      >
        <CircuitBreaker
          name="user-activity-dashboard"
          failureThreshold={3}
          recoveryTimeout={30000} // 30 seconds
          monitoringPeriod={300000} // 5 minutes
          fallback={
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Service Temporarily Unavailable
                </h2>
                <p className="text-gray-600 mb-4">
                  The user activity dashboard is experiencing issues and has been temporarily disabled.
                  It will automatically retry shortly.
                </p>
                <div className="text-sm text-gray-500">
                  This helps prevent cascading failures and maintains system stability.
                </div>
              </div>
            </div>
          }
          onStateChange={(state) => {
            console.log(`Circuit breaker state changed to: ${state}`);
            // You could also track this as an activity
            if (state === 'OPEN') {
              // Track circuit breaker activation
              console.warn('Circuit breaker opened for user activity dashboard');
            }
          }}
          onFailure={(error) => {
            console.error('Circuit breaker recorded failure:', error);
            // You could send this to an error tracking service
          }}
        >
          <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Optimized User Activity Dashboard
              </h1>
              <p className="text-gray-600">
                Enhanced with performance monitoring, circuit breakers, and optimized activity tracking.
              </p>
              
              {/* Performance Metrics Display (Development Only) */}
              {process.env.NODE_ENV === 'development' && performanceMetrics && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">
                    Performance Metrics (Development)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-blue-700 font-medium">Batch Size</div>
                      <div className="text-blue-900">{performanceMetrics.batchSize}</div>
                    </div>
                    <div>
                      <div className="text-blue-700 font-medium">Queue Length</div>
                      <div className="text-blue-900">{performanceMetrics.queueLength}</div>
                    </div>
                    <div>
                      <div className="text-blue-700 font-medium">Success Rate</div>
                      <div className="text-blue-900">{performanceMetrics.successRate.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-blue-700 font-medium">Avg Response</div>
                      <div className="text-blue-900">{performanceMetrics.averageResponseTime.toFixed(0)}ms</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Search Example */}
            <div className="mb-6">
              <div className="max-w-md">
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                  Search Users (Demonstrates Debounced Activity Tracking)
                </label>
                <input
                  type="text"
                  id="search"
                  placeholder="Type to search users..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onChange={(e) => handleSearch(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Search activity is automatically debounced and tracked asynchronously.
                </p>
              </div>
            </div>
            
            {/* Optimized User Activity Component */}
            <OptimizedUserActivity />
          </div>
        </CircuitBreaker>
      </ErrorBoundary>
    </div>
  );
};

export default OptimizedActivityExample;