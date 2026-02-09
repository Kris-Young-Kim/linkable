/**
 * 장애유형별 필터링을 위한 상수
 * ISO 9999 Subclass 코드 prefix 기반으로 제품을 필터링합니다.
 * @see core/matching/context-weights.ts DISABILITY_TYPE_WEIGHTS
 */

export const DISABILITY_TYPES = [
  {
    id: "visual",
    label: "시각장애",
    /** ISO 9999 Subclass prefixes: 시각 보조기기, 의사소통/학습(점자 등) */
    isoPrefixes: ["22 03", "12 24", "12 12", "12 15"],
  },
  {
    id: "hearing",
    label: "청각장애",
    /** ISO 9999 Subclass prefixes: 의사소통 보조기기(보청기 등) */
    isoPrefixes: ["12 12", "12 15"],
  },
  {
    id: "mobility",
    label: "이동장애",
    /** ISO 9999 Subclass prefixes: 이동, 자세, 휠체어, 보행보조 */
    isoPrefixes: ["12 03", "12 06", "12 22", "12 23"],
  },
  {
    id: "cognitive",
    label: "지적·인지장애",
    /** ISO 9999 Subclass prefixes: 학습, 의사소통, 개인보호 */
    isoPrefixes: ["12 15", "12 12", "12 18"],
  },
  {
    id: "physical",
    label: "신체장애",
    /** ISO 9999 Subclass prefixes: 식사, 가사, 개인보호 */
    isoPrefixes: ["12 09", "12 21", "12 18"],
  },
] as const;

export type DisabilityTypeId = (typeof DISABILITY_TYPES)[number]["id"];

export const DISABILITY_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  DISABILITY_TYPES.map((t) => [t.label, t.id])
);

/** 장애유형 라벨로 ISO prefix 목록 조회 */
export function getIsoPrefixesForDisabilityType(label: string): string[] | null {
  const entry = DISABILITY_TYPES.find((t) => t.label === label);
  return entry ? [...entry.isoPrefixes] : null;
}
