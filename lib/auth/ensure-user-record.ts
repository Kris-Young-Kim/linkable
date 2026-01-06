/**
 * 사용자 레코드가 없으면 자동 생성하는 공통 함수
 *
 * 이메일 중복 처리:
 * - 같은 이메일의 사용자가 이미 존재하면 기존 사용자 ID 반환
 * - clerk_id가 다르면 업데이트 (같은 사용자가 다른 소셜 로그인으로 접속한 경우)
 */

import { currentUser } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/logging";

export async function ensureUserRecord(clerkUserId: string): Promise<string> {
  // System-level operation: use server client to bypass RLS
  const supabase = getSupabaseServerClient();

  // 1. clerk_id로 먼저 확인
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkUserId)
    .single();

  if (data?.id) {
    return data.id;
  }

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  // 2. Clerk에서 사용자 정보 가져오기
  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    `${clerkUserId}@linkable.local`;

  const fullName = user?.fullName ?? user?.username ?? null;

  // Clerk 메타데이터에서 role 가져오기 (있으면)
  const role = (user?.publicMetadata?.role as string) || "user";

  // 3. 이메일로 이미 존재하는 사용자 확인 (중복 방지)
  const { data: existingByEmail } = await supabase
    .from("users")
    .select("id, clerk_id")
    .eq("email", email)
    .maybeSingle();

  // 4. 같은 이메일의 사용자가 이미 존재하는 경우
  if (existingByEmail?.id) {
    // clerk_id가 다르면 업데이트 (같은 사용자가 다른 소셜 로그인으로 접속한 경우)
    if (existingByEmail.clerk_id !== clerkUserId) {
      const { error: updateError } = await supabase
        .from("users")
        .update({ clerk_id: clerkUserId })
        .eq("id", existingByEmail.id);

      if (updateError) {
        console.error(
          "[ensureUserRecord] Failed to update clerk_id:",
          updateError
        );
        // 업데이트 실패해도 기존 사용자 ID 반환
      } else {
        logEvent({
          category: "system",
          action: "user_clerk_id_updated",
          payload: {
            userId: existingByEmail.id,
            oldClerkId: existingByEmail.clerk_id,
            newClerkId: clerkUserId,
          },
        });
      }
    }
    return existingByEmail.id;
  }

  // 5. 새 사용자 생성 시도
  const { data: insertData, error: insertError } = await supabase
    .from("users")
    .insert({
      clerk_id: clerkUserId,
      email,
      name: fullName,
      role,
    })
    .select("id")
    .single();

  if (insertError) {
    // 6. 중복 키 에러 (23505)인 경우 이메일로 다시 조회
    if (
      insertError.code === "23505" &&
      insertError.message?.includes("email")
    ) {
      console.warn(
        "[ensureUserRecord] Email duplicate detected, fetching existing user:",
        email
      );
      const { data: existingUser } = await supabase
        .from("users")
        .select("id, clerk_id")
        .eq("email", email)
        .maybeSingle();

      if (existingUser?.id) {
        // clerk_id 업데이트 시도
        if (existingUser.clerk_id !== clerkUserId) {
          const { error: updateError } = await supabase
            .from("users")
            .update({ clerk_id: clerkUserId })
            .eq("id", existingUser.id);

          if (updateError) {
            console.error(
              "[ensureUserRecord] Failed to update clerk_id after duplicate:",
              updateError
            );
          } else {
            logEvent({
              category: "system",
              action: "user_clerk_id_updated",
              payload: {
                userId: existingUser.id,
                oldClerkId: existingUser.clerk_id,
                newClerkId: clerkUserId,
              },
            });
          }
        }
        return existingUser.id;
      }
    }
    throw insertError;
  }

  logEvent({
    category: "system",
    action: "user_created",
    payload: { clerkUserId },
  });

  return insertData.id;
}
