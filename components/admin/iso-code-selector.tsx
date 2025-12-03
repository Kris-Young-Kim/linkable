"use client"

import { useState, useEffect, useMemo } from "react"
import { Check, ChevronsUpDown, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

type IsoCode = {
  iso: string
  label: string
  description: string
}

type IsoCodeSelectorProps = {
  value?: string
  onValueChange: (value: string) => void
  suggestions?: Array<{ iso: string; label: string; description: string }>
  className?: string
}

export function IsoCodeSelector({
  value,
  onValueChange,
  suggestions = [],
  className,
}: IsoCodeSelectorProps) {
  const [open, setOpen] = useState(false)
  const [isoCodes, setIsoCodes] = useState<IsoCode[]>([])

  useEffect(() => {
    // ISO 코드 목록 로드
    fetch("/api/admin/iso-codes")
      .then((res) => res.json())
      .then((data) => {
        if (data.isoCodes) {
          setIsoCodes(data.isoCodes)
        }
      })
      .catch((error) => {
        console.error("[ISO Code Selector] Failed to load ISO codes:", error)
      })
  }, [])

  const selectedIso = useMemo(() => {
    return isoCodes.find((code) => code.iso === value) || null
  }, [isoCodes, value])

  // 추천 항목을 맨 위에 표시
  const sortedIsoCodes = useMemo(() => {
    const suggestionIsos = new Set(suggestions.map((s) => s.iso))
    const withSuggestions = isoCodes.filter((code) => suggestionIsos.has(code.iso))
    const withoutSuggestions = isoCodes.filter((code) => !suggestionIsos.has(code.iso))
    return [...withSuggestions, ...withoutSuggestions]
  }, [isoCodes, suggestions])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {selectedIso ? (
            <div className="flex items-center gap-2">
              <span className="font-medium">ISO {selectedIso.iso}</span>
              <span className="text-muted-foreground text-sm">- {selectedIso.label}</span>
            </div>
          ) : (
            "ISO 코드 선택..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="ISO 코드 또는 설명 검색..." />
          <CommandList>
            <CommandEmpty>ISO 코드를 찾을 수 없습니다.</CommandEmpty>
            {suggestions.length > 0 && (
              <CommandGroup heading="추천">
                {suggestions.map((suggestion) => (
                  <CommandItem
                    key={suggestion.iso}
                    value={`${suggestion.iso} ${suggestion.label} ${suggestion.description}`}
                    onSelect={() => {
                      onValueChange(suggestion.iso)
                      setOpen(false)
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === suggestion.iso ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">ISO {suggestion.iso}</span>
                        <Badge variant="secondary" className="text-xs">
                          <Sparkles className="mr-1 h-3 w-3" />
                          추천
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {suggestion.label}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandGroup heading="전체 ISO 코드">
              {sortedIsoCodes.map((code) => {
                const isSuggestion = suggestions.some((s) => s.iso === code.iso)
                return (
                  <CommandItem
                    key={code.iso}
                    value={`${code.iso} ${code.label} ${code.description}`}
                    onSelect={() => {
                      onValueChange(code.iso)
                      setOpen(false)
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === code.iso ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">ISO {code.iso}</span>
                        {isSuggestion && (
                          <Badge variant="secondary" className="text-xs">
                            <Sparkles className="mr-1 h-3 w-3" />
                            추천
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {code.label}
                      </span>
                      <span className="text-xs text-muted-foreground/70">
                        {code.description}
                      </span>
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

