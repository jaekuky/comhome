import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useSearchStore } from "@/stores/searchStore";
import { type NeighborhoodResult } from "@/components/result/NeighborhoodCard";
import CommuteTimeline from "@/components/neighborhood/CommuteTimeline";
import CostComparisonTable from "@/components/neighborhood/CostComparisonTable";
import LivingInfoTabs from "@/components/neighborhood/LivingInfoTabs";
import HousingPreview from "@/components/neighborhood/HousingPreview";
import BottomCTA from "@/components/neighborhood/BottomCTA";

interface HousingListing {
  id: string;
  type: string;
  deposit: number;
  monthly_rent: number;
  area_sqm: number;
  floor: number;
  distance_to_station: number;
  description: string | null;
}

const NeighborhoodPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedCompany } = useSearchStore();

  const [neighborhood, setNeighborhood] = useState<any>(null);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [listings, setListings] = useState<HousingListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);

      const [nbRes, listRes, recRes] = await Promise.all([
        supabase.from("neighborhoods").select("*").eq("id", id).single(),
        supabase.from("housing_listings").select("*").eq("neighborhood_id", id).limit(10),
        selectedCompany
          ? supabase.from("recommended_neighborhoods")
              .select("*")
              .eq("neighborhood_id", id)
              .eq("company_id", selectedCompany.id)
              .single()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (nbRes.data) setNeighborhood(nbRes.data);
      if (listRes.data) setListings(listRes.data as HousingListing[]);
      if (recRes.data) setRecommendation(recRes.data);
      setLoading(false);
    };

    fetchData();
  }, [id, selectedCompany]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">불러오는 중...</div>
      </div>
    );
  }

  if (!neighborhood) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">동네 정보를 찾을 수 없습니다</p>
      </div>
    );
  }

  const neighborhoodResult: NeighborhoodResult = {
    id: neighborhood.id,
    name: neighborhood.name,
    district: neighborhood.district,
    city: neighborhood.city,
    avg_rent: neighborhood.avg_rent,
    commute_minutes: recommendation?.commute_minutes ?? 0,
    commute_route: recommendation?.commute_route ?? "",
    savings_amount: recommendation?.savings_amount ?? 0,
    rank: recommendation?.rank ?? 0,
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mobile-container py-6 space-y-6">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          결과 목록으로
        </button>

        {/* Header */}
        <div className="animate-slide-up">
          <h1 className="text-2xl font-black text-foreground">{neighborhood.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">{neighborhood.district}</Badge>
            <Badge variant="outline" className="text-xs">{neighborhood.city}</Badge>
            {recommendation && (
              <Badge className="text-xs" style={{ background: "hsl(var(--success))", color: "hsl(var(--success-foreground))" }}>
                통근 {recommendation.commute_minutes}분
              </Badge>
            )}
          </div>
        </div>

        {/* Commute */}
        {recommendation && selectedCompany && (
          <CommuteTimeline
            companyName={selectedCompany.name}
            neighborhoodName={neighborhood.name}
            commuteMinutes={recommendation.commute_minutes}
            commuteRoute={recommendation.commute_route || ""}
          />
        )}

        {/* Cost Comparison */}
        <CostComparisonTable
          neighborhoodName={neighborhood.name}
          avgRent={neighborhood.avg_rent}
          savingsAmount={recommendation?.savings_amount ?? 0}
        />

        {/* Living Info */}
        <LivingInfoTabs
          neighborhoodName={neighborhood.name}
          district={neighborhood.district}
        />

        {/* Housing Preview */}
        <HousingPreview
          neighborhoodId={neighborhood.id}
          neighborhoodName={neighborhood.name}
          listings={listings}
        />
      </div>

      {/* Bottom CTA */}
      <BottomCTA neighborhood={neighborhoodResult} />
    </div>
  );
};

export default NeighborhoodPage;
