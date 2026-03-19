const KAKAO_BASE = "https://dapi.kakao.com/v2/local/search/category.json";

/** 카카오 카테고리 그룹 코드 */
type CategoryCode = "CS2" | "MT1" | "HP8" | "PM9" | "FD6" | "CE7" | "BK9" | "CT1";

interface CategorySearchParams {
  category_group_code: CategoryCode;
  x: string; // 경도
  y: string; // 위도
  radius: number; // 미터
}

interface KakaoCategoryDocument {
  id: string;
  place_name: string;
  distance: string;
}

interface KakaoCategoryResponse {
  meta: { total_count: number };
  documents: KakaoCategoryDocument[];
}

/** 카테고리별 시설 수 조회 */
async function fetchCategoryCount(
  params: CategorySearchParams,
  apiKey: string,
): Promise<number> {
  const url = new URL(KAKAO_BASE);
  url.searchParams.set("category_group_code", params.category_group_code);
  url.searchParams.set("x", params.x);
  url.searchParams.set("y", params.y);
  url.searchParams.set("radius", String(params.radius));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Kakao category API error: ${res.status}`);
  const data: KakaoCategoryResponse = await res.json();
  return data.meta.total_count;
}

/** 집계 카테고리 정의 */
const CATEGORY_GROUPS: { codes: CategoryCode[]; weight: number; label: string }[] = [
  { codes: ["CS2", "MT1"], weight: 0.25, label: "편의점/마트" },
  { codes: ["HP8", "PM9"], weight: 0.2, label: "병원/약국" },
  { codes: ["FD6"], weight: 0.2, label: "음식점" },
  { codes: ["CE7"], weight: 0.15, label: "카페" },
  { codes: ["BK9"], weight: 0.05, label: "은행" },
  { codes: ["CT1"], weight: 0.15, label: "문화시설" },
];

export interface LivingScoreResult {
  /** 5점 만점 종합 점수 */
  score: number;
  /** 카테고리별 시설 수 */
  categories: { label: string; count: number; weight: number }[];
}

/**
 * 동네 좌표 기반 생활 편의 점수 계산.
 * 반경 500m 시설 5개 미만 시 1km로 자동 확대.
 */
export async function fetchLivingScore(
  latitude: number,
  longitude: number,
): Promise<LivingScoreResult> {
  const apiKey = import.meta.env.VITE_KAKAO_APP_KEY;
  if (!apiKey) throw new Error("VITE_KAKAO_APP_KEY 환경변수가 설정되지 않았습니다");

  const x = String(longitude);
  const y = String(latitude);

  // 1차: 반경 500m
  const firstPass = await fetchAllCategories(x, y, 500, apiKey);
  const totalCount = firstPass.reduce((s, c) => s + c.count, 0);

  // 시설 5개 미만이면 1km로 확대
  const categories =
    totalCount < 5
      ? await fetchAllCategories(x, y, 1000, apiKey)
      : firstPass;

  // 가중 합산 → 5점 정규화
  // 각 카테고리 시설 수를 min(count, 20)/20 으로 0~1 정규화 후 가중합 × 5
  const weightedSum = categories.reduce((sum, cat) => {
    const normalized = Math.min(cat.count, 20) / 20;
    return sum + normalized * cat.weight;
  }, 0);

  const score = Math.round(weightedSum * 5 * 10) / 10; // 소수점 1자리

  return { score: Math.min(score, 5), categories };
}

async function fetchAllCategories(
  x: string,
  y: string,
  radius: number,
  apiKey: string,
): Promise<{ label: string; count: number; weight: number }[]> {
  const settled = await Promise.allSettled(
    CATEGORY_GROUPS.map(async (group) => {
      const countSettled = await Promise.allSettled(
        group.codes.map((code) =>
          fetchCategoryCount({ category_group_code: code, x, y, radius }, apiKey),
        ),
      );
      const counts = countSettled.map((r) =>
        r.status === "fulfilled" ? r.value : 0,
      );
      return {
        label: group.label,
        count: counts.reduce((a, b) => a + b, 0),
        weight: group.weight,
      };
    }),
  );
  return settled.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : { label: "", count: 0, weight: 0 },
  );
}
