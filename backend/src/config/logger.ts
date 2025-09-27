import pino from 'pino';

// Configure the logger based on the environment
const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  // Use pino-pretty for development for more readable logs
  transport: process.env.NODE_ENV !== 'production' 
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,          // Add color to the output
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss', // Human-readable timestamp
          ignore: 'pid,hostname',   // Ignore process ID and hostname
        },
      }
    : undefined, // In production, use the default JSON transport
});

export default logger;
