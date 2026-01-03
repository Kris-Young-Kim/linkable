import type { Metadata } from "next"
import { TermsContent } from "@/components/pages/terms-content"

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: "이용약관 | LinkAble",
  description: "LinkAble 서비스 이용약관 안내",
  robots: {
    index: true,
    follow: true,
  },
}

export default function TermsPage() {
  return <TermsContent />
}


