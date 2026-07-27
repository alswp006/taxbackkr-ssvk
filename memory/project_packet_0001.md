---
name: packet-0001-types-definition
description: Packet 0001 - TypeScript 타입 + RouteState 계약 정의 (TDD 테스트 작성 완료)
metadata:
  type: project
---

## Packet 0001: TypeScript 타입 + RouteState 계약 정의

**Status**: Tests written (TDD), awaiting implementation

**Test file**: `src/__tests__/packet-0001.test.ts` (35 tests)

### What will be implemented

File: `src/lib/types.ts`

**Exports required**:
- Type `IncomeType = 'employee' | 'freelancer' | 'multi'`
- Interface `TaxProfile` with 8 fields (id, taxYear, incomeType, annualSalary, freelanceIncome, dependents, createdAt, updatedAt)
- Interface `DeductionInput` with 5 deduction fields (creditCard, medical, education, irp, insurance)
- Interface `TaxResult` with 9 fields including deductionBreakdown array
- Interface `ChecklistItem` with key union of 5 values
- Interface `ChecklistState` with items array and achievedRate
- Interface `AppMeta` with onboardingSeen and lastResultByYear Record
- Type `RouteState` mapped to 6 routes with specific state shapes
- Constant `STORAGE_KEYS` with 5 localStorage keys (profile, deductions, result, checklist, meta)

### Test Coverage (35 tests)

**AC-1: SPEC Data Models (13 tests)**
- IncomeType union validation
- TaxProfile all fields
- TaxProfile variants (employee, freelancer, multi)
- DeductionInput all fields
- TaxResult structure and refund handling
- ChecklistItem with 5 key values
- ChecklistState structure
- AppMeta with lastResultByYear

**AC-2: RouteState definitions (8 tests)**
- '/' → undefined
- '/input' → undefined | { editProfileId }
- '/result' → { profileId }
- '/simulate' → { profileId } | { profileId, focusKey }
- '/filing' → undefined
- '/checklist' → undefined
- focusKey type validation

**AC-3: STORAGE_KEYS constant (7 tests)**
- All 5 keys present
- Correct string values (taxback:*:v1 format)
- Key naming convention validation

**AC-4: Pure types (pure runtime check, 7 tests)**
- No function/logic implementations
- STORAGE_KEYS is runtime constant
- Types are compile-time only

### Test Failure State

```
error TS2305: Module '"@/lib/types"' has no exported member 'IncomeType'.
[... 8 more imports missing]
```

This is correct TDD behavior - tests fail until implementation exists.

### Next Steps

1. Implement `src/lib/types.ts` with all type definitions and STORAGE_KEYS constant
2. Run `npx tsc --noEmit` to verify types
3. Run `npx vitest run src/__tests__/packet-0001.test.ts` to pass all 35 tests
