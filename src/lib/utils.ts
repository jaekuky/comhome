import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * PostgREST LIKE 패턴에서 특수문자(%_)를 이스케이프합니다.
 * legal_dong_name 등 DB 값을 LIKE 접두사 검색에 안전하게 사용하기 위한 유틸.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}
