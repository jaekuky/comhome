// @ts-types: https://esm.sh/@supabase/functions-js@2/src/edge-runtime.d.ts
import { createClient } from "@supabase/supabase-js"

// ----------------------------------------------------------------
// 설정 상수
// ----------------------------------------------------------------
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// 공공데이터포털 HTTPS 엔드포인트 (구 HTTP 엔드포인트는 Supabase Edge에서 차단될 수 있음)
const MOLIT_BASE = "https://apis.data.go.kr/1613000"

/** 공공데이터포털 일일 호출 한도 대응: 동당 2회(villa + officetel) × 40동 = 80회 */
const MAX_REGIONS_PER_RUN = 40

/** 1인 가구 전용면적 필터 (㎡) */
const AREA_MIN = 20
const AREA_MAX = 33

// ----------------------------------------------------------------
// 타입
// ----------------------------------------------------------------
interface RentRecord {
  dong: string
  rent: number     // 만원
  deposit: number  // 만원
  area: number     // ㎡
}

interface DongStats {
  region_code: string
  dong_name: string
  housing_type: "villa" | "officetel" | "mixed"
  base_ym: string
  avg_rent: number
  median_rent: number
  min_rent: number
  max_rent: number
  avg_deposit: number
  sample_count: number
  collected_at: string
}

// ----------------------------------------------------------------
// XML 파싱 헬퍼 (Deno Edge Runtime — DOMParser HTML only)
// ----------------------------------------------------------------
function getTagValue(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))
  return m ? m[1].trim() : ""
}

function parseItems(xml: string): string[] {
  const regex = /<item>([\s\S]*?)<\/item>/g
  const items: string[] = []
  let m: RegExpExecArray | null
  while ((m = regex.exec(xml)) !== null) {
    items.push(m[1])
  }
  return items
}

// ----------------------------------------------------------------
// API 호출
// ----------------------------------------------------------------
async function fetchMolitXml(
  endpoint: string,
  serviceKey: string,
  lawdCd: string,
  dealYmd: string,
): Promise<string> {
  // URLSearchParams 가 serviceKey를 자동 percent-encode 하므로
  // env 에는 디코딩된 키를 저장해야 합니다.
  // apis.data.go.kr 경로: /1613000/RTMSDataSvcSHRent/getRTMSDataSvcSHRent
  const serviceName = endpoint.replace("getRTMSDataSvc", "RTMSDataSvc")
  const url = new URL(`${MOLIT_BASE}/${serviceName}/${endpoint}`)
  url.searchParams.set("serviceKey", serviceKey)
  url.searchParams.set("LAWD_CD", lawdCd)
  url.searchParams.set("DEAL_YMD", dealYmd)
  url.searchParams.set("numOfRows", "1000")
  url.searchParams.set("pageNo", "1")

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15_000)
  try {
    const res = await fetch(url.toString(), { signal: controller.signal })
    if (!res.ok) throw new Error(`MOLIT API HTTP ${res.status}`)
    const text = await res.text()
    // data.go.kr XML 에러 감지 (HTTP 200이지만 에러 XML 반환 케이스)
    // 형식 1: <returnAuthMsg> / <returnReasonCode>
    const errMatch = text.match(/<returnAuthMsg>([^<]+)<\/returnAuthMsg>/)
    if (errMatch && errMatch[1] !== "OK") throw new Error(`MOLIT API KEY ERROR: ${errMatch[1]}`)
    const codeMatch = text.match(/<returnReasonCode>([^<]+)<\/returnReasonCode>/)
    if (codeMatch && codeMatch[1] !== "00") throw new Error(`MOLIT API ERROR CODE: ${codeMatch[1]}`)
    // 형식 2: <resultCode> / <resultMsg>
    // "00" = 정상(데이터 있음), "000" = 데이터 없음(정상), 나머지 = 에러
    const resultCode = text.match(/<resultCode>([^<]+)<\/resultCode>/)
    if (resultCode && resultCode[1] !== "00" && resultCode[1] !== "000") {
      const resultMsg = text.match(/<resultMsg>([^<]+)<\/resultMsg>/)
      throw new Error(`MOLIT API RESULT: ${resultCode[1]} ${resultMsg?.[1] ?? ""}`)
    }
    return text
  } finally {
    clearTimeout(timer)
  }
}

