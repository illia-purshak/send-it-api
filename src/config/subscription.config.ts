import { CronExpression } from '@nestjs/schedule';

// TODO: Replace this test value with the real midnight/00:00 switching logic after testing.
const NON_PROD_SWITCH_DELAY_SECONDS = 60;

export const getSwitchDelayMs = (): number => {
  if (process.env.NODE_ENV !== 'production') {
    return NON_PROD_SWITCH_DELAY_SECONDS * 1000;
  }

  const now = new Date();
  const midnight = new Date(now);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);
  return midnight.getTime() - now.getTime();
};

export const getSwitchCheckCronExpression = (): string =>
  process.env.NODE_ENV === 'production'
    ? CronExpression.EVERY_HOUR
    : CronExpression.EVERY_10_SECONDS;
