/**
 * 주거비 부담률 계산 로직
 * - 소득 정보는 React state(메모리)에만 저장, 서버/스토리지에 절대 기록 금지
 */

export type AgeGroup = '20s' | '30s' | '40s';
export type AffordabilityLevel = 'safe' | 'caution' | 'danger';

/** 연령대별 평균 월소득 (만원) */
export const DEFAULT_INCOME_BY_AGE: Record<AgeGroup, number> = {
  '20s': 250,
  '30s': 320,
  '40s': 360,
};

/** 부담률(%) = (월세 / 월소득) × 100 */
export function calcAffordabilityRate(rent: number, income: number): number {
  if (income <= 0) return 100;
  return (rent / income) * 100;
}

/** 부담률 → 등급 */
export function getAffordabilityLevel(rate: number): AffordabilityLevel {
  if (rate <= 20) return 'safe';
  if (rate <= 25) return 'caution';
  return 'danger';
}

/** 등급별 라벨 */
export const LEVEL_LABEL: Record<AffordabilityLevel, string> = {
  safe: '안전',
  caution: '주의',
  danger: '위험',
};
