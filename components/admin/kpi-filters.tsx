"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export type DateRange = "today" | "7days" | "30days" | "90days" | "1year" | "custom"
export type UserGroup = "all" | "active" | "ippa_completed"

interface KPIFiltersProps {
  dateRange: DateRange
  userGroup: UserGroup
  onDateRangeChange: (range: DateRange) => void
  onUserGroupChange: (group: UserGroup) => void
  onReset: () => void
}

export function KPIFilters({
  dateRange,
  userGroup,
  onDateRangeChange,
  onUserGroupChange,
  onReset,
}: KPIFiltersProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">기간:</span>
            <Select value={dateRange} onValueChange={onDateRangeChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">오늘</SelectItem>
                <SelectItem value="7days">최근 7일</SelectItem>
                <SelectItem value="30days">최근 30일</SelectItem>
                <SelectItem value="90days">최근 90일</SelectItem>
                <SelectItem value="1year">최근 1년</SelectItem>
                <SelectItem value="custom">사용자 지정</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">사용자 그룹:</span>
            <Select value={userGroup} onValueChange={onUserGroupChange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 사용자</SelectItem>
                <SelectItem value="active">활성 사용자</SelectItem>
                <SelectItem value="ippa_completed">K-IPPA 완료</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="ml-auto"
          >
            <X className="h-4 w-4 mr-1" />
            초기화
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

