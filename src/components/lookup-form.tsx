"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { forgetMe, lookup } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PassportView } from "@/components/passport-view";
import type { Passport } from "@/lib/types";

export function LookupForm({ initial }: { initial: Passport | null }) {
  const [passport, setPassport] = useState(initial);
  // al actualizarse en vivo (puntos aprobados), tomamos los datos nuevos del servidor
  useEffect(() => {
    if (initial) setPassport(initial);
  }, [initial]);
  const [cedula, setCedula] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  if (passport)
    return (
      <div className="pt-16">
        <PassportView passport={passport} />
        <Button
          variant="link"
          className="text-muted-foreground mt-6 w-full"
          onClick={async () => {
            await forgetMe();
            setPassport(null);
          }}
        >
          Cerrar sesión en este teléfono
        </Button>
      </div>
    );

  return (
    <form
      className="bg-card space-y-4 rounded-lg border p-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        start(async () => {
          const r = await lookup({ cedula, phone });
          if (r.ok) setPassport(r.passport);
          else setError(r.error);
        });
      }}
    >
      <p className="text-muted-foreground">Usa la cédula y el teléfono con los que te registraste en la tienda.</p>
      <div className="space-y-2">
        <Label htmlFor="c">Cédula</Label>
        <Input id="c" inputMode="numeric" value={cedula} onChange={(e) => setCedula(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="t">Teléfono</Label>
        <Input id="t" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
      </div>
      <Button variant="cta" size="lg" className="w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} Ver mis puntos
      </Button>
      {error && (
        <p role="alert" className="text-destructive text-sm font-semibold">
          {error}
        </p>
      )}
    </form>
  );
}
