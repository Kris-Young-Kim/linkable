/**
 * ISO 9999 Class(대분류) 필터 옵션
 * 06 보조기 및 보철물은 제외
 * @see docs/iso-9999-class-catalog.md
 */

export const ISO_CLASSES = [
  { code: "04", label: "04 생리적, 심리적 기능을 측정, 자극 또는 훈련하기 위한 보조기구", shortLabel: "04 생리·심리" },
  { code: "09", label: "09 자가 관리 활동 및 자가 관리 참여를 위한 보조기구", shortLabel: "09 자가관리" },
  { code: "12", label: "12 개인 이동 및 운송과 관련된 활동 및 참여를 위한 보조기구", shortLabel: "12 이동·운송" },
  { code: "15", label: "15 가사 활동 및 가사 생활 참여를 위한 보조기구", shortLabel: "15 가사" },
  { code: "18", label: "18 인간이 만든 실내 및 실외 환경에서 활동을 지원하기 위한 가구, 비품 및 기타 보조기구", shortLabel: "18 가구·비품" },
  { code: "22", label: "22 통신 및 정보 관리를 위한 보조기구", shortLabel: "22 통신·정보" },
  { code: "24", label: "24 물체 및 장치를 제어, 운반, 이동 및 취급하기 위한 보조기구", shortLabel: "24 물체·장치" },
  { code: "27", label: "27 물리적 환경의 요소를 제어, 적응 또는 측정하기 위한 보조기구", shortLabel: "27 환경" },
  { code: "28", label: "28 업무 활동 및 고용 참여를 위한 보조기구", shortLabel: "28 업무" },
  { code: "30", label: "30 레크리에이션 및 레저용 보조기구", shortLabel: "30 레저" },
] as const;

export type IsoCategory = { code: string; label: string; shortLabel: string };

/** Class 코드로 ISO prefix 조회 (필터링용) */
export function getIsoPrefixForClass(code: string): string | null {
  const entry = ISO_CLASSES.find((c) => c.code === code);
  return entry ? `${entry.code} ` : null;
}
