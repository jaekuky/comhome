import { useNavigate } from "react-router-dom";
import { ArrowLeft, X, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSearchStore } from "@/stores/searchStore";

const ComparePage = () => {
  const navigate = useNavigate();
  const { compareList, removeFromCompare, clearCompare } = useSearchStore();

  // Mock transport costs
  const getTransportCost = (commute: number) => Math.max(3, 7 - Math.floor(commute * 0.08));
  const getScore = (item: typeof compareList[0]) => {
    const commuteScore = Math.max(0, 40 - item.commute_minutes) * 1.5;
    const rentScore = Math.max(0, 70 - item.avg_rent) * 0.8;
    const savingsScore = item.savings_amount * 0.5;
    return Math.min(100, Math.round(commuteScore + rentScore + savingsScore + 20));
  };

  const safetyGrades = ["A", "B", "B", "C", "A"];
  const lifeScores = [85, 78, 82, 72, 90];

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
            <Button variant="hero" size="lg" onClick={() => navigate("/result")}>
              결과 페이지로 이동
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
      values: items.map((i) => `${getTransportCost(i.commute_minutes)}만원`),
      raw: items.map((i) => getTransportCost(i.commute_minutes)),
      bestIs: "min" as const,
    },
    {
      label: "월 총 비용",
      values: items.map((i) => `${i.avg_rent + getTransportCost(i.commute_minutes)}만원`),
      raw: items.map((i) => i.avg_rent + getTransportCost(i.commute_minutes)),
      bestIs: "min" as const,
    },
    {
      label: "생활 편의",
      values: items.map((_, idx) => `${lifeScores[idx % lifeScores.length]}점`),
      raw: items.map((_, idx) => lifeScores[idx % lifeScores.length]),
      bestIs: "max" as const,
    },
    {
      label: "안전 등급",
      values: items.map((_, idx) => `${safetyGrades[idx % safetyGrades.length]}등급`),
      raw: items.map((_, idx) => safetyGrades[idx % safetyGrades.length] === "A" ? 3 : safetyGrades[idx % safetyGrades.length] === "B" ? 2 : 1),
      bestIs: "max" as const,
    },
  ];

  const getBestIdx = (raw: number[], bestIs: "min" | "max") => {
    const fn = bestIs === "min" ? Math.min : Math.max;
    const best = fn(...raw);
    return raw.indexOf(best);
  };

  const scores = items.map((item) => getScore(item));
  const bestScoreIdx = scores.indexOf(Math.max(...scores));

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
              <div className="p-3 text-xs font-medium text-muted-foreground">항목</div>
              {items.map((item) => (
                <div key={item.id} className="p-3 text-xs font-bold text-foreground text-center">{item.name}</div>
              ))}
            </div>

            {/* Rows */}
            {comparisonRows.map((row, ri) => {
              const bestIdx = getBestIdx(row.raw, row.bestIs);
              return (
                <div key={ri} className="grid border-b border-border last:border-0" style={{ gridTemplateColumns: `1fr ${items.map(() => "1fr").join(" ")}` }}>
                  <div className="p-3 text-xs text-muted-foreground">{row.label}</div>
                  {row.values.map((val, vi) => (
                    <div key={vi} className={`p-3 text-sm font-bold text-center ${vi === bestIdx ? "" : "text-foreground"}`}
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
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">{item.name}</p>
                  <p className={`text-3xl font-black ${idx === bestScoreIdx ? "" : "text-foreground"}`}
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
      </div>
    </div>
  );
};

export default ComparePage;
