"use client";

import { useActionState } from "react";
import { Loader2, Lock } from "lucide-react";
import { login } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const [state, action, pending] = useActionState(login, { error: "" });
  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <Lock className="text-secondary size-8" />
          <CardTitle>Panel del sorteo</CardTitle>
          <CardDescription>Acceso solo para las 2 cuentas autorizadas de TechnoCell.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user">Usuario</Label>
              <Input id="user" name="user" autoComplete="username" autoCapitalize="none" required autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw">Clave</Label>
              <Input id="pw" name="password" type="password" autoComplete="current-password" required />
            </div>
            <Button className="w-full" size="lg" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Entrar
            </Button>
            <p className="text-destructive min-h-5 text-sm font-semibold">{state?.error}</p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
