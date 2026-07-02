import { env } from './utils/env';
import { logger } from './utils/logger';
import app from './app'; 

const PORT = parseInt(env.PORT, 10);

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`
========================================
  SnapNGrasp API Server Started
========================================
  Environment: ${env.NODE_ENV}
  Port:        ${PORT}
  URL:         http://0.0.0.0:${PORT}
  Health:      http://0.0.0.0:${PORT}/health
========================================
  `);
});


// Graceful shutdown
const gracefulShutdown = (signal: string): void => {
  logger.info(`\n${signal} received. Starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled rejections
process.on('unhandledRejection', (reason: Error) => {
  logger.error({ err: reason }, 'Unhandled Rejection');
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error({ err: error }, 'Uncaught Exception');
  process.exit(1);
});

export default server;
