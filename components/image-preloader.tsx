"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

/**
 * 메인 페이지 Hero 섹션 이미지 프리로더
 * LCP 개선을 위해 중요한 이미지들을 미리 로드합니다.
 * 메인 페이지(/)에서만 실행됩니다.
 */
export function ImagePreloader() {
  const pathname = usePathname()
  
  useEffect(() => {
    // 메인 페이지가 아니면 preload하지 않음
    if (pathname !== "/") {
      return
    }

    // ✅ preload된 link 태그들을 추적하기 위한 배열
    const preloadedLinks: HTMLLinkElement[] = []

    // Hero 섹션 배경 이미지 (가장 중요)
    const preloadImage = (href: string, priority: "high" | "low" = "high") => {
      const link = document.createElement("link")
      link.rel = "preload"
      link.as = "image"
      link.href = href
      link.setAttribute("fetchpriority", priority)
      document.head.appendChild(link)
      preloadedLinks.push(link)
    }

    // Hero 섹션 배경 이미지 (LCP 후보)
    preloadImage(
      "https://images.unsplash.com/photo-1762264643661-d889726815cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4MTYyMzB8MHwxfHNlYXJjaHwxfHxmdXR1cmlzdGljJTIwY2l0eSUyMGFic3RyYWN0JTIwYnJpZ2h0fGVufDB8MHx8fDE3NjUxNTkwMzN8MA&ixlib=rb-4.1.0&q=80&w=1920",
      "high"
    )

    // Hero 섹션 첫 번째 보조기기 이미지
    preloadImage(
      "https://images.unsplash.com/photo-1723433892471-62f113c8c9a0?auto=format&fit=crop&w=600&q=80",
      "high"
    )

    // Hero 섹션 첫 3개 보조기기 이미지 (Above the fold)
    preloadImage(
      "https://images.unsplash.com/photo-1576864333223-db90dadfb975?auto=format&fit=crop&w=600&q=80",
      "high"
    )
    preloadImage(
      "https://images.unsplash.com/photo-1668983396705-3aa5deed5569?auto=format&fit=crop&w=600&q=80",
      "high"
    )
    preloadImage(
      "https://images.unsplash.com/photo-1695654402339-050e6aee866b?auto=format&fit=crop&w=600&q=80",
      "high"
    )

    // 나머지 이미지는 낮은 우선순위로 프리로드
    preloadImage(
      "https://images.unsplash.com/photo-1585244129648-5dc1f9cd9d7a?auto=format&fit=crop&w=600&q=80",
      "low"
    )
    preloadImage(
      "https://images.unsplash.com/photo-1651326659270-59bbb788199a?auto=format&fit=crop&w=600&q=80",
      "low"
    )

    // ✅ cleanup 함수: 컴포넌트 언마운트 시 또는 pathname 변경 시 이전 link 태그 제거
    return () => {
      preloadedLinks.forEach(link => {
        if (link.parentNode) {
          link.parentNode.removeChild(link)
        }
      })
    }
  }, [pathname])

  return null
}
