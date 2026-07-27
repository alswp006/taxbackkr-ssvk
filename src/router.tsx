import type { RouteState } from "@/lib/types";

/**
 * 앱 라우트 계약 — 단일 진실 공급원(single source of truth).
 *
 * 6개 라우트(RouteState의 키와 1:1)를 여기서만 정의한다. App.tsx는 이 배열을
 * 순회해 Route를 배선하고, tabs.ts는 이 중 일부를 골라 하단 탭을 구성한다.
 * 새 라우트를 추가할 때 RouteState(types.ts)와 이 배열을 함께 갱신하라.
 */
export interface RouteConfig {
  /** RouteState의 경로 키와 일치 */
  path: keyof RouteState;
  /** 상단 헤더/플레이스홀더에 노출되는 화면 이름 */
  label: string;
  /** 테스트에서 라우트 마운트를 식별하는 고유 id */
  testId: string;
}

export const ROUTES: RouteConfig[] = [
  { path: "/", label: "홈", testId: "route-home" },
  { path: "/input", label: "소득 입력", testId: "route-input" },
  { path: "/result", label: "환급 결과", testId: "route-result" },
  { path: "/simulate", label: "공제 시뮬레이터", testId: "route-simulate" },
  { path: "/filing", label: "종합소득세 신고", testId: "route-filing" },
  { path: "/checklist", label: "공제 체크리스트", testId: "route-checklist" },
];
