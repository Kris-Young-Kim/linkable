"use client";

import { useCallback, useState, useEffect, type ReactNode } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, ShoppingCart, Package, Sparkles, Star } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useAuth } from "@clerk/nextjs";
import { trackEvent } from "@/lib/analytics";
import type { CtaVariant } from "@/lib/cta-ab-testing";
import { useToast } from "@/hooks/use-toast";
import { showIncentiveToast } from "@/components/incentive-notification";
import { InlineSpinner } from "@/components/ui/loading-states";
import { RecommendationFeedbackButton } from "@/components/recommendation-feedback-button";

type ClickSource = "primary" | "secondary";

interface ProductRecommendationCardProps {
  productName: string;
  functionalSupport: string;
  description: string;
  imageUrl?: string;
  matchReason?: string;
  matchScore?: number;
  isoCode?: string;
  isoLabel?: string | null;
  matchedIcf?: Array<{ code: string; description: string }>;
  price?: number | string | null;
  purchaseLink?: string | null;
  recommendationId?: string | null;
  consultationId?: string | null;
  adminActions?: ReactNode;
  rating?: number | null;
  reviewCount?: number | null;
}

export function ProductRecommendationCard({
  productName,
  functionalSupport,
  description,
  imageUrl,
  matchReason,
  matchScore,
  isoCode,
  isoLabel,
  matchedIcf,
  price,
  purchaseLink,
  recommendationId,
  consultationId,
  adminActions,
  rating,
  reviewCount,
}: ProductRecommendationCardProps) {
  const { t } = useLanguage();
  const { userId } = useAuth();
  const { toast } = useToast();
  const matchPercentage = matchScore
    ? `${Math.round(matchScore * 100)}%`
    : null;

  const [pendingSource, setPendingSource] = useState<ClickSource | null>(null);
  const [ctaVariant, setCtaVariant] = useState<CtaVariant | null>(null);
  const [impressionLogged, setImpressionLogged] = useState(false);
  const [impressionTime, setImpressionTime] = useState<number | null>(null);

  // CTA 변형 할당 및 노출 로깅
  useEffect(() => {
    let mounted = true;

    const loadCtaVariant = async () => {
      try {
        // 활성화된 테스트 설정 조회
        const { getActiveCtaAbTestConfig } = await import(
          "@/lib/cta-ab-testing-client"
        );
        const testConfig = await getActiveCtaAbTestConfig();

        if (testConfig && mounted) {
          // 변형 할당
          const { assignCtaVariant } = await import("@/lib/cta-ab-testing-client");
          const variant = await assignCtaVariant(
            testConfig.id,
            userId || undefined,
            consultationId || undefined
          );

          if (variant && mounted) {
            setCtaVariant(variant);

            // 노출 로깅
            const impressionStartTime = Date.now();
            setImpressionTime(impressionStartTime);

            const { logCtaPerformance } = await import("@/lib/cta-ab-testing-client");
            await logCtaPerformance(variant.id, "impression", {
              userId: userId || undefined,
              consultationId: consultationId || undefined,
              recommendationId: recommendationId || undefined,
              screenSize:
                window.innerWidth < 768
                  ? "mobile"
                  : window.innerWidth < 1024
                    ? "tablet"
                    : "desktop",
              userAgent: navigator.userAgent,
            });

            setImpressionLogged(true);
          }
        }
      } catch (error) {
        console.error(
          "[ProductRecommendationCard] CTA variant load failed:",
          error
        );
      }
    };

    loadCtaVariant();

    return () => {
      mounted = false;
    };
  }, [userId, consultationId, recommendationId]);

  const handleClick = useCallback(
    async (
      source: ClickSource,
      buttonType: "primary" | "secondary" | "tertiary" = "primary"
    ) => {
      // 기존 구매 링크 로직
      if (!purchaseLink) {
        return;
      }

      const openLink = () => {
        // 접근성: 외부 링크 열기 전 스크린 리더에 알림
        const liveRegion = document.getElementById("aria-live-region");
        if (liveRegion) {
          liveRegion.textContent = `${productName} 상품 페이지로 이동합니다 (새 창)`;
          setTimeout(() => {
            if (liveRegion) liveRegion.textContent = "";
          }, 1000);
        }
        window.open(purchaseLink, "_blank", "noopener,noreferrer");
      };

      if (!recommendationId) {
        openLink();
        return;
      }

      setPendingSource(source);

      try {
        // CTA 성능 로깅
        if (ctaVariant && impressionTime) {
          const timeToClick = Date.now() - impressionTime;
          const scrollPosition =
            (window.scrollY /
              (document.documentElement.scrollHeight - window.innerHeight)) *
            100;

          const eventType =
            buttonType === "primary"
              ? "primary_click"
              : buttonType === "secondary"
                ? "secondary_click"
                : "tertiary_click";

          const { logCtaPerformance } = await import("@/lib/cta-ab-testing-client");
          await logCtaPerformance(ctaVariant.id, eventType, {
            userId: userId || undefined,
            consultationId: consultationId || undefined,
            recommendationId: recommendationId || undefined,
            timeToClickMs: timeToClick,
            scrollPosition: Math.min(100, Math.max(0, scrollPosition)),
            viewportPosition:
              scrollPosition < 33
                ? "top"
                : scrollPosition < 66
                  ? "middle"
                  : "bottom",
            screenSize:
              window.innerWidth < 768
                ? "mobile"
                : window.innerWidth < 1024
                  ? "tablet"
                  : "desktop",
            userAgent: navigator.userAgent,
          });
        }

        const clickResponse = await fetch(
          `/api/recommendations/${recommendationId}/click`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ source }),
          }
        );

        // 포인트 적립 알림 표시
        if (clickResponse.ok) {
          try {
            const data = await clickResponse.json();
            if (data.pointsEarned && data.pointsEarned > 0) {
              showIncentiveToast(toast, "points_earned", data.pointsEarned);
            }
          } catch (err) {
            // 응답 파싱 실패는 무시
          }
        }

        // GA4 이벤트 추적
        trackEvent("product_clicked", {
          product_name: productName,
          recommendation_id: recommendationId,
          source: source,
          cta_variant: ctaVariant?.name,
        });

        // Meta Pixel 이벤트 추적 (구매 링크 클릭)
        if (typeof window !== "undefined" && window.fbq) {
          window.fbq("track", "InitiateCheckout", {
            content_name: productName,
            content_ids: [recommendationId],
            value: price || 0,
            currency: "KRW",
          });
        }
      } catch (error) {
        console.error("[recommendations] click_track_error", error);
      } finally {
        setPendingSource(null);
        openLink();
      }
    },
    [
      purchaseLink,
      recommendationId,
      productName,
      isoCode,
      ctaVariant,
      impressionTime,
      userId,
      consultationId,
      toast,
    ]
  );

  const isPrimaryPending = pendingSource === "primary";
  const isSecondaryPending = pendingSource === "secondary";
  const isButtonDisabled = !purchaseLink;

  // 아이콘 컴포넌트 동적 로드
  const getIcon = (iconName?: string) => {
    if (!iconName) return null;
    switch (iconName) {
      case "ExternalLink":
        return <ExternalLink className="mr-2 h-5 w-5" aria-hidden="true" />;
      case "ShoppingCart":
        return <ShoppingCart className="mr-2 h-5 w-5" aria-hidden="true" />;
      default:
        return null;
    }
  };

  // CTA 버튼 렌더링 (A/B 테스트 변형 적용)
  const renderCtaButtons = (variant: CtaVariant | null) => {
    // 기본값 (변형이 없을 때)
    if (!variant) {
      return (
        <div className="flex gap-3 w-full">
          <Button
            className="flex-1 min-h-[44px]"
            size="lg"
            type="button"
            onClick={() => handleClick("primary", "primary")}
            disabled={isButtonDisabled || isPrimaryPending}
            aria-disabled={isButtonDisabled}
            aria-label={
              purchaseLink
                ? `${productName} 상품 정보 보기 (외부 링크)`
                : `${productName} 상품 정보 (링크 없음)`
            }
          >
            {isPrimaryPending ? (
              <>
                <InlineSpinner size="sm" className="mr-2" />
                {t("recommendations.loading") || "처리 중..."}
              </>
            ) : (
              <>
                <ExternalLink className="mr-2 h-5 w-5" aria-hidden="true" />
                {purchaseLink
                  ? t("recommendations.learnMore")
                  : t("recommendations.noLink")}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            className="flex-1 min-h-[44px] bg-transparent"
            size="lg"
            type="button"
            onClick={() => handleClick("secondary", "secondary")}
            disabled={isButtonDisabled || isSecondaryPending}
            aria-disabled={isButtonDisabled}
            aria-label={
              purchaseLink
                ? `${productName} 구매하기 (외부 링크)`
                : `${productName} 구매하기 (링크 없음)`
            }
          >
            {isSecondaryPending ? (
              <>
                <InlineSpinner size="sm" className="mr-2" />
                {t("recommendations.loading") || "처리 중..."}
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-5 w-5" aria-hidden="true" />
                {purchaseLink
                  ? t("recommendations.buyNow")
                  : t("recommendations.noLink")}
              </>
            )}
          </Button>
        </div>
      );
    }

    // A/B 테스트 변형 적용
    const primaryButtonClass = variant.primary_button_color
      ? `${variant.primary_button_color} hover:opacity-90`
      : "";
    const secondaryButtonClass = variant.secondary_button_color
      ? `${variant.secondary_button_color} hover:opacity-90`
      : "";

    // 버튼 크기 매핑 (md -> default, xl -> lg)
    const mapButtonSize = (size: "sm" | "md" | "lg" | "xl"): "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg" | undefined => {
      if (size === "md") return "default";
      if (size === "xl") return "lg";
      if (size === "sm") return "sm";
      if (size === "lg") return "lg";
      return undefined;
    };

    return (
      <div className="flex flex-col gap-3 w-full">
        {/* 긴급성 텍스트 */}
        {variant.show_urgency_text && variant.urgency_text && (
          <p className="text-sm font-medium text-primary text-center animate-pulse">
            {variant.urgency_text}
          </p>
        )}

        {/* 가격 강조 */}
        {variant.show_price_highlight && price && (
          <div className="text-center">
            <span className="text-2xl font-bold text-primary">
              {typeof price === "number"
                ? price.toLocaleString()
                : String(price)}
              원
            </span>
          </div>
        )}

        {/* 버튼 그룹 */}
        <div className="flex gap-3 w-full">
          {/* 주요 버튼 */}
          <Button
            className={`flex-1 min-h-[44px] ${primaryButtonClass}`}
            size={mapButtonSize(variant.primary_button_size)}
            variant={variant.primary_button_variant as any}
            type="button"
            onClick={() => handleClick("primary", "primary")}
            disabled={isButtonDisabled || isPrimaryPending}
            aria-disabled={isButtonDisabled}
            aria-label={
              purchaseLink
                ? `${productName} ${variant.primary_button_text} (외부 링크)`
                : `${productName} ${variant.primary_button_text} (링크 없음)`
            }
          >
            {isPrimaryPending ? (
              <>
                <InlineSpinner size="sm" className="mr-2" />
                {t("recommendations.loading") || "처리 중..."}
              </>
            ) : (
              <>
                {getIcon(variant.primary_button_icon)}
                {variant.primary_button_text}
              </>
            )}
          </Button>

          {/* 보조 버튼 */}
          <Button
            variant={variant.secondary_button_variant as any}
            className={`flex-1 min-h-[44px] ${secondaryButtonClass}`}
            size={mapButtonSize(variant.secondary_button_size)}
            type="button"
            onClick={() => handleClick("secondary", "secondary")}
            disabled={isButtonDisabled || isSecondaryPending}
            aria-disabled={isButtonDisabled}
            aria-label={
              purchaseLink
                ? `${productName} ${variant.secondary_button_text} (외부 링크)`
                : `${productName} ${variant.secondary_button_text} (링크 없음)`
            }
          >
            {isSecondaryPending ? (
              <>
                <InlineSpinner size="sm" className="mr-2" />
                {t("recommendations.loading") || "처리 중..."}
              </>
            ) : (
              <>
                {getIcon(variant.secondary_button_icon)}
                {variant.secondary_button_text}
              </>
            )}
          </Button>
        </div>

        {/* 세 번째 버튼 (있는 경우) */}
        {variant.tertiary_button_text && (
          <Button
            variant="ghost"
            className="w-full"
            size="default"
            type="button"
            onClick={() => handleClick("secondary", "tertiary")}
            disabled={isButtonDisabled}
          >
            {variant.tertiary_button_text}
          </Button>
        )}
      </div>
    );
  };

  return (
    <Card className="group border-2 border-border/50 hover:border-primary/40 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 bg-gradient-to-br from-card to-card/95 relative overflow-hidden">
      {matchScore && matchScore >= 0.85 && (
        <div className="absolute top-0 right-0 z-20">
          <div className="bg-primary text-primary-foreground text-[10px] font-black px-3 py-1 rounded-bl-xl shadow-md flex items-center gap-1.5 animate-pulse">
            <Sparkles className="size-3" />
            AI RECOMMENDED
          </div>
        </div>
      )}
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="flex-1">
            <CardTitle className="text-xl md:text-2xl font-black tracking-tight text-foreground group-hover:text-primary transition-colors">
              {productName}
            </CardTitle>
            <CardDescription className="text-base font-medium text-muted-foreground/80 mt-1">
              {isoLabel || functionalSupport}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            {isoCode && (
              <Badge
                variant="secondary"
                className="shrink-0 bg-primary/10 text-primary border border-primary/20 font-bold px-2.5"
              >
                ISO {isoCode}
              </Badge>
            )}
            {adminActions}
          </div>
        </div>
      </CardHeader>

      {imageUrl ? (
        <div className="px-6 relative aspect-video w-full overflow-hidden rounded-lg bg-muted/50 group">
          <Image
            src={imageUrl}
            alt={productName}
            fill
            className="object-cover rounded-lg transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            loading="lazy"
            quality={95}
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
          />
          {/* 이미지 오버레이 그라데이션 (선택적) */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none rounded-lg" />
        </div>
      ) : (
        <div className="px-6 aspect-video w-full flex items-center justify-center bg-muted rounded-lg">
          <Package
            className="size-12 text-muted-foreground/50"
            aria-hidden="true"
          />
        </div>
      )}

      <CardContent className="pt-6 space-y-4">
        {/* 가격 및 리뷰 정보 */}
        <div className="flex items-center justify-between gap-4 pb-2 border-b">
          {price && (
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">
                {typeof price === "number"
                  ? price.toLocaleString("ko-KR")
                  : price}
              </span>
              <span className="text-sm text-muted-foreground">원</span>
            </div>
          )}
          {(rating !== null && rating !== undefined) || (reviewCount !== null && reviewCount !== undefined) ? (
            <div className="flex items-center gap-2">
              {rating !== null && rating !== undefined && (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-semibold">{rating.toFixed(1)}</span>
                </div>
              )}
              {reviewCount !== null && reviewCount !== undefined && reviewCount > 0 && (
                <span className="text-sm text-muted-foreground">
                  ({reviewCount.toLocaleString("ko-KR")})
                </span>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2">
          {matchPercentage && (
            <Badge variant="outline" className="text-sm">
              {t("recommendations.matchScore")} {matchPercentage}
            </Badge>
          )}
          {/* 포인트 적립 안내 */}
          <Badge
            variant="secondary"
            className="text-xs bg-primary/10 text-primary border-primary/20"
          >
            <Sparkles className="mr-1 h-3 w-3" />
            클릭 시 10P 적립
          </Badge>
        </div>
        <p className="text-base text-muted-foreground leading-relaxed">
          {description}
        </p>

        {matchedIcf?.length ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">
              연관 ICF 코드
            </p>
            <div className="flex flex-wrap gap-2">
              {matchedIcf.map((item) => (
                <Badge key={item.code} variant="outline" className="text-xs">
                  {item.code} · {item.description}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        {matchReason && (
          <p className="text-sm text-foreground/80 leading-relaxed">
            {matchReason}
          </p>
        )}
      </CardContent>

      {/* CTA 버튼 영역 (A/B 테스트 변형 적용) */}
      {ctaVariant?.position === "top" && (
        <CardFooter className="flex flex-col gap-3 border-b">
          {renderCtaButtons(ctaVariant)}
        </CardFooter>
      )}

      {ctaVariant?.position === "middle" && (
        <CardContent className="flex flex-col gap-3 border-y">
          {renderCtaButtons(ctaVariant)}
        </CardContent>
      )}

      {(!ctaVariant || ctaVariant.position === "bottom") && (
        <CardFooter
          className={
            ctaVariant?.position === "sticky"
              ? "sticky bottom-0 bg-card border-t z-10"
              : "flex flex-col gap-3"
          }
        >
          {renderCtaButtons(ctaVariant)}
          {recommendationId && (
            <div className="flex justify-end mt-2">
              <RecommendationFeedbackButton
                recommendationId={recommendationId}
                productName={productName}
              />
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
