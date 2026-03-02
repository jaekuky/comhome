import { useNavigate } from "react-router-dom";
import { Home, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HousingListing {
  id: string;
  type: string;
  deposit: number;
  monthly_rent: number;
  area_sqm: number;
  distance_to_station: number;
}

interface HousingPreviewProps {
  neighborhoodId: string;
  neighborhoodName: string;
  listings: HousingListing[];
}

const HousingPreview = ({ neighborhoodId, neighborhoodName, listings }: HousingPreviewProps) => {
  const navigate = useNavigate();
  const preview = listings.slice(0, 3);

  return (
    <div>
      <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
        <Home className="h-4 w-4 text-primary" />
        이 동네 매물 보기
      </h3>

      {preview.length === 0 ? (
        <p className="text-sm text-muted-foreground">매물 정보를 불러오는 중...</p>
      ) : (
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
      )}
    </div>
  );
};

export default HousingPreview;
