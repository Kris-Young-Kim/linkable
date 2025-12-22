import { Metadata } from "next"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { CouponShop } from "@/components/coupon-shop"
import { Breadcrumbs } from "@/components/navigation/breadcrumbs"

export const metadata: Metadata = {
  title: "쿠폰 샵 — LinkAble",
  description: "포인트로 쿠폰을 교환하거나 무료 쿠폰을 발급받으세요.",
}

export default async function CouponsPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in?redirect_url=/dashboard/coupons")
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs
          className="mb-6"
          items={[
            { translationKey: "breadcrumbs.dashboard", href: "/dashboard" },
            { label: "쿠폰 샵" },
          ]}
        />
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">쿠폰 샵</h1>
          <p className="text-muted-foreground mt-2">
            포인트로 쿠폰을 교환하거나 무료 쿠폰을 발급받으세요.
          </p>
        </div>

        <CouponShop />
      </div>
    </div>
  )
}

