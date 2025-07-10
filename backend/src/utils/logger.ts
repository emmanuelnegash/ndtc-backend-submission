import 'dotenv/config';

import pino from 'pino';
import pinoPretty from 'pino-pretty';

const isProduction = process.env.NODE_ENV === 'production';
const level = (
  process.env.LOG_LEVEL ||
  (isProduction ? 'info' : 'debug')
).toLowerCase() as pino.LevelWithSilent;

const usePretty = !isProduction && process.env.LOG_PRETTY !== 'false';
export const logger = pino(
  {
    level,
    base: isProduction ? undefined : null,
    timestamp: pino.stdTimeFunctions.isoTime
  },
  usePretty
    ? pinoPretty({
        colorize: true,
        translateTime: 'SYS:standard'
      })
    : undefined
);
