import { useCallback } from "react";
import { ExternalLink } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

interface PlatformParams {
  dongName: string;
  district: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface Platform {
  name: string;
  buildUrl: (params: PlatformParams) => string;
  fallbackUrl: string;
  color: string;
}

const PLATFORMS: Platform[] = [
  {
    name: "네이버 부동산",
    buildUrl: ({ district, dongName }) => `https://m.land.naver.com/search/result/${encodeURIComponent(district + " " + dongName)}`,
    fallbackUrl: "https://m.land.naver.com",
    color: "bg-green-500 hover:bg-green-600",
  },
  {
    name: "직방",
    buildUrl: ({ latitude, longitude }) =>
      latitude && longitude
        ? `https://www.zigbang.com/home/oneroom/map?latitude=${latitude}&longitude=${longitude}&zoom=3`
        : "https://www.zigbang.com",
    fallbackUrl: "https://www.zigbang.com",
    color: "bg-orange-500 hover:bg-orange-600",
  },
  {
    name: "다방",
    buildUrl: ({ latitude, longitude }) =>
      latitude && longitude
        ? `https://www.dabangapp.com/map/onetwo?m_lat=${latitude}&m_lng=${longitude}&m_zoom=16`
        : "https://www.dabangapp.com",
    fallbackUrl: "https://www.dabangapp.com",
    color: "bg-blue-500 hover:bg-blue-600",
  },
];

interface ListingButtonProps {
  dongName: string;
  district: string;
  latitude?: number | null;
  longitude?: number | null;
  onBeforeNavigate?: () => void;
}

const ListingButton = ({ dongName, district, latitude, longitude, onBeforeNavigate }: ListingButtonProps) => {
  const handleClick = useCallback(
    (e: React.MouseEvent, platform: Platform) => {
      e.stopPropagation();
      onBeforeNavigate?.();
      trackEvent("listing_link_clicked", { dong: dongName, platform: platform.name });

      const url = platform.buildUrl({ dongName, district, latitude, longitude });
      const win = window.open(url, "_blank", "noopener,noreferrer");

      // 팝업 차단 등으로 열리지 않은 경우 fallback URL로 재시도
      if (!win) {
        window.open(platform.fallbackUrl, "_blank", "noopener,noreferrer");
      }
    },
    [dongName, district, latitude, longitude, onBeforeNavigate],
  );

  return (
    <div
      className="flex items-center gap-1.5 mt-3"
      onClick={(e) => e.stopPropagation()}
      role="group"
      aria-label="외부 매물 사이트 링크"
    >
      {PLATFORMS.map((platform) => (
        <button
          key={platform.name}
          type="button"
          onClick={(e) => handleClick(e, platform)}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-white transition-colors ${platform.color}`}
          aria-label={`${dongName} ${platform.name}에서 매물 보기`}
        >
          {platform.name}
          <ExternalLink className="h-3 w-3" />
        </button>
      ))}
    </div>
  );
};

export default ListingButton;
