type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  meta?: Record<string, unknown>;
  error?: Error;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private logHistory: LogEntry[] = [];
  private readonly MAX_HISTORY = 100;

  private formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>, error?: Error): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (error) {
      return `${prefix} ${message}\nError: ${error.message}\nStack: ${error.stack}`;
    }
    
    if (meta && Object.keys(meta).length > 0) {
      return `${prefix} ${message}\nMeta: ${JSON.stringify(meta, null, 2)}`;
    }
    
    return `${prefix} ${message}`;
  }

  private addToHistory(entry: LogEntry): void {
    this.logHistory.push(entry);
    if (this.logHistory.length > this.MAX_HISTORY) {
      this.logHistory.shift();
    }
  }

  private shouldLog(level: LogLevel): boolean {
    // In production, only log warnings and errors
    if (!this.isDevelopment) {
      return level === 'warn' || level === 'error';
    }
    // In development, log everything
    return true;
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog('debug')) return;
    
    const entry: LogEntry = {
      level: 'debug',
      message,
      timestamp: new Date().toISOString(),
      meta,
    };
    
    this.addToHistory(entry);
    console.debug(this.formatMessage('debug', message, meta));
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog('info')) return;
    
    const entry: LogEntry = {
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      meta,
    };
    
    this.addToHistory(entry);
    console.info(this.formatMessage('info', message, meta));
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      meta,
    };
    
    this.addToHistory(entry);
    console.warn(this.formatMessage('warn', message, meta));
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      meta,
      error,
    };
    
    this.addToHistory(entry);
    console.error(this.formatMessage('error', message, meta, error));
    
    // In production, you might want to send errors to an error tracking service
    if (!this.isDevelopment && error) {
      // TODO: Integrate with error tracking service (Sentry, LogRocket, etc.)
      // Example:
      // Sentry.captureException(error, { extra: meta });
    }
  }

  getHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  clearHistory(): void {
    this.logHistory = [];
  }
}

export const logger = new Logger();

