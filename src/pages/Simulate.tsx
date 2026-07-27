import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Top, Paragraph, Spacing, Button, AlertDialog, Toast } from "@toss/tds-mobile";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { SummaryHero } from "@/components/SummaryHero";
import { CountUp } from "@/components/CountUp";
import { Card } from "@/components/Card";
import { MiniBar } from "@/components/MiniBar";
import { EmptyState } from "@/components/StateView";
import { FloatingTabBar } from "@/components/FloatingTabBar";
import { TABS } from "@/app/tabs";
import { loadProfile, loadDeductions, saveDeductions } from "@/lib/storage";
import { calcTax } from "@/lib/taxEngine";
import { DEDUCTION_LIMITS, DEDUCTION_LABELS, DEDUCTION_KEYS } from "@/lib/taxTables";
import { CURRENT_PROFILE_ID, type DeductionInput, type RouteState } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

const ZERO_DEDUCTIONS: DeductionInput = {
  creditCard: 0,
  medical: 0,
  education: 0,
  irp: 0,
  insurance: 0,
};

export default function Simulate() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state as RouteState["/simulate"]) ?? undefined;
  const profileId = routeState?.profileId ?? CURRENT_PROFILE_ID;

  const [profile] = useState(() => loadProfile(profileId));
  const [deductions, setDeductions] = useState<DeductionInput>(
    () => loadDeductions(profileId) ?? ZERO_DEDUCTIONS,
  );
  const [resetOpen, setResetOpen] = useState(false);
  const [quotaWarned, setQuotaWarned] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  const result = useMemo(
    () => (profile ? calcTax(profile, deductions, Date.now()) : null),
    [profile, deductions],
  );

  function updateDeduction(key: keyof DeductionInput, rawValue: number) {
    const clamped = Math.max(0, Math.min(DEDUCTION_LIMITS[key], rawValue));
    const next = { ...deductions, [key]: clamped };
    setDeductions(next);
    const saved = saveDeductions(profileId, next);
    if (!saved.ok && !quotaWarned) {
      setQuotaWarned(true);
      setToastOpen(true);
    }
  }

  function handleReset() {
    setDeductions(ZERO_DEDUCTIONS);
    saveDeductions(profileId, ZERO_DEDUCTIONS);
    setResetOpen(false);
  }

  if (!profile) {
    return (
      <ScreenScaffold
        top={<Top title={<Top.TitleParagraph>공제 시뮬레이션</Top.TitleParagraph>} />}
        bottom={<FloatingTabBar items={TABS} />}
      >
        <EmptyState
          title="소득 정보를 먼저 입력해주세요"
          action={
            <Button variant="weak" onClick={() => navigate("/input")}>
              입력하러 가기
            </Button>
          }
        />
      </ScreenScaffold>
    );
  }

  const totalSaved = result?.deductionBreakdown.reduce((sum, item) => sum + item.savedTax, 0) ?? 0;
  const refund = result?.refund ?? 0;

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>공제 시뮬레이션</Top.TitleParagraph>} />}
      bottom={<FloatingTabBar items={TABS} />}
    >
      <SummaryHero
        testId="simulate-hero"
        label={refund >= 0 ? "예상 환급액" : "추가 납부 예상"}
        value={<CountUp value={Math.abs(refund)} unit="원" typography="t1" />}
      />
      <Spacing size={16} />
      <Card>
        <Paragraph.Text typography="t6">총 절감액</Paragraph.Text>
        <Spacing size={4} />
        <Paragraph.Text typography="t2">{`${formatNumber(totalSaved)}원`}</Paragraph.Text>
      </Card>
      <Spacing size={24} />

      {DEDUCTION_KEYS.map((key) => {
        const limit = DEDUCTION_LIMITS[key];
        const value = deductions[key];
        return (
          <div key={key}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Paragraph.Text typography="t6">{DEDUCTION_LABELS[key]}</Paragraph.Text>
              <Paragraph.Text typography="t6">{`${formatNumber(value)}원`}</Paragraph.Text>
            </div>
            <Spacing size={8} />
            <input
              type="range"
              min={0}
              max={limit}
              step={Math.max(1, Math.round(limit / 100))}
              value={value}
              onChange={(e) => updateDeduction(key, Number(e.target.value))}
              aria-label={DEDUCTION_LABELS[key]}
              data-testid={`deduction-slider-${key}`}
              style={{ width: "100%" }}
            />
            <Spacing size={8} />
            <MiniBar ratio={limit > 0 ? value / limit : 0} testId="deduction-minibar" />
            <Spacing size={24} />
          </div>
        );
      })}

      <Button variant="weak" display="block" onClick={() => setResetOpen(true)}>
        초기화
      </Button>
      <Spacing size={24} />

      <AlertDialog
        open={resetOpen}
        title="공제 입력을 초기화할까요?"
        alertButton={
          <AlertDialog.AlertButton onClick={handleReset}>초기화</AlertDialog.AlertButton>
        }
        onClose={() => setResetOpen(false)}
      />
      <Toast
        open={toastOpen}
        text="저장 공간이 부족해요"
        position="bottom"
        onClose={() => setToastOpen(false)}
      />

      {/* 하단 FloatingTabBar와 겹치지 않도록 여백 확보 */}
      <Spacing size={80} />
    </ScreenScaffold>
  );
}
