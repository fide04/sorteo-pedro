"use client";
import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      position="top-center"
      richColors
      toastOptions={{ style: { background: "var(--popover)", border: "1px solid var(--border)" } }}
      {...props}
    />
  );
}
