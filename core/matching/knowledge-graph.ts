/**
 * 전문가 지식 그래프 기반 ICF-ISO 매칭
 *
 * ICF 코드 간 관계와 ISO 코드 간 관계를 그래프로 모델링하여
 * 복잡한 조합에 대한 추론을 수행합니다.
 */

import type { IsoMatch } from "./iso-mapping";
import { findIcfCode } from "../assessment/icf-codes";

export type RelationshipType =
  | "direct"
  | "indirect"
  | "contextual"
  | "contraindicated";
export type EvidenceSource =
  | "expert"
  | "literature"
  | "usage"
  | "feedback"
  | "standard";

interface IcfIsoRelationship {
  icfCode: string;
  isoCode: string;
  relationshipType: RelationshipType;
  strength: number; // 0-1
  evidence: {
    source: EvidenceSource;
    confidence: number; // 0-1
    citation?: string;
  };
  context?: {
    ageGroup?: string[];
    disabilityType?: string[];
    environment?: string[];
  };
}

interface IcfIsoNode {
  code: string;
  type: "icf" | "iso";
  neighbors: Map<string, IcfIsoEdge>;
}

interface IcfIsoEdge {
  target: string;
  relationship: IcfIsoRelationship;
  weight: number;
}

/**
 * 전문가 지식 기반 관계 그래프
 * 실제 운영 시에는 데이터베이스나 벡터 DB에 저장
 */
const knowledgeGraph: IcfIsoRelationship[] = [
  // 직접적 관계 (강한 연결)
  {
    icfCode: "b765",
    isoCode: "15 09",
    relationshipType: "direct",
    strength: 0.95,
    evidence: {
      source: "expert",
      confidence: 0.9,
      citation: "ISO 9999:2022, Class 15",
    },
  },
  {
    icfCode: "d550",
    isoCode: "15 09",
    relationshipType: "direct",
    strength: 0.9,
    evidence: {
      source: "standard",
      confidence: 0.95,
    },
  },
  {
    icfCode: "d450",
    isoCode: "12 06",
    relationshipType: "direct",
    strength: 0.88,
    evidence: {
      source: "expert",
      confidence: 0.85,
    },
  },
  {
    icfCode: "e120",
    isoCode: "18 30",
    relationshipType: "direct",
    strength: 0.92,
    evidence: {
      source: "standard",
      confidence: 0.9,
    },
  },
  // 간접적 관계 (약한 연결)
  {
    icfCode: "b730",
    isoCode: "12 31",
    relationshipType: "indirect",
    strength: 0.75,
    evidence: {
      source: "expert",
      confidence: 0.7,
    },
  },
  // 컨텍스트 기반 관계
  {
    icfCode: "b210",
    isoCode: "22 03",
    relationshipType: "contextual",
    strength: 0.85,
    evidence: {
      source: "usage",
      confidence: 0.8,
    },
    context: {
      ageGroup: ["elderly"],
    },
  },
  // 금기 관계 (이 조합은 피해야 함)
  {
    icfCode: "b235",
    isoCode: "12 06",
    relationshipType: "contraindicated",
    strength: -0.5, // 음수는 금기
    evidence: {
      source: "expert",
      confidence: 0.9,
    },
  },
];

/**
 * 그래프 기반 ISO 코드 추론
 */
export function inferIsoFromGraph(
  icfCodes: string[],
  userContext?: {
    ageGroup?: string;
    disabilityType?: string;
    environment?: string;
  }
): IsoMatch[] {
  const matches = new Map<string, IsoMatch>();

  // 1. 직접 연결 찾기
  for (const icfCode of icfCodes) {
    for (const relation of knowledgeGraph) {
      if (
        relation.icfCode === icfCode &&
        relation.relationshipType !== "contraindicated"
      ) {
        const match = buildMatchFromRelation(relation, [icfCode], userContext);
        if (match) {
          const existing = matches.get(relation.isoCode);
          if (!existing || match.score > existing.score) {
            matches.set(relation.isoCode, match);
          }
        }
      }
    }
  }

  // 2. 간접 연결 추론 (2-hop)
  const indirectMatches = inferIndirectRelations(icfCodes, userContext);
  for (const match of indirectMatches) {
    const existing = matches.get(match.isoCode);
    if (!existing || match.score > existing.score) {
      matches.set(match.isoCode, match);
    }
  }

  // 3. 컨텍스트 기반 필터링
  const filtered = Array.from(matches.values()).filter((match) => {
    return !isContraindicated(match.isoCode, icfCodes);
  });

  return filtered.sort((a, b) => b.score - a.score);
}

/**
 * 관계로부터 IsoMatch 객체 생성
 */
function buildMatchFromRelation(
  relation: IcfIsoRelationship,
  matchedIcfCodes: string[],
  userContext?: {
    ageGroup?: string;
    disabilityType?: string;
    environment?: string;
  }
): IsoMatch | null {
  // 컨텍스트 필터링
  if (relation.context) {
    if (relation.context.ageGroup && userContext?.ageGroup) {
      if (!relation.context.ageGroup.includes(userContext.ageGroup)) {
        return null;
      }
    }
    // 다른 컨텍스트 필터도 적용 가능
  }

  // 금기 관계는 제외
  if (relation.relationshipType === "contraindicated") {
    return null;
  }

  const icfMeta = matchedIcfCodes
    .map((code) => findIcfCode(code))
    .filter((meta): meta is NonNullable<typeof meta> => Boolean(meta));

  // 관계 강도와 증거 신뢰도를 결합한 점수
  const baseScore = relation.strength * relation.evidence.confidence;

  // 관계 타입에 따른 가중치
  const typeWeight = {
    direct: 1.0,
    indirect: 0.8,
    contextual: 0.9,
    contraindicated: 0,
  }[relation.relationshipType];

  return {
    isoCode: relation.isoCode,
    label: getIsoLabel(relation.isoCode),
    description: getIsoDescription(relation.isoCode),
    score: baseScore * typeWeight,
    matchedIcf: icfMeta.map((meta) => ({
      code: meta.code,
      description: meta.description,
    })),
    reason: buildGraphReason(relation, matchedIcfCodes),
  };
}

