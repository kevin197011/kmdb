import { X } from "lucide-react"
import { cn } from "../../lib/utils"

export interface ToastProps {
  id: string
  title?: string
  description?: string
  variant?: "default" | "success" | "error" | "warning"
  onClose?: () => void
}

export function Toast({ title, description, variant = "default", onClose }: ToastProps) {
  const variantStyles = {
    default: "bg-white border-gray-200",
    success: "bg-green-50 border-green-200",
    error: "bg-red-50 border-red-200",
    warning: "bg-yellow-50 border-yellow-200",
  }

  const textStyles = {
    default: "text-gray-900",
    success: "text-green-900",
    error: "text-red-900",
    warning: "text-yellow-900",
  }

  return (
    <div
      className={cn(
        "pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg border shadow-lg",
        variantStyles[variant]
      )}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-1">
            {title && (
              <p className={cn("text-sm font-semibold", textStyles[variant])}>
                {title}
              </p>
            )}
            {description && (
              <p className={cn("mt-1 text-sm", textStyles[variant])}>
                {description}
              </p>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className={cn(
                "ml-4 inline-flex rounded-md p-1.5 transition-colors hover:bg-black/5 focus:outline-none",
                textStyles[variant]
              )}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function ToastContainer({ toasts, onRemove }: { toasts: ToastProps[]; onRemove: (id: string) => void }) {
  return (
    <div className="pointer-events-none fixed bottom-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={() => onRemove(toast.id)} />
      ))}
    </div>
  )
}

