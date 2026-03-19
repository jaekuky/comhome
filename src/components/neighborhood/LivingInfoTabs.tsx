import { useState, useEffect } from "react";
import { type LucideIcon, Train, ShoppingBag, Shield, MapPin, Coffee, Hospital, Package, Lightbulb, Camera, Landmark, Theater } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchLivingScore, type LivingScoreResult } from "@/lib/kakaoLocal";

interface LivingInfoTabsProps {
  neighborhoodName: string;
  latitude?: number | null;
  longitude?: number | null;
}

const InfoItem = ({ icon: Icon, label, value, grade }: { icon: LucideIcon; label: string; value: string; grade?: string }) => {
  const gradeColor = grade === "A" || grade === "B" ? "hsl(var(--success))" : grade === "C" ? "hsl(var(--warning))" : "hsl(var(--destructive))";
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-foreground">{value}</span>
        {grade && (
          <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ color: gradeColor, background: `${gradeColor}15` }}>
            {grade}등급
          </span>
        )}
      </div>
    </div>
  );
};

const ICON_MAP: Record<string, LucideIcon> = {
  "편의점/마트": ShoppingBag,
  "병원/약국": Hospital,
  "음식점": Package,
  "카페": Coffee,
  "은행": Landmark,
  "문화시설": Theater,
};

// 정적 교통/안전 mock (카카오 카테고리 API 범위 밖)
const getStaticData = (name: string) => {
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return {
    transport: [
      { icon: Train, label: "주요 지하철역", value: `${name}역` },
      { icon: MapPin, label: "버스 노선", value: `${3 + (hash % 5)}개 노선` },
      { icon: MapPin, label: "지하철 도보 거리", value: `${2 + (hash % 6)}분` },
    ],
    safety: [
      { icon: Camera, label: "CCTV 설치 수", value: `${40 + (hash % 60)}대`, grade: hash % 3 === 0 ? "A" : hash % 3 === 1 ? "B" : "C" },
      { icon: Lightbulb, label: "가로등 밀집도", value: hash % 2 === 0 ? "높음" : "보통", grade: hash % 2 === 0 ? "A" : "B" },
      { icon: Shield, label: "범죄율 등급", value: "", grade: ["A", "B", "B", "C"][hash % 4] },
    ],
  };
};

const LifeTabContent = ({ latitude, longitude, neighborhoodName }: { latitude?: number | null; longitude?: number | null; neighborhoodName: string }) => {
  const [result, setResult] = useState<LivingScoreResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (latitude == null || longitude == null) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchLivingScore(latitude, longitude)
      .then((r) => { if (!cancelled) setResult(r); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [latitude, longitude]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center justify-between py-3">
            <Skeleton className="h-8 w-32 rounded" />
            <Skeleton className="h-5 w-16 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !result) {
    // 정적 fallback (API 장애 시 mock)
    const hash = neighborhoodName.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const fallback = [
      { icon: ShoppingBag, label: "편의점", value: `${8 + (hash % 12)}개` },
      { icon: ShoppingBag, label: "마트/슈퍼", value: `${2 + (hash % 4)}개` },
      { icon: Coffee, label: "카페", value: `${5 + (hash % 15)}개` },
      { icon: Hospital, label: "병원/약국", value: `${3 + (hash % 8)}개` },
      { icon: Package, label: "평균 배달 시간", value: `${18 + (hash % 12)}분` },
    ];
    return (
      <>
        <p className="text-[10px] text-muted-foreground mb-2">* 정보 준비 중 — 추정 데이터를 표시합니다</p>
        {fallback.map((item, i) => <InfoItem key={i} {...item} />)}
      </>
    );
  }

  return (
    <>
      {result.categories.map((cat, i) => (
        <InfoItem
          key={i}
          icon={ICON_MAP[cat.label] ?? ShoppingBag}
          label={cat.label}
          value={`${cat.count}개`}
        />
      ))}
    </>
  );
};

const LivingInfoTabs = ({ neighborhoodName, latitude, longitude }: LivingInfoTabsProps) => {
  const staticData = getStaticData(neighborhoodName);

  return (
    <Card className="border-border shadow-card">
      <CardContent className="p-5">
        <h3 className="text-sm font-bold text-foreground mb-1">
          {neighborhoodName} 생활 정보
        </h3>
        <p className="text-[10px] text-muted-foreground mb-3">* 참고용 데이터이며, 실제와 다를 수 있습니다</p>

        <Tabs defaultValue="transport" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="transport" className="flex-1 text-xs">🚇 교통</TabsTrigger>
            <TabsTrigger value="life" className="flex-1 text-xs">🏪 생활</TabsTrigger>
            <TabsTrigger value="safety" className="flex-1 text-xs">🛡️ 안전</TabsTrigger>
          </TabsList>

          <TabsContent value="transport" className="mt-3">
            {staticData.transport.map((item, i) => <InfoItem key={i} {...item} />)}
          </TabsContent>
          <TabsContent value="life" className="mt-3">
            <LifeTabContent latitude={latitude} longitude={longitude} neighborhoodName={neighborhoodName} />
          </TabsContent>
          <TabsContent value="safety" className="mt-3">
            {staticData.safety.map((item, i) => <InfoItem key={i} {...item} />)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default LivingInfoTabs;
