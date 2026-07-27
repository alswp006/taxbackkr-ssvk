import { useState } from 'react';
import { Top, Paragraph, Spacing, Button, BottomSheet } from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { SummaryHero } from '../components/SummaryHero';
import { CountUp } from '../components/CountUp';
import { Card } from '../components/Card';
import { Sparkline } from '../components/Sparkline';
import { EmptyState } from '../components/StateView';
import { FloatingTabBar } from '../components/FloatingTabBar';
import { TABS } from '../app/tabs';
import { loadMeta, saveMeta, loadProfile } from '../lib/storage';
import { compareResults } from '../lib/derive';
import { CURRENT_PROFILE_ID } from '../lib/types';
import { formatNumber } from '../lib/utils';

export default function Home() {
  const navigate = useNavigate();
  const [meta] = useState(() => loadMeta() ?? { onboardingSeen: false, lastResultByYear: {} });
  const [onboardingOpen, setOnboardingOpen] = useState(() => !meta.onboardingSeen);
  const [profile] = useState(() => loadProfile(CURRENT_PROFILE_ID));

  const results = Object.values(meta.lastResultByYear);
  const latest = [...results].sort((a, b) => b.taxYear - a.taxYear)[0];
  const comparison = compareResults(meta.lastResultByYear);

  function closeOnboarding() {
    setOnboardingOpen(false);
    saveMeta({ ...meta, onboardingSeen: true });
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>TaxBackKR</Top.TitleParagraph>} />}
      bottom={<FloatingTabBar items={TABS} />}
    >
      <SummaryHero
        testId="home-hero"
        label={latest ? '최근 예상 환급액' : '예상 환급액 계산'}
        value={
          latest ? (
            <CountUp value={Math.abs(latest.refund)} unit="원" typography="t1" />
          ) : (
            <Paragraph.Text typography="t3">소득을 입력하고 환급액을 확인해보세요</Paragraph.Text>
          )
        }
        caption={profile ? undefined : '로그인 없이 바로 쓸 수 있어요'}
        action={
          <Button variant="fill" display="block" onClick={() => navigate('/input')}>
            {profile ? '다시 계산하기' : '환급액 계산하기'}
          </Button>
        }
      />

      <Spacing size={24} />

      {comparison.insufficient ? (
        <EmptyState title="비교할 작년 데이터가 없어요" />
      ) : (
        <Card testId="year-compare-card">
          <Paragraph.Text typography="t6">
            {`작년 대비 ${comparison.diff! >= 0 ? '+' : ''}${formatNumber(comparison.diff!)}원`}
          </Paragraph.Text>
          <Spacing size={12} />
          <Sparkline data={comparison.refunds!} testId="compare-sparkline" />
        </Card>
      )}

      {/* 하단 FloatingTabBar와 겹치지 않도록 여백 확보 */}
      <Spacing size={80} />

      <BottomSheet open={onboardingOpen} onClose={closeOnboarding}>
        <Paragraph.Text typography="t4">환급액을 30초 만에 확인해보세요</Paragraph.Text>
        <Spacing size={8} />
        <Paragraph.Text typography="t6">
          소득을 입력하면 예상 환급액과 절세 팁을 바로 보여드려요
        </Paragraph.Text>
        <Spacing size={20} />
        <Button variant="fill" display="block" onClick={closeOnboarding}>
          확인
        </Button>
        <Spacing size={12} />
      </BottomSheet>
    </ScreenScaffold>
  );
}
