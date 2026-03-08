import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Share2, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { type Company } from "@/stores/searchStore";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { applyRushHourWeight, RUSH_HOUR_MULTIPLIER } from "@/lib/commuteService";
import OnboardingTooltip from "@/components/OnboardingTooltip";
import NarrativeLoading from "@/components/result/NarrativeLoading";
import InsightBanner from "@/components/result/InsightBanner";
import SummaryCards from "@/components/result/SummaryCards";
import FilterTabs, { type SortMode } from "@/components/result/FilterTabs";
import NeighborhoodCard, { type NeighborhoodResult } from "@/components/result/NeighborhoodCard";

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
  };
}

const ResultPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const company = (location.state as { company?: Company })?.company;

  const [phase, setPhase] = useState<"loading" | "results" | "empty">("loading");
  const [results, setResults] = useState<NeighborhoodResult[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("rank");
  const [nudgeActive, setNudgeActive] = useState(false);
  const [departureHour, setDepartureHour] = useState<string>('08:00-09:00');
  const pageLoadTimeRef = useRef<number>(Date.now());

  const weightedResults = useMemo(
    () => results.map((r) => ({
      ...r,
      commute_minutes: applyRushHourWeight(r.commute_minutes, departureHour),
    })),
    [results, departureHour]
  );

  useEffect(() => {
    if (company) {
      document.title = `${company.name} 추천 동네 | ComHome`;
    }
  }, [company]);

  const fetchResults = useCallback(async () => {
    if (!company) return;

    if (isValidUUID(company.id)) {
      // 등록 회사: 사전 계산된 추천 동네 조회
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
            avg_rent
          )
        `)
        .eq("company_id", company.id)
        .order("rank", { ascending: true })
        .limit(10);

      if (error || !data || data.length === 0) {
        setPhase("empty");
        return;
      }

      const mapped: NeighborhoodResult[] = (data as RawRecommendedRow[]).map((r) => ({
        id: r.neighborhoods.id,
        name: r.neighborhoods.name,
        district: r.neighborhoods.district,
        city: r.neighborhoods.city,
        avg_rent: r.neighborhoods.avg_rent,
        commute_minutes: r.commute_minutes,
        commute_route: r.commute_route,
        savings_amount: r.savings_amount,
        rank: r.rank,
      }));

      setResults(mapped);
    } else if (company.latitude !== null && company.longitude !== null) {
      // 카카오 주소: 위경도 기반 근접 동네 탐색
      const { data: neighborhoods } = await supabase
        .from("neighborhoods")
        .select("id, name, district, city, avg_rent, latitude, longitude");

      if (!neighborhoods || neighborhoods.length === 0) {
        setPhase("empty");
        return;
      }

      const nearby = neighborhoods
        .filter((n) => n.latitude !== null && n.longitude !== null)
        .map((n) => {
          const km = haversineKm(
            company.latitude as number,
            company.longitude as number,
            n.latitude as number,
            n.longitude as number
          );
          return { ...n, commute_minutes: Math.round(km * 2.5) };
        })
        .filter((n) => n.commute_minutes <= 30)
        .sort((a, b) => a.commute_minutes - b.commute_minutes)
        .slice(0, 10);

      if (nearby.length === 0) {
        setPhase("empty");
        return;
      }

      const mapped: NeighborhoodResult[] = nearby.map((n, i) => ({
        id: n.id,
        name: n.name,
        district: n.district,
        city: n.city,
        avg_rent: n.avg_rent,
        commute_minutes: n.commute_minutes,
        commute_route: null,
        savings_amount: 0,
        rank: i + 1,
      }));

      setResults(mapped);
    } else {
      setPhase("empty");
    }
  }, [company]);

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
    const next = results.length > 0 ? "results" : "empty";
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
  }, [results, company]);

  const handleShare = async () => {
    trackEvent("share_clicked", { company_id: company?.id });
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: "링크가 복사되었습니다!", description: "친구에게 공유해보세요" });
    } catch {
      toast({ title: "복사에 실패했습니다", variant: "destructive" });
    }
  };

  const sorted = useMemo(() => {
    const arr = [...weightedResults];
    if (sortMode === "commute") arr.sort((a, b) => a.commute_minutes - b.commute_minutes);
    else if (sortMode === "rent") arr.sort((a, b) => a.avg_rent - b.avg_rent);
    else arr.sort((a, b) => a.rank - b.rank);
    return arr;
  }, [weightedResults, sortMode]);

  const avgCommute = useMemo(
    () => weightedResults.length ? Math.round(weightedResults.reduce((s, r) => s + r.commute_minutes, 0) / weightedResults.length) : 0,
    [weightedResults]
  );
  const avgSavings = useMemo(
    () => results.length ? Math.round(results.reduce((s, r) => s + r.savings_amount, 0) / results.length) : 0,
    [results]
  );
  // 현재 통근 시간 추정: 추천 동네 최대 통근의 1.8배 (최소 45분)
  const estimatedCurrentCommute = useMemo(
    () => weightedResults.length ? Math.max(45, Math.round(Math.max(...weightedResults.map((r) => r.commute_minutes)) * 1.8)) : 50,
    [weightedResults]
  );

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
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
            aria-label="뒤로가기"
          >
            <ArrowLeft className="h-4 w-4" />
            뒤로가기
          </button>
          {phase === "results" && (
            <button
              onClick={handleShare}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
              aria-label="결과 공유하기"
            >
              <Share2 className="h-4 w-4" />
              공유
            </button>
          )}
        </div>

        {phase === "loading" && (
          <NarrativeLoading companyName={company.name} onComplete={handleLoadingComplete} />
        )}

        {phase === "results" && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h1 className="text-xl font-bold text-foreground">{company.name} 추천 동네</h1>
              <p className="text-sm text-muted-foreground mt-1">통근 30분 이내 최적의 동네 {results.length}곳</p>
            </div>

            <InsightBanner currentCommute={estimatedCurrentCommute} avgRecommendedCommute={avgCommute} />
            <SummaryCards neighborhoodCount={results.length} avgCommute={avgCommute} avgSavings={avgSavings} />

            {/* 출근 시간대 선택 */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">출근 시간대</span>
              {(Object.keys(RUSH_HOUR_MULTIPLIER) as string[]).map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setDepartureHour(slot)}
                  className={[
                    "text-xs px-2.5 py-1 rounded-full border transition-colors",
                    departureHour === slot
                      ? "bg-primary text-primary-foreground border-primary"
                      : "text-muted-foreground border-muted hover:border-primary",
                  ].join(" ")}
                >
                  {slot === 'default' ? '평시' : `${slot.slice(0, 2)}시대`}
                </button>
              ))}
            </div>

            {/* Filter with onboarding */}
            <div className="relative">
              <OnboardingTooltip
                id="result_filter"
                text="정렬 기준을 바꿔보세요 🔄"
                position="top"
              />
              <FilterTabs value={sortMode} onChange={setSortMode} />
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
                  <NeighborhoodCard data={r} index={i} />
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === "empty" && (
          <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 animate-fade-in">
            <SearchX className="h-12 w-12 text-muted-foreground" />
            <p className="text-base font-medium text-foreground text-center">
              30분 이내 추천 동네를 찾지 못했어요
            </p>
            <p className="text-sm text-muted-foreground text-center">
              통근 시간을 40분으로 늘려볼까요?
            </p>
            <Button variant="hero" size="lg" onClick={() => {
              toast({ title: "40분 기준으로 재분석 중...", description: "곧 결과를 보여드릴게요" });
            }}>
              40분으로 확장해서 다시 찾기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultPage;
