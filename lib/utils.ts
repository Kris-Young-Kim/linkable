import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Windows PowerShell에서 한글 깨짐 방지를 위한 UTF-8 인코딩 설정
 * Node.js 스크립트 시작 부분에서 호출 권장
 */
export function ensureUTF8Output(): void {
  if (process.platform === 'win32') {
    // 콘솔 인코딩을 UTF-8로 설정
    if (process.stdout.setEncoding) {
      process.stdout.setEncoding('utf8');
    }
    // process.stdout에 직접 UTF-8 설정 (Node.js 12+)
    if (typeof process.stdout._handle !== 'undefined' && process.stdout._handle.setEncoding) {
      process.stdout._handle.setEncoding('utf8');
    }
    // stderr도 동일하게 설정
    if (process.stderr.setEncoding) {
      process.stderr.setEncoding('utf8');
    }
    if (typeof process.stderr._handle !== 'undefined' && process.stderr._handle.setEncoding) {
      process.stderr._handle.setEncoding('utf8');
    }
  }
}

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

/**
 * 시각 보조기기 즉시 추천 의도를 감지하는 함수
 * 사용자가 화면 낭독기, 시각 보조기기 등을 요청하면 true를 반환
 */
export function isVisualAidRequestIntent(message: string): boolean {
  if (!message) return false;

  const trimmed = message.trim().toLowerCase();

  // 시각 보조기기 요청 패턴
  const visualAidPatterns = [
    // 화면 낭독 관련
    /화면\s*낭독/gi,
    /낭독\s*소프트웨어/gi,
    /낭독\s*프로그램/gi,
    /screen\s*reader/gi,
    /text\s*to\s*speech/gi,
    /tts/gi,

    // 시각 보조기기 일반
    /시각\s*보조기기/gi,
    /시각\s*장애\s*기기/gi,
    /시각\s*장애\s*도구/gi,
    /visual\s*aid/gi,
    /visual\s*assistive/gi,

    // 확대 관련
    /화면\s*확대/gi,
    /돋보기\s*소프트웨어/gi,
    /magnifier/gi,
    /zoom\s*software/gi,

    // 점자 관련
    /점자\s*디스플레이/gi,
    /점자\s*단말기/gi,
    /braille\s*display/gi,

    // 시각장애 키워드 + 요청
    /(시각장애|실명|맹인|저시력|시력\s*장애).*(추천|알려|소개|필요|사용)/gi,
    /(시각장애|실명|맹인|저시력|시력\s*장애).*(기기|도구|소프트웨어|프로그램)/gi,
  ];

  // 패턴 매칭
  for (const pattern of visualAidPatterns) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }

  return false;
}
