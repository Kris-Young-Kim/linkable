import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * UUID 생성 함수 (브라우저 호환성 고려)
 * crypto.randomUUID()가 지원되지 않는 환경을 위한 폴백 포함
 */
export function generateUUID(): string {
  // crypto.randomUUID()가 지원되는 경우 사용
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (error) {
      // 에러 발생 시 폴백 사용
      console.warn("[generateUUID] crypto.randomUUID() failed, using fallback:", error);
    }
  }

  // 폴백: 간단한 UUID v4 생성
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 인사 메시지인지 확인하는 함수
 * 단순 인사만 있는 경우 true를 반환
 */
export function isGreetingMessage(message: string): boolean {
  if (!message) return false;

  const trimmed = message.trim().toLowerCase();

  // 단순 인사 패턴
  const greetingPatterns = [
    /^안녕(하세요)?[!?.]*$/,
    /^hello[!?.]*$/i,
    /^hi[!?.]*$/i,
    /^hey[!?.]*$/i,
    /^하이[!?.]*$/i,
    /^헬로[!?.]*$/i,
    /^반가워[!?.]*$/,
    /^반갑[!?.]*$/,
    /^좋은.*(아침|점심|저녁|하루)[!?.]*$/,
    /^good.*(morning|afternoon|evening)[!?.]*$/i,
  ];

  // 패턴 매칭
  for (const pattern of greetingPatterns) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }

  // 매우 짧은 메시지 (3자 이하)도 인사로 간주
  if (trimmed.length <= 3 && /^[가-힣a-z\s!?.]+$/i.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * 채팅 종료 의도를 감지하는 함수
 * 사용자가 "종료", "끝", "완료" 등을 입력하면 true를 반환
 */
export function isChatEndingIntent(message: string): boolean {
  if (!message) return false;

  const trimmed = message.trim().toLowerCase();

  // 채팅 종료 의도 패턴
  const endingPatterns = [
    /^(종료|끝|완료|그만|마무리|끝내|종료할|끝낼|완료할|마칠)[!?.]*$/,
    /^(종료|끝|완료|그만|마무리|끝내|종료할|끝낼|완료할|마칠)\s*(해|할|하자|할까|할게|하겠|하겠어|하겠습니다|합니다|해요|할래|할게요)[!?.]*$/,
    /^(네|예|응|좋아|좋아요|알겠|알겠어|알겠습니다|알겠어요)\s*(종료|끝|완료|그만|마무리|끝내|종료할|끝낼|완료할|마칠)[!?.]*$/,
    /^(종료|끝|완료|그만|마무리|끝내|종료할|끝낼|완료할|마칠)\s*(네|예|응|좋아|좋아요|알겠|알겠어|알겠습니다|알겠어요)[!?.]*$/,
    /^(finish|end|done|stop|complete|close)[!?.]*$/i,
    /^(yes|ok|okay|sure|alright)\s*(finish|end|done|stop|complete|close)[!?.]*$/i,
    /^(finish|end|done|stop|complete|close)\s*(yes|ok|okay|sure|alright)[!?.]*$/i,
  ];

  // 패턴 매칭
  for (const pattern of endingPatterns) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }

  return false;
}
