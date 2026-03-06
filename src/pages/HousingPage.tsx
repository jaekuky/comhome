import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Home, MapPin, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Listing {
  id: string;
  type: string;
  deposit: number;
  monthly_rent: number;
  area_sqm: number;
  floor: number;
  distance_to_station: number;
  description: string | null;
}

const typeFilters = ["전체", "원룸", "투룸", "쓰리룸+"] as const;

const HousingPage = () => {
  const { neighborhoodId } = useParams();
  const navigate = useNavigate();

  const [listings, setListings] = useState<Listing[]>([]);
  const [neighborhoodName, setNeighborhoodName] = useState("");
  const [loading, setLoading] = useState(true);
  const [depositRange, setDepositRange] = useState([100, 5000]);
  const [rentRange, setRentRange] = useState([20, 100]);
  const [typeFilter, setTypeFilter] = useState<string>("전체");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  useEffect(() => {
    if (!neighborhoodId) return;
    const loadData = async () => {
      setLoading(true);
      const [listRes, nbRes] = await Promise.all([
        supabase.from("housing_listings").select("*").eq("neighborhood_id", neighborhoodId),
        supabase.from("neighborhoods").select("name").eq("id", neighborhoodId).single(),
      ]);
      if (listRes.data) setListings(listRes.data as Listing[]);
      if (nbRes.data) setNeighborhoodName(nbRes.data.name);
      setLoading(false);
    };
    loadData();
  }, [neighborhoodId]);

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (typeFilter !== "전체" && l.type !== typeFilter) return false;
      if (l.deposit < depositRange[0] || l.deposit > depositRange[1]) return false;
      if (l.monthly_rent < rentRange[0] || l.monthly_rent > rentRange[1]) return false;
      return true;
    });
  }, [listings, typeFilter, depositRange, rentRange]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mobile-container py-6 space-y-5">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" />
          뒤로가기
        </button>

        <h1 className="text-xl font-bold text-foreground">
          {neighborhoodName || "동네"} 매물
        </h1>

        {/* Filters */}
        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          {/* Type filter */}
          <div className="flex gap-2">
            {typeFilters.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  typeFilter === t
                    ? "gradient-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Deposit slider */}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>보증금</span>
              <span className="font-medium text-foreground">{depositRange[0]}만 ~ {depositRange[1]}만</span>
            </div>
            <Slider
              min={100}
              max={5000}
              step={100}
              value={depositRange}
              onValueChange={setDepositRange}
            />
          </div>

          {/* Rent slider */}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>월세</span>
              <span className="font-medium text-foreground">{rentRange[0]}만 ~ {rentRange[1]}만</span>
            </div>
            <Slider
              min={20}
              max={100}
              step={5}
              value={rentRange}
              onValueChange={setRentRange}
            />
          </div>
        </div>

        {/* Results count */}
        <p className="text-xs text-muted-foreground">{filtered.length}건의 매물</p>

        {/* Listing cards */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Home className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">조건에 맞는 매물이 없어요</p>
            <p className="text-xs text-muted-foreground mt-1">필터 조건을 변경해보세요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((listing) => (
              <button
                key={listing.id}
                onClick={() => setSelectedListing(listing)}
                className="w-full rounded-xl border border-border bg-card p-4 shadow-card hover:shadow-card-hover transition-all text-left flex gap-4"
              >
                {/* Placeholder image */}
                <div className="h-20 w-20 shrink-0 rounded-lg bg-muted flex items-center justify-center">
                  <Home className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{listing.type}</Badge>
                  </div>
                  <p className="text-base font-bold text-foreground">
                    {listing.deposit}/{listing.monthly_rent}만
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                    <span>{listing.area_sqm}㎡</span>
                    <span className="flex items-center gap-0.5">
                      <Layers className="h-3 w-3" />
                      {listing.floor}층
                    </span>
                    <span className="flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" />
                      역 {listing.distance_to_station}분
                    </span>
                  </div>
                  {listing.description && (
                    <p className="mt-1 text-[11px] text-muted-foreground truncate">{listing.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selectedListing} onOpenChange={() => setSelectedListing(null)}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>매물 상세 정보</DialogTitle>
            <DialogDescription>
              이 기능은 곧 오픈 예정입니다
            </DialogDescription>
          </DialogHeader>
          {selectedListing && (
            <div className="space-y-3">
              <div className="h-40 rounded-lg bg-muted flex items-center justify-center">
                <Home className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <p className="text-lg font-bold text-foreground">
                보증금 {selectedListing.deposit}만 / 월세 {selectedListing.monthly_rent}만
              </p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>유형: {selectedListing.type} · {selectedListing.area_sqm}㎡ · {selectedListing.floor}층</p>
                <p>역까지 도보 {selectedListing.distance_to_station}분</p>
                {selectedListing.description && <p>{selectedListing.description}</p>}
              </div>
              <div className="rounded-lg bg-muted p-4 text-center">
                <p className="text-sm font-medium text-foreground">🚀 상세 정보 곧 오픈!</p>
                <p className="text-xs text-muted-foreground mt-1">실제 매물 연결 기능을 준비 중입니다</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HousingPage;
