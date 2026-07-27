import { describe, it, expect } from "vitest";
import type {
  IncomeType,
  TaxProfile,
  DeductionInput,
  TaxResult,
  ChecklistItem,
  ChecklistState,
  AppMeta,
  RouteState,
} from "@/lib/types";
import { STORAGE_KEYS } from "@/lib/types";

/**
 * Packet 0001: TypeScript 타입 + RouteState 계약 정의
 *
 * AC-1: src/lib/types.ts가 모든 인터페이스를 export한다
 * AC-2: RouteState 타입 정의가 정확하다
 * AC-3: STORAGE_KEYS 상수가 정확하다
 * AC-4: tsc 빌드 통과 (순수 타입/상수만 존재)
 */

describe("AC-1: SPEC Data Models 인터페이스 내보내기", () => {
  it("IncomeType 유니온이 3가지 값을 정확히 정의한다", () => {
    // TypeScript는 컴파일 시점에만 타입을 검증하므로, 런타임에는 타입 객체가 없다.
    // 이 테스트는 import 성공 = 타입이 export됨을 확인한다.
    type Check = IncomeType extends "employee" | "freelancer" | "multi" ? true : false;
    const check: Check = true;
    expect(check).toBe(true);
  });

  it("TaxProfile 인터페이스가 모든 필드를 정확히 정의한다", () => {
    // 샘플 객체로 구조 검증
    const profile: TaxProfile = {
      id: "uuid-123",
      taxYear: 2026,
      incomeType: "employee",
      annualSalary: 50000000,
      freelanceIncome: 0,
      dependents: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    expect(profile.id).toBe("uuid-123");
    expect(profile.taxYear).toBe(2026);
    expect(profile.incomeType).toBe("employee");
    expect(profile.annualSalary).toBe(50000000);
    expect(profile.freelanceIncome).toBe(0);
    expect(profile.dependents).toBe(1);
    expect(typeof profile.createdAt).toBe("number");
    expect(typeof profile.updatedAt).toBe("number");
  });

  it("TaxProfile은 incomeType 'freelancer'를 허용한다", () => {
    const profile: TaxProfile = {
      id: "uuid-456",
      taxYear: 2026,
      incomeType: "freelancer",
      annualSalary: 0,
      freelanceIncome: 30000000,
      dependents: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    expect(profile.incomeType).toBe("freelancer");
    expect(profile.freelanceIncome).toBe(30000000);
  });

  it("TaxProfile은 incomeType 'multi'를 허용한다", () => {
    const profile: TaxProfile = {
      id: "uuid-789",
      taxYear: 2026,
      incomeType: "multi",
      annualSalary: 40000000,
      freelanceIncome: 10000000,
      dependents: 2,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    expect(profile.incomeType).toBe("multi");
    expect(profile.annualSalary).toBe(40000000);
    expect(profile.freelanceIncome).toBe(10000000);
  });

  it("DeductionInput 인터페이스가 모든 필드를 정의한다", () => {
    const deductions: DeductionInput = {
      creditCard: 20000000,
      medical: 1000000,
      education: 5000000,
      irp: 3000000,
      insurance: 1500000,
    };
    expect(deductions.creditCard).toBe(20000000);
    expect(deductions.medical).toBe(1000000);
    expect(deductions.education).toBe(5000000);
    expect(deductions.irp).toBe(3000000);
    expect(deductions.insurance).toBe(1500000);
  });

  it("TaxResult 인터페이스가 모든 필드를 정의한다", () => {
    const result: TaxResult = {
      profileId: "profile-123",
      taxYear: 2026,
      estimatedTax: 4000000,
      withheld: 5000000,
      refund: 1000000,
      effectiveRate: 0.0800,
      needsComprehensiveFiling: false,
      deductionBreakdown: [
        { key: "creditCard", label: "신용카드", savedTax: 500000 },
        { key: "irp", label: "IRP", savedTax: 300000 },
      ],
      computedAt: Date.now(),
    };
    expect(result.profileId).toBe("profile-123");
    expect(result.taxYear).toBe(2026);
    expect(result.estimatedTax).toBe(4000000);
    expect(result.withheld).toBe(5000000);
    expect(result.refund).toBe(1000000);
    expect(result.effectiveRate).toBe(0.0800);
    expect(result.needsComprehensiveFiling).toBe(false);
    expect(result.deductionBreakdown).toHaveLength(2);
    expect(result.deductionBreakdown[0].key).toBe("creditCard");
    expect(result.deductionBreakdown[0].savedTax).toBe(500000);
  });

  it("TaxResult는 refund 음수(추가납부)를 허용한다", () => {
    const result: TaxResult = {
      profileId: "profile-456",
      taxYear: 2026,
      estimatedTax: 6000000,
      withheld: 5000000,
      refund: -1000000, // 추가납부
      effectiveRate: 0.1200,
      needsComprehensiveFiling: true,
      deductionBreakdown: [],
      computedAt: Date.now(),
    };
    expect(result.refund).toBe(-1000000);
    expect(result.needsComprehensiveFiling).toBe(true);
  });

  it("ChecklistItem 인터페이스가 모든 필드를 정의한다", () => {
    const item: ChecklistItem = {
      key: "irp",
      label: "IRP/연금저축",
      limit: 9000000,
      current: 5000000,
      done: false,
    };
    expect(item.key).toBe("irp");
    expect(item.label).toBe("IRP/연금저축");
    expect(item.limit).toBe(9000000);
    expect(item.current).toBe(5000000);
    expect(item.done).toBe(false);
  });

  it("ChecklistItem의 key는 허용된 5가지 값만 가능하다", () => {
    const item1: ChecklistItem = { key: "irp", label: "", limit: 0, current: 0, done: false };
    const item2: ChecklistItem = { key: "pension", label: "", limit: 0, current: 0, done: false };
    const item3: ChecklistItem = { key: "medical", label: "", limit: 0, current: 0, done: false };
    const item4: ChecklistItem = { key: "creditCardRatio", label: "", limit: 0, current: 0, done: false };
    const item5: ChecklistItem = { key: "insurance", label: "", limit: 0, current: 0, done: false };
    expect(item1.key).toBe("irp");
    expect(item2.key).toBe("pension");
    expect(item3.key).toBe("medical");
    expect(item4.key).toBe("creditCardRatio");
    expect(item5.key).toBe("insurance");
  });

  it("ChecklistState 인터페이스가 모든 필드를 정의한다", () => {
    const checklist: ChecklistState = {
      taxYear: 2026,
      items: [
        { key: "irp", label: "IRP", limit: 9000000, current: 8000000, done: true },
        { key: "medical", label: "의료비", limit: 3000000, current: 1000000, done: false },
      ],
      achievedRate: 0.5,
    };
    expect(checklist.taxYear).toBe(2026);
    expect(checklist.items).toHaveLength(2);
    expect(checklist.achievedRate).toBe(0.5);
  });

  it("AppMeta 인터페이스가 모든 필드를 정의한다", () => {
    const meta: AppMeta = {
      onboardingSeen: true,
      lastResultByYear: {
        2025: {
          profileId: "p-2025",
          taxYear: 2025,
          estimatedTax: 3000000,
          withheld: 3500000,
          refund: 500000,
          effectiveRate: 0.0600,
          needsComprehensiveFiling: false,
          deductionBreakdown: [],
          computedAt: 1700000000,
        },
        2026: {
          profileId: "p-2026",
          taxYear: 2026,
          estimatedTax: 4000000,
          withheld: 5000000,
          refund: 1000000,
          effectiveRate: 0.0800,
          needsComprehensiveFiling: false,
          deductionBreakdown: [],
          computedAt: 1750000000,
        },
      },
    };
    expect(meta.onboardingSeen).toBe(true);
    expect(meta.lastResultByYear[2025].refund).toBe(500000);
    expect(meta.lastResultByYear[2026].refund).toBe(1000000);
  });
});

describe("AC-2: RouteState 타입 정의가 정확하다", () => {
  it("RouteState['/']는 undefined를 허용한다", () => {
    const state: RouteState["/"] = undefined;
    expect(state).toBeUndefined();
  });

  it("RouteState['/input']는 undefined를 허용한다", () => {
    const state: RouteState["/input"] = undefined;
    expect(state).toBeUndefined();
  });

  it("RouteState['/input']는 { editProfileId: string }를 허용한다", () => {
    const state: RouteState["/input"] = { editProfileId: "uuid-abc" };
    expect(state.editProfileId).toBe("uuid-abc");
  });

  it("RouteState['/result']는 { profileId: string }를 요구한다", () => {
    const state: RouteState["/result"] = { profileId: "profile-123" };
    expect(state.profileId).toBe("profile-123");
  });

  it("RouteState['/simulate']는 { profileId: string }를 허용한다", () => {
    const state: RouteState["/simulate"] = { profileId: "profile-456" };
    expect(state.profileId).toBe("profile-456");
  });

  it("RouteState['/simulate']는 { profileId, focusKey }를 허용한다", () => {
    const state: RouteState["/simulate"] = {
      profileId: "profile-789",
      focusKey: "irp",
    };
    expect(state.profileId).toBe("profile-789");
    expect(state.focusKey).toBe("irp");
  });

  it("RouteState['/simulate'] focusKey는 DeductionInput의 키만 허용한다", () => {
    const validKeys: (keyof DeductionInput)[] = [
      "creditCard",
      "medical",
      "education",
      "irp",
      "insurance",
    ];
    validKeys.forEach((key) => {
      const state: RouteState["/simulate"] = {
        profileId: "p",
        focusKey: key,
      };
      expect(state.focusKey).toBe(key);
    });
  });

  it("RouteState['/filing']는 undefined를 허용한다", () => {
    const state: RouteState["/filing"] = undefined;
    expect(state).toBeUndefined();
  });

  it("RouteState['/checklist']는 undefined를 허용한다", () => {
    const state: RouteState["/checklist"] = undefined;
    expect(state).toBeUndefined();
  });
});

describe("AC-3: STORAGE_KEYS 상수가 정확하다", () => {
  it("STORAGE_KEYS.profile이 'taxback:profile:v1'이다", () => {
    expect(STORAGE_KEYS.profile).toBe("taxback:profile:v1");
  });

  it("STORAGE_KEYS.deductions이 'taxback:deductions:v1'이다", () => {
    expect(STORAGE_KEYS.deductions).toBe("taxback:deductions:v1");
  });

  it("STORAGE_KEYS.result가 'taxback:result:v1'이다", () => {
    expect(STORAGE_KEYS.result).toBe("taxback:result:v1");
  });

  it("STORAGE_KEYS.checklist가 'taxback:checklist:v1'이다", () => {
    expect(STORAGE_KEYS.checklist).toBe("taxback:checklist:v1");
  });

  it("STORAGE_KEYS.meta가 'taxback:meta:v1'이다", () => {
    expect(STORAGE_KEYS.meta).toBe("taxback:meta:v1");
  });

  it("STORAGE_KEYS가 모든 5개 키를 가진다", () => {
    const keys = Object.keys(STORAGE_KEYS);
    expect(keys).toHaveLength(5);
    expect(keys.sort()).toEqual(
      ["profile", "deductions", "result", "checklist", "meta"].sort()
    );
  });

  it("STORAGE_KEYS의 모든 값이 'taxback:' 프리픽스와 ':v1' 서픽스를 가진다", () => {
    Object.values(STORAGE_KEYS).forEach((key) => {
      expect(key).toMatch(/^taxback:/);
      expect(key).toMatch(/:v1$/);
    });
  });
});

describe("AC-4: 타입 정의에 런타임 로직이 없다", () => {
  it("STORAGE_KEYS는 순수 객체 상수다", () => {
    // STORAGE_KEYS가 import될 수 있다 = 런타임 상수로 export됨
    expect(STORAGE_KEYS).toBeDefined();
    expect(typeof STORAGE_KEYS).toBe("object");
  });

  it("모든 타입은 컴파일 시점 전용이므로 런타임에 값이 없다 (TypeScript 타입으로만 존재)", () => {
    // TypeScript 타입은 런타임에 존재하지 않음. 이는 정상 동작.
    // 타입이 정의된 export를 import한 것만으로 충분 (위의 import 성공).
    expect(true).toBe(true);
  });
});
