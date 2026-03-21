import { useRef, useState, useCallback, useMemo } from "react";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AnimatedCounter from "@/components/result/AnimatedCounter";
import { BASE_COMMUTE_MINUTES, type NeighborhoodCost } from "@/lib/costUtils";

interface CostComparisonCardsProps {
  neighborhoods: NeighborhoodCost[];
  currentRent: number;
  currentTransportCost: number;
  income?: number;
}

interface CostDiff {
  rentDiff: number;
  transportDiff: number;
  totalDiff: number;
  annualTimeSaved: number;
}

function calcDiff(
  n: NeighborhoodCost,
  currentRent: number,
  currentTransportCost: number,
  baseCommuteMinutes: number,
): CostDiff {
  const rentDiff = n.medianRent - currentRent;
  const transportDiff = n.monthlyTransportCost - currentTransportCost;
  const totalDiff = rentDiff + transportDiff;
  // 연간 절약 시간 = (현재 통근 - 추천 통근) × 2(왕복) × 22일 × 12개월 / 60분
  const minutesSaved = (baseCommuteMinutes - n.commuteMinutes) * 2 * 22 * 12;
  const annualTimeSaved = Math.round(minutesSaved / 60);
  return { rentDiff, transportDiff, totalDiff, annualTimeSaved };
}

const CostComparisonCards = ({
  neighborhoods,
  currentRent,
  currentTransportCost,
  income = 0,
}: CostComparisonCardsProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // 현재 통근 시간 기준: 고정값 사용 (InsightCopy와 동일 기준)
  const baseCommuteMinutes = BASE_COMMUTE_MINUTES;

  const diffs = useMemo(
    () =>
      neighborhoods.map((n) =>
        calcDiff(n, currentRent, currentTransportCost, baseCommuteMinutes),
      ),
    [neighborhoods, currentRent, currentTransportCost, baseCommuteMinutes],
  );

  const allCostIncrease = diffs.every((d) => d.totalDiff > 0);

  const scrollTo = useCallback(
    (direction: "prev" | "next") => {
      const container = scrollRef.current;
      if (!container) return;
      const nextIndex =
        direction === "next"
          ? Math.min(activeIndex + 1, neighborhoods.length - 1)
          : Math.max(activeIndex - 1, 0);
      const card = container.children[nextIndex] as HTMLElement | undefined;
      if (card) {
        container.scrollTo({ left: card.offsetLeft - 16, behavior: "smooth" });
        setActiveIndex(nextIndex);
      }
    },
    [activeIndex, neighborhoods.length],
  );

  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const scrollLeft = container.scrollLeft;
    const cardWidth = (container.children[0] as HTMLElement)?.offsetWidth ?? 280;
    setActiveIndex(Math.round(scrollLeft / (cardWidth + 12)));
  }, []);

  const formatDiff = (value: number) => {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value}만원`;
  };

  if (neighborhoods.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-bold text-foreground">지역별 비용 비교</h3>
        {neighborhoods.length > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => scrollTo("prev")}
              disabled={activeIndex === 0}
              aria-label="이전 카드"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => scrollTo("next")}
              disabled={activeIndex === neighborhoods.length - 1}
              aria-label="다음 카드"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* 스와이프 컨테이너 */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        {neighborhoods.map((n, i) => {
          const diff = diffs[i];
          const isSaving = diff.totalDiff < 0;
          return (
            <Card
              key={n.id}
              className="min-w-[280px] max-w-[320px] flex-shrink-0 snap-center border-border shadow-card"
            >
              <CardContent className="p-5 space-y-4">
                {/* 헤더 */}
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-foreground">{n.name}</h4>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {n.district}
                  </Badge>
                </div>

                {/* 비용 항목 */}
                <div className="space-y-2.5">
                  <CostRow
                    label="월세 차이"
                    value={formatDiff(diff.rentDiff)}
                    isPositive={diff.rentDiff <= 0}
                  />
                  <CostRow
                    label="교통비 차이"
                    value={formatDiff(diff.transportDiff)}
                    isPositive={diff.transportDiff <= 0}
                  />
                  <div className="border-t border-border pt-2.5">
                    <CostRow
                      label={isSaving ? "실질 절감" : "실질 추가 비용"}
                      value={formatDiff(diff.totalDiff)}
                      isPositive={isSaving}
                      bold
                    />
                  </div>
                </div>

                {/* 소득 대비 주거비 비율 */}
                {income > 0 && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>소득 대비 주거비</span>
                    <span className={`font-medium tabular-nums ${
                      Math.round((n.medianRent / income) * 100) > 30
                        ? "text-destructive"
                        : "text-foreground"
                    }`}>
                      {Math.round((n.medianRent / income) * 100)}%
                    </span>
                  </div>
                )}

                {/* 연간 절약 시간 */}
                {diff.annualTimeSaved > 0 && (
                  <div className="flex items-center gap-1.5 text-xs rounded-lg p-2.5 bg-primary/[0.06]">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span className="text-foreground font-medium">
                      연간{" "}
                      <AnimatedCounter
                        targetValue={diff.annualTimeSaved}
                        suffix="시간"
                        duration={700}
                      />{" "}
                      절약
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 페이지 인디케이터 */}
      {neighborhoods.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {neighborhoods.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIndex
                  ? "w-4 bg-primary"
                  : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      )}

      {/* 모든 지역이 손해일 때 시간 가치 전환 메시지 */}
      {allCostIncrease && (
        <Card className="border-primary/20 bg-primary/[0.04]">
          <CardContent className="p-4">
            <p className="text-xs text-foreground leading-relaxed">
              <span className="font-bold">시간 가치 관점에서 보면</span> —
              비용은 다소 올라가지만 출퇴근에서 되찾는 시간의 가치를
              고려해보세요.
              {income > 0 && diffs[0]?.annualTimeSaved > 0 ? (
                <> 시급 약 {Math.round((income * 10000) / (22 * 8) / 100).toLocaleString()}00원 기준, 연간 절약 시간의 가치는 약 <span className="font-bold">{Math.round((income * 10000) / (22 * 8) * diffs[0].annualTimeSaved / 10000)}만원</span>입니다.</>
              ) : (
                <> 연봉 기준 시급으로 환산하면 오히려 이득일 수 있습니다.</>
              )}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

function CostRow({
  label,
  value,
  isPositive,
  bold,
}: {
  label: string;
  value: string;
  isPositive: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={`text-xs ${bold ? "font-bold text-foreground" : "text-muted-foreground"}`}
      >
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <span
          className={`text-sm tabular-nums ${bold ? "font-bold" : "font-medium"}`}
          style={{
            color: isPositive
              ? "hsl(var(--success))"
              : "hsl(var(--destructive))",
          }}
        >
          {value}
        </span>
        <Badge
          variant="outline"
          className="text-[9px] px-1 py-0 text-muted-foreground"
        >
          추정
        </Badge>
      </div>
    </div>
  );
}

export default CostComparisonCards;
export type { NeighborhoodCost };
