import type { Couple } from '../types/database.ts';

export function resolveCurrentCouple({
  dashboardCouple,
  directCouple,
}: {
  dashboardCouple: Couple | null | undefined;
  directCouple: Couple | null | undefined;
}): Couple | null {
  return directCouple ?? dashboardCouple ?? null;
}
