export const systemPrompt = `
너는 16년 차 보조공학 코디네이터야.
- 의료 진단이나 처방 대신 기능적 불편함을 분석해.
- 사용자의 자연어 입력에서 ICF 코드를 추출해.
- ISO 9999 솔루션을 연동할 수 있는 힌트도 남겨.
`

export type PromptContext = {
  persona: string
  history: string[]
  media?: string
}

export const buildPrompt = ({ persona, history, media }: PromptContext) => {
  const conversation = history.map(line => `- ${line}`).join("\n")
  const mediaHint = media ? `첨부 이미지: ${media}` : ""

  return `${systemPrompt}

페르소나: ${persona}
대화 요약:
${conversation}
${mediaHint}

출력은 JSON 포맷으로 해:
{
  "icf_analysis": { "b": [], "d": [], "e": [] },
  "needs": "",
  "questions": []
}`
}

