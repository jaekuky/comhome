import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Wallet, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { trackEvent } from "@/lib/analytics";

export interface NeighborhoodResult {
  id: string;
  name: string;
  district: string;
  city: string;
  avg_rent: number;
  commute_minutes: number;
  commute_route: string;
  savings_amount: number;
  rank: number;
}

interface NeighborhoodCardProps {
  data: NeighborhoodResult;
  index: number;
}

const NeighborhoodCard = ({ data, index }: NeighborhoodCardProps) => {
  const navigate = useNavigate();
  const ref = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <button
      ref={ref}
      onClick={() => {
        trackEvent("neighborhood_clicked", { neighborhood_id: data.id, rank: data.rank });
        navigate(`/neighborhood/${data.id}`);
      }}
      aria-label={`${data.name} ${data.district} 통근 ${data.commute_minutes}분`}
      className={`w-full rounded-2xl bg-card border border-border p-5 shadow-card hover:shadow-card-hover transition-all text-left ${
        visible ? "animate-peek-a-boo opacity-100" : "opacity-0"
      }`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-primary text-xs font-bold text-primary-foreground">
            {data.rank}
          </div>
          <h3 className="font-bold text-foreground">{data.name}</h3>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {data.district}
          </Badge>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="flex items-center gap-4 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium" style={{
          background: "hsl(var(--success) / 0.1)",
          color: "hsl(var(--success))"
        }}>
          <Clock className="h-3.5 w-3.5" />
          {data.commute_minutes}분
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <Wallet className="h-3.5 w-3.5" />
          월세 {data.avg_rent}만원
        </span>
      </div>

      {data.savings_amount > 0 && (
        <p className="mt-2.5 text-xs font-medium" style={{ color: "hsl(var(--success))" }}>
          월 {data.savings_amount}만원 절약 가능
        </p>
      )}

      <p className="mt-1.5 text-[11px] text-muted-foreground">
        {data.commute_route}
      </p>
    </button>
  );
};

export default NeighborhoodCard;
