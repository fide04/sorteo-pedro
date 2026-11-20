"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Camera, Gift, LayoutDashboard, Printer, Store } from "lucide-react";
import { Instagram } from "@/components/icons";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Ranking", icon: LayoutDashboard },
  { href: "/admin/estadisticas", label: "Estadísticas", icon: BarChart3 },
  { href: "/admin/registros", label: "Fotos y videos", icon: Camera },
  { href: "/admin/instagram", label: "Instagram", icon: Instagram },
  { href: "/admin/sorteo", label: "Sorteo", icon: Gift },
  { href: "/admin/tiendas", label: "Tiendas", icon: Store },
  { href: "/admin/carteles", label: "Carteles", icon: Printer },
];

export function AdminNav({ badges }: { badges: Record<string, number> }) {
  const path = usePathname();
  return (
    <nav className="bg-muted -mx-1 flex gap-1 overflow-x-auto rounded-lg p-1">
      {items.map((i) => {
        const active = path === i.href;
        return (
          <Link
            key={i.href}
            href={i.href}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-semibold whitespace-nowrap transition-colors",
              active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <i.icon className="size-4" />
            {i.label}
            {!!badges[i.href] && (
              <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-[11px] leading-5">{badges[i.href]}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
