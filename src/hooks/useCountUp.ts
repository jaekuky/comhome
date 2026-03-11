import { useState, useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export function useCountUp(target: number, duration: number = 1200, startFrom?: number) {
  const from = startFrom ?? 0;
  const reducedMotion = usePrefersReducedMotion();
  const [value, setValue] = useState(from);
  const rafRef = useRef<number>();
  const startTimeRef = useRef<number>();

  useEffect(() => {
    if (reducedMotion) {
      setValue(target);
      return;
    }
    startTimeRef.current = undefined;
    const step = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      const eased = 1 - Math.pow(2, -10 * progress); // easeOutExpo
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, from, reducedMotion]);

  return value;
}
