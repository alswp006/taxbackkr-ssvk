import { describe, it, expect, vi } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { mockAll, mockNavigate, mockLocation } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

/**
 * Packet heal-1-01: 앱셸 라우팅 + Provider + 스캐폴드 계약 확정
 *
 * Files under test (not yet implemented):
 * - src/router.tsx        → exports ROUTES: { path, label, testId }[]
 * - src/app/tabs.ts        → exports TABS: TabItem[] (subset of ROUTES for bottom nav)
 * - src/app/AppProviders.tsx → exports AppProviders + useServices() hook
 * - src/App.tsx (modified)  → wires ROUTES, real pages for /, /input, /result;
 *                             ScreenScaffold placeholder (Top title = route.label) for
 *                             /simulate, /filing, /checklist
 */

mockAll();

// Mock the service modules so AppProviders/useServices wiring can be verified by
// reference identity (not re-implemented, just re-exposed via context).
vi.mock("@/services/taxService", () => ({
  computeAndPersistResult: vi.fn(),
  loadOrInitDeductions: vi.fn(),
  simulate: vi.fn(),
}));
vi.mock("@/services/sessionService", () => ({
  checkIntegration: vi.fn(),
  grantReward: vi.fn(),
}));

const ALL_ROUTE_PATHS = ["/", "/input", "/result", "/simulate", "/filing", "/checklist"];
const PLACEHOLDER_PATHS = ["/simulate", "/filing", "/checklist"];

// Local shape mirrors the RouteConfig/TabItem contract src/router.tsx & src/app/tabs.ts
// are expected to export — used only to annotate callback params below (avoids
// noImplicitAny while the real modules don't exist yet, in this TDD red phase).
type RouteConfigLike = { path: string; label: string; testId: string };
type TabItemLike = { path: string; label: string };

