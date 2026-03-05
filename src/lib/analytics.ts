const SESSION_KEY = "comhome_session_id";
const ANALYSIS_COUNT_KEY = "comhome_analysis_count";

function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function getDeviceType(): "mobile" | "tablet" | "desktop" {
  const ua = navigator.userAgent;
  if (/Mobi|Android|iPhone|iPod/.test(ua)) return "mobile";
  if (/iPad|Tablet/.test(ua)) return "tablet";
  return "desktop";
}

export function getUTMParams(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  const result: Record<string, string> = {};
  for (const key of utmKeys) {
    const val = params.get(key);
    if (val) result[key] = val;
  }
  return result;
}

export function getAnalysisCount(): number {
  return parseInt(sessionStorage.getItem(ANALYSIS_COUNT_KEY) ?? "0", 10);
}

export function incrementAnalysisCount(): void {
  sessionStorage.setItem(ANALYSIS_COUNT_KEY, String(getAnalysisCount() + 1));
}

type EventName =
  | "page_view"
  | "page_view_landing"
  | "search_start"
  | "input_focus"
  | "company_selected"
  | "analysis_triggered"
  | "analysis_started"
  | "analysis_completed"
  | "result_loaded"
  | "aha_moment"
  | "card_explored"
  | "second_analysis"
  | "neighborhood_clicked"
  | "neighborhood_detail_viewed"
  | "compare_added"
  | "housing_viewed"
  | "share_clicked"
  | "quick_access_clicked";

interface EventParams {
  company_id?: string;
  [key: string]: unknown;
}

export function trackEvent(eventName: EventName, params: EventParams = {}) {
  const payload = {
    event: eventName,
    session_id: getSessionId(),
    timestamp: new Date().toISOString(),
    ...params,
  };

  // Dev mode logging
  if (import.meta.env.DEV) {
    console.log("[Analytics]", eventName, payload);
  }

  // GA4 ready
  type GtagWindow = Window & { gtag?: (command: string, event: string, params: Record<string, unknown>) => void };
  if (typeof window !== "undefined" && (window as GtagWindow).gtag) {
    (window as GtagWindow).gtag!("event", eventName, payload);
  }
}
