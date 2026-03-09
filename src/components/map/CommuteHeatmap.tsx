import { useEffect, useRef, useState, useCallback } from "react";
import { Clock, Train, FootprintsIcon, MapPin, AlertCircle } from "lucide-react";
import { applyRushHourWeight } from "@/lib/commuteService";
import type { CommuteResult } from "@/lib/commuteService";

// ---------- 타입 ----------

export interface Neighborhood {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface Props {
  companyCoords: { lat: number; lng: number };
  commuteResults: CommuteResult[];
  neighborhoods: Neighborhood[];
  departureHour: string;
  onNeighborhoodClick: (id: string) => void;
}

// ---------- 색상 결정 ----------

function resolveColor(minutes: number): { fill: string; opacity: number } {
  if (minutes <= 20) return { fill: "#27AE60", opacity: 0.4 };
  if (minutes <= 30) return { fill: "#F39C12", opacity: 0.4 };
  return { fill: "#95A5A6", opacity: 0.3 };
}

// ---------- Kakao Maps SDK 동적 로딩 ----------

let sdkPromise: Promise<void> | null = null;

function loadKakaoSdk(appKey: string): Promise<void> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    if (window.kakao?.maps) { resolve(); return; }
    const script = document.createElement("script");
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`;
    script.onload = () => {
      window.kakao.maps.load(() => resolve());
    };
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error("Kakao Maps SDK 로딩 실패"));
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

// ---------- 패널 UI ----------

interface PanelData {
  name: string;
  result: CommuteResult;
  weightedMinutes: number;
}

function InfoPanel({
  data,
  onClose,
  onNavigate,
}: {
  data: PanelData;
  onClose: () => void;
  onNavigate: () => void;
}) {
  return (
    <div
      className="absolute top-3 right-3 z-10 w-64 rounded-2xl bg-white/95 shadow-xl border border-gray-100 p-4 backdrop-blur-sm"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
          <span className="font-bold text-sm text-gray-800">{data.name}</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label="패널 닫기"
        >
          ×
        </button>
      </div>

      {/* 소요 시간 뱃지 */}
      <div
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold mb-3"
        style={{
          background: resolveColor(data.weightedMinutes).fill + "22",
          color: resolveColor(data.weightedMinutes).fill,
        }}
      >
        <Clock className="h-3.5 w-3.5" />
        {data.weightedMinutes}분 소요
      </div>

      {/* 상세 정보 */}
      <div className="space-y-2 text-xs text-gray-600">
        {data.result.routeSummary && (
          <div className="flex items-start gap-2">
            <Train className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gray-400" />
            <span>{data.result.routeSummary}</span>
          </div>
        )}
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="font-medium text-gray-500">환승</span>
            {data.result.transferCount}회
          </span>
          <span className="flex items-center gap-1">
            <FootprintsIcon className="h-3.5 w-3.5 text-gray-400" />
            도보 {data.result.walkMinutes}분
          </span>
        </div>
      </div>

      {/* 시간표 안내 */}
      <p className="mt-3 text-[10px] text-gray-400 leading-snug">
        * 시간표 기준 추정값이며 실제 소요 시간과 차이가 있을 수 있습니다.
      </p>

      {/* 상세보기 버튼 */}
      <button
        onClick={onNavigate}
        className="mt-3 w-full rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium py-1.5 transition-colors"
      >
        동네 상세보기
      </button>
    </div>
  );
}

// ---------- 카드 리스트 (지도 불가 fallback / 모바일 오버레이) ----------

function NeighborhoodCardList({
  neighborhoods,
  commuteResults,
  departureHour,
  onNeighborhoodClick,
  activeId,
}: {
  neighborhoods: Neighborhood[];
  commuteResults: CommuteResult[];
  departureHour: string;
  onNeighborhoodClick: (id: string) => void;
  activeId: string | null;
}) {
  const resultMap = new Map(commuteResults.map((r) => [r.neighborhoodId, r]));

  return (
    <ul className="space-y-2">
      {neighborhoods.map((n) => {
        const result = resultMap.get(n.id);
        const minutes = result
          ? applyRushHourWeight(result.commuteMinutes, departureHour)
          : null;
        const { fill } = minutes !== null ? resolveColor(minutes) : { fill: "#95A5A6" };

        return (
          <li key={n.id}>
            <button
              onClick={() => onNeighborhoodClick(n.id)}
              className={`w-full rounded-xl border p-3 text-left text-sm transition-all hover:shadow-md ${
                activeId === n.id
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-100 bg-white hover:border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-800">{n.name}</span>
                {minutes !== null && (
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                    style={{ background: fill }}
                  >
                    {minutes}분
                  </span>
                )}
              </div>
              {result?.routeSummary && (
                <p className="mt-1 text-[11px] text-gray-500 truncate">
                  {result.routeSummary}
                </p>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ---------- 메인 컴포넌트 ----------

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kakao: any;
  }
}

export default function CommuteHeatmap({
  companyCoords,
  commuteResults,
  neighborhoods,
  departureHour,
  onNeighborhoodClick,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overlayLayersRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);

  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [sdkError, setSdkError] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelData | null>(null);
  const [activeNeighborhoodId, setActiveNeighborhoodId] = useState<string | null>(null);

  // Maps SDK는 JavaScript 키가 필요 (REST API 키와 다름)
  const appKey = (import.meta.env.VITE_KAKAO_MAPS_JS_KEY || import.meta.env.VITE_KAKAO_APP_KEY) as string | undefined;

  // ---------- SDK 로딩 ----------
  useEffect(() => {
    if (!appKey) { setSdkError(true); return; }
    loadKakaoSdk(appKey)
      .then(() => setSdkLoaded(true))
      .catch(() => setSdkError(true));
  }, [appKey]);

  // ---------- 지도 초기화 ----------
  useEffect(() => {
    if (!sdkLoaded || !mapRef.current) return;

    const kakao = window.kakao;
    const center = new kakao.maps.LatLng(companyCoords.lat, companyCoords.lng);
    const map = new kakao.maps.Map(mapRef.current, {
      center,
      level: 6,
    });
    mapInstanceRef.current = map;

    // 회사 마커 (빨간색)
    const companyMarkerImg = new kakao.maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png",
      new kakao.maps.Size(36, 46),
    );
    new kakao.maps.Marker({
      map,
      position: center,
      image: companyMarkerImg,
      title: "회사",
    });

    return () => {
      mapInstanceRef.current = null;
    };
    // companyCoords는 마운트 시 한 번만 반영
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkLoaded]);

  // ---------- 오버레이·마커 갱신 (commuteResults / departureHour 변경 시) ----------
  const refreshOverlays = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || !sdkLoaded) return;

