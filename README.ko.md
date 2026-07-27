🇰🇷 [English](./README.md)

# TaxBackKR

Vite + React + TDS를 활용한 앱인토스 미니 앱으로, 연말정산과 종합소득세 환급액을 30초 안에 시뮬레이션할 수 있습니다. 절세 팁은 리워드 광고 뒤에 공개됩니다.

대부분의 직장인과 프리랜서는 연말정산과 종합소득세 신고 시즌마다 환급액을 예측하지 못합니다. 홈택스는 너무 복잡해서 많은 사람들이 포기하고, 절세 방법도 알기 어렵습니다.

## 기술 스택

- React 18.0.0
- TypeScript
- Vitest

## 라우트

| 경로 | 설명 |
|------|------|
| `/Home` | 홈 |

## 시작하기

```bash
pnpm install
pnpm dev
```

## 개발

```bash
pnpm typecheck    # 타입 검사
pnpm test         # 테스트 실행
pnpm build        # 프로덕션 빌드
```

## 설계 문서

설계 자료는 `.ai-factory/` 디렉토리를 참고하세요:
- `prd.md` — 제품 요구사항 문서
- `spec.md` — 기술 명세서
- `task.md` — Epic/Task 분해

---
[AI Factory](https://github.com/alswp006/ai-factory)로 빌드됨 · 마지막 동기화: 2026-07-27
