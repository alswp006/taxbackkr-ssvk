import type { TabItem } from "@/components/FloatingTabBar";

/**
 * 하단 탭 네비게이션 매핑 — ROUTES의 부분집합.
 *
 * FloatingTabBar에 그대로 넘긴다(items={TABS}). path는 반드시 ROUTES(router.tsx)에
 * 존재하는 경로여야 한다. 소득 입력/환급 결과는 홈에서 밀려 들어가는 화면이라 탭에
 * 두지 않는다 — 탭은 서로 병렬인 최상위 목적지만.
 */
export const TABS: TabItem[] = [
  { path: "/", label: "홈" },
  { path: "/simulate", label: "시뮬레이터" },
  { path: "/checklist", label: "체크리스트" },
  { path: "/filing", label: "신고" },
];
