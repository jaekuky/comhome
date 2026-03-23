import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, X, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSearchStore } from "@/stores/searchStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { toNeighborhoodCost, fareToMonthly } from "@/lib/costUtils";
import { escapeLikePattern } from "@/lib/utils";
import { calcCommuteTime, type CommuteResult } from "@/lib/commuteService";
import CostInputForm from "@/components/cost/CostInputForm";
import CostComparisonCards from "@/components/cost/CostComparisonCards";
import InsightCopy from "@/components/cost/InsightCopy";

const ComparePage = () => {
  const navigate = useNavigate();
  const { compareList, removeFromCompare, clearCompare, commuteResults, selectedCompany } = useSearchStore();

  // 비용 분석 입력 상태
  const [currentRent, setCurrentRent] = useState(50);
  const [transportCost, setTransportCost] = useState(7);
  const [income, setIncome] = useState(0);

  // rent_stats median_rent 조회 결과
  const [medianRents, setMedianRents] = useState<Record<string, number>>({});

  // store에 없는 동네의 commuteResult를 on-demand fetch
  const [localCommutes, setLocalCommutes] = useState<CommuteResult[]>([]);
  const [commuteFetchDone, setCommuteFetchDone] = useState(false);

  useEffect(() => {
    if (compareList.length === 0) { setCommuteFetchDone(true); return; }

    const missingIds = compareList
      .filter((item) => !commuteResults.some((r) => r.neighborhoodId === item.id))
      .map((item) => ({ id: item.id }));

    if (missingIds.length === 0) { setCommuteFetchDone(true); return; }
    if (!selectedCompany?.latitude || !selectedCompany?.longitude) { setCommuteFetchDone(true); return; }

    let cancelled = false;
    setCommuteFetchDone(false);
    calcCommuteTime(selectedCompany, missingIds).then((results) => {
      if (!cancelled) {
        setLocalCommutes(results);
        setCommuteFetchDone(true);
      }
    }).catch(() => {
      if (!cancelled) {
        setCommuteFetchDone(true);
        toast({ title: "통근 시간 조회 실패", description: "교통비는 추정값으로 표시됩니다", variant: "destructive" });
      }
    });
    return () => { cancelled = true; };
  }, [compareList, commuteResults, selectedCompany]);

  // store + on-demand fetch 결과를 합산
  const mergedCommutes = useMemo(() => {
    const map = new Map(commuteResults.map((r) => [r.neighborhoodId, r]));
    for (const r of localCommutes) {
      if (!map.has(r.neighborhoodId)) map.set(r.neighborhoodId, r);
    }
    return map;
  }, [commuteResults, localCommutes]);

  // commute_cache의 totalFare 기반 교통비 자동 세팅 (fetch 완료 후에만)
  useEffect(() => {
    if (!commuteFetchDone) return;
    const relevant = compareList
      .map((item) => mergedCommutes.get(item.id))
      .filter((r): r is CommuteResult => r !== undefined && r.totalFare > 0);
    if (relevant.length > 0) {
      const avgFare = relevant.reduce((sum, r) => sum + r.totalFare, 0) / relevant.length;
      setTransportCost(fareToMonthly(avgFare));
    }
  }, [compareList, mergedCommutes, commuteFetchDone]);

  // compareList 동네들의 rent_stats median_rent 조회
  useEffect(() => {
    if (compareList.length === 0) return;
    let cancelled = false;

    const fetchRentStats = async () => {
      // neighborhoods 테이블에서 legal_dong_name을 가져와 rent_stats와 매칭
      const ids = compareList.map((item) => item.id);
      const { data: nbData } = await supabase
        .from("neighborhoods")
        .select("id, name, legal_dong_name")
        .in("id", ids);

      if (!nbData || nbData.length === 0) return;

      // id → { name, legal_dong_name } 매핑
      const nbMap = new Map(nbData.map((nb) => [nb.id, nb]));

      // legal_dong_name 기반 OR 조건으로 rent_stats 조회
      const legalDongs = nbData
        .map((nb) => nb.legal_dong_name)
        .filter((d): d is string => d !== null);

      let data: { dong_name: string; median_rent: number | null; base_ym: string }[] | null = null;

      if (legalDongs.length > 0) {
        const orFilter = legalDongs.map((d) => `dong_name.like.${escapeLikePattern(d)}%`).join(",");
        const { data: statsData } = await supabase
          .from("rent_stats")
          .select("dong_name, median_rent, base_ym")
          .or(orFilter)
          .eq("housing_type", "mixed")
          .order("base_ym", { ascending: false });
        data = statsData;
      } else {
        // legal_dong_name이 없으면 기존 name+"동" 폴백
        const dbNames = [...new Set(nbData.map((nb) => nb.name))];
        const dongNameVariants = [...new Set(dbNames.flatMap((n) => [n, n.endsWith("동") ? n : n + "동"]))];
        const { data: statsData } = await supabase
          .from("rent_stats")
          .select("dong_name, median_rent, base_ym")
          .in("dong_name", dongNameVariants)
          .eq("housing_type", "mixed")
          .order("base_ym", { ascending: false });
        data = statsData;
      }

      if (cancelled || !data) return;

      // 각 dong_name별 가장 최신 base_ym의 median_rent만 사용
      const dongResult: Record<string, number> = {};
      for (const row of data) {
        if (!dongResult[row.dong_name] && row.median_rent !== null) {
          dongResult[row.dong_name] = row.median_rent;
        }
      }

      // neighborhood.name 기준으로 매핑 (CostComparisonCards에서 name으로 접근)
      const result: Record<string, number> = {};
      for (const item of compareList) {
        const nb = nbMap.get(item.id);
        if (!nb) continue;
        const legalDong = nb.legal_dong_name;
        if (legalDong) {
          // legal_dong_name과 매칭되는 dong_name 찾기 (LIKE 매칭이므로 prefix 비교)
          const matched = Object.entries(dongResult).find(([key]) => key.startsWith(legalDong));
          if (matched) result[item.name] = matched[1];
        } else {
          // 폴백: name 또는 name+"동"
          const withDong = item.name.endsWith("동") ? item.name : item.name + "동";
          if (dongResult[item.name]) result[item.name] = dongResult[item.name];
          else if (dongResult[withDong]) result[item.name] = dongResult[withDong];
        }
      }

      setMedianRents(result);
    };

    fetchRentStats();
    return () => { cancelled = true; };
  }, [compareList]);

  // NeighborhoodCost 변환
  const neighborhoodCosts = useMemo(() => {
    return compareList.map((item) =>
      toNeighborhoodCost(item, mergedCommutes.get(item.id), medianRents[item.name] ?? null),
    );
  }, [compareList, mergedCommutes, medianRents]);

  // 실제 통근 요금 기반 교통비 (만원), fallback: 하드코딩 추정
  const getTransportCost = (item: typeof compareList[0]) => {
    const commute = mergedCommutes.get(item.id);
    if (commute && commute.totalFare > 0) return fareToMonthly(commute.totalFare);
    return Math.max(3, 7 - Math.floor(item.commute_minutes * 0.08));
  };
  const getScore = (item: typeof compareList[0]) => {
    const commuteScore = Math.max(0, 40 - item.commute_minutes) * 1.5;
    const rentScore = Math.max(0, 70 - item.avg_rent) * 0.8;
    const savingsScore = item.savings_amount * 0.5;
    return Math.min(100, Math.round(commuteScore + rentScore + savingsScore + 20));
  };
  const getLifeScore = (avgRent: number) => Math.min(95, Math.max(60, Math.round(60 + avgRent * 0.3)));
  const getSafetyGrade = (commute: number) => commute <= 15 ? "A" : commute <= 25 ? "B" : "C";

  if (compareList.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mobile-container py-6 space-y-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" />
            뒤로가기
          </button>
          <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
            <BarChart3 className="h-12 w-12 text-muted-foreground" />
            <p className="text-base font-medium text-foreground">비교할 동네가 없어요</p>
            <p className="text-sm text-muted-foreground text-center">결과 페이지에서 동네를 선택해주세요</p>
            <Button variant="hero" size="lg" onClick={() => navigate("/search")}>
              회사 검색하기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const items = compareList;
  const comparisonRows = [
    {
      label: "통근 시간",
      values: items.map((i) => `${i.commute_minutes}분`),
      raw: items.map((i) => i.commute_minutes),
      bestIs: "min" as const,
    },
    {
      label: "평균 월세",
      values: items.map((i) => `${i.avg_rent}만원`),
      raw: items.map((i) => i.avg_rent),
      bestIs: "min" as const,
    },
    {
      label: "월 교통비",
      values: items.map((i) => `${getTransportCost(i)}만원`),
      raw: items.map((i) => getTransportCost(i)),
      bestIs: "min" as const,
    },
    {
      label: "월 총 비용",
      values: items.map((i) => `${i.avg_rent + getTransportCost(i)}만원`),
      raw: items.map((i) => i.avg_rent + getTransportCost(i)),
      bestIs: "min" as const,
    },
    {
      label: "생활 편의",
      values: items.map((i) => `${getLifeScore(i.avg_rent)}점`),
      raw: items.map((i) => getLifeScore(i.avg_rent)),
      bestIs: "max" as const,
    },
    {
      label: "안전 등급",
      values: items.map((i) => `${getSafetyGrade(i.commute_minutes)}등급`),
      raw: items.map((i) => getSafetyGrade(i.commute_minutes) === "A" ? 3 : getSafetyGrade(i.commute_minutes) === "B" ? 2 : 1),
      bestIs: "max" as const,
    },
  ];

  const getBestIdx = (raw: number[], bestIs: "min" | "max") => {
    if (raw.length === 0) return -1;
    const fn = bestIs === "min" ? Math.min : Math.max;
    const best = fn(...raw);
    return raw.indexOf(best);
  };

  const scores = items.map((item) => getScore(item));
  const bestScoreIdx = scores.length > 0 ? scores.indexOf(Math.max(...scores)) : -1;

  return (
    <div className="min-h-screen bg-background">
      <div className="mobile-container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" />
            뒤로가기
          </button>
          <button onClick={clearCompare} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
            초기화
          </button>
        </div>

        <h1 className="text-xl font-bold text-foreground">동네 비교</h1>

        {/* Selected neighborhoods */}
        <div className="flex gap-2">
          {items.map((item) => (
            <Badge key={item.id} variant="secondary" className="flex items-center gap-1 px-3 py-1.5 text-xs">
              {item.name}
              <button onClick={() => removeFromCompare(item.id)} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>

        {/* Comparison Table */}
        <Card className="border-border shadow-card overflow-hidden">
          <CardContent className="p-0">
            {/* Header */}
            <div className={`grid border-b border-border bg-muted`} style={{ gridTemplateColumns: `1fr ${items.map(() => "1fr").join(" ")}` }}>
              <div className="p-2 text-[11px] font-medium text-muted-foreground">항목</div>
              {items.map((item) => (
                <div key={item.id} className="p-2 text-[11px] font-bold text-foreground text-center truncate">{item.name}</div>
              ))}
            </div>

            {/* Rows */}
            {comparisonRows.map((row, ri) => {
              const bestIdx = getBestIdx(row.raw, row.bestIs);
              return (
                <div key={ri} className="grid border-b border-border last:border-0" style={{ gridTemplateColumns: `1fr ${items.map(() => "1fr").join(" ")}` }}>
                  <div className="p-2 text-[11px] text-muted-foreground">{row.label}</div>
                  {row.values.map((val, vi) => (
                    <div key={vi} className={`p-2 text-[11px] font-bold text-center ${vi === bestIdx ? "" : "text-foreground"}`}
                      style={vi === bestIdx ? { color: "hsl(var(--success))" } : undefined}>
                      {val}
                    </div>
                  ))}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Scores */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">종합 추천 점수</h3>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
            {items.map((item, idx) => (
              <Card key={item.id} className={`border-border shadow-card text-center ${idx === bestScoreIdx ? "ring-2" : ""}`}
                style={idx === bestScoreIdx ? { borderColor: "hsl(var(--success))" } : undefined}>
                <CardContent className="p-3">
                  <p className="text-[11px] text-muted-foreground mb-1 truncate">{item.name}</p>
                  <p className={`text-2xl font-black ${idx === bestScoreIdx ? "" : "text-foreground"}`}
                    style={idx === bestScoreIdx ? { color: "hsl(var(--success))" } : undefined}>
                    {scores[idx]}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">/ 100점</p>
                  {idx === bestScoreIdx && (
                    <Badge className="mt-2 text-[10px]" style={{ background: "hsl(var(--success))", color: "hsl(var(--success-foreground))" }}>
                      🏆 추천
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

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

          <InsightCopy
            neighborhoods={neighborhoodCosts}
            currentRent={currentRent}
            currentTransportCost={transportCost}
          />
        </div>
      </div>
    </div>
  );
};

export default ComparePage;
