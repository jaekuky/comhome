import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { ArrowLeft, Share2, SearchX, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { type Company, useSearchStore } from "@/stores/searchStore";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { applyRushHourWeight, RUSH_HOUR_MULTIPLIER, calcCommuteTime } from "@/lib/commuteService";
import type { CommuteResult } from "@/lib/commuteService";
import OnboardingTooltip from "@/components/OnboardingTooltip";
import NarrativeLoading from "@/components/result/NarrativeLoading";
import InsightBanner from "@/components/result/InsightBanner";
import SummaryCards from "@/components/result/SummaryCards";
import FilterTabs, { type SortMode } from "@/components/result/FilterTabs";
import NeighborhoodCard, { type NeighborhoodResult } from "@/components/result/NeighborhoodCard";
import CommuteHeatmap, { type Neighborhood as HeatmapNeighborhood } from "@/components/map/CommuteHeatmap";
import SafeFilterToggle from "@/components/cost/SafeFilterToggle";
import { calcAffordabilityRate, getAffordabilityLevel, DEFAULT_INCOME_BY_AGE } from "@/lib/affordability";

function companyFromParams(params: URLSearchParams): Company | null {
  const id = params.get("companyId");
  const name = params.get("name");
  const address = params.get("address");
  const district = params.get("district");
  if (!id || !name || !address || !district) return null;
  const lat = params.get("lat");
  const lng = params.get("lng");
  const parsedLat = lat ? parseFloat(lat) : NaN;
  const parsedLng = lng ? parseFloat(lng) : NaN;
  return {
    id,
    name,
    address,
    district,
    latitude: isNaN(parsedLat) ? null : parsedLat,
    longitude: isNaN(parsedLng) ? null : parsedLng,
  };
}

// ---------- 유틸 ----------

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// ---------- 시간대 레이블 ----------

const SLOT_LABELS: Record<string, string> = {
  '07:00-08:00': '07-08시',
  '08:00-09:00': '08-09시',
  '09:00-10:00': '09-10시',
  'default': '기타',
};

// ---------- Supabase 행 타입 ----------

interface RawRecommendedRow {
  rank: number;
  commute_minutes: number;
  commute_route: string | null;
  savings_amount: number;
  neighborhoods: {
    id: string;
    name: string;
    district: string;
    city: string;
    avg_rent: number;
    latitude: number | null;
    longitude: number | null;
  };
}

// ---------- 컴포넌트 ----------

const ResultPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const companyParamKey = searchParams.toString();
  const company = useMemo(() => {
    return (location.state as { company?: Company })?.company ?? companyFromParams(searchParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, companyParamKey]);
  const { setCommuteResults } = useSearchStore();

  const [phase, setPhase] = useState<"loading" | "results" | "empty" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [results, setResults] = useState<NeighborhoodResult[]>([]);
  const [rawCommuteResults, setRawCommuteResults] = useState<CommuteResult[]>([]);
  const [heatmapNeighborhoods, setHeatmapNeighborhoods] = useState<HeatmapNeighborhood[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("rank");
  const [nudgeActive, setNudgeActive] = useState(false);
  const [departureHour, setDepartureHour] = useState<string>('08:00-09:00');
  const [isApiReady, setIsApiReady] = useState(false);
  const [maxCommute, setMaxCommute] = useState(30);
  const [userIncome, setUserIncome] = useState<number | null>(null);
  const [safeOnly, setSafeOnly] = useState(false);
  const [showIncomeInput, setShowIncomeInput] = useState(false);
  const [incomeInputValue, setIncomeInputValue] = useState('');
  const pageLoadTimeRef = useRef<number>(Date.now());
  // Tracks the intended final phase so fetchResults doesn't bypass the loading animation
  const pendingPhaseRef = useRef<"results" | "empty" | "error">("empty");

  const weightedResults = useMemo(
    () => results.map((r) => ({
      ...r,
      commute_minutes: applyRushHourWeight(r.commute_minutes, departureHour),
    })),
    [results, departureHour],
  );

  useEffect(() => {
    if (company) {
      document.title = `${company.name} 추천 동네 | ComHome`;
    }
  }, [company]);

  // commuteResults를 store에 동기화하여 다른 페이지에서 접근 가능하게 함
  // useEffect 대신 fetchResults 내에서 직접 호출하여 race condition 방지

  const fetchResults = useCallback(async (maxMinutes: number = maxCommute) => {
    if (!company) return;

    // BUG 6 수정: 새 회사 검색 시 이전 데이터 제거
    setCommuteResults([]);

    if (isValidUUID(company.id)) {
      // 등록 회사: recommended_neighborhoods + ODsay 실시간 보정
      const { data, error } = await supabase
        .from("recommended_neighborhoods")
        .select(`
          rank,
          commute_minutes,
          commute_route,
          savings_amount,
          neighborhoods:neighborhood_id (
            id,
            name,
            district,
            city,
            avg_rent,
            latitude,
            longitude
          )
        `)
        .eq("company_id", company.id)
        .order("rank", { ascending: true })
        .limit(10);

      if (error) {
        setErrorMessage("데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        pendingPhaseRef.current = "error";
        setIsApiReady(true);
        return;
      }

      if (!data || data.length === 0) {
        pendingPhaseRef.current = "empty";
        setIsApiReady(true);
        return;
      }

      const rows = data as RawRecommendedRow[];

      // 로딩 단계에서 calcCommuteTime으로 통근 시간 조회 ('default' → rush hour 가중치 미적용, 클라이언트 재계산)
      let commuteMap = new Map<string, CommuteResult>();
      let odRaw: CommuteResult[] = [];
      if (company.latitude !== null && company.longitude !== null) {
        odRaw = await calcCommuteTime(
          company,
          rows.map((r) => ({ id: r.neighborhoods.id })),
        );
        commuteMap = new Map(odRaw.map((r) => [r.neighborhoodId, r]));
      }

      // savings_amount가 0인 행이 있으면 회사 소재 구 평균 월세 기준으로 fallback 계산
      let districtRefRent = 0;
      const needsFallback = rows.some((r) => r.savings_amount === 0);
      if (needsFallback) {
        const { data: districtData } = await supabase
          .from("neighborhoods")
          .select("avg_rent")
          .eq("district", company.district);
        if (districtData && districtData.length > 0) {
          districtRefRent = Math.round(
            districtData.reduce((s, n) => s + n.avg_rent, 0) / districtData.length,
          );
        }
      }

      const mapped: NeighborhoodResult[] = rows.map((r) => {
        const od = commuteMap.get(r.neighborhoods.id);
        const savings = r.savings_amount > 0
          ? r.savings_amount
          : Math.max(0, districtRefRent - r.neighborhoods.avg_rent);
        return {
          id: r.neighborhoods.id,
          name: r.neighborhoods.name,
          district: r.neighborhoods.district,
          city: r.neighborhoods.city,
          avg_rent: r.neighborhoods.avg_rent,
          commute_minutes: od?.commuteMinutes ?? r.commute_minutes,
          commute_route: od?.routeSummary ?? r.commute_route ?? "",
          savings_amount: savings,
          rank: r.rank,
          latitude: r.neighborhoods.latitude,
          longitude: r.neighborhoods.longitude,
        };
      });

      // 히트맵용 데이터 세팅
      const heatNeighborhoods: HeatmapNeighborhood[] = rows.flatMap((r) => {
        const { id, name, latitude, longitude } = r.neighborhoods;
        if (latitude === null || longitude === null) return [];
        return [{ id, name, lat: latitude, lng: longitude }];
      });

      // ODsay 결과와 정적 데이터를 merge: ODsay 결과 우선, 누락된 항목은 fallback으로 채움
      const fallbackOd: CommuteResult[] = rows.map((r) => ({
        neighborhoodId: r.neighborhoods.id,
        commuteMinutes: r.commute_minutes,
        routeSummary: r.commute_route ?? "",
        transferCount: 0,
        walkMinutes: 0,
        totalFare: 0,
        isEstimated: true,
      }));
      const odMap = new Map(odRaw.map((r) => [r.neighborhoodId, r]));
      const mergedOd = fallbackOd.map((fb) => odMap.get(fb.neighborhoodId) ?? fb);

      setRawCommuteResults(mergedOd);
      setCommuteResults(mergedOd);
      setHeatmapNeighborhoods(heatNeighborhoods);
      setResults(mapped);
      pendingPhaseRef.current = "results";
      setIsApiReady(true);
    } else if (company.latitude !== null && company.longitude !== null) {
      // 미등록 주소: 인근 동네 ODsay 실시간 계산
      const { data: neighborhoods } = await supabase
        .from("neighborhoods")
        .select("id, name, district, city, avg_rent, latitude, longitude");

      if (!neighborhoods || neighborhoods.length === 0) {
        pendingPhaseRef.current = "empty";
        setIsApiReady(true);
        return;
      }

      // 동적 반경: 후보가 MIN_CANDIDATES 미만이면 반경을 단계적으로 확장
      const MIN_CANDIDATES = 5;
      const RADIUS_STEPS_KM = [20, 30, 40, 60];
      const validNeighborhoods = neighborhoods.filter(
        (n) => n.latitude !== null && n.longitude !== null,
      );

      let candidates: typeof validNeighborhoods = [];
      for (const radius of RADIUS_STEPS_KM) {
        candidates = validNeighborhoods
          .filter(
            (n) =>
              haversineKm(
                company.latitude as number,
                company.longitude as number,
                n.latitude as number,
                n.longitude as number,
              ) < radius,
          )
          .slice(0, 20);
        if (candidates.length >= MIN_CANDIDATES) break;
      }

      if (candidates.length === 0) {
        pendingPhaseRef.current = "empty";
        setIsApiReady(true);
        return;
      }

      // 로딩 단계에서 calcCommuteTime으로 통근 시간 조회 ('default' → rush hour 가중치 미적용, 클라이언트 재계산)
      const odResults = await calcCommuteTime(
        company,
        candidates.map((n) => ({ id: n.id })),
      );

      if (odResults.length === 0) {
        setErrorMessage("대중교통 경로를 조회할 수 없습니다. 잠시 후 다시 시도해주세요.");
        pendingPhaseRef.current = "error";
        setIsApiReady(true);
        return;
      }

      const neighborhoodMap = new Map(candidates.map((n) => [n.id, n]));
      const filtered = odResults
        .filter((r) => r.commuteMinutes <= maxMinutes)
        .sort((a, b) => a.commuteMinutes - b.commuteMinutes)
        .slice(0, 10);

      if (filtered.length === 0) {
        pendingPhaseRef.current = "empty";
        setIsApiReady(true);
        return;
      }

      // 회사 소재 구의 평균 월세를 기준 금액으로 산출
      const districtRents = neighborhoods.filter((n) => n.district === company.district);
      const referenceRent = districtRents.length > 0
        ? Math.round(districtRents.reduce((s, n) => s + n.avg_rent, 0) / districtRents.length)
        : Math.round(neighborhoods.reduce((s, n) => s + n.avg_rent, 0) / neighborhoods.length);

      const mapped: NeighborhoodResult[] = filtered.flatMap((r, i) => {
        const nb = neighborhoodMap.get(r.neighborhoodId);
        if (!nb) return [];
        return [{
          id: r.neighborhoodId,
          name: nb.name,
          district: nb.district,
          city: nb.city,
          avg_rent: nb.avg_rent,
          commute_minutes: r.commuteMinutes,
          commute_route: r.routeSummary,
          savings_amount: Math.max(0, referenceRent - nb.avg_rent),
          rank: i + 1,
          latitude: nb.latitude,
          longitude: nb.longitude,
        }];
      });

      // 히트맵용 데이터 세팅
      const heatNeighborhoods: HeatmapNeighborhood[] = candidates.flatMap((n) => {
        if (n.latitude === null || n.longitude === null) return [];
        return [{ id: n.id, name: n.name, lat: n.latitude, lng: n.longitude }];
      });

      setRawCommuteResults(odResults);
      setCommuteResults(odResults);
      setHeatmapNeighborhoods(heatNeighborhoods);
      setResults(mapped);
      pendingPhaseRef.current = "results";
      setIsApiReady(true);
    } else {
      pendingPhaseRef.current = "empty";
      setIsApiReady(true);
    }
  }, [company, maxCommute, setCommuteResults]);

  useEffect(() => {
    if (company?.id) {
      fetchResults();
    }
  }, [company, fetchResults]);

  useEffect(() => {
    if (phase !== "results") return;
    const t = setTimeout(() => setNudgeActive(true), 5000);
    return () => clearTimeout(t);
  }, [phase]);

  const handleLoadingComplete = useCallback(() => {
    const next = pendingPhaseRef.current;
    setPhase(next);
    if (next === "results") {
      const loadTimeMs = Date.now() - pageLoadTimeRef.current;
      trackEvent("analysis_completed", { company_id: company?.id, count: results.length });
      trackEvent("result_loaded", {
        company_id: company?.id,
        load_time_ms: loadTimeMs,
        result_count: results.length,
      });
    }
  }, [company, results.length]);

  const handleShare = async () => {
    trackEvent("share_clicked", { company_id: company?.id });
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: "링크가 복사되었습니다!", description: "친구에게 공유해보세요" });
    } catch {
      toast({ title: "복사에 실패했습니다", variant: "destructive" });
    }
  };

  const effectiveIncome = userIncome ?? DEFAULT_INCOME_BY_AGE['30s'];

  const sorted = useMemo(() => {
    const arr = [...weightedResults];
    const levelOrder = { safe: 0, caution: 1, danger: 2 };

    arr.sort((a, b) => {
      // 1차: 위험 등급 (danger를 하단으로)
      const aLevel = getAffordabilityLevel(calcAffordabilityRate(a.avg_rent, effectiveIncome));
      const bLevel = getAffordabilityLevel(calcAffordabilityRate(b.avg_rent, effectiveIncome));
      const levelDiff = levelOrder[aLevel] - levelOrder[bLevel];
      if (levelDiff !== 0) return levelDiff;

      // 2차: 사용자 선택 정렬 (같은 등급 내에서)
      if (sortMode === "commute") return a.commute_minutes - b.commute_minutes;
      if (sortMode === "rent") return a.avg_rent - b.avg_rent;
      return a.rank - b.rank;
    });

    if (safeOnly) {
      return arr.filter((r) =>
        getAffordabilityLevel(calcAffordabilityRate(r.avg_rent, effectiveIncome)) === 'safe'
      );
    }
    return arr;
  }, [weightedResults, sortMode, effectiveIncome, safeOnly]);

  const allDanger = useMemo(
    () => weightedResults.length > 0 && weightedResults.every((r) =>
      getAffordabilityLevel(calcAffordabilityRate(r.avg_rent, effectiveIncome)) === 'danger'
    ),
    [weightedResults, effectiveIncome],
  );

  const avgCommute = useMemo(
    () => weightedResults.length
      ? Math.round(weightedResults.reduce((s, r) => s + r.commute_minutes, 0) / weightedResults.length)
      : 0,
    [weightedResults],
  );
  const avgSavings = useMemo(
    () => results.length
      ? Math.round(results.reduce((s, r) => s + r.savings_amount, 0) / results.length)
      : 0,
    [results],
  );
  const estimatedCurrentCommute = useMemo(
    () => weightedResults.length
      ? Math.max(45, Math.round(Math.max(...weightedResults.map((r) => r.commute_minutes)) * 1.8))
      : 50,
    [weightedResults],
  );

  // 히트맵 표시 조건: 회사 좌표 + 동네 데이터 모두 있을 때
  const companyCoords = company?.latitude && company?.longitude
    ? { lat: company.latitude, lng: company.longitude }
    : null;
  const showHeatmap = companyCoords !== null && heatmapNeighborhoods.length > 0;

  if (!company) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">회사를 먼저 선택해주세요</p>
          <Button variant="outline" onClick={() => navigate("/search")}>검색으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mobile-container py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
            aria-label="뒤로가기"
          >
            <ArrowLeft className="h-4 w-4" />
            뒤로가기
          </button>
          {phase === "results" && (
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
              aria-label="결과 공유하기"
            >
              <Share2 className="h-4 w-4" />
              공유
            </button>
          )}
        </div>

        {/* 로딩 */}
        {phase === "loading" && (
          <NarrativeLoading companyName={company.name} onComplete={handleLoadingComplete} isApiReady={isApiReady} maxCommute={maxCommute} />
        )}

        {/* 결과 */}
        {phase === "results" && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h1 className="text-xl font-bold text-foreground">{company.name} 추천 동네</h1>
              <p className="text-sm text-muted-foreground mt-1">
                통근 {maxCommute}분 이내 최적의 동네 {results.length}곳
              </p>
            </div>

            <InsightBanner
              currentCommute={estimatedCurrentCommute}
              avgRecommendedCommute={avgCommute}
            />
            <SummaryCards
              neighborhoodCount={results.length}
              avgCommute={avgCommute}
              avgSavings={avgSavings}
            />

            {/* 출근 시간대 선택 */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground shrink-0">출근 시간대</span>
              {(Object.keys(RUSH_HOUR_MULTIPLIER) as string[]).map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setDepartureHour(slot)}
                  aria-pressed={departureHour === slot}
                  className={[
                    "text-xs px-2.5 py-1 rounded-full border transition-colors",
                    departureHour === slot
                      ? "bg-primary text-primary-foreground border-primary"
                      : "text-muted-foreground border-muted hover:border-primary",
                  ].join(" ")}
                >
                  {SLOT_LABELS[slot] ?? slot}
                </button>
              ))}
            </div>

            {/* 히트맵 */}
            {showHeatmap && (
              <section aria-label="통근 시간 지도">
                <CommuteHeatmap
                  companyCoords={companyCoords}
                  commuteResults={rawCommuteResults}
                  neighborhoods={heatmapNeighborhoods}
                  departureHour={departureHour}
                  onNeighborhoodClick={(id) => navigate(`/neighborhood/${id}`)}
                />
              </section>
            )}

            {/* 소득 입력 인라인 폼 */}
            {showIncomeInput && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3 animate-fade-in">
                <p className="text-sm font-medium text-foreground">월 소득을 입력하세요 (만원)</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="예: 300"
                    value={incomeInputValue}
                    onChange={(e) => setIncomeInputValue(e.target.value)}
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      const v = parseInt(incomeInputValue, 10);
                      if (v > 0) {
                        setUserIncome(v);
                        setShowIncomeInput(false);
                      }
                    }}
                  >
                    적용
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowIncomeInput(false)}
                  >
                    취소
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">소득 정보는 서버에 저장되지 않습니다</p>
              </div>
            )}

            {/* 전체 지역 위험 등급 시 재검색 제안 */}
            {allDanger && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3 animate-fade-in">
                <p className="text-sm font-medium text-red-700">
                  모든 추천 지역이 주거비 부담 위험 등급이에요
                </p>
                <p className="text-xs text-red-600">다른 조건으로 다시 검색해보세요</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setMaxCommute(40);
                      setIsApiReady(false);
                      setPhase("loading");
                      fetchResults(40);
                    }}
                  >
                    통근 40분으로 확장
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowIncomeInput(true)}
                  >
                    내 소득 직접 입력
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate("/search")}
                  >
                    다른 회사로 검색
                  </Button>
                </div>
              </div>
            )}

            {/* 카드 목록 */}
            <div>
              <div className="relative mb-3 flex items-center justify-between gap-2">
                <div className="relative flex-1">
                  <OnboardingTooltip
                    id="result_filter"
                    text="정렬 기준을 바꿔보세요 🔄"
                    position="top"
                  />
                  <FilterTabs value={sortMode} onChange={setSortMode} />
                </div>
                <SafeFilterToggle checked={safeOnly} onChange={setSafeOnly} />
              </div>

              <div className="space-y-3">
                {sorted.map((r, i) => (
                  <div
                    key={r.id}
                    className={[
                      i === 1 ? "card-peek-1" : i === 2 ? "card-peek-2" : "",
                      i === 1 && nudgeActive ? "animate-card-nudge" : "",
                    ].join(" ").trim()}
                    onAnimationEnd={i === 1 ? () => setNudgeActive(false) : undefined}
                  >
                    <NeighborhoodCard
                      data={r}
                      index={i}
                      income={userIncome}
                      onRequestIncomeInput={() => setShowIncomeInput(true)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 오류 */}
        {phase === "error" && (
          <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 animate-fade-in">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <p className="text-base font-medium text-foreground text-center">
              {errorMessage ?? "대중교통 경로를 조회할 수 없습니다."}
            </p>
            <p className="text-sm text-muted-foreground text-center">잠시 후 다시 시도해주세요</p>
            <Button
              variant="outline"
              size="lg"
              onClick={() => { setPhase("loading"); fetchResults(); }}
            >
              다시 시도
            </Button>
          </div>
        )}

        {/* 결과 없음 */}
        {phase === "empty" && (
          <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 animate-fade-in">
            <SearchX className="h-12 w-12 text-muted-foreground" />
            <p className="text-base font-medium text-foreground text-center">
              {maxCommute}분 이내 추천 동네를 찾지 못했어요
            </p>
            {maxCommute < 40 && (
              <>
                <p className="text-sm text-muted-foreground text-center">
                  통근 시간을 40분으로 늘려볼까요?
                </p>
                <Button
                  variant="hero"
                  size="lg"
                  onClick={() => {
                    setMaxCommute(40);
                    setIsApiReady(false);
                    setPhase("loading");
                    fetchResults(40);
                  }}
                >
                  40분으로 확장해서 다시 찾기
                </Button>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default ResultPage;
