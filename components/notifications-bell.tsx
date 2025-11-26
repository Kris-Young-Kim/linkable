"use client"

import { useState, useEffect } from "react"
import { Bell, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useLanguage } from "@/components/language-provider"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  type: string
  title: string
  message: string | null
  link_url: string | null
  is_read: boolean
  created_at: string
  metadata?: {
    recommendation_id?: string
    product_id?: string
  }
}

export function NotificationsBell() {
  const { t } = useLanguage()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const fetchNotifications = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/notifications?unreadOnly=false&limit=10")
      if (!response.ok) {
        console.warn("[Notifications] API returned non-200", response.status)
        return
      }

      const data = await response.json()
      if (data.setupRequired) {
        console.warn(
          "[Notifications] Table missing. Apply supabase/migrations/20241126100000_create_notifications_table.sql",
        )
        setNotifications([])
        setUnreadCount(0)
        return
      }

      const notifs = data.notifications ?? []
      setNotifications(notifs)
      setUnreadCount(notifs.filter((n: Notification) => !n.is_read).length)
    } catch (error) {
      console.error("[Notifications] Fetch error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    // 주기적으로 알림 새로고침 (5분마다)
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId, isRead: true }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        if (data?.setupRequired) {
          console.warn(
            "[Notifications] Cannot mark as read: notifications table missing. Apply supabase/migrations/20241126100000_create_notifications_table.sql",
          )
        }
        return
      }

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error("[Notifications] Mark as read error:", error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "오늘"
    if (diffDays === 1) return "어제"
    if (diffDays < 7) return `${diffDays}일 전`
    return date.toLocaleDateString("ko-KR")
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="알림"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-semibold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 md:w-96 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">알림</CardTitle>
              {unreadCount > 0 && (
                <Badge variant="secondary">{unreadCount}개 읽지 않음</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                로딩 중...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                알림이 없습니다
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "border-b border-border p-4 hover:bg-muted/50 transition-colors",
                      !notification.is_read && "bg-primary/5"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4
                            className={cn(
                              "text-sm font-semibold",
                              !notification.is_read && "text-foreground"
                            )}
                          >
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                          )}
                        </div>
                        {notification.message && (
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                            {notification.message}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(notification.created_at)}
                          </span>
                          <div className="flex gap-2">
                            {notification.link_url && (
                              <Link
                                href={notification.link_url}
                                onClick={() => {
                                  handleMarkAsRead(notification.id)
                                  setIsOpen(false)
                                }}
                                className="text-xs text-primary hover:underline"
                              >
                                보기
                              </Link>
                            )}
                            {!notification.is_read && (
                              <button
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="text-xs text-muted-foreground hover:text-foreground"
                                aria-label="읽음 처리"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  )
}

