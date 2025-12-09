import { useState, useCallback } from "react"
import { ToastContainer, ToastProps } from "../components/ui/toast"

let toastId = 0

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const toast = useCallback(
    (props: Omit<ToastProps, "id">) => {
      const id = `toast-${++toastId}`
      const newToast: ToastProps = { ...props, id }
      setToasts((prev) => [...prev, newToast])

      // 自动移除
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 3000)

      return id
    },
    []
  )

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const ToastProvider = () => <ToastContainer toasts={toasts} onRemove={removeToast} />

  return { toast, ToastProvider }
}

