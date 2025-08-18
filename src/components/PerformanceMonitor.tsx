import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, Clock, Zap, AlertTriangle, TrendingUp, Database } from 'lucide-react';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  threshold?: number;
  status: 'good' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';
  history: number[];
}

interface PerformanceData {
  timestamp: number;
  metrics: {
    renderTime: number;
    queryTime: number;
    memoryUsage: number;
    activityLogCount: number;
    errorCount: number;
    batchSize: number;
    queueLength: number;
  };
}

class PerformanceTracker {
  private data: PerformanceData[] = [];
  private maxDataPoints = 100;
  private observers: ((data: PerformanceData) => void)[] = [];
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.startMonitoring();
  }

  private startMonitoring() {
    // Monitor every 5 seconds
    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, 5000);

    // Monitor performance observer if available
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'measure' && entry.name.startsWith('activity-')) {
              this.recordCustomMetric(entry.name, entry.duration);
            }
          });
        });
        observer.observe({ entryTypes: ['measure'] });
      } catch (error) {
        console.warn('PerformanceObserver not supported:', error);
      }
    }
  }

  private collectMetrics() {
    const now = Date.now();
    const memory = (performance as any).memory;
    
    const data: PerformanceData = {
      timestamp: now,
      metrics: {
        renderTime: this.getAverageRenderTime(),
        queryTime: this.getAverageQueryTime(),
        memoryUsage: memory ? memory.usedJSHeapSize / 1024 / 1024 : 0, // MB
        activityLogCount: this.getActivityLogCount(),
        errorCount: this.getErrorCount(),
        batchSize: this.getBatchSize(),
        queueLength: this.getQueueLength(),
      },
    };

    this.data.push(data);
    if (this.data.length > this.maxDataPoints) {
      this.data.shift();
    }

    this.notifyObservers(data);
  }

  private getAverageRenderTime(): number {
    const entries = performance.getEntriesByType('measure')
      .filter(entry => entry.name.includes('React'))
      .slice(-10);
    
    if (entries.length === 0) return 0;
    return entries.reduce((sum, entry) => sum + entry.duration, 0) / entries.length;
  }

  private getAverageQueryTime(): number {
    const entries = performance.getEntriesByType('measure')
      .filter(entry => entry.name.includes('query'))
      .slice(-10);
    
    if (entries.length === 0) return 0;
    return entries.reduce((sum, entry) => sum + entry.duration, 0) / entries.length;
  }

  private getActivityLogCount(): number {
    // This would be injected by the activity logger
    return (window as any).__activityLogCount || 0;
  }

  private getErrorCount(): number {
    return (window as any).__errorCount || 0;
  }

  private getBatchSize(): number {
    return (window as any).__batchSize || 0;
  }

  private getQueueLength(): number {
    return (window as any).__queueLength || 0;
  }

  recordCustomMetric(name: string, value: number) {
    performance.mark(`${name}-start`);
    setTimeout(() => {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
    }, value);
  }

  subscribe(callback: (data: PerformanceData) => void) {
    this.observers.push(callback);
    return () => {
      const index = this.observers.indexOf(callback);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  private notifyObservers(data: PerformanceData) {
    this.observers.forEach(callback => callback(data));
  }

  getLatestData(): PerformanceData | null {
    return this.data[this.data.length - 1] || null;
  }

  getHistoricalData(minutes: number = 10): PerformanceData[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.data.filter(d => d.timestamp >= cutoff);
  }

  getMetrics(): PerformanceMetric[] {
    const latest = this.getLatestData();
    if (!latest) return [];

    const historical = this.getHistoricalData(5);
    const previousValues = historical.slice(-10, -1);

    return [
      {
        name: 'Render Time',
        value: latest.metrics.renderTime,
        unit: 'ms',
        threshold: 16, // 60fps
        status: latest.metrics.renderTime > 50 ? 'critical' : latest.metrics.renderTime > 16 ? 'warning' : 'good',
        trend: this.calculateTrend(previousValues.map(d => d.metrics.renderTime), latest.metrics.renderTime),
        history: historical.map(d => d.metrics.renderTime),
      },
      {
        name: 'Query Time',
        value: latest.metrics.queryTime,
        unit: 'ms',
        threshold: 100,
        status: latest.metrics.queryTime > 500 ? 'critical' : latest.metrics.queryTime > 100 ? 'warning' : 'good',
        trend: this.calculateTrend(previousValues.map(d => d.metrics.queryTime), latest.metrics.queryTime),
        history: historical.map(d => d.metrics.queryTime),
      },
      {
        name: 'Memory Usage',
        value: latest.metrics.memoryUsage,
        unit: 'MB',
        threshold: 100,
        status: latest.metrics.memoryUsage > 200 ? 'critical' : latest.metrics.memoryUsage > 100 ? 'warning' : 'good',
        trend: this.calculateTrend(previousValues.map(d => d.metrics.memoryUsage), latest.metrics.memoryUsage),
        history: historical.map(d => d.metrics.memoryUsage),
      },
      {
        name: 'Activity Logs',
        value: latest.metrics.activityLogCount,
        unit: 'count',
        status: 'good',
        trend: this.calculateTrend(previousValues.map(d => d.metrics.activityLogCount), latest.metrics.activityLogCount),
        history: historical.map(d => d.metrics.activityLogCount),
      },
      {
        name: 'Queue Length',
        value: latest.metrics.queueLength,
        unit: 'items',
        threshold: 50,
        status: latest.metrics.queueLength > 100 ? 'critical' : latest.metrics.queueLength > 50 ? 'warning' : 'good',
        trend: this.calculateTrend(previousValues.map(d => d.metrics.queueLength), latest.metrics.queueLength),
        history: historical.map(d => d.metrics.queueLength),
      },
      {
        name: 'Error Count',
        value: latest.metrics.errorCount,
        unit: 'errors',
        threshold: 0,
        status: latest.metrics.errorCount > 5 ? 'critical' : latest.metrics.errorCount > 0 ? 'warning' : 'good',
        trend: this.calculateTrend(previousValues.map(d => d.metrics.errorCount), latest.metrics.errorCount),
        history: historical.map(d => d.metrics.errorCount),
      },
    ];
  }

  private calculateTrend(previous: number[], current: number): 'up' | 'down' | 'stable' {
    if (previous.length === 0) return 'stable';
    
    const avg = previous.reduce((sum, val) => sum + val, 0) / previous.length;
    const threshold = avg * 0.1; // 10% threshold
    
    if (current > avg + threshold) return 'up';
    if (current < avg - threshold) return 'down';
    return 'stable';
  }

  cleanup() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.observers = [];
    this.data = [];
  }
}

