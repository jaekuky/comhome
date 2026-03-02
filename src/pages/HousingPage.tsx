import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const HousingPage = () => {
  const { neighborhoodId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="mobile-container py-6 space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          뒤로가기
        </button>
        <h1 className="text-xl font-bold text-foreground">매물 리스트 - {neighborhoodId}</h1>
        <p className="text-sm text-muted-foreground">매물 리스트가 곧 제공됩니다.</p>
      </div>
    </div>
  );
};

export default HousingPage;
