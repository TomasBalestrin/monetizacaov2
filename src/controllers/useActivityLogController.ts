import { useQuery } from '@tanstack/react-query';
import { fetchActivityLog, type ActivityLogEntry } from '@/model/repositories/activityLogRepository';

export type { ActivityLogEntry };

export function useActivityLog(periodStart?: string, periodEnd?: string) {
  return useQuery({
    queryKey: ['activity-log', periodStart, periodEnd],
    queryFn: () => fetchActivityLog(periodStart, periodEnd),
  });
}
