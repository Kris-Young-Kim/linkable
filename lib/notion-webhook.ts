/**
 * 에러 알림 시스템 (Notion/n8n 웹훅 연동)
 * 
 * 서비스에서 발생하는 에러를 외부 알림 시스템(n8n -> Notion)으로 전달합니다.
 */

interface ErrorAlertPayload {
  level: "error" | "warn";
  category: string;
  action: string;
  message: string;
  timestamp: string;
  userId?: string;
  url?: string;
  stack?: string;
  payload?: any;
}

/**
 * 에러 알림을 외부 웹훅으로 전송합니다.
 */
export async function sendErrorAlert(errorData: Omit<ErrorAlertPayload, "timestamp">) {
  const webhookUrl = process.env.NEXT_PUBLIC_NOTION_WEBHOOK_URL;
  
  if (!webhookUrl) {
    // 웹훅 URL이 설정되지 않은 경우 개발 모드에서만 경고 출력
    if (process.env.NODE_ENV === "development") {
      console.warn("[Notion Webhook] 알림을 전송할 웹훅 URL이 설정되지 않았습니다. (NEXT_PUBLIC_NOTION_WEBHOOK_URL)");
    }
    return;
  }

  const payload: ErrorAlertPayload = {
    ...errorData,
    timestamp: new Date().toISOString(),
    url: typeof window !== "undefined" ? window.location.href : "server-side",
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook response status: ${response.status}`);
    }

    console.log(`[Notion Webhook] 에러 알림이 성공적으로 전송되었습니다: ${errorData.action}`);
  } catch (error) {
    // 알림 전송 실패 자체가 시스템 중단으로 이어지지 않도록 예외 처리만 수행
    console.error("[Notion Webhook] 에러 알림 전송 실패:", error);
  }
}

