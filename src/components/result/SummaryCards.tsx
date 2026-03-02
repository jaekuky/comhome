import { MapPin, Clock, Wallet } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";

interface SummaryCardsProps {
  neighborhoodCount: number;
  avgCommute: number;
  avgSavings: number;
}

const SummaryCards = ({ neighborhoodCount, avgCommute, avgSavings }: SummaryCardsProps) => {
  const countVal = useCountUp(neighborhoodCount, 1000);
  const commuteVal = useCountUp(avgCommute, 1000, 60);
  const savingsVal = useCountUp(avgSavings, 1200);

  const cards = [
    { icon: MapPin, value: `${countVal}개`, label: "추천 동네", color: "text-primary" },
    { icon: Clock, value: `${commuteVal}분`, label: "평균 통근", color: "text-primary" },
    { icon: Wallet, value: `${savingsVal}만원`, label: "월 절감 가능", color: "text-primary" },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
      {cards.map((card, i) => (
        <div
          key={i}
          className="min-w-[130px] flex-1 rounded-2xl bg-card border border-border p-4 shadow-card text-center animate-fade-in animate-counter-blur"
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          <card.icon className={`h-5 w-5 mx-auto mb-2 ${card.color}`} />
          <p className="text-xl font-bold text-foreground">{card.value}</p>
          <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;
