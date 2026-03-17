import { useMemo, useCallback } from "react";
import { Copy, Share2, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import type { NeighborhoodCost } from "./CostComparisonCards";

interface InsightCopyProps {
  neighborhoods: NeighborhoodCost[];
  currentRent: number;
  currentTransportCost: number;
}

function buildInsightText(
  n: NeighborhoodCost,
  currentRent: number,
  currentTransportCost: number,
): string {
  const rentDiff = n.medianRent - currentRent;
  const transportDiff = n.monthlyTransportCost - currentTransportCost;
  const totalDiff = rentDiff + transportDiff;

  const baseCommute = 60; // 기본 통근 시간 추정
  const minutesSaved = (baseCommute - n.commuteMinutes) * 2 * 22 * 12;
  const annualHours = Math.round(minutesSaved / 60);

  const rentPart =
    rentDiff >= 0 ? `월세 +${rentDiff}만원` : `월세 ${rentDiff}만원`;
  const transportPart =
    transportDiff >= 0
      ? `교통비 +${transportDiff}만원`
      : `교통비 ${transportDiff}만원`;
  const totalPart =
    totalDiff >= 0
      ? `실질 추가 비용 월 ${totalDiff}만원`
      : `실질 절감 월 ${Math.abs(totalDiff)}만원`;

  let text = `${n.name} 이사 시: ${rentPart}, ${transportPart} = ${totalPart}.`;
  if (annualHours > 0) {
    text += ` 대신 연간 ${annualHours}시간을 되찾습니다.`;
  }

  return text;
}

const InsightCopy = ({
  neighborhoods,
  currentRent,
  currentTransportCost,
}: InsightCopyProps) => {
  const insights = useMemo(
    () =>
      neighborhoods.map((n) =>
        buildInsightText(n, currentRent, currentTransportCost),
      ),
    [neighborhoods, currentRent, currentTransportCost],
  );

  const fullText = useMemo(() => {
    const header = "[ComHome 비용 분석 결과]";
    return `${header}\n\n${insights.join("\n\n")}\n\n출퇴근 30분, 월세는 더 저렴하게 - ComHome`;
  }, [insights]);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      toast({ title: "클립보드에 복사되었습니다!" });
      trackEvent("share_clicked", { method: "clipboard" });
    } catch {
      toast({ title: "복사에 실패했습니다", variant: "destructive" });
    }
  }, [fullText]);

  const handleWebShare = useCallback(async () => {
    trackEvent("share_clicked", { method: "web_share" });
    if (navigator.share) {
      try {
        await navigator.share({
          title: "ComHome 비용 분석 결과",
          text: fullText,
          url: window.location.href,
        });
        return;
      } catch (err) {
        // 사용자가 취소한 경우 무시
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
    // Web Share API 미지원 또는 실패 시 클립보드 fallback
    await copyToClipboard();
  }, [fullText, copyToClipboard]);

  const handleKakaoShare = useCallback(() => {
    trackEvent("share_clicked", { method: "kakao" });

    const kakao = (
      window as Window & { Kakao?: { isInitialized: () => boolean; Share: { sendDefault: (config: unknown) => void } } }
    ).Kakao;

    if (kakao?.isInitialized?.()) {
      try {
        kakao.Share.sendDefault({
          objectType: "text",
          text: fullText,
          link: {
            mobileWebUrl: window.location.href,
            webUrl: window.location.href,
          },
        });
        return;
      } catch {
        // 카카오 SDK 실패 시 클립보드 fallback
      }
    }

    // 카카오 SDK 미초기화 시 클립보드 fallback
    copyToClipboard();
    toast({
      title: "카카오톡 공유 대신 클립보드에 복사되었습니다",
      description: "채팅창에 붙여넣기 해주세요",
    });
  }, [fullText, copyToClipboard]);

  if (neighborhoods.length === 0) return null;

  return (
    <Card className="border-border shadow-card">
      <CardContent className="p-5 space-y-4">
        <h3 className="text-sm font-bold text-foreground">분석 요약</h3>

        {/* 인사이트 문구 */}
        <div className="space-y-3">
          {insights.map((text, i) => (
            <p
              key={neighborhoods[i].id}
              className="text-xs text-foreground leading-relaxed bg-muted/50 rounded-lg p-3"
            >
              {text}
            </p>
          ))}
        </div>

        {/* 공유 버튼 */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-xs"
            onClick={handleKakaoShare}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            카카오톡
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-xs"
            onClick={copyToClipboard}
          >
            <Copy className="h-3.5 w-3.5" />
            복사
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-xs"
            onClick={handleWebShare}
          >
            <Share2 className="h-3.5 w-3.5" />
            공유
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InsightCopy;
