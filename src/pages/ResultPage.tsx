import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Wallet, Star } from "lucide-react";

const mockResults = [
  { id: "mangwon", name: "망원동", time: 22, rent: 55, score: 92 },
  { id: "yeongdeungpo", name: "영등포동", time: 18, rent: 48, score: 89 },
  { id: "noryangjin", name: "노량진동", time: 25, rent: 42, score: 85 },
];

const ResultPage = () => {
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

        <div>
          <h1 className="text-xl font-bold text-foreground">추천 동네</h1>
          <p className="text-sm text-muted-foreground mt-1">통근 30분 이내 최적의 동네 3곳</p>
        </div>

        <div className="space-y-3">
          {mockResults.map((r, i) => (
            <button
              key={r.id}
              onClick={() => navigate(`/neighborhood/${r.id}`)}
              className="w-full rounded-xl bg-card p-5 shadow-card hover:shadow-card-hover transition-all text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary text-sm font-bold text-primary-foreground">
                    {i + 1}
                  </div>
                  <h3 className="font-bold text-foreground">{r.name}</h3>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-primary">
                  <Star className="h-3.5 w-3.5" />
                  {r.score}점
                </div>
              </div>
              <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  통근 {r.time}분
                </span>
                <span className="flex items-center gap-1">
                  <Wallet className="h-3.5 w-3.5" />
                  평균 월세 {r.rent}만원
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResultPage;
