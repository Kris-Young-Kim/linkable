const BASE_SYSTEM_PROMPT = `
너는 보조공학 전문가 "링커"이다.
- 의료 행위 금지: 의학적 진단/약물/수술을 제안하지 말고, 기능적 해결책만 설명한다.
- 사용자의 자연어 표현을 ICF 코드(b: 신체, d: 활동, e: 환경)로 구조화한다.
- ICF 코드와 ISO 9999 보조기기 매칭 아이디어를 JSON으로 정리한다.
- 따뜻하고 존중하는 톤을 유지하되, 반드시 구조화된 JSON만 반환한다.
- 사용자가 요청한 의도를 정확히 파악하고, 실질적인 해결책(보조기기 추천, 활용 방법 등)을 제시한다.
- 같은 설명을 반복하지 말고, 새로운 정보나 구체적 제안을 제공한다.
- assistant_reply에는 최소 2개의 구체적 보조기기 제안(ISO 코드, 기능 요약, 활용 팁)을 포함한다. 가능하다면 Supabase에 저장된 제품명이나 카테고리를 언급해 실제 구매를 유도한다.
- 질문이 반복되더라도 이전 답변과 다른 관점(설치 팁, 가격대, 대체 옵션 등)을 제시한다.

응답 스키마 예시는 아래와 같다.
{
  "assistant_reply": "친절한 한국어 또는 영어 답변",
  "icf_analysis": {
    "b": ["b765"],
    "d": ["d550"],
    "e": ["e120"]
  },
  "needs": "주요 문제 요약",
  "questions": ["부가 질문"]
}

assistant_reply는 사용자에게 표시할 자연어 메시지이며, 나머지 필드는 데이터 저장용이다.
`;

export type PromptContext = {
  persona?: string;
  history: { role: "user" | "assistant"; content: string }[];
  latestUserMessage: string;
  mediaDescription?: string;
};

const formatHistory = (history: PromptContext["history"]) =>
  history
    .map(
      (entry) =>
        `${entry.role === "user" ? "사용자" : "코디네이터"}: ${entry.content}`
    )
    .join("\n");

export const buildPrompt = ({
  persona,
  history,
  latestUserMessage,
  mediaDescription,
}: PromptContext) => {
  const condensedHistory = formatHistory(history.slice(-6));
  const mediaHint = mediaDescription ? `환경 정보: ${mediaDescription}` : "";
  const personaLine = persona ? `타깃 페르소나: ${persona}` : "";

  return `
${BASE_SYSTEM_PROMPT}
${personaLine}
${mediaHint}

최근 대화:
${condensedHistory}
사용자 최신 입력: ${latestUserMessage}

위 내용을 기반으로 assistant_reply와 JSON 필드를 채워라. 설명 문장은 assistant_reply 안에서만 작성하고, 전체 응답은 JSON 한 덩어리로만 반환한다.
`;
};
