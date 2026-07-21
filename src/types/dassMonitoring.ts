import type { DassScores } from '@/lib/dass21';

export interface DassMonitoringEntry extends DassScores {
  id: string;
  submittedBy: string;
  createdAt: string;
}

export interface DassMonitoringHistory {
  entries: DassMonitoringEntry[];
  nextEligibleAt: string | null;
}
