import type { Metadata } from "next"
import { AboutContent } from "@/components/pages/about-content"

export const metadata: Metadata = {
  title: "회사 소개 | LinkAble",
  description: "LinkAble 프로젝트의 취지와 개발 동기를 소개합니다.",
}

export default function AboutPage() {
  return <AboutContent />
}


