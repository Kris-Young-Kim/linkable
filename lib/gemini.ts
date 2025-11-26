const GEMINI_MODEL = "gemini-flash-lite-latest";
// Vision API는 v1을 사용해야 함
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent`;

type GeminiCandidate = {
  content?: {
    parts?: Array<{ text?: string }>;
  };
};

type GeminiResponse = {
  candidates?: GeminiCandidate[];
  promptFeedback?: { safetyRatings?: unknown[] };
};

const extractText = (payload: GeminiResponse) => {
  const parts = payload.candidates?.[0]?.content?.parts;
  if (!parts?.length) {
    return "";
  }
  return parts
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();
};

const extractJson = (text: string) => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || start >= end) {
    return null;
  }

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
};

export const callGemini = async (prompt: string, imageBase64?: string, mimeType?: string) => {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured");
  }

  // 이미지가 있으면 Vision API 형식으로 parts 구성
  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
    { text: prompt },
  ];

  if (imageBase64 && mimeType) {
    parts.push({
      inlineData: {
        mimeType: mimeType,
        data: imageBase64,
      },
    });
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
          parts: parts,
        },
      ],
      generationConfig: {
        temperature: 0.4,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as GeminiResponse;
  const rawText = extractText(data);
  const json = extractJson(rawText);

  return {
    rawText,
    json,
  };
};
