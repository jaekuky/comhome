export interface KakaoAddressResult {
  id: string;
  name: string;
  address: string;
  district: string;
  latitude: number;
  longitude: number;
}

const METRO_BBOX = { latMin: 36.9, latMax: 37.9, lngMin: 126.5, lngMax: 127.5 };
const METRO_KEYWORDS = ["서울", "경기", "인천"];

export function isMetroArea(lat: number, lng: number, addressName: string): boolean {
  const inBbox =
    lat >= METRO_BBOX.latMin &&
    lat <= METRO_BBOX.latMax &&
    lng >= METRO_BBOX.lngMin &&
    lng <= METRO_BBOX.lngMax;
  const hasKeyword = METRO_KEYWORDS.some((k) => addressName.includes(k));
  return inBbox || hasKeyword;
}

async function fetchKakaoAddress(query: string): Promise<KakaoAddressResult[]> {
  const apiKey = import.meta.env.VITE_KAKAO_APP_KEY;
  const res = await fetch(
    `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}`,
    { headers: { Authorization: `KakaoAK ${apiKey}` } }
  );
  if (!res.ok) throw new Error(`Kakao API error: ${res.status}`);
  const data = await res.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.documents ?? []).map((doc: any) => {
    const lat = parseFloat(doc.y);
    const lng = parseFloat(doc.x);
    const region2 =
      doc.address?.region_2depth_name ||
      doc.road_address?.region_2depth_name ||
      "";
    return {
      id: `kakao-${doc.address_name}`,
      name: doc.address_name,
      address: doc.address_name,
      district: region2,
      latitude: lat,
      longitude: lng,
    };
  });
}

export async function searchKakaoAddress(
  query: string,
  maxRetries = 3
): Promise<KakaoAddressResult[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fetchKakaoAddress(query);
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}
