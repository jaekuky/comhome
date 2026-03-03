import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface OnboardingTooltipProps {
  id: string;
  text: string;
  position?: "top" | "bottom";
  onDismiss?: () => void;
}

const STORAGE_KEY = "comhome_onboarding";

function isDismissed(id: string): boolean {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return !!data[id];
  } catch {
    return false;
  }
}

function dismiss(id: string) {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    data[id] = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (_e) { /* localStorage unavailable */ }
}

const OnboardingTooltip = ({ id, text, position = "top", onDismiss }: OnboardingTooltipProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isDismissed(id)) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, [id]);

  const handleDismiss = () => {
    setVisible(false);
    dismiss(id);
    onDismiss?.();
  };

  if (!visible) return null;

  const isTop = position === "top";

  return (
    <div
      className={`absolute left-1/2 -translate-x-1/2 z-50 animate-fade-in ${
        isTop ? "bottom-[calc(100%+12px)]" : "top-[calc(100%+12px)]"
      }`}
    >
      <div className="relative bg-foreground text-background rounded-xl px-4 py-2.5 text-sm font-medium whitespace-nowrap shadow-lg">
        {text}
        <button
          onClick={handleDismiss}
          className="ml-2 inline-flex items-center justify-center rounded-full hover:opacity-70 transition-opacity"
          aria-label="닫기"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        {/* Arrow */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-foreground rotate-45 ${
            isTop ? "-bottom-1.5" : "-top-1.5"
          }`}
        />
      </div>
    </div>
  );
};

export default OnboardingTooltip;
