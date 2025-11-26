const GEMINI_TEXT_MODEL = "gemini-flash-lite-latest";
const GEMINI_VISION_MODEL = "gemini-1.5-flash-latest";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com";

const buildEndpoint = (model: string) => `${GEMINI_BASE_URL}/v1/models/${model}:generateContent`;

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

  const isVisionRequest = Boolean(imageBase64 && mimeType);

  if (imageBase64 && mimeType) {
    parts.push({
      inlineData: {
        mimeType: mimeType,
        data: imageBase64,
      },
    });
  }

  const endpoint = buildEndpoint(isVisionRequest ? GEMINI_VISION_MODEL : GEMINI_TEXT_MODEL);

  const response = await fetch(`${endpoint}?key=${apiKey}`, {
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
