"use client";

import { useEffect } from "react";

/**
 * Un solo script liviano para todo el movimiento ligado al scroll:
 *  - parallax de las capas [data-depth] de la escena
 *  - entrada escalonada de [data-reveal] que están fuera de pantalla al cargar
 *  - conteo animado de [data-count]
 * Lo que ya se ve al cargar no se oculta nunca (no retrasa la primera pintura).
 */
export function SceneMotion() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Parallax
    const layers = [...document.querySelectorAll<HTMLElement>("[data-depth]")];
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = scrollY;
        if (y > innerHeight * 1.2) return;
        for (const l of layers) l.style.transform = `translate3d(0, ${(y * Number(l.dataset.depth)).toFixed(1)}px, 0)`;
      });
    };
    if (layers.length) addEventListener("scroll", onScroll, { passive: true });

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
