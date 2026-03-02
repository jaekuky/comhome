import { Zap, TrainFront, PiggyBank } from "lucide-react";

const cards = [
  {
    icon: Zap,
    title: "30초 분석",
    description: "회사 주소 하나면 충분합니다",
  },
  {
    icon: TrainFront,
    title: "실시간 교통 데이터",
    description: "대중교통 기반 정확한 통근 시간",
  },
  {
    icon: PiggyBank,
    title: "월세 비교",
    description: "통근비 절감 vs 월세 변동 한눈에",
  },
];

const ValueCardsSection = () => {
  return (
    <section className="py-12">
      <div className="mobile-container space-y-4">
        <h2 className="text-center text-xl font-bold text-foreground">
          왜 <span className="gradient-primary-text">ComHome</span>인가요?
        </h2>
        <div className="mt-6 space-y-3">
          {cards.map((card, i) => (
            <div
              key={card.title}
              className="flex items-start gap-4 rounded-xl bg-card p-5 shadow-card transition-shadow duration-200 hover:shadow-card-hover animate-fade-up"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl gradient-primary">
                <card.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">{card.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {card.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ValueCardsSection;
