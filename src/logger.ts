import winston from 'winston'

export default winston.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(info => `${info.timestamp} ${info.level} ${info.message}`),
      ),
    }),
  ],
})