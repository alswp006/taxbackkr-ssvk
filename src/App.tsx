import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import type { ComponentType } from 'react';
import { Top } from '@toss/tds-mobile';
import { AppProviders } from './app/AppProviders';
import { ROUTES } from './router';
import { ScreenScaffold } from './components/ScreenScaffold';
import { EmptyState } from './components/StateView';
import Home from './pages/Home';
import Input from './pages/Input';
import Result from './pages/Result';

// 실제 구현된 페이지만 매핑. 미구현 경로는 아래 Placeholder로 방어 배선해
// 단일 화면 결함이 전체 빌드를 무너뜨리지 않게 한다(플레이스홀더 골격은 계약과 동일).
const PAGES: Partial<Record<string, ComponentType>> = {
  '/': Home,
  '/input': Input,
  '/result': Result,
};

/** 미구현 라우트용 최소 플레이스홀더 — ScreenScaffold 골격 + 라우트 이름 헤더. */
function RoutePlaceholder({ label }: { label: string }) {
  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>{label}</Top.TitleParagraph>} />}>
      <EmptyState title="준비 중인 화면이에요" description="곧 이어서 만들어질 예정입니다" />
    </ScreenScaffold>
  );
}

// Dev-only TDS Gallery route — `import.meta.env.DEV` is statically replaced
// (true in dev, false in prod) so the entire import + Route is tree-shaken
// from production builds. Verify with: `grep -r "TdsGallery" dist/` → empty.
const DevTdsGallery = import.meta.env.DEV
  ? lazy(() => import('./pages/__TdsGallery'))
  : null;

export default function App() {
  return (
    <AppProviders>
      <Routes>
        {ROUTES.map((route) => {
          const Page = PAGES[route.path];
          return (
            <Route
              key={route.path}
              path={route.path}
              element={Page ? <Page /> : <RoutePlaceholder label={route.label} />}
            />
          );
        })}
        {DevTdsGallery && (
          <Route
            path="/__tds-gallery"
            element={
              <Suspense fallback={null}>
                <DevTdsGallery />
              </Suspense>
            }
          />
        )}
      </Routes>
    </AppProviders>
  );
}