    const kakao = window.kakao;

    // 기존 레이어 제거
    overlayLayersRef.current.forEach((o) => o.setMap(null));
    markersRef.current.forEach((m) => m.setMap(null));
    overlayLayersRef.current = [];
    markersRef.current = [];

    const resultMap = new Map(commuteResults.map((r) => [r.neighborhoodId, r]));
    const bounds = new kakao.maps.LatLngBounds();
    bounds.extend(new kakao.maps.LatLng(companyCoords.lat, companyCoords.lng));

    neighborhoods.forEach((n) => {
      const pos = new kakao.maps.LatLng(n.lat, n.lng);
      bounds.extend(pos);

      const result = resultMap.get(n.id);
      const rawMinutes = result?.commuteMinutes ?? 35;
      const weighted = applyRushHourWeight(rawMinutes, departureHour);
      const { fill, opacity } = resolveColor(weighted);

      // 원형 오버레이
      const circle = new kakao.maps.Circle({
        map,
        center: pos,
        radius: 600,
        strokeWeight: 1,
        strokeColor: fill,
        strokeOpacity: 0.6,
        fillColor: fill,
        fillOpacity: opacity,
      });
      overlayLayersRef.current.push(circle);

      // 동네 마커
      const marker = new kakao.maps.Marker({ map, position: pos, title: n.name });
      markersRef.current.push(marker);

      kakao.maps.event.addListener(marker, "click", () => {
        if (!result) {
          onNeighborhoodClick(n.id);
          return;
        }
        const panelData: PanelData = {
          name: n.name,
          result,
          weightedMinutes: weighted,
        };
        setActivePanel(panelData);
        setActiveNeighborhoodId(n.id);
      });
    });

