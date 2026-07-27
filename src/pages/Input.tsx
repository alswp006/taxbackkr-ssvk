import { useState } from "react";
import type { FocusEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Top, Chip, ChipItem, TextField, Paragraph, Spacing } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { SubmitFooter } from "@/components/BottomCTA";
import { loadProfile, saveProfile } from "@/lib/storage";
import { CURRENT_PROFILE_ID, type IncomeType, type TaxProfile, type RouteState } from "@/lib/types";

const MAX_SALARY = 1_000_000_000;

function fireTickWeak() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

// 포커스된 입력칸이 하단 SubmitFooter에 가려지지 않게 스크롤. jsdom/구형 브라우저엔
// scrollIntoView가 없을 수 있어 optional chaining + 가드로 무시한다.
function scrollFieldIntoView(e: FocusEvent<HTMLInputElement>) {
  try {
    e.currentTarget.scrollIntoView?.({ block: "center", behavior: "smooth" });
  } catch {
    /* no-op */
  }
}

export default function Input() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state as RouteState["/input"]) ?? undefined;
  const profileId = routeState?.editProfileId ?? CURRENT_PROFILE_ID;

  const [existingProfile] = useState<TaxProfile | null>(() => loadProfile(profileId));

  const [incomeType, setIncomeType] = useState<IncomeType>(existingProfile?.incomeType ?? "employee");
  const [salary, setSalary] = useState(existingProfile ? String(existingProfile.annualSalary) : "");
  const [freelanceIncome, setFreelanceIncome] = useState(
    existingProfile ? String(existingProfile.freelanceIncome) : "",
  );
  const [dependents, setDependents] = useState(existingProfile ? String(existingProfile.dependents) : "");
  const [salaryError, setSalaryError] = useState<string | undefined>();

  function selectIncomeType(type: IncomeType) {
    fireTickWeak();
    setIncomeType(type);
  }

  function handleCalc() {
    if (!salary.trim()) {
      setSalaryError("연봉을 입력해주세요");
      return;
    }
    const salaryNum = Number(salary);
    if (salaryNum > MAX_SALARY) {
      setSalaryError("10억원 이하로 입력해주세요");
      return;
    }
    setSalaryError(undefined);

    const now = Date.now();
    const profile: TaxProfile = {
      id: profileId,
      taxYear: existingProfile?.taxYear ?? new Date().getFullYear(),
      incomeType,
      annualSalary: salaryNum,
      freelanceIncome: incomeType === "multi" ? Number(freelanceIncome) || 0 : 0,
      dependents: Number(dependents) || 0,
      createdAt: existingProfile?.createdAt ?? now,
      updatedAt: now,
    };

    saveProfile(profile);
    navigate("/result", { state: { profileId } as RouteState["/result"] });
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>소득 입력</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="환급액 계산" onClick={handleCalc} />}
    >
      <Paragraph.Text typography="t4">소득 유형을 골라주세요</Paragraph.Text>
      <Spacing size={4} />
      <Paragraph.Text typography="st13">자영업·사업소득도 프리랜서를 선택해요</Paragraph.Text>
      <Spacing size={12} />
      <Chip>
        <ChipItem
          selected={incomeType === "employee"}
          onClick={() => selectIncomeType("employee")}
          data-testid="income-type-chip-employee"
        >
          직장인
        </ChipItem>
        <ChipItem
          selected={incomeType === "freelancer"}
          onClick={() => selectIncomeType("freelancer")}
          data-testid="income-type-chip-freelancer"
        >
          프리랜서
        </ChipItem>
        <ChipItem
          selected={incomeType === "multi"}
          onClick={() => selectIncomeType("multi")}
          data-testid="income-type-chip-multi"
        >
          N잡
        </ChipItem>
      </Chip>

      <Spacing size={24} />

      <TextField
        variant="box"
        label="연봉(총급여)"
        placeholder="예: 50000000"
        help={salaryError ?? "만 원 단위 말고 전체 금액을 숫자로 입력해요 (5천만 원 → 50000000)"}
        hasError={!!salaryError}
        inputMode="numeric"
        value={salary}
        onChange={(e) => {
          setSalary(e.target.value);
          setSalaryError(undefined);
        }}
        onFocus={scrollFieldIntoView}
        data-testid="annual-salary-field"
      />

      {incomeType === "multi" && (
        <>
          <Spacing size={16} />
          <TextField
            variant="box"
            label="프리랜서 수입"
            placeholder="예: 8000000"
            help="전체 금액을 숫자로 입력해요 (800만 원 → 8000000)"
            inputMode="numeric"
            value={freelanceIncome}
            onChange={(e) => setFreelanceIncome(e.target.value)}
            onFocus={scrollFieldIntoView}
            data-testid="freelance-income-field"
          />
        </>
      )}

      <Spacing size={16} />

      <TextField
        variant="box"
        label="부양가족 수"
        placeholder="부양가족 수 (예: 2명)"
        help="본인 제외, 배우자·자녀 등 부양가족 인원이에요"
        inputMode="numeric"
        value={dependents}
        onChange={(e) => setDependents(e.target.value)}
        onFocus={scrollFieldIntoView}
        data-testid="dependents-field"
      />

      <Spacing size={24} />
    </ScreenScaffold>
  );
}
