import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog"

export function useConfirm() {
  const [open, setOpen] = useState(false)
  const [config, setConfig] = useState<{
    title: string
    description?: string
    onConfirm: () => void
  } | null>(null)

  const confirm = (
    title: string,
    description?: string
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfig({
        title,
        description,
        onConfirm: () => {
          resolve(true)
          setOpen(false)
        },
      })
      setOpen(true)
    })
  }

  const handleCancel = () => {
    setOpen(false)
    setConfig(null)
  }

  const ConfirmDialog = () => {
    if (!config) return null

    return (
      <AlertDialog open={open} onOpenChange={(open) => {
        if (!open) handleCancel()
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{config.title}</AlertDialogTitle>
            {config.description && (
              <AlertDialogDescription>{config.description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction onClick={config.onConfirm}>
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  return { confirm, ConfirmDialog }
}

