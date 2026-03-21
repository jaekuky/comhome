import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Wallet, ChevronRight, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trackEvent } from "@/lib/analytics";
import AffordabilityBadge from "@/components/cost/AffordabilityBadge";
import ListingButton from "@/components/result/ListingButton";
import { fetchLivingScore } from "@/lib/kakaoLocal";
import { type NeighborhoodResult } from "@/types/neighborhood";

export type { NeighborhoodResult };

interface NeighborhoodCardProps {
  data: NeighborhoodResult;
  index: number;
  income?: number | null;
  onRequestIncomeInput?: () => void;
  onBeforeListingNavigate?: () => void;
}

const LivingScoreStars = ({ lat, lng }: { lat: number; lng: number }) => {
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchLivingScore(lat, lng)
      .then((r) => { if (!cancelled) setScore(r.score); })
      .catch(() => { /* P0 영향 없음 — 조용히 실패 */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [lat, lng]);

  if (loading) return <Skeleton className="h-4 w-20 rounded" />;
  if (score === null) return null;

  const fullStars = Math.floor(score);
  const hasHalf = score - fullStars >= 0.5;

  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground" title={`생활 편의 ${score}점`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className="h-3.5 w-3.5"
          fill={i < fullStars ? "hsl(var(--warning))" : i === fullStars && hasHalf ? "url(#halfStar)" : "none"}
          stroke={i < fullStars || (i === fullStars && hasHalf) ? "hsl(var(--warning))" : "currentColor"}
        />
      ))}
      <span className="ml-1 font-medium">{score}</span>
      <svg width="0" height="0"><defs><linearGradient id="halfStar"><stop offset="50%" stopColor="hsl(var(--warning))" /><stop offset="50%" stopColor="transparent" /></linearGradient></defs></svg>
    </span>
  );
};

const NeighborhoodCard = ({ data, index, income = null, onRequestIncomeInput, onBeforeListingNavigate }: NeighborhoodCardProps) => {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
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
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={() => {
        trackEvent("neighborhood_clicked", { neighborhood_id: data.id, rank: data.rank });
        if (index >= 1) {
          trackEvent("card_explored", { card_index: index, area_name: data.name });
        }
        navigate(`/neighborhood/${data.id}`);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          trackEvent("neighborhood_clicked", { neighborhood_id: data.id, rank: data.rank });
          if (index >= 1) {
            trackEvent("card_explored", { card_index: index, area_name: data.name });
          }
          navigate(`/neighborhood/${data.id}`);
        }
      }}
      aria-label={`${data.name} ${data.district} 통근 ${data.commute_minutes}분`}
      className={`w-full rounded-2xl bg-card border border-border p-5 shadow-card hover:shadow-card-hover transition-all text-left cursor-pointer ${
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

      <div className="mt-1 flex items-center gap-3">
        <AffordabilityBadge rent={data.avg_rent} income={income} onRequestInput={onRequestIncomeInput} />
        {data.latitude != null && data.longitude != null && (
          <LivingScoreStars lat={data.latitude} lng={data.longitude} />
        )}
      </div>

      <div className="flex items-center gap-4 text-xs mt-2">
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

      <ListingButton dongName={data.name} district={data.district} latitude={data.latitude} longitude={data.longitude} onBeforeNavigate={onBeforeListingNavigate} />
    </div>
  );
};

export default NeighborhoodCard;
