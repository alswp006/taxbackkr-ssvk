import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Top, Paragraph, Spacing, Badge, ListRow, Button, Toast } from "@toss/tds-mobile";
import {
  generateHapticFeedback,
  loadFullScreenAd,
  showFullScreenAd,
} from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { SummaryHero } from "@/components/SummaryHero";
import { CountUp } from "@/components/CountUp";
import { Card } from "@/components/Card";
import { AdSlot } from "@/components/AdSlot";
import { EmptyState, LoadingState } from "@/components/StateView";
import { loadProfile } from "@/lib/storage";
import { computeAndPersistResult } from "@/services/taxService";
import type { RouteState, TaxResult } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

const REWARD_SLOT_ID = import.meta.env.VITE_TOSS_AD_SLOT_ID ?? "result-unlock";

function fireHaptic(type: "success" | "tickWeak") {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

export default function Result() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state as RouteState["/result"]) ?? null;
  const profileId = routeState?.profileId;

  const profile = useMemo(() => (profileId ? loadProfile(profileId) : null), [profileId]);

  const [result, setResult] = useState<TaxResult | null>(null);
  const [adLoaded, setAdLoaded] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  // 마운트 시: 계산 파사드(0005)를 통해 결과를 계산·영속화(F3-AC8)
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    computeAndPersistResult(profileId, Date.now())
      .then((computed) => {
        if (!cancelled && computed) setResult(computed);
      })
      .catch(() => {
        /* 계산 실패 시 로딩 상태로 남겨 흰 화면/throw 방지 */
      });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  // 리워드 광고 프리로드. 로드 실패(앱인토스 WebView 밖 등)는 버튼을 영구 비활성으로
  // 남기지 않고 게이트를 건너뛴다(TossRewardAd 컴포넌트와 동일한 정책).
  useEffect(() => {
    if (!profile) return;
    try {
      loadFullScreenAd({
        slotId: REWARD_SLOT_ID,
        onEvent: () => setAdLoaded(true),
        onError: () => setUnlocked(true),
      } as Parameters<typeof loadFullScreenAd>[0]);
    } catch {
      setUnlocked(true);
    }
  }, [profile]);

  function handleUnlock() {
    fireHaptic("success");
    try {
      showFullScreenAd({
        slotId: REWARD_SLOT_ID,
        onEvent: () => setUnlocked(true),
        onError: () => setToastOpen(true),
      } as Parameters<typeof showFullScreenAd>[0]);
    } catch {
      setToastOpen(true);
    }
  }

  if (!profileId || !profile) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>예상 환급액</Top.TitleParagraph>} />}>
        <EmptyState
          title="먼저 소득을 입력해주세요"
          action={
            <Button variant="weak" onClick={() => navigate("/input")}>
              입력하러 가기
            </Button>
          }
        />
      </ScreenScaffold>
    );
  }

  const refund = result?.refund ?? 0;
  const isRefund = refund >= 0;

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>예상 환급액</Top.TitleParagraph>} />}>
      {!result ? (
        <LoadingState rows={4} />
      ) : (
        <>
          <SummaryHero
            testId="refund-hero"
            label={isRefund ? "예상 환급액" : "추가 납부 예상"}
            value={<CountUp value={Math.abs(refund)} unit="원" typography="t1" />}
          />
          <Spacing size={16} />
          <Card testId="tax-summary-card">
            <Badge size="medium" variant="fill" color={isRefund ? "blue" : "red"}>
              {isRefund ? "환급" : "추가납부"}
            </Badge>
            <Spacing size={12} />
            <ListRow
              contents={
                <ListRow.Texts
                  type="2RowTypeA"
                  top="산출세액"
                  bottom={
                    <Paragraph.Text typography="t3">
                      {`${formatNumber(result.estimatedTax)}원`}
                    </Paragraph.Text>
                  }
                />
              }
            />
            <ListRow
              contents={
                <ListRow.Texts
                  type="2RowTypeA"
                  top="실효세율"
                  bottom={
                    <Paragraph.Text typography="t3">
                      {`${(result.effectiveRate * 100).toFixed(1)}%`}
                    </Paragraph.Text>
                  }
                />
              }
            />
          </Card>
          <Spacing size={16} />
          <AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID ?? "result-banner"} />
          <Spacing size={16} />
          {unlocked ? (
            <div data-testid="deduction-breakdown">
              {result.deductionBreakdown.map((item) => (
                <ListRow
                  key={item.key}
                  contents={
                    <ListRow.Texts
                      type="2RowTypeA"
                      top={item.label}
                      bottom={`-${formatNumber(item.savedTax)}원`}
                    />
                  }
                />
              ))}
            </div>
          ) : (
            <Button
              variant="fill"
              size="large"
              display="block"
              disabled={!adLoaded}
              onClick={handleUnlock}
            >
              절세 상세 분석 보기
            </Button>
          )}
          <Spacing size={16} />
          <Paragraph.Text typography="st13">실제 환급액과 다를 수 있어요</Paragraph.Text>
          <Spacing size={16} />
        </>
      )}
      <Toast
        open={toastOpen}
        text="광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요"
        position="bottom"
        onClose={() => setToastOpen(false)}
      />
    </ScreenScaffold>
  );
}