    // 모든 마커가 보이도록 줌 자동 조절
    if (neighborhoods.length > 0) {
      map.setBounds(bounds, 60);
    }
  }, [sdkLoaded, commuteResults, neighborhoods, departureHour, companyCoords, onNeighborhoodClick]);

  useEffect(() => {
    refreshOverlays();
  }, [refreshOverlays]);

  // ---------- 외부 클릭 → 패널 닫기 ----------
  const handleMapClick = useCallback(() => {
    setActivePanel(null);
    setActiveNeighborhoodId(null);
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !sdkLoaded) return;
    window.kakao.maps.event.addListener(map, "click", handleMapClick);
    return () => {
      window.kakao.maps.event.removeListener(map, "click", handleMapClick);
    };
  }, [sdkLoaded, handleMapClick]);

  // ---------- SDK 오류 Fallback ----------
  if (sdkError) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          지도를 불러올 수 없습니다. 텍스트 목록으로 표시합니다.
        </div>
        <NeighborhoodCardList
          neighborhoods={neighborhoods}
          commuteResults={commuteResults}
          departureHour={departureHour}
          onNeighborhoodClick={onNeighborhoodClick}
          activeId={activeNeighborhoodId}
        />
      </div>
    );
  }

  // ---------- 렌더 ----------
  return (
    // 모바일: 세로 스택 / 데스크톱: 60/40 가로 분할
    <div className="flex flex-col md:flex-row w-full gap-0 md:gap-4 h-[640px] md:h-[520px]">
      {/* 지도 영역 */}
      <div className="relative flex-1 md:flex-none md:w-[60%] h-[340px] md:h-full rounded-2xl overflow-hidden shadow-lg bg-gray-100">
        {/* 지도 컨테이너 */}
        <div ref={mapRef} className="w-full h-full" />

        {/* SDK 로딩 중 스피너 */}
        {!sdkLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500" />
            <span className="text-sm text-gray-500">지도 불러오는 중…</span>
          </div>
        )}

        {/* 색상 범례 */}
        {sdkLoaded && (
          <div className="absolute bottom-3 left-3 flex flex-col gap-1 rounded-xl bg-white/90 px-3 py-2 text-[11px] shadow backdrop-blur-sm">
            {[
              { dotClass: "bg-[#27AE60]", label: "20분 이내" },
              { dotClass: "bg-[#F39C12]", label: "20–30분" },
              { dotClass: "bg-[#95A5A6]", label: "30분 초과" },
            ].map(({ dotClass, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className={`inline-block h-3 w-3 rounded-full ${dotClass}`} />
                <span className="text-gray-600">{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* 정보 패널 */}
        {sdkLoaded && activePanel && (
          <InfoPanel
            data={activePanel}
            onClose={() => { setActivePanel(null); setActiveNeighborhoodId(null); }}
            onNavigate={() => onNeighborhoodClick(activePanel.result.neighborhoodId)}
          />
        )}
      </div>

      {/* 카드 리스트 영역 */}
      <div className="md:w-[40%] h-[300px] md:h-full overflow-y-auto md:overflow-y-auto rounded-2xl md:rounded-none px-1 pb-2 md:pb-0">
        <NeighborhoodCardList
          neighborhoods={neighborhoods}
          commuteResults={commuteResults}
          departureHour={departureHour}
          onNeighborhoodClick={(id) => {
            setActiveNeighborhoodId(id);
            onNeighborhoodClick(id);
          }}
          activeId={activeNeighborhoodId}
        />
      </div>
    </div>
  );
}
