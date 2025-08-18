import React, { useState, useEffect, useCallback, useRef, ReactNode, Component, ErrorInfo } from 'react';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  fallback?: ReactNode;
  onStateChange?: (state: CircuitState) => void;
  onFailure?: (error: Error) => void;
}

interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface CircuitBreakerProps extends CircuitBreakerConfig {
  children: ReactNode;
  name?: string;
}

interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
  successCount: number;
}

class CircuitBreakerManager {
  private circuits = new Map<string, CircuitBreakerState>();
  private timers = new Map<string, number>();
  private eventListeners = new Map<string, (() => void)[]>();

  getCircuit(name: string): CircuitBreakerState {
    if (!this.circuits.has(name)) {
      this.circuits.set(name, {
        state: 'CLOSED',
        failureCount: 0,
        lastFailureTime: 0,
        nextAttemptTime: 0,
        successCount: 0,
      });
    }
    return this.circuits.get(name)!;
  }

  recordSuccess(name: string, config: CircuitBreakerConfig): void {
    const circuit = this.getCircuit(name);
    circuit.successCount++;
    circuit.failureCount = 0;
    
    if (circuit.state === 'HALF_OPEN') {
      this.setState(name, 'CLOSED', config);
    }
  }

  recordFailure(name: string, config: CircuitBreakerConfig, error: Error): void {
    const circuit = this.getCircuit(name);
    circuit.failureCount++;
    circuit.lastFailureTime = Date.now();
    
    config.onFailure?.(error);
    
    if (circuit.state === 'CLOSED' && circuit.failureCount >= config.failureThreshold) {
      this.setState(name, 'OPEN', config);
      this.scheduleRecovery(name, config);
    } else if (circuit.state === 'HALF_OPEN') {
      this.setState(name, 'OPEN', config);
      this.scheduleRecovery(name, config);
    }
  }

  canExecute(name: string): boolean {
    const circuit = this.getCircuit(name);
    
    switch (circuit.state) {
      case 'CLOSED':
        return true;
      case 'OPEN':
        return Date.now() >= circuit.nextAttemptTime;
      case 'HALF_OPEN':
        return true;
      default:
        return false;
    }
  }

  private setState(name: string, state: CircuitState, config: CircuitBreakerConfig): void {
    const circuit = this.getCircuit(name);
    const previousState = circuit.state;
    circuit.state = state;
    
    if (state === 'HALF_OPEN') {
      circuit.failureCount = 0;
      circuit.successCount = 0;
    }
    
    if (previousState !== state) {
      config.onStateChange?.(state);
      console.log(`Circuit breaker '${name}' state changed: ${previousState} -> ${state}`);
    }
  }

  private scheduleRecovery(name: string, config: CircuitBreakerConfig): void {
    const circuit = this.getCircuit(name);
    circuit.nextAttemptTime = Date.now() + config.recoveryTimeout;
    
    // Clear existing timer
    const existingTimer = this.timers.get(name);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Schedule recovery attempt
    const timer = window.setTimeout(() => {
      if (circuit.state === 'OPEN') {
        this.setState(name, 'HALF_OPEN', config);
      }
      this.timers.delete(name);
    }, config.recoveryTimeout);
    
    this.timers.set(name, timer);
  }

  addEventListener(name: string, cleanup: () => void): void {
    const listeners = this.eventListeners.get(name) || [];
    listeners.push(cleanup);
    this.eventListeners.set(name, listeners);
  }

  removeEventListeners(name: string): void {
    const listeners = this.eventListeners.get(name) || [];
    listeners.forEach(cleanup => cleanup());
    this.eventListeners.delete(name);
  }

  getState(name: string): CircuitState {
    return this.getCircuit(name).state;
  }

  getStats(name: string): CircuitBreakerStats {
    const circuit = this.getCircuit(name);
    return {
      state: circuit.state,
      failureCount: circuit.failureCount,
      successCount: circuit.successCount,
      lastFailureTime: circuit.lastFailureTime,
      nextAttemptTime: circuit.nextAttemptTime,
    };
  }

