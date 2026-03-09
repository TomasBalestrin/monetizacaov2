export { calculateTrend, calculateTrendDetailed } from './trendService';
export type { TrendResult } from './trendService';
export { aggregateSquadMetrics, calculateTotalMetrics } from './closerService';
export { calculateAggregatedMetrics, groupMetricsBySDR, calculateSDRRates, calculatePartialSDRRates } from './sdrService';
export { getGoalTarget } from './goalService';
export { createProfileMap, enrichWithProfiles } from './meetingService';
export { combineUserData, resolveUserEntityLinks } from './userService';
