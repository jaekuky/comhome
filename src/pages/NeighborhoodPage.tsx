import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { type Tables } from "@/integrations/supabase/types";
import { useSearchStore } from "@/stores/searchStore";
import { type NeighborhoodResult } from "@/types/neighborhood";
import { trackEvent } from "@/lib/analytics";
import { toNeighborhoodCost, fareToMonthly } from "@/lib/costUtils";
import { calcCommuteTime, type CommuteResult } from "@/lib/commuteService";
import CommuteTimeline from "@/components/neighborhood/CommuteTimeline";
import CostComparisonTable from "@/components/neighborhood/CostComparisonTable";
import LivingInfoTabs from "@/components/neighborhood/LivingInfoTabs";
import HousingPreview from "@/components/neighborhood/HousingPreview";
import BottomCTA from "@/components/neighborhood/BottomCTA";
import CostInputForm from "@/components/cost/CostInputForm";
import CostComparisonCards from "@/components/cost/CostComparisonCards";
import InsightCopy from "@/components/cost/InsightCopy";
import AffordabilityGauge from "@/components/cost/AffordabilityGauge";

interface HousingListing {
  id: string;
  type: string;
  deposit: number;
  monthly_rent: number;
  area_sqm: number;
  floor: number;
  distance_to_station: number;
  description: string | null;
}

const PopularBadge = () => (
  <div className="flex items-center gap-2 text-xs text-muted-foreground">
    <Eye className="h-3.5 w-3.5 inline-touch-target" />
    <span>많은 직장인이 관심을 가지는 동네입니다</span>
  </div>
);

const NeighborhoodPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedCompany, commuteResults } = useSearchStore();

  const [neighborhood, setNeighborhood] = useState<Tables<"neighborhoods"> | null>(null);
  const [recommendation, setRecommendation] = useState<Tables<"recommended_neighborhoods"> | null>(null);
  const [listings, setListings] = useState<HousingListing[]>([]);
  const [rentStats, setRentStats] = useState<Tables<"rent_stats">[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 비용 분석 입력 상태
  const [currentRent, setCurrentRent] = useState(50);
  const [transportCost, setTransportCost] = useState(7);
  const [income, setIncome] = useState(0);

  // store에 commuteResults가 없으면 on-demand fetch
  const [localCommute, setLocalCommute] = useState<CommuteResult | null>(null);
  const [commuteFetched, setCommuteFetched] = useState(false);

  useEffect(() => {
    if (!id) return;
    setCommuteFetched(false);

    // store에 이미 데이터가 있으면 사용
    const storeMatch = commuteResults.find((r) => r.neighborhoodId === id);
    if (storeMatch) {
      setLocalCommute(storeMatch);
      if (storeMatch.totalFare > 0) {
        setTransportCost(fareToMonthly(storeMatch.totalFare));
      }
      setCommuteFetched(true);
      return;
    }

    // store가 비어있고 회사 좌표가 있으면 직접 fetch
    if (!selectedCompany?.latitude || !selectedCompany?.longitude) {
      setCommuteFetched(true);
      return;
    }

    let cancelled = false;
    calcCommuteTime(selectedCompany, [{ id }]).then((results) => {
      if (cancelled) return;
      const match = results.find((r) => r.neighborhoodId === id);
      if (match) {
        setLocalCommute(match);
        if (match.totalFare > 0) {
          setTransportCost(fareToMonthly(match.totalFare));
        }
      }
      setCommuteFetched(true);
    }).catch(() => {
      if (!cancelled) setCommuteFetched(true);
    });
    return () => { cancelled = true; };
  }, [id, commuteResults, selectedCompany]);

  // NeighborhoodCost 변환 (단일 동네)
  const neighborhoodCosts = useMemo(() => {
    if (!neighborhood) return [];
    const commute = localCommute ?? commuteResults.find((r) => r.neighborhoodId === neighborhood.id);
    const medianRent = rentStats.find((s) => s.housing_type === "mixed")?.median_rent ?? null;
    return [toNeighborhoodCost(neighborhood, commute, medianRent)];
  }, [neighborhood, localCommute, commuteResults, rentStats]);

  useEffect(() => {
    if (!id || id.trim() === "") return;

    trackEvent("neighborhood_detail_viewed", { neighborhood_id: id, company_id: selectedCompany?.id });

    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const isValidUUID = (str: string) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

        const [nbRes, listRes, recRes] = await Promise.all([
          supabase.from("neighborhoods").select("*").eq("id", id).single(),
          supabase.from("housing_listings").select("*").eq("neighborhood_id", id).limit(10),
          selectedCompany && isValidUUID(selectedCompany.id)
            ? supabase.from("recommended_neighborhoods")
                .select("*")
                .eq("neighborhood_id", id)
                .eq("company_id", selectedCompany.id)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ]);

        if (cancelled) return;
        if (nbRes.error) throw nbRes.error;
        if (nbRes.data) {
          setNeighborhood(nbRes.data);
          document.title = `${nbRes.data.name} - 동네 상세 | ComHome`;
        }
        if (listRes.data) setListings(listRes.data as HousingListing[]);
        if (recRes.data) setRecommendation(recRes.data);

        // housing_listings가 비어있으면 rent_stats 폴백 조회
        if (!listRes.data || listRes.data.length === 0) {
          const dongName = nbRes.data?.name;
          if (dongName) {
            const { data: statsData } = await supabase
              .from("rent_stats")
              .select("*")
              .eq("dong_name", dongName)
              .eq("housing_type", "mixed")
              .order("base_ym", { ascending: false })
              .limit(10);
            if (!cancelled && statsData && statsData.length > 0) {
              // 가장 최신 base_ym의 데이터를 사용, 불완전하면 차선 월로 fallback
              const latestYm = statsData[0].base_ym;
              const latestData = statsData.filter((s) => s.base_ym === latestYm);
              if (latestData.length > 0 && latestData.some((s) => s.median_rent !== null)) {
                setRentStats(latestData);
              } else {
                // 최신 월에 유효 데이터 없으면 전체에서 median_rent가 있는 첫 번째 base_ym 사용
                const validRow = statsData.find((s) => s.median_rent !== null);
                if (validRow) {
                  setRentStats(statsData.filter((s) => s.base_ym === validRow.base_ym));
                }
              }
            }
          }
        }
      } catch {
        if (!cancelled) setError("데이터를 불러오는 중 오류가 발생했습니다");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [id, selectedCompany]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={() => navigate(-1)}>뒤로가기</Button>
        </div>
      </div>
    );
  }

  if (!neighborhood) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">동네 정보를 찾을 수 없습니다</p>
      </div>
    );
  }

  // 통근 데이터 소스 우선순위: localCommute (ODsay 실시간) → recommendation (정적)
  const commuteMinutes = localCommute?.commuteMinutes ?? recommendation?.commute_minutes ?? null;
  const commuteRoute = localCommute?.routeSummary ?? recommendation?.commute_route ?? "";
  const hasCommuteData = commuteMinutes !== null && commuteMinutes > 0;
  const commuteLoading = !commuteFetched && !hasCommuteData;

  const neighborhoodResult: NeighborhoodResult = {
    id: neighborhood.id,
    name: neighborhood.name,
    district: neighborhood.district,
    city: neighborhood.city,
    avg_rent: neighborhood.avg_rent,
    commute_minutes: hasCommuteData ? commuteMinutes : 0,
    commute_route: commuteRoute,
    savings_amount: recommendation?.savings_amount ?? 0,
    rank: recommendation?.rank ?? 0,
    latitude: neighborhood.latitude,
    longitude: neighborhood.longitude,
  };

  return (
    <div className="min-h-screen bg-background pb-24 safe-area-bottom">
      <div className="mobile-container py-6 space-y-6">
        {/* Back */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
          aria-label="결과 목록으로 돌아가기"
        >
          <ArrowLeft className="h-4 w-4" />
          결과 목록으로
        </button>

        {/* Header */}
        <div className="animate-slide-up">
          <h1 className="text-2xl font-black text-foreground">{neighborhood.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">{neighborhood.district}</Badge>
            <Badge variant="outline" className="text-xs">{neighborhood.city}</Badge>
            {hasCommuteData && (
              <Badge className="text-xs" style={{ background: "hsl(var(--success))", color: "hsl(var(--success-foreground))" }}>
                통근 {commuteMinutes}분
              </Badge>
            )}
          </div>
          {/* Scarcity counter */}
          <div className="mt-3">
            <PopularBadge />
          </div>
        </div>

        {/* Commute */}
        {commuteLoading && selectedCompany && (
          <div className="rounded-xl border border-border bg-card p-4 animate-pulse">
            <div className="h-4 w-32 bg-muted rounded mb-2" />
            <div className="h-3 w-48 bg-muted rounded" />
          </div>
        )}
        {hasCommuteData && selectedCompany && (
          <CommuteTimeline
            companyName={selectedCompany.name}
            neighborhoodName={neighborhood.name}
            commuteMinutes={commuteMinutes!}
            commuteRoute={commuteRoute}
          />
        )}

        {/* Cost Comparison */}
        <CostComparisonTable
          neighborhoodName={neighborhood.name}
          avgRent={neighborhood.avg_rent}
          savingsAmount={recommendation?.savings_amount ?? 0}
        />

        {/* 비용 손익 분석 */}
        <div className="space-y-4 border-t border-border pt-6">
          <h2 className="text-lg font-bold text-foreground">비용 손익 분석</h2>

          <CostInputForm
            currentRent={currentRent}
            transportCost={transportCost}
            income={income}
            onCurrentRentChange={setCurrentRent}
            onTransportCostChange={setTransportCost}
            onIncomeChange={setIncome}
          />

          <CostComparisonCards
            neighborhoods={neighborhoodCosts}
            currentRent={currentRent}
            currentTransportCost={transportCost}
            income={income}
          />

          {income > 0 && (
            <AffordabilityGauge
              currentRent={currentRent}
              newRent={neighborhood.avg_rent}
              income={income}
            />
          )}

          <InsightCopy
            neighborhoods={neighborhoodCosts}
            currentRent={currentRent}
            currentTransportCost={transportCost}
          />
        </div>

        {/* Living Info */}
        <LivingInfoTabs
          neighborhoodName={neighborhood.name}
          latitude={neighborhood.latitude}
          longitude={neighborhood.longitude}
        />

        {/* Housing Preview */}
        <HousingPreview
          neighborhoodId={neighborhood.id}
          neighborhoodName={neighborhood.name}
          listings={listings}
          rentStats={rentStats}
          loading={loading}
        />
      </div>

      {/* Bottom CTA */}
      <BottomCTA neighborhood={neighborhoodResult} />
    </div>
  );
};

export default NeighborhoodPage;
