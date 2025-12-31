/**
 * 이메일 발송 유틸리티
 * Resend API를 사용하여 이메일을 발송합니다.
 */

interface EmailOptions {
  to: string
  subject: string
  html: string
  from?: string
}

/**
 * 이메일 발송 함수
 * Resend API를 사용하여 이메일을 발송합니다.
 */
export async function sendEmail({ to, subject, html, from }: EmailOptions): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY

  if (!resendApiKey) {
    console.warn("[Email] RESEND_API_KEY가 설정되지 않았습니다. 이메일 발송을 건너뜁니다.")
    return false
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: from || process.env.EMAIL_FROM || "LinkAble <noreply@linkable.kr>",
        to,
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[Email] 이메일 발송 실패:", {
        status: response.status,
        error: errorData,
      })
      return false
    }

    const data = await response.json()
    console.log(`[Email] 이메일 발송 성공: ${to}`, { id: data.id })
    return true
  } catch (error) {
    console.error("[Email] 이메일 발송 중 오류:", error)
    return false
  }
}

/**
 * K-IPPA 평가 요청 이메일 템플릿
 */
export function generateIppaReminderEmail(productName: string, evaluationLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>보조기기 사용 후 평가 요청</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">LinkAble</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">보조기기 사용 후 평가를 진행해 주세요</h2>
    
    <p style="color: #666; font-size: 16px;">
      안녕하세요, LinkAble입니다.
    </p>
    
    <p style="color: #666; font-size: 16px;">
      <strong>${productName}</strong>을(를) 사용하신 지 일주일이 지났습니다. 
      사용 경험을 공유해 주시면 더 나은 추천을 제공하는 데 도움이 됩니다.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${evaluationLink}" 
         style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
        평가하기
      </a>
    </div>
    
    <p style="color: #999; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
      평가를 완료하시면 포인트를 적립해 드립니다.<br>
      이 이메일은 자동으로 발송되었습니다.
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
    <p>© 2025 LinkAble. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim()
}
