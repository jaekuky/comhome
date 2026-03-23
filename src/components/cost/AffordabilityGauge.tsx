import { calcAffordabilityRate, getAffordabilityLevel, LEVEL_LABEL, type AffordabilityLevel } from "@/lib/affordability";

const BAR_COLORS: Record<AffordabilityLevel, string> = {
  safe: "bg-green-500",
  caution: "bg-yellow-500",
  danger: "bg-red-500",
};

interface AffordabilityGaugeProps {
  currentRent: number;
  newRent: number;
  income: number;
}

const GaugeBar = ({ label, rate, level }: { label: string; rate: number; level: AffordabilityLevel }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">
        {LEVEL_LABEL[level]} {Math.round(rate)}%
      </span>
    </div>
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${BAR_COLORS[level]}`}
        style={{ width: `${Math.min(rate, 100)}%` }}
      />
    </div>
  </div>
);

const AffordabilityGauge = ({ currentRent, newRent, income }: AffordabilityGaugeProps) => {
  if (income <= 0) return null;
  const currentRate = calcAffordabilityRate(currentRent, income);
  const newRate = calcAffordabilityRate(newRent, income);
  const currentLevel = getAffordabilityLevel(currentRate);
  const newLevel = getAffordabilityLevel(newRate);
  const diff = currentRate - newRate;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h4 className="text-sm font-semibold text-foreground">주거비 부담률 비교</h4>
      <GaugeBar label="현재" rate={currentRate} level={currentLevel} />
      <GaugeBar label="이사 후" rate={newRate} level={newLevel} />
      {diff > 0 && (
        <p className="text-xs font-medium text-green-600">
          부담률 {Math.round(diff)}%p 감소
        </p>
      )}
    </div>
  );
};

export default AffordabilityGauge;
