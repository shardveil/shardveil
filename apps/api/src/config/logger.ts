import pino, { type Logger } from 'pino';
import { env } from './env';

/**
 * Pino logger singleton with environment-aware configuration.
 *
 * Development: Pretty-printed, colorized, human-readable logs
 * Production: Structured JSON, one log per line
 *
 * All sensitive fields are automatically redacted:
 * - JWT_SECRET
 * - *_PRIVATE_KEY (e.g., SETTLER_PRIVATE_KEY)
 * - Authorization header
 * - Cookie header
 */

const isProduction = env.NODE_ENV === 'production';

const pinoConfig = {
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  redact: {
    paths: [
      'JWT_SECRET',
      '*.PRIVATE_KEY',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[Redacted]',
  },
};

export const logger: Logger = isProduction
  ? pino(pinoConfig)
  : pino(
      pinoConfig,
      pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }),
    );
