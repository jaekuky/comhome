import { Shield } from "lucide-react";

interface SafeFilterToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const SafeFilterToggle = ({ checked, onChange }: SafeFilterToggleProps) => (
  <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
    <Shield className="h-3.5 w-3.5 text-green-600" />
    <span className="text-xs font-medium text-muted-foreground">안전 지역만 보기</span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors",
        checked ? "bg-green-500 border-green-500" : "bg-muted border-border",
      ].join(" ")}
    >
      <span
        className={[
          "pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5",
        ].join(" ")}
      />
    </button>
  </label>
);

export default SafeFilterToggle;
