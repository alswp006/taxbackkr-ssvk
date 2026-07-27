import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Top, Paragraph, Spacing, Badge, ListRow } from "@toss/tds-mobile";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { SummaryHero } from "@/components/SummaryHero";
import { CountUp } from "@/components/CountUp";
import { MiniBar } from "@/components/MiniBar";
import { EmptyState } from "@/components/StateView";
import { FloatingTabBar } from "@/components/FloatingTabBar";
import { TABS } from "@/app/tabs";
import { loadProfile, loadDeductions } from "@/lib/storage";
import { buildChecklistState } from "@/lib/derive";
import { CURRENT_PROFILE_ID, type ChecklistItemKey, type DeductionInput } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

// 체크리스트 항목은 세법상 세부 한도 구분(연금저축/신용카드 사용액)이지만
// 시뮬레이터 슬라이더는 DeductionInput 필드 단위다 — 탭 시 대응 슬라이더로 매핑.
const FOCUS_KEY_MAP: Record<ChecklistItemKey, keyof DeductionInput> = {
  irp: "irp",
  pension: "irp",
  medical: "medical",
  creditCardRatio: "creditCard",
  insurance: "insurance",
};

export default function Checklist() {
  const navigate = useNavigate();
  const [profile] = useState(() => loadProfile(CURRENT_PROFILE_ID));
  const [deductions] = useState<DeductionInput | null>(() =>
    profile ? loadDeductions(profile.id) : null,
  );

  if (!profile || !deductions) {
    return (
      <ScreenScaffold
        top={<Top title={<Top.TitleParagraph>절세 체크리스트</Top.TitleParagraph>} />}
        bottom={<FloatingTabBar items={TABS} />}
      >
        <EmptyState title="공제 항목을 입력하면 달성도를 확인할 수 있어요" />
      </ScreenScaffold>
    );
  }

  const checklist = buildChecklistState(deductions, profile.taxYear);
  const achievedPct = Math.round(checklist.achievedRate * 100);

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>절세 체크리스트</Top.TitleParagraph>} />}
      bottom={<FloatingTabBar items={TABS} />}
    >
      <SummaryHero
        testId="achieve-hero"
        label="공제 달성률"
        value={<CountUp value={achievedPct} unit="%" typography="t1" />}
      />
      <Spacing size={16} />

      {checklist.items.map((item) => (
        <div key={item.key}>
          <ListRow
            onClick={() =>
              navigate("/simulate", {
                state: { profileId: profile.id, focusKey: FOCUS_KEY_MAP[item.key] },
              })
            }
            contents={
              <ListRow.Texts
                type="2RowTypeA"
                top={item.label}
                bottom={
                  item.done ? (
                    <Badge size="small" variant="weak" color="blue">
                      달성
                    </Badge>
                  ) : (
                    `${formatNumber(item.current)}원 / ${formatNumber(item.limit)}원`
                  )
                }
              />
            }
          />
          <Spacing size={8} />
          <MiniBar
            ratio={item.limit > 0 ? item.current / item.limit : 0}
            testId="checklist-minibar"
          />
          <Spacing size={16} />
        </div>
      ))}

      {/* 하단 FloatingTabBar와 겹치지 않도록 여백 확보 */}
      <Spacing size={80} />
    </ScreenScaffold>
  );
}
