import { useState, useEffect, useRef } from "react";
import { MapPin } from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface NarrativeLoadingProps {
  companyName: string;
  onComplete: () => void;
  isApiReady: boolean;
}

// Step 1: Map zooms into company location
const MapZoomScene = () => (
  <div
    className="relative w-44 h-44 rounded-2xl bg-primary/5 border border-primary/10 overflow-hidden animate-map-zoom"
    aria-hidden="true"
  >
    <svg
      className="absolute inset-0 w-full h-full text-foreground"
      viewBox="0 0 176 176"
      fill="none"
    >
      {[22, 44, 66, 88, 110, 132, 154].map((v) => (
        <g key={v}>
          <line
            x1={0} y1={v} x2={176} y2={v}
            stroke="currentColor" strokeOpacity={0.06} strokeWidth={1}
          />
          <line
            x1={v} y1={0} x2={v} y2={176}
            stroke="currentColor" strokeOpacity={0.06} strokeWidth={1}
          />
        </g>
      ))}
      {/* Main roads */}
      <line x1={0} y1={88} x2={176} y2={88} stroke="currentColor" strokeOpacity={0.15} strokeWidth={2} />
      <line x1={88} y1={0} x2={88} y2={176} stroke="currentColor" strokeOpacity={0.15} strokeWidth={2} />
      {/* Diagonal road */}
      <line x1={0} y1={44} x2={132} y2={176} stroke="currentColor" strokeOpacity={0.08} strokeWidth={1.5} />
    </svg>
    {/* Company pin */}
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex flex-col items-center gap-0.5">
        <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center shadow-md animate-pulse">
          <MapPin className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <div className="w-3 h-1.5 rounded-full bg-primary/20" />
      </div>
    </div>
  </div>
);

// Step 2: 30-min radius ripples expand from center
const RippleScene = () => (
  <div
    className="relative w-44 h-44 flex items-center justify-center"
    aria-hidden="true"
  >
    <div className="absolute rounded-full border-2 border-primary ripple-sm" />
    <div className="absolute rounded-full border-2 border-primary ripple-md" />
    <div className="absolute rounded-full border-2 border-primary ripple-lg" />
    <div className="relative z-10 w-5 h-5 rounded-full bg-primary shadow-lg" />
  </div>
);

const PIN_DELAYS = ["pin-delay-0", "pin-delay-1", "pin-delay-2"] as const;
const CONFETTI_DELAYS = ["confetti-delay-0", "confetti-delay-1", "confetti-delay-2", "confetti-delay-3"] as const;
const CONFETTI_EMOJIS = ["🎉", "⭐", "🎊", "✨"] as const;

// Step 3: Pins drop in + confetti celebration
const PinDropScene = () => (
  <div className="relative w-44 h-44" aria-hidden="true">
    <div className="absolute top-6 inset-x-0 flex justify-around px-4">
      {PIN_DELAYS.map((delayClass, i) => (
        <div key={i} className={`animate-pin-drop ${delayClass}`}>
          <MapPin className="w-8 h-8 text-primary" strokeWidth={2} />
        </div>
      ))}
    </div>
    <div className="absolute bottom-4 inset-x-0 flex justify-around px-2">
      {CONFETTI_EMOJIS.map((emoji, i) => (
        <span key={i} className={`text-xl animate-confetti ${CONFETTI_DELAYS[i]}`}>
          {emoji}
        </span>
      ))}
    </div>
  </div>
);

const LABELS = [
  (name: string) => `${name} 주변을 탐색합니다`,
  () => "30분 안에 도착할 수 있는 곳을 계산합니다",
  () => "최적의 동네를 찾았습니다!",
] as const;

const NarrativeLoading = ({ companyName, onComplete, isApiReady }: NarrativeLoadingProps) => {
  const [step, setStep] = useState(0);
  const [animationDone, setAnimationDone] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const reducedMotion = usePrefersReducedMotion();

  // Advance steps: 0→1s→2s, mark done at 3s (min 2s of animation guaranteed)
  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 1000);
    const t2 = setTimeout(() => setStep(2), 2000);
    const t3 = setTimeout(() => setAnimationDone(true), 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  // Min-Max: call onComplete only when BOTH animation done AND API ready
  useEffect(() => {
    if (animationDone && isApiReady) {
      onCompleteRef.current();
    }
  }, [animationDone, isApiReady]);

  // Show waiting spinner after animation completes but API is still pending
  const showWaitingSpinner = animationDone && !isApiReady;

  return (
    <div
      role="status"
      aria-label="동네 분석 중"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background safe-area-top safe-area-bottom"
    >
      {/* Visual scene (hidden for reduced motion) */}
      {!reducedMotion && (
        <div className="flex items-center justify-center h-48 mb-2">
          {step === 0 && <MapZoomScene />}
          {step === 1 && <RippleScene />}
          {step === 2 && <PinDropScene />}
        </div>
      )}

      {/* Narrative text or waiting spinner */}
      {showWaitingSpinner ? (
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground text-center px-8">
            조금만 기다려주세요...
          </p>
        </div>
      ) : (
        <p
          key={step}
          className={`text-base font-semibold text-foreground text-center px-8 ${
            reducedMotion ? "" : "animate-fade-up"
          }`}
        >
          {LABELS[step](companyName)}
        </p>
      )}

      {/* Step progress dots */}
      <div className="flex gap-2 mt-6" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i < step
                ? "w-6 bg-primary/40"
                : i === step
                  ? "w-6 bg-primary"
                  : "w-1.5 bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default NarrativeLoading;
