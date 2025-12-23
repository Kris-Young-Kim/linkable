"use client"

import { SWRConfig } from "swr"
import type { ReactNode } from "react"

interface SWRProviderProps {
  children: ReactNode
}

/**
 * SWR 전역 설정 Provider
 * 
 * - 기본 fetcher 설정
 * - 재시도 전략 설정
 * - 캐시 설정
 */
export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        // 기본 fetcher: fetch API 사용
        fetcher: async (url: string) => {
          const res = await fetch(url)
          if (!res.ok) {
            const error = new Error("An error occurred while fetching the data.")
            // @ts-ignore
            error.info = await res.json().catch(() => ({}))
            // @ts-ignore
            error.status = res.status
            throw error
          }
          return res.json()
        },
        // 재시도 설정
        revalidateOnFocus: true, // 포커스 시 재검증
        revalidateOnReconnect: true, // 재연결 시 재검증
        revalidateIfStale: true, // 오래된 데이터 자동 재검증
        // 에러 재시도 설정
        errorRetryCount: 3,
        errorRetryInterval: 1000,
        // 캐시 설정
        dedupingInterval: 2000, // 2초 내 동일 요청 중복 제거
        // 폴링 설정 (필요한 경우)
        refreshInterval: 0, // 기본적으로 폴링 비활성화
      }}
    >
      {children}
    </SWRConfig>
  )
}

