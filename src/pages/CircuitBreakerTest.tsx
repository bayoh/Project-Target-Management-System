import React, { useState, useCallback } from 'react';
import { CircuitBreaker, useCircuitBreaker, withCircuitBreaker } from '../components/CircuitBreaker';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { toast } from 'react-hot-toast';

// Test component that simulates failures
function FailingComponent({ shouldFail }: { shouldFail: boolean }) {
  if (shouldFail) {
    throw new Error('Simulated component failure');
  }
  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
      <p className="text-green-800">✅ Component rendered successfully!</p>
    </div>
  );
}

// HOC wrapped component for testing
const WrappedFailingComponent = withCircuitBreaker(FailingComponent, {
  name: 'wrapped-component',
  fallback: (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-red-800">🔴 HOC Circuit Breaker is OPEN - Component unavailable</p>
    </div>
  )
});

// Async operation simulator
const simulateAsyncOperation = async (shouldFail: boolean, delay: number = 1000): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, delay));
  if (shouldFail) {
    throw new Error('Async operation failed');
  }
  return 'Async operation completed successfully!';
};

// Sync operation simulator
const simulateSyncOperation = (shouldFail: boolean): string => {
  if (shouldFail) {
    throw new Error('Sync operation failed');
  }
  return 'Sync operation completed successfully!';
};

