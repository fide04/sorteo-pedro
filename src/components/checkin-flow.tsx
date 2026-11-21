"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowLeft, Camera, Loader2, RefreshCw, Video } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { finishCheckin, forgetMe, identify, startCheckin } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PassportView } from "@/components/passport-view";
import { compressPhoto, storyImage, uploadSigned, videoInfo, visualHash } from "@/lib/image";
import { RAFFLE } from "@/lib/config";
import type { Passport } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Turnstile, TURNSTILE_SITE_KEY, type TurnstileHandle } from "@/components/turnstile";

type Step = "id" | "datos" | "foto" | "listo";

export function CheckinFlow({ token, storeName, known, contestUrl }: { token: string; storeName: string; known: string | null; contestUrl: string | null }) {
  const [step, setStep] = useState<Step>(known ? "foto" : "id");
  const [name, setName] = useState<string | null>(known);
  const [isNew, setIsNew] = useState(false);
  const [session, setSession] = useState(!!known);
  const [form, setForm] = useState({ cedula: "", phone: "", fullName: "", instagram: "" });
  const [accept, setAccept] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null); // foto comprimida o video original
  const [thumb, setThumb] = useState<File | null>(null);
  const [kind, setKind] = useState<"foto" | "video">("foto");
  const [progress, setProgress] = useState<number | null>(null);
  const [meta, setMeta] = useState<{ phash: string | null; takenAt: number | null }>({ phash: null, takenAt: null });
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ passport: Passport; checkinId: string; share: File | null; gained: number; pendingVideo: boolean } | null>(null);
  const [videoOk, setVideoOk] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [human, setHuman] = useState("");
  const tsRef = useRef<TurnstileHandle>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  function submitId(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      const r = await identify({ cedula: form.cedula, phone: form.phone });
      if (!r.ok) return setError(r.error);
      if (r.status === "conocido") {
        setName(r.firstName);
        setIsNew(false);
        setStep("foto");
      } else {
        setIsNew(true);
        setStep("datos");
      }
    });
  }

  function submitDatos(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.fullName.trim().split(/\s+/).length < 2) return setError("Escribe tu nombre y apellido.");
    if (contestUrl && !form.instagram.trim()) return setError("Escribe tu usuario de Instagram: lo usamos para verificar tu comentario en el video del concurso.");
    if (!accept) return setError("Debes aceptar las reglas para participar.");
    setName(form.fullName.trim().split(/\s+/)[0]);
    setStep("foto");
  }

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setError("");
    try {
      if (f.type.startsWith("video/")) {
        if (f.size > 60 * 1024 * 1024) return setError("El video pesa más de 60 MB. Graba uno más corto.");
        const info = await videoInfo(f);
        if (info.duration > RAFFLE.maxVideoSeconds + 1)
          return setError(`El video dura ${Math.round(info.duration)} segundos. El máximo es ${RAFFLE.maxVideoSeconds}.`);
        setKind("video");
        setVideoOk(false);
        setPhoto(f);
        setThumb(info.poster);
        setMeta({ phash: info.poster ? await visualHash(info.poster) : null, takenAt: f.lastModified || null });
        setPreview(URL.createObjectURL(f));
      } else {
        const [small, mini] = await Promise.all([compressPhoto(f), compressPhoto(f, 600)]);
        setKind("foto");
        setPhoto(small);
        setThumb(mini);
        setMeta({ phash: await visualHash(mini), takenAt: f.lastModified || null });
        setPreview(URL.createObjectURL(small));
      }
    } catch {
      setError("No pudimos leer ese archivo. Prueba con otro.");
    }
  }

  function send() {
    if (!photo) return setError("Toma una foto o graba un video en la tienda.");
    if (kind === "video" && !videoOk) return setError("Confirma que tu video cumple con lo que pedimos.");
    if (isNew && TURNSTILE_SITE_KEY && !human) return setError("Estamos confirmando que eres una persona. Espera un segundo y vuelve a tocar el botón.");
    setError("");
    start(async () => {
      const fd = new FormData();
      fd.set("token", token);
      fd.set("kind", kind);
      fd.set("type", photo.type);
      fd.set("size", String(photo.size));
      if (thumb) fd.set("withThumb", "1");
      if (form.cedula) {
        fd.set("cedula", form.cedula);
        fd.set("phone", form.phone);
      }
      if (isNew) {
        fd.set("fullName", form.fullName);
        fd.set("instagram", form.instagram);
        if (accept) fd.set("acceptRules", "on");
        if (human) fd.set("cf-turnstile-response", human);
      }
      const prep = await startCheckin(fd);
      if (isNew) tsRef.current?.reset(); // cada verificación sirve una sola vez
      if (!prep.ok) {
        setError(prep.error);
        toast.error(prep.error);
        return;
      }
      setSession(true);
      try {
        setProgress(0);
        await uploadSigned(prep.upload.url, photo, (p) => setProgress(p));
        if (prep.thumb && thumb) await uploadSigned(prep.thumb.url, thumb).catch(() => {});
      } catch {
        setProgress(null);
        return setError("Se cortó la subida. Revisa tu conexión e intenta otra vez.");
      }
      const r = await finishCheckin({ token, path: prep.upload.path, thumbPath: prep.thumb?.path ?? null, kind, phash: meta.phash, takenAt: meta.takenAt });
      setProgress(null);
      if (!r.ok) {
        setError(r.error);
        toast.error(r.error);
        return;
      }
      let share: File | null = kind === "video" ? photo : null;
      if (kind === "foto") {
        try {
          share = await storyImage(photo, { store: storeName, firstName: r.passport.firstName });
        } catch {}
      }
      setResult({ passport: r.passport, checkinId: r.checkinId, share, gained: r.gained, pendingVideo: r.pendingVideo });
      setStep("listo");
      scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  async function notMe() {
    await forgetMe();
    setSession(false);
    setName(null);
    setForm({ cedula: "", phone: "", fullName: "", instagram: "" });
    setStep("id");
  }

  if (step === "listo" && result)
    return (
      <div className="pt-16">
        <PassportView
          passport={result.passport}
          justStore={storeName}
          gained={result.gained}
          pendingVideo={result.pendingVideo}
          shareFile={result.share}
          checkinId={result.checkinId}
          contestUrl={contestUrl}
        />
      </div>
    );

  const stepIndex = { id: 0, datos: 1, foto: 2, listo: 3 }[step];
  const totalSteps = known && session && !isNew ? 1 : 3;

  return (
    <div className="bg-card rounded-lg border p-5 shadow-[0_12px_32px_-12px_rgb(15_20_66/0.25)] sm:p-6">
      {totalSteps > 1 && (
        <div className="mb-5" aria-label={`Paso ${stepIndex + 1} de 3`}>
          <p className="text-muted-foreground text-sm">Paso {stepIndex + 1} de 3</p>
          <div className="mt-2 grid grid-cols-3 gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className={cn("h-1 rounded-full", i <= stepIndex ? "bg-pink" : "bg-muted")} />
            ))}
          </div>
        </div>
      )}

      {step === "id" && (
        <form onSubmit={submitId} className="space-y-4">
          <div>
            <h2 className="font-wide text-xl font-extrabold">Tus datos</h2>
            <p className="text-muted-foreground mt-1 leading-relaxed">
              Con tu cédula juntamos tus puntos de todas las tiendas, uses el teléfono que uses.
            </p>
          </div>
          <Field id="cedula" label="Cédula">
            <Input id="cedula" inputMode="numeric" autoComplete="off" placeholder="Solo números" value={form.cedula} onChange={set("cedula")} required />
          </Field>
          <Field id="phone" label="Teléfono con WhatsApp" hint="Si ganas, te llamamos a este número.">
            <Input id="phone" type="tel" autoComplete="tel" placeholder="0414 123 4567" value={form.phone} onChange={set("phone")} required />
          </Field>
          <Submit pending={pending}>Continuar</Submit>
        </form>
      )}

      {step === "datos" && (
        <form onSubmit={submitDatos} className="space-y-4">
          <div>
            <h2 className="font-wide text-xl font-extrabold">Es tu primera vez</h2>
            <p className="text-muted-foreground mt-1 leading-relaxed">Solo te pedimos esto una vez.</p>
          </div>
          <Field id="fullName" label="Nombre y apellido">
            <Input id="fullName" autoComplete="name" value={form.fullName} onChange={set("fullName")} required />
          </Field>
          <Field
            id="instagram"
            label={contestUrl ? "Usuario de Instagram" : "Usuario de Instagram (opcional)"}
            hint={contestUrl ? "Lo usamos para verificar tu comentario en el video del concurso, que es requisito para ganar." : undefined}
          >
            <Input id="instagram" placeholder="@usuario" autoCapitalize="none" value={form.instagram} onChange={set("instagram")} required={!!contestUrl} />
          </Field>
          {contestUrl && (
            <a href={contestUrl} target="_blank" rel="noreferrer" className="text-violet inline-block text-sm font-semibold underline underline-offset-2">
              Ver y comentar el video del concurso
            </a>
          )}
          <label className="flex cursor-pointer items-start gap-3 pt-1 text-[15px] leading-snug">
            <Checkbox checked={accept} onCheckedChange={(v) => setAccept(v === true)} className="mt-0.5" />
            <span>
              Tengo 18 años o más, acepto las{" "}
              <a href="/#reglas" target="_blank" className="text-violet font-semibold underline underline-offset-2">
                reglas del sorteo
              </a>{" "}
              y que mi foto aparezca en la galería con mi nombre y la inicial de mi apellido.
            </span>
          </label>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="lg" onClick={() => setStep("id")} aria-label="Volver">
              <ArrowLeft />
            </Button>
            <Submit pending={false} className="flex-1">
              Continuar
            </Submit>
          </div>
        </form>
      )}

      {step === "foto" && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-wide text-xl font-extrabold">{name ? `${name}, tu foto o video` : "Tu foto o video"}</h2>
              <p className="text-muted-foreground mt-1 leading-relaxed">
                Hazlo creativo: va a salir en la galería del sorteo para que todos lo vean.
              </p>
            </div>
            {session && (
              <Button variant="ghost" size="sm" onClick={notMe} className="text-muted-foreground shrink-0">
                No soy {name ?? "yo"}
              </Button>
            )}
          </div>

          {/* capture: abre la cámara directo, para que la foto o el video se haga en la tienda en ese momento */}
          <input ref={fileRef} type="file" accept="image/*" capture="user" className="sr-only" onChange={pick} aria-label="Foto en la tienda" />
          <input ref={videoRef} type="file" accept="video/*" capture="user" className="sr-only" onChange={pick} aria-label="Video en la tienda" />

          {preview ? (
            <div className="relative overflow-hidden rounded-md border bg-black">
              {kind === "video" ? (
                <video src={preview} className="max-h-80 w-full object-contain" controls playsInline muted />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Tu foto" className="max-h-80 w-full object-cover" />
              )}
              <span className="bg-ink/80 absolute top-2 left-2 rounded px-2 py-1 text-xs font-bold text-white">
                {kind === "video" ? `Video: +${RAFFLE.points.video} puntos` : `Foto: +${RAFFLE.points.photo} puntos`}
              </span>
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2"
                disabled={pending}
                onClick={() => {
                  setPhoto(null);
                  setPreview(null);
                }}
              >
                <RefreshCw /> Cambiar
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <MediaButton onClick={() => fileRef.current?.click()} icon={<Camera className="size-8" strokeWidth={1.75} />} label="Tomar foto" points={RAFFLE.points.photo} />
              <MediaButton
                onClick={() => videoRef.current?.click()}
                icon={<Video className="size-8" strokeWidth={1.75} />}
                label={`Grabar video, hasta ${RAFFLE.maxVideoSeconds} s`}
                points={RAFFLE.points.video}
                highlight
              />
            </div>
          )}

          {!preview && (
            <div className="bg-muted/60 rounded-md p-4 text-[15px]">
              <p className="font-bold">Lo que debe tener</p>
              <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5 leading-snug">
                <li>Foto o video dentro de esta tienda: que se vea el local o el cartel del sorteo.</li>
                <li>Tú en cámara. En el video, muéstranos tu emoción por el {RAFFLE.prize} (máximo {RAFFLE.maxVideoSeconds} segundos).</li>
                <li>Que sea creativo: un grito, un baile, un reto, lo que se te ocurra.</li>
              </ul>
              <p className="text-muted-foreground mt-2 text-sm">
                Antes de entregar el premio revisamos todas las fotos y videos del ganador. Si no cumplen, se sortea de nuevo.
              </p>
            </div>
          )}

          {preview && kind === "video" && (
            <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-snug">
              <Checkbox checked={videoOk} onCheckedChange={(v) => setVideoOk(v === true)} className="mt-0.5" />
              <span>Mi video es en la tienda, salgo yo y muestro mi emoción por el {RAFFLE.prize}.</span>
            </label>
          )}

          {progress !== null && (
            <div aria-live="polite">
              <Progress value={Math.round(progress * 100)} />
              <p className="text-muted-foreground mt-1.5 text-sm">
                Subiendo {kind === "video" ? "video" : "foto"}: {Math.round(progress * 100)} %
              </p>
            </div>
          )}

          {isNew && <Turnstile ref={tsRef} onToken={setHuman} />}

          <Button variant="cta" size="xl" className="w-full" disabled={!photo || pending} onClick={send}>
            {pending && <Loader2 className="animate-spin" />}
            {pending ? "Subiendo" : `Subir y sumar ${kind === "video" ? RAFFLE.points.video : RAFFLE.points.photo} puntos`}
          </Button>
          {!session && (
            <Button variant="link" className="text-muted-foreground w-full" onClick={() => setStep(isNew ? "datos" : "id")}>
              Volver
            </Button>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-destructive mt-4 text-sm font-semibold">
          {error}
        </p>
      )}
    </div>
  );
}

function MediaButton({ onClick, icon, label, points, highlight }: { onClick: () => void; icon: React.ReactNode; label: string; points: number; highlight?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "focus-visible:ring-ring/50 relative flex flex-col items-center gap-2 rounded-md border-2 border-dashed px-3 py-7 text-center transition-colors outline-none focus-visible:ring-[3px]",
        highlight ? "border-pink text-ink hover:bg-pink/5" : "border-input hover:border-violet hover:bg-muted/50",
      )}
    >
      <span className={highlight ? "text-pink" : "text-violet"}>{icon}</span>
      <span className="text-sm leading-tight font-semibold">{label}</span>
      <span className={cn("font-narrow text-2xl font-extrabold", highlight ? "text-pink" : "text-violet")}>+{points}</span>
    </button>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-muted-foreground text-sm">{hint}</p>}
    </div>
  );
}

function Submit({ pending, children, className }: { pending: boolean; children: React.ReactNode; className?: string }) {
  return (
    <Button type="submit" variant="cta" size="lg" className={cn("w-full", className)} disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  );
}
