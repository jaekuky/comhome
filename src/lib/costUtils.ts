import type { CommuteResult } from "@/lib/commuteService";
import type { NeighborhoodCost } from "@/components/cost/CostComparisonCards";

/**
 * 편도 요금(원) → 월간 교통비(만원) 변환
 * 왕복 × 22일(월 평균 근무일) / 10,000
 */
export function fareToMonthly(oneWayFareWon: number): number {
  return Math.round((oneWayFareWon * 2 * 22) / 10000);
}

/**
 * NeighborhoodResult + CommuteResult + rent_stats → NeighborhoodCost 변환
 */
export function toNeighborhoodCost(
  neighborhood: { id: string; name: string; district: string; avg_rent: number },
  commuteResult: CommuteResult | undefined,
  medianRent: number | null,
): NeighborhoodCost {
  const fare = commuteResult?.totalFare ?? 0;
  return {
    id: neighborhood.id,
    name: neighborhood.name,
    district: neighborhood.district,
    medianRent: medianRent ?? neighborhood.avg_rent,
    monthlyTransportCost: fareToMonthly(fare),
    commuteMinutes: commuteResult?.commuteMinutes ?? 0,
  };
}
