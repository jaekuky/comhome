import { useEffect, useCallback, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import type { NeighborhoodResult } from "@/types/neighborhood";

function isValidSnapshot(value: unknown): value is SessionSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.companyId === "string" &&
    Array.isArray(obj.results) &&
    typeof obj.timestamp === "number"
  );
}

const SESSION_KEY_PREFIX = "comhome_result_snapshot_";

function sessionKey(companyId: string): string {
  return `${SESSION_KEY_PREFIX}${companyId}`;
}

interface SessionSnapshot {
  companyId: string;
  results: NeighborhoodResult[];
  timestamp: number;
}

/**
 * 외부 매물 사이트 이동 시 세션 저장/복원 및 복귀 감지 훅
 */
export function useListingSession(
  companyId: string | undefined,
  results: NeighborhoodResult[],
  onRestore: (results: NeighborhoodResult[]) => void,
) {
  const navigatedAwayRef = useRef(false);

  /** 외부 링크 클릭 직전 호출 — 현재 결과를 sessionStorage에 저장 */
  const saveBeforeNavigate = useCallback(() => {
    if (!companyId || results.length === 0) return;
    const snapshot: SessionSnapshot = {
      companyId,
      results,
      timestamp: Date.now(),
    };
    try {
      sessionStorage.setItem(sessionKey(companyId), JSON.stringify(snapshot));
    } catch {
      // 용량 초과 등 — 무시
    }
    navigatedAwayRef.current = true;
  }, [companyId, results]);

  /** 페이지 최초 마운트 시 sessionStorage 에서 복원 시도 */
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;

  useEffect(() => {
    if (!companyId) return;
    try {
      const raw = sessionStorage.getItem(sessionKey(companyId));
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!isValidSnapshot(parsed)) return;
      // 같은 회사 결과만 복원, 1시간 이내
      if (parsed.companyId === companyId && Date.now() - parsed.timestamp < 3600_000) {
        onRestoreRef.current(parsed.results);
      }
    } catch {
      // 파싱 실패 — 무시
    }
  }, [companyId]);

  /** Page Visibility API 로 복귀 감지 */
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && navigatedAwayRef.current) {
        navigatedAwayRef.current = false;
        toast({
          title: "다녀오셨군요! 👋",
          description: "검색 결과가 그대로 유지되어 있어요.",
        });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  return { saveBeforeNavigate };
}
