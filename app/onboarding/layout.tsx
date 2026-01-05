import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "온보딩 - LinkAble",
  description: "LinkAble에 오신 것을 환영합니다. 역할을 선택해주세요.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
