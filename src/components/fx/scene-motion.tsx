"use client";

import { useEffect } from "react";

/**
 * Un solo script liviano para todo el movimiento ligado al scroll:
 *  - atardecer ligado al scroll (sol que se pone, cielo que oscurece)
 *  - entrada escalonada de [data-reveal] que están fuera de pantalla al cargar
 *  - conteo animado de [data-count]
 * Lo que ya se ve al cargar no se oculta nunca (no retrasa la primera pintura).
 */
export function SceneMotion() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Atardecer: el progreso del scroll sobre la escena (0 → 1) va en --dusk.
    // El sol baja detrás del mar, el cielo se oscurece y se prenden las ventanas de la ciudad.
    const band = document.querySelector<HTMLElement>(".vice-sky");
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!band) return;
        // 0 mientras la escena se ve completa abajo de la pantalla; 1 cuando ya subió y está por salir.
        const bottom = band.getBoundingClientRect().bottom;
        const p = Math.min(1, Math.max(0, (innerHeight - bottom) / (Math.min(band.offsetHeight, innerHeight) * 0.75)));
        band.style.setProperty("--dusk", p.toFixed(3));
      });
    };
    if (band) {
      addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    // Conteo
    const count = (el: HTMLElement) => {
      const to = Number(el.dataset.count);
      if (!to) return;
      const t0 = performance.now();
      const step = (t: number) => {
        const p = Math.min(1, (t - t0) / 900);
        el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step);
      };
      el.textContent = "0";
      requestAnimationFrame(step);
    };

    // Entradas
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          if (el.dataset.reveal === "pending") el.dataset.reveal = "in";
          if (el.dataset.count && el.dataset.counted !== "1") {
            el.dataset.counted = "1";
            count(el);
          }
          io.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    const vh = innerHeight;
    document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
      if (el.getBoundingClientRect().top > vh) {
        el.dataset.reveal = "pending";
        io.observe(el);
      }
    });
    document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
      if (el.getBoundingClientRect().top > vh * 0.9) io.observe(el);
    });

    return () => {
      removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);
  return null;
}
