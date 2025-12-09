"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const STORAGE_KEYS = {
  contrast: "accessibility:contrast",
  font: "accessibility:font",
};

export function AccessibilityControls() {
  const [isOpen, setIsOpen] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [largeFont, setLargeFont] = useState(false);

  // 초기값 로드
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedContrast = localStorage.getItem(STORAGE_KEYS.contrast);
    const storedFont = localStorage.getItem(STORAGE_KEYS.font);
    if (storedContrast === "high") {
      setHighContrast(true);
      document.documentElement.setAttribute("data-contrast", "high");
    }
    if (storedFont === "large") {
      setLargeFont(true);
      document.documentElement.setAttribute("data-font", "large");
    }
  }, []);

  // 상태 변경 시 DOM & 로컬스토리지 반영
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (highContrast) {
      document.documentElement.setAttribute("data-contrast", "high");
      localStorage.setItem(STORAGE_KEYS.contrast, "high");
    } else {
      document.documentElement.removeAttribute("data-contrast");
      localStorage.removeItem(STORAGE_KEYS.contrast);
    }
  }, [highContrast]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (largeFont) {
      document.documentElement.setAttribute("data-font", "large");
      localStorage.setItem(STORAGE_KEYS.font, "large");
    } else {
      document.documentElement.removeAttribute("data-font");
      localStorage.removeItem(STORAGE_KEYS.font);
    }
  }, [largeFont]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <div className="w-[260px] rounded-lg border bg-card p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <Label className="text-sm font-semibold">고대비 모드</Label>
              <p className="text-xs text-muted-foreground">
                대비를 높여 가시성을 개선합니다.
              </p>
            </div>
            <Switch
              checked={highContrast}
              onCheckedChange={(checked) => setHighContrast(checked)}
              aria-label="고대비 모드 토글"
            />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <Label className="text-sm font-semibold">글자 키우기</Label>
              <p className="text-xs text-muted-foreground">
                본문 글꼴 크기를 키워 읽기 쉽게 합니다.
              </p>
            </div>
            <Switch
              checked={largeFont}
              onCheckedChange={(checked) => setLargeFont(checked)}
              aria-label="글자 크기 확대 토글"
            />
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                setHighContrast(false);
                setLargeFont(false);
              }}
            >
              초기화
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              aria-label="접기"
            >
              닫기
            </Button>
          </div>
        </div>
      )}

      <Button
        className="h-12 w-12 rounded-full shadow-lg"
        variant="default"
        aria-label="접근성 패널 열기"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {isOpen ? "×" : "A"}
      </Button>
    </div>
  );
}

