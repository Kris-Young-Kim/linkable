import type { Metadata } from "next"
import { PrivacyContent } from "@/components/pages/privacy-content"

export const metadata: Metadata = {
  title: "개인정보 처리방침 | LinkAble",
  description: "LinkAble 서비스의 개인정보 처리방침입니다.",
}

export default function PrivacyPage() {
  return <PrivacyContent />
}


