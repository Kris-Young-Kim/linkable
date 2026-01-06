import type { Metadata } from "next";
import { UserProfile } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "프로필 설정 - LinkAble",
  description: "LinkAble 프로필 및 계정 설정",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProfilePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-4xl">
        <UserProfile
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-lg",
            },
          }}
          routing="path"
          path="/profile"
          additionalOAuthScopes={{
            google: ["email", "profile"],
            kakao: ["profile_nickname", "account_email"],
            apple: ["email", "name"],
          }}
        />
      </div>
    </div>
  );
}
