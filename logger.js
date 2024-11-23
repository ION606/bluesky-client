import { createLogger, format, transports } from 'winston';

// configure log file paths
const logFilePath = './logs/app.log';
const errorLogFilePath = './logs/error.log';

// create a custom format for log messages
const logFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ level, message, timestamp }) => `${timestamp} [${level}]: ${message}`)
);

// initialize the logger
const logger = createLogger({
    level: 'info', // default logging level
    format: logFormat,
    transports: [
        new transports.Console(), // log to console
        new transports.File({ filename: logFilePath }), // log to a general log file
        new transports.File({ filename: errorLogFilePath, level: 'error' }) // log errors separately
    ],
    exitOnError: false, // prevent exit on handled exceptions
});

export default logger
