interface QuickAccessArea {
  name: string;
  icon: string;
}

const QUICK_ACCESS_AREAS: QuickAccessArea[] = [
  { name: "강남역", icon: "🏢" },
  { name: "판교역", icon: "🚉" },
  { name: "여의도", icon: "🏦" },
  { name: "광화문", icon: "🏛️" },
];

interface QuickAccessButtonsProps {
  onSelect: (areaName: string) => void;
  disabled?: boolean;
}

const QuickAccessButtons = ({ onSelect, disabled }: QuickAccessButtonsProps) => {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground text-center">
        인기 지역 바로 분석
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 sm:justify-center sm:flex-wrap scrollbar-none">
        {QUICK_ACCESS_AREAS.map((area) => (
          <button
            key={area.name}
            onClick={() => onSelect(area.name)}
            disabled={disabled}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted/50 px-4 py-2 text-sm font-medium text-foreground transition-all duration-200 hover:bg-primary/10 hover:border-primary/40 hover:text-primary hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span aria-hidden="true">{area.icon}</span>
            {area.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickAccessButtons;
