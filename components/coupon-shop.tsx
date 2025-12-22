"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { Gift, Sparkles, ShoppingBag } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { showIncentiveToast } from "@/components/incentive-notification"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import type { Coupon } from "@/lib/incentives"

interface CouponShopProps {
  className?: string
}

/**
 * 쿠폰 샵 컴포넌트
 * 사용 가능한 쿠폰을 조회하고 발급받을 수 있습니다.
 */
export function CouponShop({ className }: CouponShopProps) {
  const { userId } = useAuth()
  const { toast } = useToast()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [userPoints, setUserPoints] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [issuingCouponId, setIssuingCouponId] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const loadData = async () => {
      try {
        const response = await fetch("/api/incentives/coupons?type=available")
        if (response.ok) {
          const data = await response.json()
          setCoupons(data.coupons || [])
          setUserPoints(data.userPoints || 0)
        }
      } catch (error) {
        console.error("[CouponShop] Load error:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [userId])

  const handleIssueCoupon = async (couponId: string, pointsCost: number = 0) => {
    if (issuingCouponId) return

    if (pointsCost > 0 && userPoints < pointsCost) {
      toast({
        title: "포인트 부족",
        description: `보유 포인트가 부족합니다. (보유: ${userPoints}포인트, 필요: ${pointsCost}포인트)`,
        variant: "destructive",
      })
      return
    }

    setIssuingCouponId(couponId)

    try {
      const response = await fetch("/api/incentives/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ couponId, pointsCost }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        showIncentiveToast(toast, "coupon_issued", undefined, data.message, data.userCoupon?.coupon?.name)
        
        // 포인트 업데이트
        if (pointsCost > 0) {
          setUserPoints((prev) => prev - pointsCost)
        }
      } else {
        toast({
          title: "쿠폰 발급 실패",
          description: data.error || "쿠폰 발급에 실패했습니다.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[CouponShop] Issue error:", error)
      toast({
        title: "오류 발생",
        description: "쿠폰 발급 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIssuingCouponId(null)
    }
  }

  const formatDiscount = (coupon: Coupon): string => {
    switch (coupon.discount_type) {
      case "percentage":
        return `${coupon.discount_value}% 할인`
      case "fixed":
        return `${coupon.discount_value.toLocaleString()}원 할인`
      case "free_shipping":
        return "무료배송"
      default:
        return "할인"
    }
  }

  if (loading) {
    return (
      <div className={className}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* 포인트 잔액 표시 */}
      <div className="mb-6 p-4 rounded-lg border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">보유 포인트</span>
          </div>
          <span className="text-2xl font-bold">{userPoints.toLocaleString()}P</span>
        </div>
      </div>

      {/* 쿠폰 목록 */}
      {coupons.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            현재 발급 가능한 쿠폰이 없습니다.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {coupons.map((coupon) => {
            const pointsCost = 0 // 포인트로 교환하는 경우 설정
            const canRedeem = pointsCost === 0 || userPoints >= pointsCost

            return (
              <Card key={coupon.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{coupon.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {coupon.description || formatDiscount(coupon)}
                      </CardDescription>
                    </div>
                    <Gift className="h-6 w-6 text-primary shrink-0" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{formatDiscount(coupon)}</Badge>
                    {coupon.min_purchase_amount > 0 && (
                      <Badge variant="outline">
                        {coupon.min_purchase_amount.toLocaleString()}원 이상 구매 시
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    유효기간: {new Date(coupon.valid_until).toLocaleDateString("ko-KR")}
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => handleIssueCoupon(coupon.id, pointsCost)}
                    disabled={!canRedeem || issuingCouponId === coupon.id}
                  >
                    {issuingCouponId === coupon.id ? (
                      <>
                        <ShoppingBag className="mr-2 h-4 w-4 animate-spin" />
                        발급 중...
                      </>
                    ) : pointsCost > 0 ? (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        {pointsCost}포인트로 교환
                      </>
                    ) : (
                      <>
                        <Gift className="mr-2 h-4 w-4" />
                        무료 발급받기
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

