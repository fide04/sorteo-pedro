"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createStore } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewStoreForm() {
  const [state, action, pending] = useActionState(createStore, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.error === "") {
      toast.success("Tienda creada");
      ref.current?.reset();
    } else if (state?.error) toast.error(state.error);
  }, [state]);
  return (
    <form ref={ref} action={action} className="flex flex-wrap gap-2">
      <Input name="name" placeholder="CC Sambil" required className="h-10 min-w-48 flex-1" />
      <Input name="city" placeholder="Ciudad (opcional)" className="h-10 w-40" />
      <Button disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Plus />} Agregar</Button>
    </form>
  );
}
