const GEMINI_MODEL = "gemini-1.5-flash"
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

type GeminiCandidate = {
  content?: {
    parts?: Array<{ text?: string }>
  }
}

type GeminiResponse = {
  candidates?: GeminiCandidate[]
  promptFeedback?: { safetyRatings?: unknown[] }
}

const extractText = (payload: GeminiResponse) => {
  const parts = payload.candidates?.[0]?.content?.parts
  if (!parts?.length) {
    return ""
  }
  return parts
    .map((part) => part.text ?? "")
    .join("\n")
    .trim()
}

const extractJson = (text: string) => {
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")

  if (start === -1 || end === -1 || start >= end) {
    return null
  }

  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
}

export const callGemini = async (prompt: string) => {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured")
  }

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 1024,
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error: ${response.status} ${errorText}`)
  }

  const data = (await response.json()) as GeminiResponse
  const rawText = extractText(data)
  const json = extractJson(rawText)

  return {
    rawText,
    json,
  }
}

