import { useNavigate } from "react-router-dom";
import { BarChart3, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchStore } from "@/stores/searchStore";
import { type NeighborhoodResult } from "@/components/result/NeighborhoodCard";
import { toast } from "@/hooks/use-toast";

interface BottomCTAProps {
  neighborhood: NeighborhoodResult;
}

const BottomCTA = ({ neighborhood }: BottomCTAProps) => {
  const navigate = useNavigate();
  const { compareList, addToCompare } = useSearchStore();
  const isInCompare = compareList.some((c) => c.id === neighborhood.id);

  const handleCompare = () => {
    if (isInCompare) {
      navigate("/compare");
      return;
    }
    const added = addToCompare(neighborhood);
    if (added) {
      toast({ title: `${neighborhood.name} 비교 목록에 추가됨`, description: `${compareList.length + 1}/3개 선택됨` });
    } else {
      toast({ title: "최대 3개까지 비교할 수 있어요", variant: "destructive" });
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm">
      <div className="mobile-container flex gap-3 py-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleCompare}
        >
          {isInCompare ? (
            <>
              <Check className="h-4 w-4" />
              비교 목록에 있음
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              비교하기
            </>
          )}
        </Button>
        {compareList.length >= 2 && (
          <Button
            variant="hero"
            className="flex-1"
            onClick={() => navigate("/compare")}
          >
            <BarChart3 className="h-4 w-4" />
            비교 보기 ({compareList.length})
          </Button>
        )}
      </div>
    </div>
  );
};

export default BottomCTA;
