"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Inclinación 3D que sigue el mouse/dedo (y el giroscopio en Android).
 * Sin librerías: escribe variables CSS (--rx, --ry, --mx, --my) en un requestAnimationFrame
 * que se detiene cuando el elemento no está en pantalla o la pestaña está oculta.
 */
export function Tilt({ children, className, max = 16 }: { children: React.ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    let lastInput = 0;
    let raf = 0;
    let visible = true;

    const set = (nx: number, ny: number) => {
      target.x = Math.max(-1, Math.min(1, nx));
      target.y = Math.max(-1, Math.min(1, ny));
      lastInput = performance.now();
    };

    const onPointer = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      set(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
    };
    const onLeave = () => set(0, 0);
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      set(e.gamma / 25, (e.beta - 45) / 25);
    };
    // iOS pide permiso para el giroscopio: lo solicitamos al primer toque
    const askIOS = () => {
      const D = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
      D.requestPermission?.().then((s) => s === "granted" && addEventListener("deviceorientation", onOrient)).catch(() => {});
    };

    const loop = (t: number) => {
      // sin interacción por 2 s → flota suave solo
      if (t - lastInput > 2000) {
        target.x = Math.sin(t / 1600) * 0.45;
        target.y = Math.cos(t / 2100) * 0.3;
      }
      cur.x += (target.x - cur.x) * 0.08;
      cur.y += (target.y - cur.y) * 0.08;
      el.style.setProperty("--ry", `${(cur.x * max).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${(-cur.y * max).toFixed(2)}deg`);
      el.style.setProperty("--mx", `${((cur.x + 1) * 50).toFixed(1)}%`);
      el.style.setProperty("--my", `${((cur.y + 1) * 50).toFixed(1)}%`);
      if (visible && !document.hidden) raf = requestAnimationFrame(loop);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      if (visible && !document.hidden) raf = requestAnimationFrame(loop);
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      start();
    });
    io.observe(el);
    el.addEventListener("pointermove", onPointer, { passive: true });
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointerdown", askIOS, { once: true });
    addEventListener("deviceorientation", onOrient, { passive: true });
    document.addEventListener("visibilitychange", start);
    start();
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      el.removeEventListener("pointermove", onPointer);
      el.removeEventListener("pointerleave", onLeave);
      removeEventListener("deviceorientation", onOrient);
      document.removeEventListener("visibilitychange", start);
    };
  }, [max]);

  return (
    <div ref={ref} className={cn("tilt-stage", className)}>
      <div className="tilt-card">{children}</div>
    </div>
  );
}
