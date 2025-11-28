"use client"

import { Edit2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useCallback } from "react"

type CardActionButtonsProps = {
  onEdit?: () => void
  onDelete?: () => void
  editLabel?: string
  deleteLabel?: string
  confirmDeleteMessage?: string
  isEditDisabled?: boolean
  isDeleteDisabled?: boolean
  className?: string
  size?: "sm" | "md"
}

export function CardActionButtons({
  onEdit,
  onDelete,
  editLabel = "수정",
  deleteLabel = "삭제",
  confirmDeleteMessage,
  isEditDisabled,
  isDeleteDisabled,
  className,
  size = "md",
}: CardActionButtonsProps) {
  const buttonSize = size === "sm" ? "h-8 w-8" : "h-9 w-9"

  const handleDelete = useCallback(() => {
    if (!onDelete || isDeleteDisabled) {
      return
    }

    if (confirmDeleteMessage && !window.confirm(confirmDeleteMessage)) {
      return
    }

    onDelete()
  }, [confirmDeleteMessage, onDelete, isDeleteDisabled])

  if (!onEdit && !onDelete) {
    return null
  }

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {onEdit && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={editLabel}
              className={cn(buttonSize)}
              onClick={() => {
                if (!isEditDisabled) {
                  onEdit()
                }
              }}
              disabled={isEditDisabled}
            >
              <Edit2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{editLabel}</TooltipContent>
        </Tooltip>
      )}
      {onDelete && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={deleteLabel}
              className={cn(buttonSize, "text-destructive hover:text-destructive")}
              onClick={handleDelete}
              disabled={isDeleteDisabled}
            >
              <Trash2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{deleteLabel}</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}