// ----------------------------------------------------------------
// XML 파싱 — 연립다세대 전월세 (/getRTMSDataSvcRHRent)
// apis.data.go.kr/1613000 신규 엔드포인트 영문 필드:
//   excluUseAr(전용면적), umdNm(법정동), monthlyRent(월세금액), deposit(보증금액)
// ----------------------------------------------------------------
function parseVillaRent(xml: string): RentRecord[] {
  const records: RentRecord[] = []
  for (const item of parseItems(xml)) {
    const area = parseFloat(getTagValue(item, "excluUseAr")) || 0
    if (area < AREA_MIN || area > AREA_MAX) continue

    const dong = getTagValue(item, "umdNm")
    const rent = parseInt(getTagValue(item, "monthlyRent").replace(/,/g, ""), 10) || 0
    const deposit = parseInt(getTagValue(item, "deposit").replace(/,/g, ""), 10) || 0

    // 월세 = 0 이면 전세 계약 → 스킵
    if (!dong || rent === 0) continue
    records.push({ dong, rent, deposit, area })
  }
  return records
}

// ----------------------------------------------------------------
// XML 파싱 — 오피스텔 전월세 (/getRTMSDataSvcOffiRent)
// 실제 XML 필드: excluUseAr, umdNm, monthlyRent, deposit
// ----------------------------------------------------------------
function parseOfficetelRent(xml: string): RentRecord[] {
  const records: RentRecord[] = []
  for (const item of parseItems(xml)) {
    const area = parseFloat(getTagValue(item, "excluUseAr")) || 0
    if (area < AREA_MIN || area > AREA_MAX) continue

    const dong = getTagValue(item, "umdNm")
    const rent = parseInt(getTagValue(item, "monthlyRent").replace(/,/g, ""), 10) || 0
    const deposit = parseInt(getTagValue(item, "deposit").replace(/,/g, ""), 10) || 0

    // 월세 = 0 이면 전세 계약 → 스킵
    if (!dong || rent === 0) continue
    records.push({ dong, rent, deposit, area })
  }
  return records
}

// ----------------------------------------------------------------
// 통계 집계 — 동 단위
// ----------------------------------------------------------------
function computeDongStats(
  records: RentRecord[],
  regionCode: string,
  housingType: "villa" | "officetel" | "mixed",
  baseYm: string,
): DongStats[] {
  const byDong = new Map<string, RentRecord[]>()
  for (const r of records) {
    const arr = byDong.get(r.dong) ?? []
    arr.push(r)
    byDong.set(r.dong, arr)
  }

  const now = new Date().toISOString()
  const result: DongStats[] = []

  for (const [dong, recs] of byDong) {
    const rents = recs.map((r) => r.rent).sort((a, b) => a - b)
    const n = rents.length

    const avg_rent = rents.reduce((s, v) => s + v, 0) / n
    const median_rent =
      n % 2 === 0
        ? (rents[n / 2 - 1] + rents[n / 2]) / 2
        : rents[Math.floor(n / 2)]
    const avg_deposit = recs.reduce((s, r) => s + r.deposit, 0) / n

    result.push({
      region_code: regionCode,
      dong_name: dong,
      housing_type: housingType,
      base_ym: baseYm,
      avg_rent: round2(avg_rent),
      median_rent: round2(median_rent),
      min_rent: rents[0],
      max_rent: rents[n - 1],
      avg_deposit: round2(avg_deposit),
      sample_count: n,
      collected_at: now,
    })
  }
  return result
}