describe("앱셸 라우팅 + Provider + 스캐폴드 계약 확정", () => {
  // ==========================================================================
  // AC-1: npm run build / tsc --noEmit passes with 0 errors
  // (proxy: App module imports & renders cleanly under jsdom — real verification
  //  is `npx tsc --noEmit` + `npx vite build`, run separately by the Coder)
  // ==========================================================================
  describe("AC-1: App renders cleanly (build/typecheck proxy)", () => {
    it("AC-1[P0]: App module renders at '/' without throwing", async () => {
      const App = (await import("@/App")).default;
      expect(() =>
        renderWithRouter(React.createElement(App), { initialEntries: ["/"] }),
      ).not.toThrow();
      expect(document.body.textContent).not.toBe("");
    });
  });

  // ==========================================================================
  // AC-2: 6 routes mount; missing pages render a ScreenScaffold placeholder
  // ==========================================================================
  describe("AC-2: 6 라우트 마운트 + 플레이스홀더", () => {
    it("AC-2[P0]: router.ts exports exactly the 6 contracted route paths", async () => {
      const { ROUTES } = await import("@/router");

      expect(ROUTES.length).toBe(6);
      expect(ROUTES.map((r: RouteConfigLike) => r.path).sort()).toEqual(
        [...ALL_ROUTE_PATHS].sort(),
      );
      // testId per route must be unique (used to identify placeholder mounts)
      const testIds = ROUTES.map((r: RouteConfigLike) => r.testId);
      expect(new Set(testIds).size).toBe(testIds.length);
    });

    it("AC-2[P0]: implemented pages (/, /input, /result) render their real page content", async () => {
      const App = (await import("@/App")).default;

      const home = renderWithRouter(React.createElement(App), { initialEntries: ["/"] });
      expect(screen.getByText("TaxBackKR").textContent).toBe("TaxBackKR");
      home.unmount();

      const input = renderWithRouter(React.createElement(App), { initialEntries: ["/input"] });
      expect(screen.getByText("소득 입력").textContent).toBe("소득 입력");
      input.unmount();

      const result = renderWithRouter(React.createElement(App), { initialEntries: ["/result"] });
      expect(screen.getByText("예상 환급액").textContent).toBe("예상 환급액");
      result.unmount();
    });

    it("AC-2: previously-placeholder routes (/simulate, /filing, /checklist) now render real ScreenScaffold pages, not the placeholder", async () => {
      const App = (await import("@/App")).default;
      const { ROUTES } = await import("@/router");

      for (const path of PLACEHOLDER_PATHS) {
        const route = ROUTES.find((r: RouteConfigLike) => r.path === path);
        expect(route).toBeDefined();

        const { container, unmount } = renderWithRouter(React.createElement(App), {
          initialEntries: [path],
        });

        // These routes are now implemented (F4/F5/F6) — the generic placeholder
        // copy must no longer appear.
        expect(screen.queryByText("준비 중인 화면이에요")).toBeNull();

        // Must be wrapped in ScreenScaffold/PageShell (minHeight: 100dvh), not a raw <div>
        const shellPresent = Array.from(container.querySelectorAll("div")).some(
          (el) => el.style.minHeight === "100dvh",
        );
        expect(shellPresent).toBe(true);

        unmount();
      }
    });

    it("AC-2: all 6 routes render without crashing", async () => {
      const App = (await import("@/App")).default;

      for (const path of ALL_ROUTE_PATHS) {
        const { container, unmount } = renderWithRouter(React.createElement(App), {
          initialEntries: [path],
        });
        expect(container.textContent).not.toBe("");
        unmount();
      }
    });
  });

  // ==========================================================================
  // AC-3: FloatingTabBar tab click navigates; 44x44 touch target
  // ==========================================================================
  describe("AC-3: FloatingTabBar 탭 ↔ 라우트 매핑", () => {
    it("AC-3[P0]: tabs.ts exports TABS whose paths are all valid contracted routes", async () => {
      const { TABS } = await import("@/app/tabs");
      const { ROUTES } = await import("@/router");
      const routePaths = new Set(ROUTES.map((r: RouteConfigLike) => r.path));

      expect(TABS.length).toBeGreaterThanOrEqual(2);
      TABS.forEach((tab: TabItemLike) => {
        expect(routePaths.has(tab.path)).toBe(true);
        expect(typeof tab.label).toBe("string");
        expect(tab.label.length).toBeGreaterThan(0);
      });
      // No duplicate tab paths
      const tabPaths = TABS.map((t: TabItemLike) => t.path);
      expect(new Set(tabPaths).size).toBe(tabPaths.length);
    });

    it("AC-3[P0]: clicking a non-active tab calls navigate() with that tab's path", async () => {
      const { TABS } = await import("@/app/tabs");
      const { FloatingTabBar } = await import("@/components/FloatingTabBar");

      mockLocation.pathname = "/";
      const targetTab: TabItemLike = TABS.find((t: TabItemLike) => t.path !== "/") ?? TABS[0];

      renderWithRouter(React.createElement(FloatingTabBar, { items: TABS }));
      fireEvent.click(screen.getByRole("tab", { name: targetTab.label }));

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(targetTab.path);
    });

    it("AC-3[P0]: every tab button meets the 44px minimum touch target", async () => {
      const { TABS } = await import("@/app/tabs");
      const { FloatingTabBar } = await import("@/components/FloatingTabBar");

      renderWithRouter(React.createElement(FloatingTabBar, { items: TABS }));
      const tabButtons = screen.getAllByRole("tab");

      expect(tabButtons.length).toBe(TABS.length);
      tabButtons.forEach((btn) => {
        expect(btn.style.minHeight).toBe("44px");
      });
    });

    it("AC-3[P0]: every TABS destination actually renders the tab bar when mounted through App (no dead-end screens)", async () => {
      const App = (await import("@/App")).default;
      const { TABS } = await import("@/app/tabs");

      for (const tab of TABS as TabItemLike[]) {
        const { unmount } = renderWithRouter(React.createElement(App), {
          initialEntries: [tab.path],
        });
        expect(screen.getAllByRole("tab").length).toBe(TABS.length);
        unmount();
      }
    });
  });

  // ==========================================================================
  // AC-4: service facade (0005) + session service (0006) injected via Provider,
  // consumable by pages through a hook
  // ==========================================================================
  describe("AC-4: AppProviders가 서비스 파사드/세션 서비스를 훅으로 노출", () => {
    it("AC-4[P0]: useServices() exposes the exact taxService + sessionService function references", async () => {
      const { AppProviders, useServices } = await import("@/app/AppProviders");
      const taxServiceModule = await import("@/services/taxService");
      const sessionServiceModule = await import("@/services/sessionService");

      let captured: any = null;
      function Probe() {
        captured = useServices();
        return null;
      }

      renderWithRouter(
        React.createElement(AppProviders, null, React.createElement(Probe)),
      );

      expect(captured).not.toBeNull();
      expect(captured.taxService.computeAndPersistResult).toBe(
        taxServiceModule.computeAndPersistResult,
      );
      expect(captured.taxService.simulate).toBe(taxServiceModule.simulate);
      expect(captured.sessionService.checkIntegration).toBe(
        sessionServiceModule.checkIntegration,
      );
      expect(captured.sessionService.grantReward).toBe(sessionServiceModule.grantReward);
    });

    it("AC-4[P0]: AppProviders renders its children", async () => {
      const { AppProviders } = await import("@/app/AppProviders");

      renderWithRouter(
        React.createElement(
          AppProviders,
          null,
          React.createElement("span", { "data-testid": "provider-child" }, "child"),
        ),
      );

      expect(screen.getByTestId("provider-child").tagName).toBe("SPAN");
      expect(screen.getByTestId("provider-child").textContent).toBe("child");
    });
  });

  // ==========================================================================
  // AC-5: zero console.error in a production render across all routes
  // ==========================================================================
  describe("AC-5: 콘솔 에러 0개", () => {
    it("AC-5[P0]: rendering every route produces zero console.error calls", async () => {
      const App = (await import("@/App")).default;
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      for (const path of ALL_ROUTE_PATHS) {
        const { unmount } = renderWithRouter(React.createElement(App), {
          initialEntries: [path],
        });
        unmount();
      }

      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Integration: navigate() targets used by existing pages must have a Route
  // ==========================================================================
  describe("Integration: navigate 대상 ↔ Route 일치", () => {
    it("all navigate() targets used by Home/Input/Result have a matching Route entry", async () => {
      const { ROUTES } = await import("@/router");
      const routePaths = ROUTES.map((r: RouteConfigLike) => r.path);

      // Home navigates within itself ("/"), Input -> "/result", Result -> "/input"
      const usedTargets = ["/", "/input", "/result"];
      usedTargets.forEach((target) => {
        expect(routePaths).toContain(target);
      });
      expect(routePaths.length).toBe(6);
    });
  });
});
