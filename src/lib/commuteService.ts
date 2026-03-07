export interface CommuteResult {
  neighborhoodId: string;
  commuteMinutes: number;
  routeSummary: string;     // 예: '2호선 → 환승 → 3호선'
  transferCount: number;
  walkMinutes: number;
  totalFare: number;        // 총 교통비 (원)
}

interface Company {
  latitude: number | null;
  longitude: number | null;
}

interface Neighborhood {
  id: string;
}

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/commute-calc`;

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
): Promise<CommuteResult[]> {
  return calcByOdsay(company, neighborhoods);
  // MAU 1,000+ 시 이 한 줄만 calcByKakaoMobility로 변경
}
