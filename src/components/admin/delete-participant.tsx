"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteParticipant } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Borrado permanente con confirmación escribiendo la cédula (evita borrar por error). */
export function DeleteParticipant({ id, name, cedula, files }: { id: string; name: string; cedula: string; files: number }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <>
      <Button size="sm" variant="outline" className="text-destructive" onClick={() => setOpen(true)}>
        <Trash2 /> Borrar
      </Button>
      <Dialog open={open} onOpenChange={(o) => (setOpen(o), setTyped(""))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Borrar a {name} para siempre?</DialogTitle>
            <DialogDescription>
              Se borran sus datos, sus puntos y {files} {files === 1 ? "foto o video" : "fotos y videos"}, también de la galería. No se puede deshacer. Si solo
              quieres sacarla del sorteo, usa «Anular».
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm-ced">Escribe su cédula ({cedula}) para confirmar</Label>
            <Input id="confirm-ced" inputMode="numeric" value={typed} onChange={(e) => setTyped(e.target.value)} className="h-10" />
          </div>
          <Button
            variant="destructive"
            disabled={typed.trim() !== cedula || pending}
            onClick={() =>
              start(async () => {
                const r = await deleteParticipant(id);
                if (!r.ok) {
                  toast.error(r.error);
                  return;
                }
                toast.success(`${name} fue borrado`);
                setOpen(false);
                router.push("/admin");
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" /> : <Trash2 />} Borrar para siempre
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
