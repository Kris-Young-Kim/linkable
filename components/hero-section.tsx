import { Fragment } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { CTAButton, CTAButtonSecondary } from "@/components/ui/cta-button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { getTranslation, type Language } from "@/lib/translations"

const heroAssistiveImages = [
  {
    src: "https://images.unsplash.com/photo-1723433892471-62f113c8c9a0?auto=format&fit=crop&w=600&q=80",
    alt: "Caregiver assisting an older adult at home",
  },
  {
    src: "https://images.unsplash.com/photo-1585244129648-5dc1f9cd9d7a?auto=format&fit=crop&w=600&q=80",
    alt: "Medical equipment arranged on a table",
  },
  {
    src: "https://images.unsplash.com/photo-1651326659270-59bbb788199a?auto=format&fit=crop&w=600&q=80",
    alt: "Modern wheelchair on white background",
  },
  {
    src: "https://images.unsplash.com/photo-1576864333223-db90dadfb975?auto=format&fit=crop&w=600&q=80",
    alt: "Therapist helping a patient exercise",
  },
  {
    src: "https://images.unsplash.com/photo-1668983396705-3aa5deed5569?auto=format&fit=crop&w=600&q=80",
    alt: "Assistive walking rail in bright clinic",
  },
  {
    src: "https://images.unsplash.com/photo-1695654402339-050e6aee866b?auto=format&fit=crop&w=600&q=80",
    alt: "Care professional supporting a user outdoors",
  },
  {
    src: "https://images.unsplash.com/photo-1609113160023-4e31f3765fd7?auto=format&fit=crop&w=600&q=80",
    alt: "Friendly caregiver smiling with patient",
  },
  {
    src: "https://images.unsplash.com/photo-1642680936843-b09109c69104?auto=format&fit=crop&w=600&q=80",
    alt: "Assistive grab bars installed in bathroom",
  },
  {
    src: "https://images.unsplash.com/photo-1584289247071-4cd2a7648f54?auto=format&fit=crop&w=600&q=80",
    alt: "Technician maintaining mobility equipment",
  },
  {
    src: "https://images.unsplash.com/photo-1603695690725-28ba287dd333?auto=format&fit=crop&w=600&q=80",
    alt: "Person using adaptive tablet holder",
  },
]

interface HeroSectionProps {
  language?: Language
}

export function HeroSection({ language = "ko" }: HeroSectionProps) {
  const t = (key: string) => getTranslation(language, key)

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#fff3e0] via-[#fff8f0] to-[#eef7f4] py-20 md:py-32">
      <div className="absolute inset-0" aria-hidden="true">
        {/* 배경 이미지 */}
        <div className="absolute inset-0 opacity-30">
          <Image
            src="https://images.unsplash.com/photo-1762264643661-d889726815cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4MTYyMzB8MHwxfHNlYXJjaHwxfHxmdXR1cmlzdGljJTIwY2l0eSUyMGFic3RyYWN0JTIwYnJpZ2h0fGVufDB8MHx8fDE3NjUxNTkwMzN8MA&ixlib=rb-4.1.0&q=80&w=1920"
            alt="Futuristic abstract cityscape background"
            fill
            className="object-cover brightness-150 contrast-110 saturate-110 animate-fadeIn animate-float"
            priority
            quality={85}
            sizes="100vw"
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
          />
        </div>
        {/* 이미지 오버레이 - 텍스트 가독성 향상 */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/40 to-white/50" />
        {/* 기존 그라데이션 효과 */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/80 to-transparent" />
        <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(255,188,153,0.4),_transparent_55%)] blur-3xl animate-softGlow" />
        <div className="absolute -bottom-24 -right-12 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(144,224,239,0.35),_transparent_55%)] blur-2xl animate-softGlow delay-500" />
        {/* 추가 애니메이션 효과 - 미래적 느낌 */}
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-[radial-gradient(circle,_rgba(99,102,241,0.2),_transparent_70%)] blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(168,85,247,0.15),_transparent_70%)] blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
      </div>
      <div className="container relative mx-auto px-4 md:px-6">
        <div className="mx-auto max-w-4xl text-center space-y-8">
          <div className="flex flex-col gap-4">
            <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
              {t("hero.title")} <span className="text-primary">{t("hero.titleHighlight")}</span>
            </h1>
            <p className="text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
              {t("hero.subtitle")
                .split("\n")
                .map((line, index, arr) => (
                  <Fragment key={index}>
                    {line}
                    {index < arr.length - 1 && <br />}
                  </Fragment>
                ))}
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <CTAButton
              variant="chat"
              href="/chat"
              size="lg"
              className="shadow-xl shadow-primary/30 transition-transform hover:-translate-y-0.5"
            >
              {t("hero.getStarted")}
            </CTAButton>
            <CTAButtonSecondary
              variant="custom"
              href="/products"
              size="lg"
              showArrow={false}
              className="border-2 border-primary/20 bg-white/70 backdrop-blur hover:border-primary hover:bg-primary/10"
            >
              {t("hero.learnMore")}
            </CTAButtonSecondary>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-white/80 px-3 py-1 shadow-sm">
              <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium">{t("hero.icfCertified")}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-white/80 px-3 py-1 shadow-sm">
              <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium">{t("hero.isoStandards")}</span>
            </div>
          </div>
        </div>

        {/* Assistive device showcase */}
        <div className="mt-16 overflow-hidden rounded-3xl border border-white/70 bg-white/70 p-4 shadow-2xl backdrop-blur">
          <div className="flex min-w-[200%] gap-4 animate-scrollRight">
            {[...heroAssistiveImages, ...heroAssistiveImages].map((image, index) => (
              <div
                key={`${image.src}-${index}`}
                className="relative h-32 w-48 flex-shrink-0 overflow-hidden rounded-2xl border border-primary/10 bg-muted"
                aria-hidden="true"
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 192px, 192px"
                  loading={index < 3 ? "eager" : "lazy"}
                  priority={index < 3}
                  quality={80}
                  placeholder="blur"
                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