  reset(name: string, config: CircuitBreakerConfig): void {
    const circuit = this.getCircuit(name);
    circuit.failureCount = 0;
    circuit.successCount = 0;
    circuit.lastFailureTime = 0;
    circuit.nextAttemptTime = 0;
    this.setState(name, 'CLOSED', config);
    
    const timer = this.timers.get(name);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(name);
    }
    
    this.removeEventListeners(name);
  }

  cleanup(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    
    this.eventListeners.forEach(listeners => {
      listeners.forEach(cleanup => cleanup());
    });
    this.eventListeners.clear();
    
    this.circuits.clear();
  }
}

// Simple SVG icon components
const AlertCircleIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const ClockIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckCircleIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// Error boundary class component
class CircuitBreakerErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode; onError?: (error: Error, errorInfo: ErrorInfo) => void },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode; onError?: (error: Error, errorInfo: ErrorInfo) => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('CircuitBreaker Error Boundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-2">
          <div className="flex items-center">
            <AlertCircleIcon className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-sm font-medium text-red-800">Something went wrong</span>
          </div>
          {this.state.error && (
            <p className="mt-2 text-xs text-red-700 font-mono bg-red-100 p-2 rounded">
              {this.state.error.message}
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Global circuit breaker manager
const globalCircuitManager = new CircuitBreakerManager();

// Circuit breaker hook
export function useCircuitBreaker(
  name: string,
  config: CircuitBreakerConfig
) {
  const [state, setState] = useState<CircuitState>(() => globalCircuitManager.getState(name));
  const configRef = useRef(config);
  const stateChangeHandlerRef = useRef<((newState: CircuitState) => void) | null>(null);
  
  // Update config ref without causing re-renders
  configRef.current = config;

  useEffect(() => {
    const handleStateChange = (newState: CircuitState) => {
      setState(prevState => prevState !== newState ? newState : prevState);
    };

    stateChangeHandlerRef.current = handleStateChange;
    
    const originalOnStateChange = configRef.current.onStateChange;
    const wrappedOnStateChange = (newState: CircuitState) => {
      handleStateChange(newState);
      originalOnStateChange?.(newState);
    };
    
    configRef.current.onStateChange = wrappedOnStateChange;
    
    // Register cleanup with circuit manager
    const cleanup = () => {
      configRef.current.onStateChange = originalOnStateChange;
    };
    globalCircuitManager.addEventListener(name, cleanup);

    return cleanup;
  }, [name]);

  const execute = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    if (!globalCircuitManager.canExecute(name)) {
      throw new Error(`Circuit breaker '${name}' is OPEN`);
    }

    try {
      const result = await operation();
      globalCircuitManager.recordSuccess(name, configRef.current);
      return Promise.resolve(result);
    } catch (error) {
      globalCircuitManager.recordFailure(name, configRef.current, error as Error);
      throw error;
    }
  }, [name]);

  const executeSync = useCallback(<T extends unknown>(operation: () => T): T => {
    if (!globalCircuitManager.canExecute(name)) {
      throw new Error(`Circuit breaker '${name}' is OPEN`);
    }

    try {
      const result = operation();
      globalCircuitManager.recordSuccess(name, configRef.current);
      return result;
    } catch (error) {
      globalCircuitManager.recordFailure(name, configRef.current, error as Error);
      throw error;
    }
  }, [name]);

  const reset = useCallback(() => {
    globalCircuitManager.reset(name, configRef.current);
  }, [name]);

  const getStats = useCallback(() => {
    return globalCircuitManager.getStats(name);
  }, [name]);

  return {
    state,
    execute,
    executeSync,
    reset,
    getStats,
    canExecute: globalCircuitManager.canExecute(name),
  };
}

// Circuit breaker component
export const CircuitBreaker: React.FC<CircuitBreakerProps> = ({
  children,
  name = 'default',
  failureThreshold = 5,
  recoveryTimeout = 60000, // 1 minute
  monitoringPeriod = 300000, // 5 minutes
  fallback,
  onStateChange,
  onFailure,
}) => {
  const config = {
    failureThreshold,
    recoveryTimeout,
    monitoringPeriod,
    onStateChange,
    onFailure,
  };

  const { state, reset, getStats } = useCircuitBreaker(name, config);
  const stats = getStats();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Update countdown timer for recovery
  useEffect(() => {
    if (state === 'OPEN' && stats.nextAttemptTime > Date.now()) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((stats.nextAttemptTime - Date.now()) / 1000));
        setTimeRemaining(remaining);
        if (remaining <= 0) {
          clearInterval(interval);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [state, stats.nextAttemptTime]);

  const handleRetry = () => {
    reset();
  };

  // Show fallback UI when circuit is open
  if (state === 'OPEN') {
    if (fallback) {
      return (
        <CircuitBreakerErrorBoundary fallback={fallback}>
          {fallback}
        </CircuitBreakerErrorBoundary>
      );
    }

    return (
      <CircuitBreakerErrorBoundary>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 m-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertCircleIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                Service Temporarily Unavailable
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  This service is temporarily disabled due to repeated failures. 
                  {timeRemaining > 0 
                    ? `It will automatically retry in ${timeRemaining} seconds.`
                    : 'Attempting to recover...'}
                </p>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleRetry}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-200"
                >
                  Try Again
                </button>
              </div>
              
              {/* Debug info in development */}
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-xs text-yellow-600 hover:text-yellow-800">
                    Circuit Breaker Stats (Development)
                  </summary>
                  <div className="mt-2 text-xs text-yellow-700 bg-yellow-100 p-2 rounded font-mono">
                    <div>Name: {name}</div>
                    <div>State: {stats.state}</div>
                    <div>Failure Count: {stats.failureCount}</div>
                    <div>Success Count: {stats.successCount}</div>
                    <div>Failure Threshold: {failureThreshold}</div>
                    <div>Recovery Timeout: {recoveryTimeout}ms</div>
                    {stats.lastFailureTime > 0 && (
                      <div>Last Failure: {new Date(stats.lastFailureTime).toLocaleString()}</div>
                    )}
                    {stats.nextAttemptTime > 0 && (
                      <div>Next Attempt: {new Date(stats.nextAttemptTime).toLocaleString()}</div>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      </CircuitBreakerErrorBoundary>
    );
  }

  // Show half-open state indicator
  if (state === 'HALF_OPEN') {
    return (
      <CircuitBreakerErrorBoundary>
        <div className="relative">
          <div className="fixed top-4 right-4 z-50 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-lg shadow-sm">
            <ClockIcon className="h-3 w-3 inline mr-1" />
            Testing Recovery
          </div>
          {children}
        </div>
      </CircuitBreakerErrorBoundary>
    );
  }

  // Normal operation
  return (
    <CircuitBreakerErrorBoundary>
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 z-50 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-lg shadow-sm">
          <CheckCircleIcon className="h-3 w-3 inline mr-1" />
          Circuit OK
        </div>
      )}
      {children}
    </CircuitBreakerErrorBoundary>
  );
};

// Higher-order component for circuit breaker
export function withCircuitBreaker<P extends object>(
  Component: React.ComponentType<P>,
  circuitBreakerProps: Omit<CircuitBreakerProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <CircuitBreaker {...circuitBreakerProps}>
      <Component {...props} />
    </CircuitBreaker>
  );

  WrappedComponent.displayName = `withCircuitBreaker(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Cleanup function for tests or app unmount
export function cleanupCircuitBreakers() {
  globalCircuitManager.cleanup();
}

export default CircuitBreaker;