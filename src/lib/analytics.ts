const SESSION_KEY = "comhome_session_id";

function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

type EventName =
  | "page_view"
  | "search_start"
  | "company_selected"
  | "analysis_triggered"
  | "analysis_completed"
  | "neighborhood_clicked"
  | "neighborhood_detail_viewed"
  | "compare_added"
  | "housing_viewed"
  | "share_clicked";

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
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", eventName, payload);
  }
}