// Global performance tracker
const globalPerformanceTracker = new PerformanceTracker();

// Performance monitor hook
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(globalPerformanceTracker.getMetrics());
    };

    // Initial load
    updateMetrics();

    // Subscribe to updates
    const unsubscribe = globalPerformanceTracker.subscribe(() => {
      updateMetrics();
    });

    return unsubscribe;
  }, []);

  const recordMetric = useCallback((name: string, value: number) => {
    globalPerformanceTracker.recordCustomMetric(name, value);
  }, []);

  const getHistoricalData = useCallback((minutes: number = 10) => {
    return globalPerformanceTracker.getHistoricalData(minutes);
  }, []);

  return {
    metrics,
    isVisible,
    setIsVisible,
    recordMetric,
    getHistoricalData,
  };
}

// Performance monitor component
interface PerformanceMonitorProps {
  className?: string;
  compact?: boolean;
  showOnlyWarnings?: boolean;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  className = '',
  compact = false,
  showOnlyWarnings = false,
}) => {
  const { metrics, isVisible, setIsVisible } = usePerformanceMonitor();
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  const filteredMetrics = showOnlyWarnings 
    ? metrics.filter(m => m.status !== 'good')
    : metrics;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <Activity className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical':
        return <Zap className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-red-500" />;
      case 'down':
        return <TrendingUp className="h-3 w-3 text-green-500 transform rotate-180" />;
      default:
        return <div className="h-3 w-3 bg-gray-300 rounded-full" />;
    }
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === 'ms' && value < 1) {
      return `${(value * 1000).toFixed(0)}μs`;
    }
    if (unit === 'MB') {
      return `${value.toFixed(1)}${unit}`;
    }
    return `${Math.round(value)}${unit === 'count' || unit === 'items' || unit === 'errors' ? '' : unit}`;
  };

  if (!isVisible && process.env.NODE_ENV !== 'development') {
    return null;
  }

  if (compact) {
    const criticalCount = metrics.filter(m => m.status === 'critical').length;
    const warningCount = metrics.filter(m => m.status === 'warning').length;

    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <button
          onClick={() => setIsVisible(!isVisible)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg shadow-lg text-sm font-medium transition-colors ${
            criticalCount > 0
              ? 'bg-red-100 text-red-800 hover:bg-red-200'
              : warningCount > 0
              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
              : 'bg-green-100 text-green-800 hover:bg-green-200'
          }`}
        >
          <Database className="h-4 w-4" />
          <span>
            {criticalCount > 0 ? `${criticalCount} Critical` : 
             warningCount > 0 ? `${warningCount} Warning` : 'All Good'}
          </span>
        </button>

        {isVisible && (
          <div className="absolute bottom-full right-0 mb-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Performance Monitor</h3>
              <button
                onClick={() => setIsVisible(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="space-y-2">
              {filteredMetrics.map((metric) => (
                <div
                  key={metric.name}
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedMetric(selectedMetric === metric.name ? null : metric.name)}
                >
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(metric.status)}
                    <span className="text-sm text-gray-700">{metric.name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-sm font-medium">
                      {formatValue(metric.value, metric.unit)}
                    </span>
                    {getTrendIcon(metric.trend)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <Database className="h-5 w-5 mr-2" />
          Performance Monitor
        </h2>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMetrics.map((metric) => (
          <div
            key={metric.name}
            className={`p-4 rounded-lg border-2 transition-colors ${
              metric.status === 'critical'
                ? 'border-red-200 bg-red-50'
                : metric.status === 'warning'
                ? 'border-yellow-200 bg-yellow-50'
                : 'border-green-200 bg-green-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {getStatusIcon(metric.status)}
                <h3 className="text-sm font-medium text-gray-900">{metric.name}</h3>
              </div>
              {getTrendIcon(metric.trend)}
            </div>
            
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {formatValue(metric.value, metric.unit)}
            </div>
            
            {metric.threshold && (
              <div className="text-xs text-gray-500">
                Threshold: {formatValue(metric.threshold, metric.unit)}
              </div>
            )}
            
            {/* Mini chart */}
            {metric.history.length > 1 && (
              <div className="mt-3 h-8">
                <div className="flex items-end space-x-1 h-full">
                  {metric.history.slice(-20).map((value, index) => {
                    const max = Math.max(...metric.history);
                    const height = max > 0 ? (value / max) * 100 : 0;
                    return (
                      <div
                        key={index}
                        className={`flex-1 rounded-t ${
                          metric.status === 'critical'
                            ? 'bg-red-300'
                            : metric.status === 'warning'
                            ? 'bg-yellow-300'
                            : 'bg-green-300'
                        }`}
                        style={{ height: `${height}%` }}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-600">
            <strong>Development Mode:</strong> Performance monitoring is active. 
            This component will be hidden in production unless explicitly enabled.
          </div>
        </div>
      )}
    </div>
  );
};

// Cleanup function
export function cleanupPerformanceMonitor() {
  globalPerformanceTracker.cleanup();
}

export default PerformanceMonitor;