import { auth, clerkClient } from "@clerk/nextjs/server"

export type AdminAccessResult =
  | { hasAccess: true; userId: string }
  | { hasAccess: false; reason: "not_authenticated" | "insufficient_permissions" | "error" }

export const verifyAdminAccess = async (): Promise<AdminAccessResult> => {
  const { userId } = await auth()

  if (!userId) {
    return { hasAccess: false, reason: "not_authenticated" }
  }

  try {
    const client = await clerkClient()
    const clerkUser = await client.users.getUser(userId)
    // privateMetadata에서 role 확인 (관리자 권한은 privateMetadata에 저장)
    const role = clerkUser.privateMetadata?.role as string | undefined

    if (role !== "admin" && role !== "expert") {
      return { hasAccess: false, reason: "insufficient_permissions" }
    }

    return { hasAccess: true, userId }
  } catch (error) {
    console.error("[Admin] Access verification failed:", error)
    return { hasAccess: false, reason: "error" }
  }
}


