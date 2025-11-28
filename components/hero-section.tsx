"use client"

import { Fragment } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/components/language-provider"

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

export function HeroSection() {
  const { t } = useLanguage()

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#fff3e0] via-[#fff8f0] to-[#eef7f4] py-20 md:py-32">
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/80 to-transparent" />
        <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(255,188,153,0.4),_transparent_55%)] blur-3xl animate-softGlow" />
        <div className="absolute -bottom-24 -right-12 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(144,224,239,0.35),_transparent_55%)] blur-2xl animate-softGlow delay-500" />
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
            <Button
              size="lg"
              className="min-h-[48px] px-8 text-base font-semibold shadow-xl shadow-primary/30 transition-transform hover:-translate-y-0.5"
              asChild
            >
              <Link href="/chat">
                {t("hero.getStarted")}
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="min-h-[48px] border-2 border-primary/20 bg-white/70 px-8 text-base font-semibold backdrop-blur hover:border-primary hover:bg-primary/10"
              asChild
            >
              <Link href="#how-it-works">{t("hero.learnMore")}</Link>
            </Button>
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
                className="h-32 w-48 flex-shrink-0 overflow-hidden rounded-2xl border border-primary/10 bg-muted"
                aria-hidden="true"
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
