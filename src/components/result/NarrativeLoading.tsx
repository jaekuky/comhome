import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";

interface NarrativeLoadingProps {
  companyName: string;
  onComplete: () => void;
}

const STEPS = [
  { emoji: "🚇", template: (name: string) => `${name} 주변 교통 노선을 분석하고 있어요...` },
  { emoji: "🏠", template: () => "30분 이내 도달 가능한 동네를 찾고 있어요..." },
  { emoji: "💰", template: () => "동네별 월세 시세를 비교하고 있어요..." },
  { emoji: "✨", template: () => "최적의 추천 결과를 정리하고 있어요!" },
];

const NarrativeLoading = ({ companyName, onComplete }: NarrativeLoadingProps) => {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => {
        const next = prev + 1;
        if (next >= STEPS.length) {
          clearInterval(interval);
          setTimeout(onComplete, 600);
          return prev;
        }
        return next;
      });
    }, 700);
    return () => clearInterval(interval);
  }, [onComplete]);

  useEffect(() => {
    setProgress((step + 1) * 25);
  }, [step]);

  const current = STEPS[step];

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-8 animate-fade-in">
      <div className="text-5xl animate-scale-in" key={step}>
        {current.emoji}
      </div>
      <p className="text-base font-medium text-foreground text-center animate-fade-in" key={`msg-${step}`}>
        {current.template(companyName)}
      </p>
      <div className="w-full max-w-[280px]">
        <Progress
          value={progress}
          className="h-2 bg-muted"
        />
      </div>
      <p className="text-xs text-muted-foreground">{progress}% 완료</p>
    </div>
  );
};

export default NarrativeLoading;
