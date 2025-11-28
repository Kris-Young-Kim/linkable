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
    const role = clerkUser.publicMetadata?.role as string | undefined

    if (role !== "admin" && role !== "expert") {
      return { hasAccess: false, reason: "insufficient_permissions" }
    }

    return { hasAccess: true, userId }
  } catch (error) {
    console.error("[Admin] Access verification failed:", error)
    return { hasAccess: false, reason: "error" }
  }
}


