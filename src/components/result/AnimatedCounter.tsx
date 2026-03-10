import { useState, useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface AnimatedCounterProps {
  targetValue: number;
  duration?: number;
  suffix?: string;
  contextText?: string;
}

const AnimatedCounter = ({
  targetValue,
  duration = 800,
  suffix = "",
  contextText,
}: AnimatedCounterProps) => {
  const reducedMotion = usePrefersReducedMotion();
  const [displayValue, setDisplayValue] = useState(0);
  const [isBouncing, setIsBouncing] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (reducedMotion) {
      setDisplayValue(targetValue);
      setShowContext(true);
      return;
    }

    const bounceTimer = { id: 0 };
    const contextTimer = { id: 0 };

    const startAnimation = () => {
      let startTime: number | undefined;

      const step = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const eased = 1 - Math.pow(2, -10 * progress); // easeOutExpo
        setDisplayValue(Math.round(targetValue * eased));

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          setDisplayValue(targetValue);
          setIsBouncing(true);
          bounceTimer.id = window.setTimeout(() => {
            setIsBouncing(false);
            contextTimer.id = window.setTimeout(
              () => setShowContext(true),
              300,
            );
          }, 400);
        }
      };

      rafRef.current = requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted.current) {
          hasStarted.current = true;
          observer.disconnect();
          startAnimation();
        }
      },
      { threshold: 0.3 },
    );

    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearTimeout(bounceTimer.id);
      clearTimeout(contextTimer.id);
    };
  }, [targetValue, duration, reducedMotion]);

  return (
    <div ref={containerRef} className="inline-flex flex-col items-center gap-1">
      <span
        aria-live="polite"
        aria-atomic="true"
        className={`text-3xl font-bold text-primary tabular-nums${isBouncing ? " animate-counter-bounce" : ""}`}
      >
        {displayValue}
        {suffix}
      </span>
      {contextText && (
        <span
          className={`text-sm text-muted-foreground text-center transition-opacity duration-500 ${showContext ? "opacity-100" : "opacity-0"}`}
          aria-hidden={!showContext}
        >
          {contextText}
        </span>
      )}
    </div>
  );
};

export default AnimatedCounter;
