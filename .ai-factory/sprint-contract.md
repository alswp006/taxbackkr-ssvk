# Sprint Contract — Packet 0001: App Shell Routing & Provider Integration

## Overview
Integrate react-router-dom with 6 routes, wrap services (0005, 0006) as top-level Provider, export shared contract (tabs, screen props) so pages consume a single unified API.

## Files to Create/Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Add 4 missing routes + placeholder pages; keep 3 existing |
| `src/router.tsx` | Export `ROUTES` array + `RouteConfig` type |
| `src/app/AppProviders.tsx` | Wrap 0005 ServiceFacade + 0006 SessionService as context |
| `src/app/tabs.ts` | Export `TABS` (path↔label↔icon) + `useTabState` hook |
| `src/main.tsx` | **NO CHANGE** — @AI:ANCHOR, protected |

## Routes (6 total)
- `/` → Home (placeholder: ScreenScaffold + "Home")
- `/input` → Input (placeholder: ScreenScaffold + "Income Input")
- `/result` → Result (placeholder: ScreenScaffold + "Tax Result")
- `/simulate` → Simulate (placeholder: ScreenScaffold + "Deduction Simulator")
- `/filing` → Filing (placeholder: ScreenScaffold + "E-Filing Guide")
- `/checklist` → Checklist (placeholder: ScreenScaffold + "Deduction Checklist")

## Shared Types (import from `@/lib/types.ts`)
- `RouteState` — union of path → state type (Route ↔ location.state contract)
- `ChecklistItemKey`, `TaxProfile`, `TaxResult`, `DeductionInput` — page consumption

## Provider Stack
```
<TDSMobileAITProvider> (main.tsx — @AI:ANCHOR)
  └─ <BrowserRouter> (main.tsx — @AI:ANCHOR)
     └─ <AppProviders> (AppProviders.tsx — new)
        ├─ SessionService.Provider (0006)
        ├─ ServiceFacade.Provider (0005)
        └─ <App /> (routes)
```

## Contract Exports (single source of truth for pages)
- `ROUTES: { path: string, label: string, icon: string }[]` — tab config
- `useTabState()` — active tab ↔ navigate
- `ScreenScaffold` props signature (top, footer, onHeaderClick)
- `SubmitFooter` props signature (label, onSubmit, loading)

## Verification
1. `pnpm typecheck` — zero errors
2. `npx next build` — succeeds (all placeholder routes compile)
3. Navigate to each route — renders ScreenScaffold + placeholder text
4. FloatingTabBar tabs ↔ routes match (navigate /input → "Input" tab active)

## Absolute DON'Ts
- ❌ Modify `src/main.tsx` (protected @AI:ANCHOR)
- ❌ Create nested BrowserRouter (already in main.tsx)
- ❌ Hardcode routes in App.tsx — use `ROUTES` from `src/router.tsx`
- ❌ Placeholder pages with raw `<div>` — wrap all in ScreenScaffold
