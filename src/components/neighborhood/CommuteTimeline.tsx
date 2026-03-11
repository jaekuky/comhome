import { Clock, Train } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import AnimatedCounter from "@/components/result/AnimatedCounter";

interface CommuteTimelineProps {
  companyName: string;
  neighborhoodName: string;
  commuteMinutes: number;
  commuteRoute: string;
}

const CommuteTimeline = ({ companyName, neighborhoodName, commuteMinutes, commuteRoute }: CommuteTimelineProps) => {
  const congestion = commuteMinutes <= 20 ? "여유" : commuteMinutes <= 30 ? "보통" : "혼잡";
  const congestionColor = congestion === "여유" ? "hsl(var(--success))" : congestion === "보통" ? "hsl(var(--warning))" : "hsl(var(--destructive))";
  const congestionEmoji = congestion === "여유" ? "🟢" : congestion === "보통" ? "🟡" : "🔴";

  return (
    <Card className="border-border shadow-card">
      <CardContent className="p-5">
        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <Train className="h-4 w-4 text-primary" />
          통근 경로
        </h3>

        {/* Timeline */}
        <div className="relative pl-6 space-y-6">
          {/* Line */}
          <div className="absolute left-[9px] top-1 bottom-1 w-0.5 bg-border" />

          {/* Start */}
          <div className="relative">
            <div className="absolute -left-6 top-0.5 h-[18px] w-[18px] rounded-full gradient-primary flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-primary-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">{neighborhoodName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">출발</p>
          </div>

          {/* Route info */}
          <div className="relative">
            <div className="absolute -left-6 top-0.5 h-[18px] w-[18px] rounded-full bg-muted flex items-center justify-center">
              <Train className="h-2.5 w-2.5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">{commuteRoute}</p>
          </div>

          {/* End */}
          <div className="relative">
            <div className="absolute -left-6 top-0.5 h-[18px] w-[18px] rounded-full bg-foreground flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-background" />
            </div>
            <p className="text-sm font-medium text-foreground">{companyName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">도착</p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-muted p-3 text-center">
            <Clock className="h-4 w-4 mx-auto text-primary mb-1" />
            <AnimatedCounter targetValue={commuteMinutes} suffix="분" duration={800} />
            <p className="text-[10px] text-muted-foreground">도어투도어</p>
          </div>
          <div className="rounded-xl bg-muted p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">첫차</p>
            <p className="text-sm font-bold text-foreground">05:30</p>
            <p className="text-[10px] text-muted-foreground">막차 23:40</p>
          </div>
          <div className="rounded-xl bg-muted p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">혼잡도</p>
            <p className="text-sm font-bold" style={{ color: congestionColor }}>
              {congestionEmoji} {congestion}
            </p>
            <p className="text-[10px] text-muted-foreground">출근시간대</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CommuteTimeline;
