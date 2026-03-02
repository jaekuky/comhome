import { TrendingDown } from "lucide-react";

interface InsightBannerProps {
  currentCommute: number;
  avgRecommendedCommute: number;
}

const InsightBanner = ({ currentCommute, avgRecommendedCommute }: InsightBannerProps) => {
  const savedMinutesPerDay = (currentCommute - avgRecommendedCommute) * 2; // round trip
  const savedHoursPerMonth = Math.round((savedMinutesPerDay * 22) / 60);
  const savedHoursPerYear = savedHoursPerMonth * 12;
  const savedDaysPerYear = (savedHoursPerYear / 24).toFixed(1);

  return (
    <div className="rounded-2xl p-5 animate-fade-in" style={{
      background: "linear-gradient(135deg, hsl(217 82% 51% / 0.08), hsl(199 91% 64% / 0.12))"
    }}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <TrendingDown className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm text-foreground leading-relaxed">
            현재 통근 시간 <span className="font-bold text-primary">{currentCommute}분</span>으로
            한 달에 약 <span className="font-bold text-primary">{savedHoursPerMonth}시간</span>을 소비하고 있어요
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            추천 동네로 이사하면 연간{" "}
            <span className="font-bold text-primary">{savedHoursPerYear}시간</span>, 약{" "}
            <span className="font-bold text-primary">{savedDaysPerYear}일</span>을 돌려받을 수 있어요
          </p>
        </div>
      </div>
    </div>
  );
};

export default InsightBanner;
