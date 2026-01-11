/**
 * SEO 유틸리티 함수
 * 
 * 메타데이터 및 구조화된 데이터 생성을 위한 헬퍼 함수
 */

/**
 * 특수 문자를 HTML 엔티티로 이스케이프
 * 
 * @param text 이스케이프할 텍스트
 * @returns 이스케이프된 텍스트
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }
  
  return text.replace(/[&<>"']/g, (char) => map[char] || char)
}

/**
 * 메타데이터 title/description에서 특수 문자 이스케이프
 * Next.js Metadata API는 자동으로 이스케이프하지만, 
 * 일부 특수 문자(예: em dash —)는 명시적으로 처리 필요
 * 
 * @param text 원본 텍스트
 * @returns 이스케이프된 텍스트
 */
export function escapeMetadata(text: string): string {
  // HTML 엔티티 변환
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/**
 * URL에서 안전한 문자열 생성 (SEO 친화적)
 * 
 * @param text 원본 텍스트
 * @returns URL 안전 문자열
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // 특수 문자 제거
    .replace(/[\s_-]+/g, "-") // 공백/언더스코어를 하이픈으로
    .replace(/^-+|-+$/g, "") // 앞뒤 하이픈 제거
}
