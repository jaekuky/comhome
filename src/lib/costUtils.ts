import type { CommuteResult } from "@/lib/commuteService";

export interface NeighborhoodCost {
  id: string;
  name: string;
  district: string;
  /** rent_stats median_rent (만원) */
  medianRent: number;
  /** commute_cache totalFare → 만원 환산 (왕복 × 22일) */
  monthlyTransportCost: number;
  /** 편도 통근 시간 (분) */
  commuteMinutes: number;
  /** true면 교통비가 실제 ODsay 데이터 기반, false면 기본 추정값 */
  isRealTransportCost: boolean;
}

/** 현재 통근 시간 기준 (분) — CostComparisonCards, InsightCopy에서 공통 사용 */
export const BASE_COMMUTE_MINUTES = 60;

/**
 * 편도 요금(원) → 월간 교통비(만원) 변환
 * 왕복 × 22일(월 평균 근무일) / 10,000
 */
export function fareToMonthly(oneWayFareWon: number): number {
  if (oneWayFareWon <= 0) return 0;
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
  // commuteResult가 undefined이면 데이터 미존재 → 기본 추정값 사용
  // commuteResult가 있지만 totalFare=0이면 추정 데이터(isEstimated) → 기본 교통비 추정
  const DEFAULT_TRANSPORT_COST = 7; // 만원 (서울 평균 대중교통 월 비용 추정)
  const fare = commuteResult?.totalFare ?? 0;
  const hasRealFare = commuteResult !== undefined && fare > 0;
  const transportCost = hasRealFare ? fareToMonthly(fare) : DEFAULT_TRANSPORT_COST;

  return {
    id: neighborhood.id,
    name: neighborhood.name,
    district: neighborhood.district,
    medianRent: medianRent ?? neighborhood.avg_rent,
    monthlyTransportCost: transportCost,
    commuteMinutes: commuteResult?.commuteMinutes ?? 0,
    isRealTransportCost: hasRealFare,
  };
}
