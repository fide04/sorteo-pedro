import { ExternalLink, KeyRound, Power } from "lucide-react";
import { rotateToken, toggleStore } from "../../actions";
import { ActionButton } from "@/components/admin/action-button";
import { NewStoreForm } from "@/components/admin/new-store-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { qrSvg, storeUrl } from "@/lib/qr";
import { db } from "@/lib/supabase";
import type { Store } from "@/lib/types";

export default async function Tiendas() {
  const sb = db();
  const [{ data: stores }, { data: counts }] = await Promise.all([
    sb.from("stores").select("*").order("created_at").returns<Store[]>(),
    sb.from("checkins").select("store_id").eq("status", "aprobado"),
  ]);
  const per = new Map<string, number>();
  (counts ?? []).forEach((c) => per.set(c.store_id, (per.get(c.store_id) ?? 0) + 1));
  const qrs = await Promise.all((stores ?? []).map((s) => qrSvg(storeUrl(s.qr_token))));

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Agregar tienda</CardTitle>
          <CardDescription>Cada tienda recibe un QR con un código secreto. Desactivar una tienda la quita del bonus de «todas las tiendas».</CardDescription>
        </CardHeader>
        <CardContent>
          <NewStoreForm />
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(stores ?? []).map((s, i) => (
          <Card key={s.id} className={s.active ? "" : "opacity-60"}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle>{s.name}</CardTitle>
                  <CardDescription>{s.city ?? "—"} · {per.get(s.id) ?? 0} registros</CardDescription>
                </div>
                <Badge variant={s.active ? "success" : "outline"}>{s.active ? "Activa" : "Inactiva"}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="mx-auto w-36 rounded-lg bg-white p-2.5 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qrs[i] }} />
              <a href={storeUrl(s.qr_token)} target="_blank" rel="noreferrer" className="text-secondary flex items-center justify-center gap-1 truncate text-xs">
                /t/{s.qr_token} <ExternalLink className="size-3" />
              </a>
              <div className="grid grid-cols-2 gap-2">
                <ActionButton size="sm" variant="outline" action={toggleStore.bind(null, s.id, !s.active)}>
                  <Power /> {s.active ? "Desactivar" : "Activar"}
                </ActionButton>
                <ActionButton
                  size="sm"
                  variant="outline"
                  action={rotateToken.bind(null, s.id)}
                  confirm={`¿Cambiar el QR de ${s.name}? Los carteles impresos dejarán de funcionar y tendrás que imprimir uno nuevo.`}
                  done="QR cambiado. Imprime el cartel nuevo."
                >
                  <KeyRound /> Nuevo QR
                </ActionButton>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