export function CircuitBreakerTest() {
  const [componentShouldFail, setComponentShouldFail] = useState(false);
  const [asyncShouldFail, setAsyncShouldFail] = useState(false);
  const [syncShouldFail, setSyncShouldFail] = useState(false);
  const [asyncResult, setAsyncResult] = useState<string>('');
  const [syncResult, setSyncResult] = useState<string>('');
  const [isAsyncLoading, setIsAsyncLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // Circuit breaker for async operations
  const asyncCircuitBreaker = useCircuitBreaker({
    name: 'async-operations',
    failureThreshold: 3,
    recoveryTimeout: 5000,
    onStateChange: (state) => {
      const logMessage = `🔄 Async Circuit Breaker state changed to: ${state}`;
      setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${logMessage}`]);
      toast(logMessage);
    }
  });

  // Circuit breaker for sync operations
  const syncCircuitBreaker = useCircuitBreaker({
    name: 'sync-operations',
    failureThreshold: 2,
    recoveryTimeout: 3000,
    onStateChange: (state) => {
      const logMessage = `🔄 Sync Circuit Breaker state changed to: ${state}`;
      setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${logMessage}`]);
      toast(logMessage);
    }
  });

  const addLog = useCallback((message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  }, []);

  const handleAsyncOperation = async () => {
    setIsAsyncLoading(true);
    setAsyncResult('');
    addLog('🚀 Starting async operation...');

    try {
      const result = await asyncCircuitBreaker.executeAsync(() => 
        simulateAsyncOperation(asyncShouldFail, 2000)
      );
      setAsyncResult(result);
      addLog(`✅ Async operation succeeded: ${result}`);
      toast.success('Async operation succeeded!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setAsyncResult(`Error: ${errorMessage}`);
      addLog(`❌ Async operation failed: ${errorMessage}`);
      toast.error(`Async operation failed: ${errorMessage}`);
    } finally {
      setIsAsyncLoading(false);
    }
  };

  const handleSyncOperation = () => {
    setSyncResult('');
    addLog('🚀 Starting sync operation...');

    try {
      const result = syncCircuitBreaker.execute(() => 
        simulateSyncOperation(syncShouldFail)
      );
      setSyncResult(result);
      addLog(`✅ Sync operation succeeded: ${result}`);
      toast.success('Sync operation succeeded!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSyncResult(`Error: ${errorMessage}`);
      addLog(`❌ Sync operation failed: ${errorMessage}`);
      toast.error(`Sync operation failed: ${errorMessage}`);
    }
  };

  const resetCircuitBreakers = () => {
    asyncCircuitBreaker.reset();
    syncCircuitBreaker.reset();
    addLog('🔄 All circuit breakers reset manually');
    toast('Circuit breakers reset!');
  };

  const clearLogs = () => {
    setLogs([]);
    setAsyncResult('');
    setSyncResult('');
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'CLOSED': return 'bg-green-100 text-green-800';
      case 'OPEN': return 'bg-red-100 text-red-800';
      case 'HALF_OPEN': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const asyncStats = asyncCircuitBreaker.getStats();
  const syncStats = syncCircuitBreaker.getStats();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Circuit Breaker Test Suite</h1>
        <p className="text-gray-600">Comprehensive testing of CircuitBreaker component functionality</p>
      </div>

      {/* Circuit Breaker States Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Circuit Breaker States</CardTitle>
          <CardDescription>Current state of all circuit breakers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Async Operations</h4>
              <Badge className={getStateColor(asyncStats.state)}>
                {asyncStats.state}
              </Badge>
              <div className="text-sm text-gray-600">
                <p>Failures: {asyncStats.failures}</p>
                <p>Successes: {asyncStats.successes}</p>
                <p>Total Calls: {asyncStats.totalCalls}</p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Sync Operations</h4>
              <Badge className={getStateColor(syncStats.state)}>
                {syncStats.state}
              </Badge>
              <div className="text-sm text-gray-600">
                <p>Failures: {syncStats.failures}</p>
                <p>Successes: {syncStats.successes}</p>
                <p>Total Calls: {syncStats.totalCalls}</p>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={resetCircuitBreakers} variant="outline">
              Reset All Circuit Breakers
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Component Error Boundary Test */}
      <Card>
        <CardHeader>
          <CardTitle>Component Error Boundary Test</CardTitle>
          <CardDescription>Test CircuitBreaker as error boundary with fallback UI</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={componentShouldFail}
                  onChange={(e) => setComponentShouldFail(e.target.checked)}
                  className="rounded"
                />
                <span>Make component fail</span>
              </label>
            </div>
            
            <CircuitBreaker
              name="component-test"
              fallback={
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-orange-800">🟡 Circuit Breaker Fallback - Component failed</p>
                </div>
              }
            >
              <FailingComponent shouldFail={componentShouldFail} />
            </CircuitBreaker>

            <Separator />
            
            <div>
              <h4 className="font-semibold mb-2">HOC Wrapped Component Test</h4>
              <WrappedFailingComponent shouldFail={componentShouldFail} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Async Operations Test */}
      <Card>
        <CardHeader>
          <CardTitle>Async Operations Test</CardTitle>
          <CardDescription>Test circuit breaker with async operations (Threshold: 3 failures, Recovery: 5s)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={asyncShouldFail}
                  onChange={(e) => setAsyncShouldFail(e.target.checked)}
                  className="rounded"
                />
                <span>Make async operations fail</span>
              </label>
              <Button 
                onClick={handleAsyncOperation} 
                disabled={isAsyncLoading}
                className="min-w-[120px]"
              >
                {isAsyncLoading ? 'Running...' : 'Run Async Op'}
              </Button>
            </div>
            
            {asyncResult && (
              <div className={`p-3 rounded-lg ${
                asyncResult.startsWith('Error') 
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : 'bg-green-50 border border-green-200 text-green-800'
              }`}>
                {asyncResult}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sync Operations Test */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Operations Test</CardTitle>
          <CardDescription>Test circuit breaker with sync operations (Threshold: 2 failures, Recovery: 3s)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={syncShouldFail}
                  onChange={(e) => setSyncShouldFail(e.target.checked)}
                  className="rounded"
                />
                <span>Make sync operations fail</span>
              </label>
              <Button onClick={handleSyncOperation}>
                Run Sync Op
              </Button>
            </div>
            
            {syncResult && (
              <div className={`p-3 rounded-lg ${
                syncResult.startsWith('Error') 
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : 'bg-green-50 border border-green-200 text-green-800'
              }`}>
                {syncResult}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
          <CardDescription>Real-time logs of circuit breaker activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Button onClick={clearLogs} variant="outline" size="sm">
              Clear Logs
            </Button>
            <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500 italic">No logs yet...</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="text-sm font-mono">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Test Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <h4 className="font-semibold">How to test:</h4>
            <ol className="list-decimal list-inside space-y-1">
              <li>Toggle failure modes and observe state changes</li>
              <li>Trigger multiple failures to open circuit breakers</li>
              <li>Wait for recovery timeout to see HALF_OPEN state</li>
              <li>Test successful operations to close circuit breakers</li>
              <li>Use manual reset to immediately close circuit breakers</li>
              <li>Monitor logs and toast notifications for state changes</li>
              <li>Test both component error boundaries and operation circuit breakers</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}