function round2(v: number): number {
  return Math.round(v * 100) / 100
}

// ----------------------------------------------------------------
// JSON 응답 헬퍼
// ----------------------------------------------------------------
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  })
}

// ----------------------------------------------------------------
// Edge Function 진입점
// ----------------------------------------------------------------
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

  // Health check
  if (body.action === "ping") {
    return jsonResponse({ status: "ok" })
  }


  const serviceKey = Deno.env.get("MOLIT_API_KEY")
  if (!serviceKey) {
    return jsonResponse({ error: "MOLIT_API_KEY 환경변수가 설정되지 않았습니다" }, 500)
  }

  const { regionCodes, dealYmd } = body as {
    regionCodes: string[]
    dealYmd: string
  }

  if (!Array.isArray(regionCodes) || regionCodes.length === 0) {
    return jsonResponse({ error: "regionCodes 배열이 필요합니다" }, 400)
  }
  if (typeof dealYmd !== "string" || !/^\d{6}$/.test(dealYmd)) {
    return jsonResponse({ error: "dealYmd는 YYYYMM 형식이어야 합니다" }, 400)
  }

  // 일일 제한 대응: 최대 MAX_REGIONS_PER_RUN 개 동만 처리
  const targets = regionCodes.slice(0, MAX_REGIONS_PER_RUN)

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  )

  const saved: string[] = []
  const skipped: string[] = []
  const errors: string[] = []

  // 동별 직렬 처리 (API 호출 속도 제한 대응)
  for (const lawdCd of targets) {
    let villaRecords: RentRecord[] = []
    let officetelRecords: RentRecord[] = []

    // ── 연립다세대 ─────────────────────────────────────────────
    try {
      const xml = await fetchMolitXml(
        "getRTMSDataSvcRHRent",
        serviceKey,
        lawdCd,
        dealYmd,
      )
      villaRecords = parseVillaRent(xml)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`[${lawdCd}] 연립다세대 API 오류: ${msg}`)
      // 캐시 데이터 유지: 이 동의 villa 집계는 건너뜀
    }

    // ── 오피스텔 ───────────────────────────────────────────────
    try {
      const xml = await fetchMolitXml(
        "getRTMSDataSvcOffiRent",
        serviceKey,
        lawdCd,
        dealYmd,
      )
      officetelRecords = parseOfficetelRent(xml)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`[${lawdCd}] 오피스텔 API 오류: ${msg}`)
    }

    // ── 집계 ───────────────────────────────────────────────────
    const rows: DongStats[] = [
      ...(villaRecords.length > 0
        ? computeDongStats(villaRecords, lawdCd, "villa", dealYmd)
        : []),
      ...(officetelRecords.length > 0
        ? computeDongStats(officetelRecords, lawdCd, "officetel", dealYmd)
        : []),
    ]

    // mixed: villa + officetel 통합
    const combined = [...villaRecords, ...officetelRecords]
    if (combined.length > 0) {
      rows.push(...computeDongStats(combined, lawdCd, "mixed", dealYmd))
    }

    if (rows.length === 0) {
      skipped.push(lawdCd)
      continue
    }

    // ── UPSERT ─────────────────────────────────────────────────
    const { error: upsertError } = await supabase
      .from("rent_stats")
      .upsert(rows, {
        onConflict: "region_code,dong_name,housing_type,base_ym",
      })

    if (upsertError) {
      errors.push(`[${lawdCd}] DB UPSERT 오류: ${upsertError.message}`)
    } else {
      saved.push(lawdCd)
    }
  }

  return jsonResponse({
    base_ym: dealYmd,
    requested: regionCodes.length,
    processed: targets.length,
    saved: saved.length,
    skipped: skipped.length,
    error_count: errors.length,
    saved_codes: saved,
    skipped_codes: skipped,
    errors,
  })
})
