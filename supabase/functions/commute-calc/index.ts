import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "@supabase/supabase-js"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

interface CommuteResult {
  neighborhoodId: string
  commuteMinutes: number
  routeSummary: string
  transferCount: number
  walkMinutes: number
  totalFare: number
  isEstimated: boolean
}

interface CacheRow {
  commute_minutes: number
  route_summary: string
  transfer_count: number
  walk_minutes: number
  total_fare: number
}

function roundCoord(val: number): number {
  return Math.round(val * 10000) / 10000
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  })
}

function cacheRowToResult(neighborhoodId: string, row: CacheRow): CommuteResult {
  return {
    neighborhoodId,
    commuteMinutes: row.commute_minutes,
    routeSummary: row.route_summary,
    transferCount: row.transfer_count,
    walkMinutes: row.walk_minutes,
    totalFare: row.total_fare,
    isEstimated: true,
  }
}

async function fetchFromOdsay(
  apiKey: string,
  companyLat: number,
  companyLng: number,
  neighborhoodLat: number,
  neighborhoodLng: number,
): Promise<Omit<CommuteResult, "neighborhoodId">> {
  const url = new URL("https://api.odsay.com/v1/api/searchPubTransPathT")
  url.searchParams.set("SX", String(neighborhoodLng)) // 출발 경도 (집)
  url.searchParams.set("SY", String(neighborhoodLat)) // 출발 위도 (집)
  url.searchParams.set("EX", String(companyLng))       // 도착 경도 (회사)
  url.searchParams.set("EY", String(companyLat))       // 도착 위도 (회사)
  url.searchParams.set("apiKey", apiKey)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const referer = Deno.env.get("ODSAY_REFERER") ?? "http://localhost:8080"
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Referer: referer, Origin: referer },
    })
    if (!res.ok) throw new Error(`ODsay API HTTP 오류: ${res.status}`)

    const json = await res.json()
    const path = json?.result?.path?.[0]
    if (!path) throw new Error("경로를 찾을 수 없습니다")

    const info = path.info
    const totalTime: number = info.totalTime ?? 0
    const payment: number = info.payment ?? 0
    const transferCount: number = info.transferCount ?? 0
    const subPaths: unknown[] = path.subPath ?? []

    const transitNames: string[] = []
    let walkMinutes = 0

    for (const sub of subPaths as Record<string, unknown>[]) {
      if (sub.trafficType === 3) {
        walkMinutes += (sub.sectionTime as number) ?? 0
      } else if (sub.trafficType === 1 || sub.trafficType === 2) {
        const lanes = (sub.lane as Record<string, unknown>[]) ?? []
        const name = (lanes[0]?.name as string) ?? (sub.laneName as string) ?? ""
        if (name) transitNames.push(name)
      }
    }

    const routeSummary = transitNames.join(" → 환승 → ")

    return {
      commuteMinutes: totalTime,
      routeSummary,
      transferCount,
      walkMinutes,
      totalFare: payment,
      isEstimated: true,
    }
  } finally {
    clearTimeout(timeout)
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: "잘못된 JSON 형식입니다" }, 400)
  }

  // Health check — warm-up 전용, ODsay 호출 없이 즉시 반환
  if (body.action === "ping") {
    return jsonResponse({ status: "ok" })
  }

  const apiKey = Deno.env.get("ODSAY_API_KEY")
  if (!apiKey) {
    return jsonResponse({ error: "서버 설정 오류" }, 500)
  }

  const { companyLat, companyLng, neighborhoodIds } = body as {
    companyLat: number
    companyLng: number
    neighborhoodIds: string[]
  }

  if (
    typeof companyLat !== "number" ||
    typeof companyLng !== "number" ||
    !Array.isArray(neighborhoodIds) ||
    neighborhoodIds.length === 0
  ) {
    return jsonResponse({ error: "필수 파라미터가 누락되었습니다" }, 400)
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  )

  // 좌표 정규화 (소수점 4자리, DB round_coord()와 동일 로직)
  const cLat = roundCoord(companyLat)
  const cLng = roundCoord(companyLng)

  // 동네 좌표 일괄 조회
  const { data: neighborhoods, error: nError } = await supabase
    .from("neighborhoods")
    .select("id, latitude, longitude")
    .in("id", neighborhoodIds)

  if (nError || !neighborhoods) {
    return jsonResponse({ error: "동네 정보를 불러올 수 없습니다" }, 500)
  }

  const neighborhoodMap = new Map(
    neighborhoods.map((n) => [n.id as string, n as { id: string; latitude: number | null; longitude: number | null }]),
  )

  const results: CommuteResult[] = []
  const errors: string[] = []
  let apiCallMade = false

  const settled = await Promise.allSettled(
    neighborhoodIds.map(async (neighborhoodId) => {
      const nb = neighborhoodMap.get(neighborhoodId)
      if (nb?.latitude === null || nb?.latitude === undefined || nb?.longitude === null || nb?.longitude === undefined) {
        throw new Error(`동네 ${neighborhoodId} 좌표 없음`)
      }

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      // 캐시 조회 (7일 이내)
      const { data: cached } = await supabase
        .from("commute_cache")
        .select("commute_minutes, route_summary, transfer_count, walk_minutes, total_fare")
        .eq("company_lat", cLat)
        .eq("company_lng", cLng)
        .eq("neighborhood_id", neighborhoodId)
        .gte("cached_at", sevenDaysAgo)
        .maybeSingle()

      if (cached) {
        return { result: cacheRowToResult(neighborhoodId, cached as CacheRow), fromCache: true }
      }

      // ODsay API 호출
      try {
        const nLat = roundCoord(nb.latitude)
        const nLng = roundCoord(nb.longitude)
        const commuteData = await fetchFromOdsay(apiKey, cLat, cLng, nLat, nLng)

        // 캐시 UPSERT
        await supabase.from("commute_cache").upsert(
          {
            company_lat: cLat,
            company_lng: cLng,
            neighborhood_id: neighborhoodId,
            commute_minutes: commuteData.commuteMinutes,
            route_summary: commuteData.routeSummary,
            transfer_count: commuteData.transferCount,
            walk_minutes: commuteData.walkMinutes,
            total_fare: commuteData.totalFare,
            cached_at: new Date().toISOString(),
          },
          { onConflict: "company_lat,company_lng,neighborhood_id" },
        )

        return { result: { neighborhoodId, ...commuteData }, fromCache: false }
      } catch (err) {
        // 타임아웃 등 실패 시 만료된 캐시라도 반환
        const { data: stale } = await supabase
          .from("commute_cache")
          .select("commute_minutes, route_summary, transfer_count, walk_minutes, total_fare")
          .eq("company_lat", cLat)
          .eq("company_lng", cLng)
          .eq("neighborhood_id", neighborhoodId)
          .maybeSingle()

        if (stale) {
          return { result: cacheRowToResult(neighborhoodId, stale as CacheRow), fromCache: true }
        }

        throw err
      }
    }),
  )

  for (let i = 0; i < settled.length; i++) {
    const s = settled[i]
    if (s.status === "fulfilled") {
      results.push(s.value.result as CommuteResult)
      if (!s.value.fromCache) apiCallMade = true
    } else {
      const reason = s.reason instanceof Error ? s.reason.message : "알 수 없는 오류"
      errors.push(`${neighborhoodIds[i]}: ${reason}`)
    }
  }

  return jsonResponse({
    results,
    fromCache: !apiCallMade,
    errors,
  })
})
