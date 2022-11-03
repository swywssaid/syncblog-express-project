import { createLogger, format, Logger } from 'winston';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const { combine, timestamp, printf, json, cli, splat, colorize, errors } = format;

const loggerInstance: Logger = createLogger({
  level: 'info',
  levels: winston.config.npm.levels,
  format: combine(
    timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    errors({ stack: true }),
    splat(),
    json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.cli(),
        winston.format.splat(),
        winston.format.colorize()
      ),
    }),
    new DailyRotateFile({
      level: 'info',
      datePattern: 'YYYY-MM-DD',
      dirname: 'logs',
      filename: `%DATE%.log`,
      maxFiles: '30d', // 30일치 로그 파일 저장
      zippedArchive: true,
    }),
    // error 레벨 로그를 저장할 파일 설정
    new DailyRotateFile({
      level: 'error',
      datePattern: 'YYYY-MM-DD',
      dirname: 'logs' + '/error', // error.log 파일은 /logs/error 하위에 저장
      filename: `%DATE%.error.log`,
      maxFiles: '30d',
      zippedArchive: true,
    }),
  ],
});

export default loggerInstance;
