"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Botón que ejecuta una server action y muestra carga. */
export function ActionButton({
  action,
  confirm: confirmText,
  done,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "onClick" | "action"> & {
  action: () => Promise<unknown>;
  confirm?: string;
  done?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      {...props}
      disabled={pending || props.disabled}
      onClick={() => {
        if (confirmText && !window.confirm(confirmText)) return;
        start(async () => {
          try {
            await action();
            if (done) toast.success(done);
          } catch {
            toast.error("Algo falló. Intenta de nuevo.");
          }
        });
      }}
    >
      {pending ? <Loader2 className="animate-spin" /> : null}
      {children}
    </Button>
  );
}
