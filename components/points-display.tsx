"use client"

import { useAuth } from "@clerk/nextjs"
import { Sparkles, Gift } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { usePoints, useUserCoupons } from "@/lib/api-hooks"

interface PointsDisplayProps {
  showCoupons?: boolean
  className?: string
}

/**
 * 포인트 표시 컴포넌트
 * 사용자 포인트와 쿠폰을 표시합니다.
 * SWR을 사용하여 데이터를 캐싱하고 자동으로 재검증합니다.
 */
export function PointsDisplay({ showCoupons = true, className }: PointsDisplayProps) {
  const { userId } = useAuth()
  const { points, isLoading: pointsLoading } = usePoints()
  const { coupons, isLoading: couponsLoading } = useUserCoupons()

  const loading = pointsLoading || (showCoupons && couponsLoading)

  if (loading) {
    return (
      <div className={className}>
        <Skeleton className="h-6 w-20" />
      </div>
    )
  }

  if (!userId) {
    return null
  }

  return (
    <div className={className}>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-semibold">{points.toLocaleString()}P</span>
            {showCoupons && coupons.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {coupons.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">포인트 잔액</h4>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{points.toLocaleString()}포인트</span>
              </div>
            </div>

            {showCoupons && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  보유 쿠폰 ({coupons.length}개)
                </h4>
                {coupons.length === 0 ? (
                  <p className="text-sm text-muted-foreground">보유한 쿠폰이 없습니다.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {coupons.map((userCoupon) => (
                      <div
                        key={userCoupon.id}
                        className="p-3 rounded-lg border bg-card text-sm"
                      >
                        <div className="font-medium">{userCoupon.coupon?.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {userCoupon.coupon?.description}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          만료: {new Date(userCoupon.expires_at).toLocaleDateString("ko-KR")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                포인트는 추천 클릭, K-IPPA 평가, 피드백 제출 시 적립됩니다.
              </p>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

