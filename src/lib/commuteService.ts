export interface CommuteResult {
  neighborhoodId: string;
  commuteMinutes: number;
  routeSummary: string;     // 예: '2호선 → 환승 → 3호선'
  transferCount: number;
  walkMinutes: number;
  totalFare: number;        // 총 교통비 (원)
  isEstimated: boolean;     // 혼잡도 가중치 적용 여부
}

export interface OdsayServiceResult {
  results: CommuteResult[];
  fromCache: boolean;
  errors: string[];
}

interface Company {
  latitude: number | null;
  longitude: number | null;
}

interface Neighborhood {
  id: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/commute-calc`;

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

export async function calcByOdsay(
  company: Company,
  neighborhoods: Neighborhood[],
): Promise<OdsayServiceResult> {
  if (company.latitude === null || company.longitude === null || neighborhoods.length === 0) {
    return { results: [], fromCache: false, errors: [] };
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("[commuteService] VITE_SUPABASE_URL 또는 VITE_SUPABASE_PUBLISHABLE_KEY가 설정되지 않았습니다");
    return { results: [], fromCache: false, errors: ["Supabase 환경변수 미설정"] };
  }

  try {
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
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
    return {
      results: (data.results ?? []) as CommuteResult[],
      fromCache: data.fromCache ?? false,
      errors: data.errors ?? [],
    };
  } catch (err) {
    console.error("[commuteService] calcByOdsay 실패:", err);
    return {
      results: [],
      fromCache: false,
      errors: [err instanceof Error ? err.message : "알 수 없는 오류"],
    };
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
): Promise<CommuteResult[]> {
  const { results: raw } = await calcByOdsay(company, neighborhoods);
  // MAU 1,000+ 시 calcByOdsay → calcByKakaoMobility로 변경
  // 러시아워 가중치는 UI 레이어(ResultPage weightedResults)에서 적용
  return raw;
}
