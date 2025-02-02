import { createWriteStream, existsSync, mkdirSync, renameSync, statSync } from 'fs';
import type { WriteStream } from 'fs';
import path from 'path';
import { format } from 'util';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type Transport = 'console' | 'file';
type LogMeta = Record<string, unknown> | Error | unknown | undefined;

type LoggerConfig = {
  level?: LogLevel;
  transports?: Transport[];
  filePath?: string;
  maxFileSize?: number;
};

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LOG_EMOJIS = {
  debug: '🐛',
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
} as const;

class Logger {
  private static instance: Logger;
  #config: Required<LoggerConfig>;
  #logStream?: WriteStream;

  private constructor(config: LoggerConfig) {
    this.#config = {
      level: 'info',
      transports: ['console'],
      maxFileSize: 1024 * 1024 * 5, // 5MB
      filePath: `logs/app.log`,
      ...config,
    };

    if (this.#config.transports.includes('file') && !this.#config.filePath) {
      throw new Error('File path required for file transport');
    }

    this.#initializeFileTransport();
    this.#registerErrorHandlers();
  }

  #initializeFileTransport() {
    if (!this.#config.transports.includes('file') || !this.#config.filePath) {
      return;
    }

    const dir = path.dirname(this.#config.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    this.#logStream = createWriteStream(this.#config.filePath, {
      flags: 'a',
    });
  }

  #registerErrorHandlers() {
    process.on('uncaughtExceptionMonitor', (error) => {
      this.error('Uncaught Exception', error);
      process.exit(1);
    });
    process.on('unhandledRejection', (reason, promise) => {
      this.error('Unhandled Rejection at:', { promise, reason });
    });
  }

  // TODO: handle file rotation better
  /** Rotates log file if it exceeds max size */
  #rotateFileIfNeeded() {
    if (!this.#config.filePath || !this.#config.maxFileSize || !this.#logStream) {
      return;
    }

    try {
      if (!existsSync(this.#config.filePath)) {
        return;
      }

      const stats = statSync(this.#config.filePath);
      if (stats.size > this.#config.maxFileSize) {
        this.#logStream.end();
        const rotatedPath = `${this.#config.filePath}.${Date.now()}`;
        renameSync(this.#config.filePath, rotatedPath);

        // Recreate the log file immediately after rotation
        this.#logStream = createWriteStream(this.#config.filePath, {
          flags: 'a',
        });
      }
    } catch (error) {
      console.error('[CRITICAL] Log rotation failed:', error);

      // Disable file transport to prevent infinite loops
      this.#config.transports = this.#config.transports.filter((t) => t !== 'file');
      this.#logStream = undefined;
      console.error('[CRITICAL] File logging disabled due to rotation failure');
    }
  }

  #writeToTransports(message: string) {
    if (this.#config.transports.includes('console')) {
      process.stdout.write(`${message}\n`);
    }

    if (this.#config.transports.includes('file') && this.#logStream) {
      this.#logStream.write(`${message}\n`);
      this.#rotateFileIfNeeded();
    }
  }

  #formatMessage(level: LogLevel, message: string, meta?: LogMeta) {
    const formatted = `${LOG_EMOJIS[level]} [${level.toUpperCase()}] [${new Date().toISOString()}] ${message}`;

    if (meta instanceof Error) {
      return `${formatted}\n${meta.stack}`;
    }
    return meta ? format(formatted, meta) : formatted;
  }

  #shouldLog(level: LogLevel) {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.#config.level];
  }

  debug(message: string, meta?: LogMeta) {
    if (!this.#shouldLog('debug')) return;
    this.#writeToTransports(this.#formatMessage('debug', message, meta));
  }

  info(message: string, meta?: LogMeta) {
    if (!this.#shouldLog('info')) return;
    this.#writeToTransports(this.#formatMessage('info', message, meta));
  }

  warn(message: string, meta?: LogMeta) {
    if (!this.#shouldLog('warn')) return;
    this.#writeToTransports(this.#formatMessage('warn', message, meta));
  }

  error(message: string, meta?: LogMeta) {
    if (!this.#shouldLog('error')) return;
    this.#writeToTransports(this.#formatMessage('error', message, meta));
  }

  static createLogger(config: LoggerConfig = {}) {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }
}

export function createLogger(config: LoggerConfig = {}) {
  return Logger.createLogger(config);
}
