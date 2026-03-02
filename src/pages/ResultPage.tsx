import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Share2, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { type Company } from "@/stores/searchStore";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import OnboardingTooltip from "@/components/OnboardingTooltip";
import NarrativeLoading from "@/components/result/NarrativeLoading";
import InsightBanner from "@/components/result/InsightBanner";
import SummaryCards from "@/components/result/SummaryCards";
import FilterTabs, { type SortMode } from "@/components/result/FilterTabs";
import NeighborhoodCard, { type NeighborhoodResult } from "@/components/result/NeighborhoodCard";

const ResultPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const company = (location.state as { company?: Company })?.company;

  const [phase, setPhase] = useState<"loading" | "results" | "empty">("loading");
  const [results, setResults] = useState<NeighborhoodResult[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("rank");

  useEffect(() => {
    if (company) {
      document.title = `${company.name} 추천 동네 | ComHome`;
    }
  }, [company]);

  const fetchResults = useCallback(async (companyId: string) => {
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
      .eq("company_id", companyId)
      .order("rank", { ascending: true })
      .limit(10);

    if (error || !data || data.length === 0) {
      setPhase("empty");
      return;
    }

    const mapped: NeighborhoodResult[] = data.map((r: any) => ({
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
  }, []);

  useEffect(() => {
    if (company?.id) {
      fetchResults(company.id);
    }
  }, [company, fetchResults]);

  const handleLoadingComplete = useCallback(() => {
    const next = results.length > 0 ? "results" : "empty";
    setPhase(next);
    if (next === "results") {
      trackEvent("analysis_completed", { company_id: company?.id, count: results.length });
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
    const arr = [...results];
    if (sortMode === "commute") arr.sort((a, b) => a.commute_minutes - b.commute_minutes);
    else if (sortMode === "rent") arr.sort((a, b) => a.avg_rent - b.avg_rent);
    else arr.sort((a, b) => a.rank - b.rank);
    return arr;
  }, [results, sortMode]);

  const avgCommute = useMemo(
    () => results.length ? Math.round(results.reduce((s, r) => s + r.commute_minutes, 0) / results.length) : 0,
    [results]
  );
  const avgSavings = useMemo(
    () => results.length ? Math.round(results.reduce((s, r) => s + r.savings_amount, 0) / results.length) : 0,
    [results]
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

            <InsightBanner currentCommute={50} avgRecommendedCommute={avgCommute} />
            <SummaryCards neighborhoodCount={results.length} avgCommute={avgCommute} avgSavings={avgSavings} />

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
                <NeighborhoodCard key={r.id} data={r} index={i} />
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
