import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const SearchPage = () => {
  const navigate = useNavigate();
  const [address, setAddress] = useState("");

  return (
    <div className="min-h-screen bg-background">
      <div className="mobile-container py-6 space-y-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          뒤로가기
        </button>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            회사 주소를 알려주세요
          </h1>
          <p className="text-sm text-muted-foreground">
            정확한 주소를 입력하면 더 정확한 결과를 얻을 수 있어요
          </p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="예) 서울시 강남구 테헤란로 142"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-[24px] border border-input bg-card px-12 py-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          </div>

          <Button
            variant="hero"
            size="lg"
            className="w-full"
            disabled={!address.trim()}
            onClick={() => navigate("/result")}
          >
            분석 시작하기
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">최근 검색</p>
          {["서울시 강남구 테헤란로 142", "경기도 성남시 분당구 판교역로 235"].map((item) => (
            <button
              key={item}
              onClick={() => setAddress(item)}
              className="flex w-full items-center gap-3 rounded-xl bg-card p-3 text-left text-sm text-foreground shadow-card hover:shadow-card-hover transition-shadow"
            >
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