/**
 * 간접 관계 추론 (2-hop, 3-hop)
 */
function inferIndirectRelations(
  icfCodes: string[],
  userContext?: {
    ageGroup?: string;
    disabilityType?: string;
    environment?: string;
  }
): IsoMatch[] {
  const matches: IsoMatch[] = [];

  // ICF 코드 간 공통 ISO 코드 찾기
  const isoCodeMap = new Map<string, string[]>(); // ISO 코드 -> 관련 ICF 코드들

  for (const icfCode of icfCodes) {
    for (const relation of knowledgeGraph) {
      if (
        relation.icfCode === icfCode &&
        relation.relationshipType !== "contraindicated"
      ) {
        const existing = isoCodeMap.get(relation.isoCode) || [];
        existing.push(icfCode);
        isoCodeMap.set(relation.isoCode, existing);
      }
    }
  }

  // 여러 ICF 코드와 연결된 ISO 코드는 더 높은 신뢰도
  for (const [isoCode, relatedIcfCodes] of isoCodeMap.entries()) {
    if (relatedIcfCodes.length >= 2) {
      // 여러 ICF 코드가 같은 ISO를 가리키면 강한 신호
      const relation = knowledgeGraph.find((r) => r.isoCode === isoCode);
      if (relation) {
        const match = buildMatchFromRelation(
          relation,
          relatedIcfCodes,
          userContext
        );
        if (match) {
          // 여러 ICF 코드와 연결되면 점수 보너스
          match.score = Math.min(match.score * 1.2, 1.0);
          matches.push(match);
        }
      }
    }
  }

  return matches;
}

/**
 * 금기 관계 확인
 */
function isContraindicated(isoCode: string, icfCodes: string[]): boolean {
  return knowledgeGraph.some(
    (relation) =>
      relation.isoCode === isoCode &&
      relation.relationshipType === "contraindicated" &&
      icfCodes.includes(relation.icfCode)
  );
}

/**
 * 그래프 기반 이유 생성
 */
function buildGraphReason(
  relation: IcfIsoRelationship,
  matchedIcfCodes: string[]
): string {
  const icfDesc = matchedIcfCodes
    .map((code) => {
      const meta = findIcfCode(code);
      return meta ? `${code}(${meta.description})` : code;
    })
    .join(" + ");

  const relationTypeText = {
    direct: "직접적",
    indirect: "간접적",
    contextual: "컨텍스트 기반",
    contraindicated: "금기",
  }[relation.relationshipType];

  const evidenceText = {
    expert: "전문가 지식",
    literature: "문헌 연구",
    usage: "사용 사례",
    feedback: "사용자 피드백",
    standard: "표준 문서",
  }[relation.evidence.source];

  return `${icfDesc}와 ${
    relation.isoCode
  }는 ${relationTypeText} 관계입니다 (${evidenceText} 기반, 신뢰도: ${(
    relation.evidence.confidence * 100
  ).toFixed(0)}%)`;
}

/**
 * ISO 코드로부터 라벨 가져오기 (실제로는 DB 또는 매핑 테이블에서)
 */
function getIsoLabel(isoCode: string): string {
  // 실제 구현 시 ISO 코드 매핑 테이블에서 조회
  // 임시로 하드코딩
  const labels: Record<string, string> = {
    "15 09": "식사 및 음주 보조기기",
    "12 06": "양팔 조작 보행 보조기기",
    "18 30": "수직 접근성 보조기기",
    "12 31": "체위 변경 보조기기",
    "22 03": "시각 보조기기",
  };
  return labels[isoCode] || `ISO ${isoCode}`;
}

/**
 * ISO 코드로부터 설명 가져오기
 */
function getIsoDescription(isoCode: string): string {
  const descriptions: Record<string, string> = {
    "15 09": "식사와 음주 활동을 돕는 보조기기",
    "12 06": "양팔로 조작하는 보행 보조기기",
    "18 30": "문턱이나 계단을 해소해 이동을 돕는 보조기기",
    "12 31": "체위 변경을 돕는 보조기기",
    "22 03": "시각 기능 보조를 위한 기기",
  };
  return descriptions[isoCode] || `ISO ${isoCode} 보조기기`;
}

/**
 * 그래프 관계 추가 (학습용)
 */
export function addGraphRelation(relation: IcfIsoRelationship): void {
  knowledgeGraph.push(relation);
}

/**
 * 그래프 관계 업데이트 (피드백 기반)
 */
export function updateGraphRelation(
  icfCode: string,
  isoCode: string,
  feedback: "positive" | "negative"
): void {
  const relation = knowledgeGraph.find(
    (r) => r.icfCode === icfCode && r.isoCode === isoCode
  );

  if (relation) {
    if (feedback === "positive") {
      relation.strength = Math.min(relation.strength + 0.05, 1.0);
      relation.evidence.confidence = Math.min(
        relation.evidence.confidence + 0.02,
        1.0
      );
    } else {
      relation.strength = Math.max(relation.strength - 0.1, 0.1);
    }
  }
}
