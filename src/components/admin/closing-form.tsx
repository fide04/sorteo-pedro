"use client";

import { useActionState, useEffect } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { setClosesAt } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ClosingForm({ closesAt }: { closesAt: string }) {
  const [state, action, pending] = useActionState(setClosesAt, null);
  useEffect(() => {
    if (state?.ok) toast.success(state.note || "Fecha de cierre guardada");
    else if (state?.error) toast.error(state.error);
  }, [state]);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div className="space-y-2">
        <Label htmlFor="closesAt">Último día para participar</Label>
        <Input id="closesAt" name="closesAt" type="date" defaultValue={closesAt} required className="h-10 w-48 [color-scheme:dark]" />
      </div>
      <Button disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <CalendarClock />} Guardar fecha
      </Button>
    </form>
  );
}
