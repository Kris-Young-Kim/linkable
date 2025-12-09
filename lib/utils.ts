import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
