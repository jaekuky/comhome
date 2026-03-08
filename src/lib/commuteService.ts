export interface CommuteResult {
  neighborhoodId: string;
  commuteMinutes: number;
  routeSummary: string;     // 예: '2호선 → 환승 → 3호선'
  transferCount: number;
  walkMinutes: number;
  totalFare: number;        // 총 교통비 (원)
  isEstimated: boolean;     // 혼잡도 가중치 적용 여부
}

interface Company {
  latitude: number | null;
  longitude: number | null;
}

interface Neighborhood {
  id: string;
}

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/commute-calc`;

export const RUSH_HOUR_MULTIPLIER: Record<string, number> = {
  '07:00-08:00': 1.15,    // 혼잡도 15% 추가
  '08:00-09:00': 1.20,    // 최혼잡 시간대
  '09:00-10:00': 1.10,    // 혼잡도 10% 추가
  default: 1.0,
};

export function applyRushHourWeight(commuteMinutes: number, departureHour: string): number {
  const multiplier = RUSH_HOUR_MULTIPLIER[departureHour] ?? RUSH_HOUR_MULTIPLIER['default'];
  return Math.round(commuteMinutes * multiplier);
}

async function calcByOdsay(
  company: Company,
  neighborhoods: Neighborhood[],
): Promise<CommuteResult[]> {
  if (!company.latitude || !company.longitude || neighborhoods.length === 0) {
    return [];
  }

  try {
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyLat: company.latitude,
        companyLng: company.longitude,
        neighborhoodIds: neighborhoods.map((n) => n.id),
      }),
    });

    if (!res.ok) {
      throw new Error(`commute-calc Edge Function 오류: ${res.status}`);
    }

    const data = await res.json();
    return (data.results ?? []) as CommuteResult[];
  } catch (err) {
    console.error("[commuteService] calcByOdsay 실패:", err);
    return [];
  }
}

// async function calcByKakaoMobility(
//   company: Company,
//   neighborhoods: Neighborhood[],
// ): Promise<CommuteResult[]> {
//   // MAU 1,000+ 시 KakaoMobility 대중교통 API로 전환
//   // https://developers.kakaomobility.com/docs/transit-api/
//   //
//   // const results = await Promise.allSettled(
//   //   neighborhoods.map(async (n) => { ... })
//   // );
//   // return results.filter(...).map(...);
//   throw new Error("Not implemented");
// }

export async function calcCommuteTime(
  company: Company,
  neighborhoods: Neighborhood[],
  departureHour: string = '08:00-09:00',
): Promise<CommuteResult[]> {
  const raw = await calcByOdsay(company, neighborhoods);
  // MAU 1,000+ 시 calcByOdsay → calcByKakaoMobility로 변경
  return raw.map((r) => ({
    ...r,
    commuteMinutes: applyRushHourWeight(r.commuteMinutes, departureHour),
    isEstimated: true,
  }));
}
