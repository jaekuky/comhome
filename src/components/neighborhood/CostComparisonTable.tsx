import { TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface CostComparisonTableProps {
  neighborhoodName: string;
  avgRent: number;
  savingsAmount: number;
}

const CostComparisonTable = ({ neighborhoodName, avgRent, savingsAmount }: CostComparisonTableProps) => {
  const seoulAvgRent = 65; // 서울 평균 원룸 월세
  const seoulTransport = 7; // 서울 평균 교통비
  const neighborhoodTransport = Math.max(3, seoulTransport - Math.floor(savingsAmount * 0.15));
  const seoulTotal = seoulAvgRent + seoulTransport;
  const neighborhoodTotal = avgRent + neighborhoodTransport;
  const monthlySaving = seoulTotal - neighborhoodTotal;
  const annualSaving = monthlySaving * 12;

  const rows = [
    { label: "평균 월세 (원룸)", seoul: `${seoulAvgRent}만원`, neighborhood: `${avgRent}만원`, highlight: avgRent < seoulAvgRent },
    { label: "월 교통비", seoul: `${seoulTransport}만원`, neighborhood: `${neighborhoodTransport}만원`, highlight: neighborhoodTransport < seoulTransport },
    { label: "월 총 주거비용", seoul: `${seoulTotal}만원`, neighborhood: `${neighborhoodTotal}만원`, highlight: neighborhoodTotal < seoulTotal },
  ];

  return (
    <Card className="border-border shadow-card overflow-hidden">
      <CardContent className="p-5">
        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-primary" />
          비용 비교
        </h3>

        {/* Table */}
        <div className="rounded-xl border border-border overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-3 bg-muted text-xs font-medium text-muted-foreground">
            <div className="p-3">항목</div>
            <div className="p-3 text-center">서울 평균</div>
            <div className="p-3 text-center">{neighborhoodName}</div>
          </div>
          {/* Rows */}
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-3 border-t border-border text-sm">
              <div className="p-3 text-xs text-muted-foreground">{row.label}</div>
              <div className="p-3 text-center text-foreground font-medium">{row.seoul}</div>
              <div className={`p-3 text-center font-bold ${row.highlight ? "" : "text-foreground"}`}
                style={row.highlight ? { color: "hsl(var(--success))" } : undefined}>
                {row.neighborhood}
              </div>
            </div>
          ))}
          {/* Savings row */}
          <div className="grid grid-cols-3 border-t-2 border-border bg-muted/50">
            <div className="p-3 text-xs font-bold text-foreground">월 절감액</div>
            <div className="p-3 text-center text-muted-foreground">—</div>
            <div className="p-3 text-center text-lg font-black" style={{ color: "hsl(var(--success))" }}>
              {monthlySaving > 0 ? `−${monthlySaving}만원` : "동일"}
            </div>
          </div>
        </div>

        {/* Annual highlight */}
        {annualSaving > 0 && (
          <div className="mt-4 rounded-xl p-4 text-center" style={{ background: "hsl(var(--success) / 0.08)" }}>
            <p className="text-xs text-muted-foreground mb-1">연간 절감 예상액</p>
            <p className="text-2xl font-black" style={{ color: "hsl(var(--success))" }}>
              {annualSaving}만원
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">서울 평균 대비 절감 가능 금액</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CostComparisonTable;
