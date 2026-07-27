import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Top, Paragraph, Spacing, Badge, ListRow, Button } from "@toss/tds-mobile";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/StateView";
import { FloatingTabBar } from "@/components/FloatingTabBar";
import { TABS } from "@/app/tabs";
import { loadProfile } from "@/lib/storage";
import { judgeComprehensiveFiling } from "@/lib/taxEngine";
import { CURRENT_PROFILE_ID } from "@/lib/types";

const REQUIRED_DOCUMENTS = ["소득/세액 신고서", "경비 증빙", "원천징수영수증"];

export default function Filing() {
  const navigate = useNavigate();
  const [profile] = useState(() => loadProfile(CURRENT_PROFILE_ID));

  if (!profile) {
    return (
      <ScreenScaffold
        top={<Top title={<Top.TitleParagraph>종합소득세 신고</Top.TitleParagraph>} />}
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

  const isTarget = judgeComprehensiveFiling(profile);

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>종합소득세 신고</Top.TitleParagraph>} />}
      bottom={<FloatingTabBar items={TABS} />}
    >
      <Card testId="filing-verdict-card">
        <Badge size="medium" variant="fill" color={isTarget ? "red" : "blue"}>
          {isTarget ? "신고 대상" : "신고 대상 아님"}
        </Badge>
        <Spacing size={12} />
        <Paragraph.Text typography="t3">
          {isTarget ? "종합소득세 신고 대상입니다" : "종합소득세 신고 대상이 아닙니다"}
        </Paragraph.Text>
        <Spacing size={8} />
        <Paragraph.Text typography="st13">기타·사업소득 300만원 초과 시 대상이에요</Paragraph.Text>
        <Spacing size={4} />
        <Paragraph.Text typography="st13">실제 신고는 홈택스 기준으로 확인해주세요</Paragraph.Text>
      </Card>

      {isTarget && (
        <>
          <Spacing size={24} />
          <Paragraph.Text typography="t6">준비물</Paragraph.Text>
          <Spacing size={8} />
          {REQUIRED_DOCUMENTS.map((doc) => (
            <ListRow key={doc} contents={<ListRow.Texts type="1RowTypeA" top={doc} />} />
          ))}
        </>
      )}

      {/* 하단 FloatingTabBar와 겹치지 않도록 여백 확보 */}
      <Spacing size={80} />
    </ScreenScaffold>
  );
}
