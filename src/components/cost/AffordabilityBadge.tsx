import {
  calcAffordabilityRate,
  getAffordabilityLevel,
  DEFAULT_INCOME_BY_AGE,
  LEVEL_LABEL,
  type AffordabilityLevel,
} from "@/lib/affordability";

const COLORS: Record<AffordabilityLevel, { bg: string; text: string }> = {
  safe: { bg: "bg-green-100", text: "text-green-700" },
  caution: { bg: "bg-yellow-100", text: "text-yellow-700" },
  danger: { bg: "bg-red-100", text: "text-red-700" },
};

interface AffordabilityBadgeProps {
  rent: number;
  income: number | null;
  onRequestInput?: () => void;
}

const AffordabilityBadge = ({ rent, income, onRequestInput }: AffordabilityBadgeProps) => {
  const isDefault = income === null;
  const effectiveIncome = income ?? DEFAULT_INCOME_BY_AGE['30s'];
  const rate = calcAffordabilityRate(rent, effectiveIncome);
  const level = getAffordabilityLevel(rate);
  const { bg, text } = COLORS[level];

  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${bg} ${text}`}
      >
        {LEVEL_LABEL[level]} {Math.round(rate)}%
        {isDefault && " (평균)"}
      </span>
      {isDefault && onRequestInput && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onRequestInput();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              onRequestInput();
            }
          }}
          className="text-[10px] text-primary underline hover:no-underline cursor-pointer"
        >
          내 소득으로 계산
        </span>
      )}
    </span>
  );
};

export default AffordabilityBadge;
