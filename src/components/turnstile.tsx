"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";

type TS = {
  render: (el: HTMLElement, o: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TS;
    __tsLoad?: Promise<void>;
  }
}

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

function load(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  window.__tsLoad ??= new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => res();
    s.onerror = () => rej(new Error("turnstile"));
    document.head.appendChild(s);
  });
  return window.__tsLoad;
}

export type TurnstileHandle = { reset: () => void };

/** Verificación anti-bots de Cloudflare. Casi siempre es invisible; solo aparece si sospecha. */
export function Turnstile({ onToken, ref }: { onToken: (t: string) => void; ref?: Ref<TurnstileHandle> }) {
  const box = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useImperativeHandle(ref, () => ({
    reset: () => {
      cb.current("");
      if (id.current && window.turnstile) window.turnstile.reset(id.current);
    },
  }));

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let gone = false;
    load()
      .then(() => {
        if (gone || !box.current || !window.turnstile) return;
        id.current = window.turnstile.render(box.current, {
          sitekey: TURNSTILE_SITE_KEY,
          appearance: "interaction-only",
          theme: "dark",
          language: "es",
          "refresh-expired": "auto",
          callback: (t: string) => cb.current(t),
          "expired-callback": () => cb.current(""),
          "error-callback": () => cb.current(""),
        });
      })
      .catch(() => {});
    return () => {
      gone = true;
      if (id.current && window.turnstile) window.turnstile.remove(id.current);
      id.current = null;
    };
  }, []);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={box} className="mt-3 flex justify-center empty:hidden" />;
}
