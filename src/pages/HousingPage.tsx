import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Home, Layers, Calendar, Building2, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { type Tables } from "@/integrations/supabase/types";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ListingButton from "@/components/result/ListingButton";
import { escapeLikePattern } from "@/lib/utils";

type RentTransaction = Pick<
  Tables<"rent_transactions">,
  "id" | "housing_type" | "building_name" | "area_sqm" | "floor" | "deposit" | "monthly_rent" | "build_year" | "deal_date" | "contract_type"
>;

function housingTypeLabel(type: string): string {
  switch (type) {
    case "villa": return "빌라/연립";
    case "officetel": return "오피스텔";
    default: return type;
  }
}

function formatDealDate(date: string): string {
  const d = new Date(date);
  return `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, "0")}.${d.getDate().toString().padStart(2, "0")}`;
}

const typeFilters = ["전체", "빌라/연립", "오피스텔"] as const;
const typeFilterMap: Record<string, string> = { "빌라/연립": "villa", "오피스텔": "officetel" };

const HousingPage = () => {
  const { neighborhoodId } = useParams();
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<RentTransaction[]>([]);
  const [neighborhoodName, setNeighborhoodName] = useState("");
  const [neighborhoodDistrict, setNeighborhoodDistrict] = useState("");
  const [neighborhoodLat, setNeighborhoodLat] = useState<number | null>(null);
  const [neighborhoodLng, setNeighborhoodLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [depositRange, setDepositRange] = useState([100, 5000]);
  const [rentRange, setRentRange] = useState([20, 100]);
  const [typeFilter, setTypeFilter] = useState<string>("전체");
  const [selectedTx, setSelectedTx] = useState<RentTransaction | null>(null);

  useEffect(() => {
    if (!neighborhoodId) return;
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(neighborhoodId);
    if (!isValidUUID) {
      setError("유효하지 않은 동네 ID입니다");
      setLoading(false);
      return;
    }
    let cancelled = false;
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. 동네 정보 조회
        const { data: nb, error: nbErr } = await supabase
          .from("neighborhoods")
          .select("name, district, latitude, longitude, region_code, legal_dong_name")
          .eq("id", neighborhoodId)
          .single();

        if (cancelled) return;
        if (nbErr) throw nbErr;
        if (!nb) throw new Error("동네 정보를 찾을 수 없습니다");

        setNeighborhoodName(nb.name);
        setNeighborhoodDistrict(nb.district);
        setNeighborhoodLat(nb.latitude);
        setNeighborhoodLng(nb.longitude);

        // 2. rent_transactions에서 해당 동네 실거래 데이터 조회
        const legalDong = nb.legal_dong_name;
        let txQuery = supabase
          .from("rent_transactions")
          .select("id, housing_type, building_name, area_sqm, floor, deposit, monthly_rent, build_year, deal_date, contract_type")
          .order("deal_date", { ascending: false })
          .limit(100);

        if (legalDong) {
          txQuery = txQuery.like("dong_name", `${escapeLikePattern(legalDong)}%`);
        } else {
          const dongNameVariants = [nb.name, nb.name.endsWith("동") ? nb.name : nb.name + "동"];
          txQuery = txQuery.in("dong_name", dongNameVariants);
        }

        if (nb.region_code) {
          txQuery = txQuery.eq("region_code", nb.region_code);
        }

        const { data: txData, error: txErr } = await txQuery;
        if (cancelled) return;
        if (txErr) throw txErr;

        // 3. rent_transactions가 비어있으면 기존 housing_listings fallback
        if (!txData || txData.length === 0) {
          const { data: legacyData } = await supabase
            .from("housing_listings")
            .select("*")
            .eq("neighborhood_id", neighborhoodId);

          if (cancelled) return;
          if (legacyData && legacyData.length > 0) {
            setTransactions(legacyData.map((l, idx) => ({
              id: idx + 1,
              housing_type: l.type === "원룸" || l.type === "투룸" ? "villa" : "officetel",
              building_name: l.description,
              area_sqm: l.area_sqm,
              floor: l.floor,
              deposit: l.deposit,
              monthly_rent: l.monthly_rent,
              build_year: null,
              deal_date: l.created_at,
              contract_type: null,
            })));
          }
        } else {
          setTransactions(txData);
        }
      } catch {
        if (!cancelled) setError("데이터를 불러오는 중 오류가 발생했습니다");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadData();
    return () => { cancelled = true; };
  }, [neighborhoodId]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter !== "전체") {
        const mappedType = typeFilterMap[typeFilter];
        if (mappedType && t.housing_type !== mappedType) return false;
      }
      if (t.deposit < depositRange[0] || t.deposit > depositRange[1]) return false;
      if (t.monthly_rent < rentRange[0] || t.monthly_rent > rentRange[1]) return false;
      return true;
    });
  }, [transactions, typeFilter, depositRange, rentRange]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mobile-container py-6 space-y-5">
        <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" />
          뒤로가기
        </button>

        <div>
          <h1 className="text-xl font-bold text-foreground">
            {neighborhoodName || "동네"} 실거래 내역
          </h1>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
            <BarChart3 className="h-3 w-3" />
            <span>국토교통부 실거래가 기준 · 1인 가구 (20~33㎡)</span>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          {/* Type filter */}
          <div className="flex gap-2">
            {typeFilters.map((t) => (
              <button
                key={t}
                type="button"
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
            <Slider min={100} max={5000} step={100} value={depositRange} onValueChange={setDepositRange} />
          </div>

          {/* Rent slider */}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>월세</span>
              <span className="font-medium text-foreground">{rentRange[0]}만 ~ {rentRange[1]}만</span>
            </div>
            <Slider min={20} max={100} step={5} value={rentRange} onValueChange={setRentRange} />
          </div>
        </div>

        {/* Results count */}
        <p className="text-xs text-muted-foreground">{filtered.length}건의 실거래</p>

        {/* Transaction cards */}
        {error ? (
          <div className="py-12 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <p className="text-xs text-muted-foreground mt-1">잠시 후 다시 시도해주세요</p>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Home className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">조건에 맞는 실거래 내역이 없어요</p>
            <p className="text-xs text-muted-foreground mt-1">필터 조건을 변경해보세요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((tx) => (
              <button
                key={tx.id}
                type="button"
                onClick={() => setSelectedTx(tx)}
                className="w-full rounded-xl border border-border bg-card p-4 shadow-card hover:shadow-card-hover transition-all text-left"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {housingTypeLabel(tx.housing_type)}
                  </Badge>
                  {tx.contract_type && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {tx.contract_type}
                    </Badge>
                  )}
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {formatDealDate(tx.deal_date)}
                  </span>
                </div>
                <p className="text-base font-bold text-foreground">
                  {tx.deposit}/{tx.monthly_rent}만
                </p>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                  <span>{tx.area_sqm}㎡</span>
                  {tx.floor && (
                    <span className="flex items-center gap-0.5">
                      <Layers className="h-3 w-3" />
                      {tx.floor}층
                    </span>
                  )}
                  {tx.building_name && (
                    <span className="flex items-center gap-0.5">
                      <Building2 className="h-3 w-3" />
                      {tx.building_name}
                    </span>
                  )}
                  {tx.build_year && (
                    <span className="flex items-center gap-0.5">
                      <Calendar className="h-3 w-3" />
                      {tx.build_year}년
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>실거래 상세 정보</DialogTitle>
            <DialogDescription>
              국토교통부 실거래가 데이터 기반
            </DialogDescription>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-3">
              <p className="text-lg font-bold text-foreground">
                보증금 {selectedTx.deposit}만 / 월세 {selectedTx.monthly_rent}만
              </p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>유형: {housingTypeLabel(selectedTx.housing_type)} · {selectedTx.area_sqm}㎡{selectedTx.floor ? ` · ${selectedTx.floor}층` : ""}</p>
                {selectedTx.building_name && <p>건물명: {selectedTx.building_name}</p>}
                {selectedTx.build_year && <p>건축년도: {selectedTx.build_year}년</p>}
                <p>계약일: {formatDealDate(selectedTx.deal_date)}{selectedTx.contract_type ? ` (${selectedTx.contract_type})` : ""}</p>
              </div>
              <div className="rounded-lg border border-border p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">외부 플랫폼에서 매물 검색</p>
                <p className="text-xs text-muted-foreground">{neighborhoodName} 주변 현재 매물을 확인해보세요</p>
                <ListingButton
                  dongName={neighborhoodName}
                  district={neighborhoodDistrict}
                  latitude={neighborhoodLat}
                  longitude={neighborhoodLng}
                  onBeforeNavigate={() => setSelectedTx(null)}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HousingPage;
