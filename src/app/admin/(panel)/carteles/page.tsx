import { Poster } from "@/components/admin/poster";
import { PrintButton } from "@/components/admin/print-button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SITE_URL } from "@/lib/config";
import { qrSvg, storeUrl } from "@/lib/qr";
import { db } from "@/lib/supabase";
import type { Store } from "@/lib/types";

export default async function Carteles() {
  const { data } = await db().from("stores").select("*").eq("active", true).order("created_at").returns<Store[]>();
  const stores = data ?? [];
  const qrs = await Promise.all(stores.map((s) => qrSvg(storeUrl(s.qr_token))));
  return (
    <div>
      <Card className="no-print mb-4">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Carteles A4 ({stores.length})</CardTitle>
            <CardDescription>
              Un cartel por tienda activa. Los QR apuntan a {SITE_URL}. En el diálogo de impresión elige «Sin márgenes» y activa «Gráficos de fondo».
            </CardDescription>
          </div>
          <PrintButton />
        </CardHeader>
      </Card>
      <div className="-mx-4 overflow-x-auto print:mx-0 print:overflow-visible">
        {stores.map((s, i) => (
          <Poster key={s.id} storeName={s.name} qr={qrs[i]} />
        ))}
      </div>
    </div>
  );
}
