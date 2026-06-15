"use client"

import { Toaster as SonnerToaster } from "sonner"

export { toast } from "sonner"

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      richColors
      closeButton
      toastOptions={{
        style: {
          borderRadius: "0.75rem",
          fontSize: "0.9rem",
          fontWeight: 500,
        },
      }}
    />
  )
}
