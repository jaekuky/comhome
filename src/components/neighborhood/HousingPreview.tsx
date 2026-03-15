import { useNavigate } from "react-router-dom";
import { Home, MapPin, TrendingDown, TrendingUp, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HousingListing {
  id: string;
  type: string;
  deposit: number;
  monthly_rent: number;
  area_sqm: number;
  distance_to_station: number;
}

interface RentStats {
  housing_type: string;
  base_ym: string;
  avg_rent: number | null;
  median_rent: number | null;
  min_rent: number | null;
  max_rent: number | null;
  avg_deposit: number | null;
  sample_count: number | null;
}

interface HousingPreviewProps {
  neighborhoodId: string;
  neighborhoodName: string;
  listings: HousingListing[];
  rentStats?: RentStats[];
  loading?: boolean;
}

function formatBaseYm(baseYm: string): string {
  const year = baseYm.slice(0, 4);
  const month = parseInt(baseYm.slice(4, 6), 10);
  return `${year}년 ${month}월`;
}

function housingTypeLabel(type: string): string {
  switch (type) {
    case "villa": return "빌라/연립";
    case "officetel": return "오피스텔";
    case "mixed": return "전체";
    default: return type;
  }
}

const RentStatsCard = ({ stat }: { stat: RentStats }) => (
  <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
    <div className="flex items-center justify-between">
      <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
        {housingTypeLabel(stat.housing_type)}
      </span>
      <span className="text-[10px] text-muted-foreground">
        {formatBaseYm(stat.base_ym)} 기준
      </span>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <div>
        <p className="text-[10px] text-muted-foreground mb-0.5">평균 월세</p>
        <p className="text-sm font-bold text-foreground">{stat.avg_rent ?? "-"}만원</p>
      </div>
      <div>
        <p className="text-[10px] text-muted-foreground mb-0.5">중앙값 월세</p>
        <p className="text-sm font-bold text-foreground">{stat.median_rent ?? "-"}만원</p>
      </div>
      <div>
        <p className="text-[10px] text-muted-foreground mb-0.5">평균 보증금</p>
        <p className="text-sm font-bold text-foreground">{stat.avg_deposit ?? "-"}만원</p>
      </div>
      <div>
        <p className="text-[10px] text-muted-foreground mb-0.5">거래 건수</p>
        <p className="text-sm font-bold text-foreground">{stat.sample_count ?? 0}건</p>
      </div>
    </div>

    <div className="flex items-center justify-between pt-2 border-t border-border">
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <TrendingDown className="h-3 w-3 text-blue-500" />
        <span>최저 {stat.min_rent ?? "-"}만</span>
      </div>
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <TrendingUp className="h-3 w-3 text-red-500" />
        <span>최고 {stat.max_rent ?? "-"}만</span>
      </div>
    </div>
  </div>
);

const HousingPreview = ({ neighborhoodId, neighborhoodName, listings, rentStats, loading }: HousingPreviewProps) => {
  const navigate = useNavigate();
  const preview = listings.slice(0, 3);

  // rent_stats에서 mixed 제외, villa/officetel만 표시 (mixed는 요약용)
  const detailStats = rentStats?.filter((s) => s.housing_type !== "mixed") ?? [];
  const mixedStat = rentStats?.find((s) => s.housing_type === "mixed");

  return (
    <div>
      <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
        <Home className="h-4 w-4 text-primary" />
        이 동네 매물 보기
      </h3>

      {loading ? (
        <p className="text-sm text-muted-foreground">매물 정보를 불러오는 중...</p>
      ) : preview.length > 0 ? (
        <>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
            {preview.map((listing) => (
              <div
                key={listing.id}
                className="min-w-[200px] snap-start rounded-xl border border-border bg-card p-4 shadow-card"
              >
                {/* Placeholder image */}
                <div className="h-24 rounded-lg bg-muted mb-3 flex items-center justify-center">
                  <Home className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground mb-2">
                  {listing.type}
                </span>
                <p className="text-sm font-bold text-foreground">
                  {listing.deposit}/{listing.monthly_rent}만
                </p>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                  <span>{listing.area_sqm}㎡</span>
                  <span>·</span>
                  <span className="flex items-center gap-0.5">
                    <MapPin className="h-3 w-3" />
                    역 {listing.distance_to_station}분
                  </span>
                </div>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            className="w-full mt-3"
            onClick={() => navigate(`/housing/${neighborhoodId}`)}
          >
            전체 매물 보기 ({listings.length}건)
          </Button>
        </>
      ) : rentStats && rentStats.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>국토교통부 실거래가 기반 임대료 통계 (1인 가구, 20~33㎡)</span>
          </div>

          {/* 요약 카드 (mixed) */}
          {mixedStat && (
            <RentStatsCard stat={mixedStat} />
          )}

          {/* 유형별 상세 */}
          {detailStats.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
              {detailStats.map((stat) => (
                <div key={stat.housing_type} className="min-w-[220px] snap-start">
                  <RentStatsCard stat={stat} />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">현재 등록된 매물이 없습니다</p>
      )}
    </div>
  );
};

export default HousingPreview;
