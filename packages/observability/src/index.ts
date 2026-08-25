export interface LogContext {
  businessId?: string;
  branchId?: string;
  correlationId?: string;
  [key: string]: unknown;
}

export interface AppLogger {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

export function createLogger(service: string): AppLogger {
  const write = (level: "info" | "warn" | "error", message: string, context: LogContext = {}) => {
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      service,
      message,
      ...context,
    });

    if (level === "error") console.error(entry);
    else if (level === "warn") console.warn(entry);
    else console.info(entry);
  };

  return {
    info: (message, context) => write("info", message, context),
    warn: (message, context) => write("warn", message, context),
    error: (message, context) => write("error", message, context),
  };
}
