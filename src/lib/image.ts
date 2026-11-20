// Utilidades de imagen que corren en el navegador.
import { RAFFLE } from "./config";

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("No se pudo leer la imagen"));
    i.src = url;
  });
}

const toBlob = (c: HTMLCanvasElement, q: number) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/jpeg", q));

/** Reduce a 1600 px y JPEG 0.82 → fotos de ~300-600 KB, subida rápida con datos móviles. */
export async function compressPhoto(file: File, max = 1600): Promise<File> {
  const img = await loadImage(file);
  const s = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * s);
  c.height = Math.round(img.height * s);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return new File([await toBlob(c, 0.82)], "foto.jpg", { type: "image/jpeg" });
}

/** Imagen 9:16 para Historias de Instagram, estilo Vice City: foto tipo polaroid + "¡Misión superada!". */
export async function storyImage(file: Blob, opts: { store: string; firstName: string }): Promise<File> {
  const img = await loadImage(file);
  const W = 1080, H = 1920;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d")!;
  const family = getComputedStyle(document.body).getPropertyValue("--font-archivo").trim() || "Arial";
  const ctx = x as CanvasRenderingContext2D & { fontStretch?: string };

  // cielo
  const sky = x.createLinearGradient(0, 0, 0, 1600);
  [[0, "#1b0833"], [0.32, "#3a0f6b"], [0.55, "#6b1fa8"], [0.78, "#c2268f"], [0.92, "#ff4f7b"], [1, "#ff8a3d"]].forEach(([o, col]) => sky.addColorStop(o as number, col as string));
  x.fillStyle = sky; x.fillRect(0, 0, W, 1600);

  // sol con franjas (en un lienzo aparte para recortar las franjas)
  const s = document.createElement("canvas"); s.width = W; s.height = 1600;
  const sx = s.getContext("2d")!;
  const sg = sx.createLinearGradient(0, 1240, 0, 1600);
  sg.addColorStop(0, "#ffd25a"); sg.addColorStop(0.55, "#ff8a3d"); sg.addColorStop(1, "#ff2e88");
  sx.fillStyle = sg; sx.beginPath(); sx.arc(W / 2, 1600, 360, Math.PI, 0); sx.fill();
  for (let i = 0; i < 7; i++) sx.clearRect(0, 1420 + i * 26, W, 4 + i * 3);
  x.drawImage(s, 0, 0);

  // mar
  const sea = x.createLinearGradient(0, 1600, 0, H);
  sea.addColorStop(0, "#14d4c4"); sea.addColorStop(1, "#0a5d78");
  x.fillStyle = sea; x.fillRect(0, 1600, W, H - 1600);
  x.fillStyle = "rgba(255,210,90,0.7)";
  for (let i = 0; i < 5; i++) { const w = 300 - i * 50; x.fillRect(W / 2 - w, 1625 + i * 26, w * 2, 6); }

  // título HUD
  ctx.fontStretch = "expanded";
  x.textAlign = "center";
  x.font = `900 104px ${family}`;
  x.lineJoin = "round"; x.lineWidth = 22; x.strokeStyle = "#1b0833";
  x.strokeText("¡Misión superada!", W / 2, 210);
  x.fillStyle = "#ffd25a"; x.fillText("¡Misión superada!", W / 2, 210);

  // polaroid
  x.save();
  x.translate(W / 2, 830);
  x.rotate((-3 * Math.PI) / 180);
  const PW = 820, PH = 1000, P = 34;
  x.shadowColor = "rgba(27,8,51,0.55)"; x.shadowBlur = 50; x.shadowOffsetY = 24;
  x.fillStyle = "#ffffff"; x.fillRect(-PW / 2, -PH / 2, PW, PH);
  x.shadowColor = "transparent";
  const iw = PW - P * 2, ih = PH - P - 150, k = Math.max(iw / img.width, ih / img.height);
  x.save(); x.beginPath(); x.rect(-PW / 2 + P, -PH / 2 + P, iw, ih); x.clip();
  x.drawImage(img, -PW / 2 + P + (iw - img.width * k) / 2, -PH / 2 + P + (ih - img.height * k) / 2, img.width * k, img.height * k);
  x.restore();
  ctx.fontStretch = "normal";
  x.fillStyle = "#1b0833"; x.font = `800 50px ${family}`;
  x.fillText(`${opts.firstName} en ${opts.store}`, 0, PH / 2 - 62, PW - 80);
  x.restore();

  // pie
  ctx.fontStretch = "expanded";
  x.fillStyle = "#ffffff"; x.font = `900 68px ${family}`;
  x.fillText(`Sorteo gratis de ${RAFFLE.prize}`, W / 2, 1790);
  ctx.fontStretch = "normal";
  x.font = `700 44px ${family}`;
  x.fillText(`@${RAFFLE.instagram}  ${RAFFLE.hashtag}`, W / 2, 1860);
  return new File([await toBlob(c, 0.9)], "sorteo-technocell-historia.jpg", { type: "image/jpeg" });
}

/** Lee un video local: duración y un cuadro (≈0.5 s) como miniatura JPEG de 600 px. */
export function videoInfo(file: File): Promise<{ duration: number; poster: File | null }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.src = url;
    let done = false;
    const finish = (poster: File | null) => {
      if (done) return;
      done = true;
      resolve({ duration: Number.isFinite(v.duration) ? v.duration : 0, poster });
    };
    v.onloadedmetadata = () => {
      v.currentTime = Math.min(0.5, (v.duration || 1) / 2);
    };
    v.onseeked = async () => {
      try {
        const s = Math.min(1, 600 / Math.max(v.videoWidth, v.videoHeight));
        const c = document.createElement("canvas");
        c.width = Math.round(v.videoWidth * s);
        c.height = Math.round(v.videoHeight * s);
        c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
        finish(new File([await toBlob(c, 0.8)], "poster.jpg", { type: "image/jpeg" }));
      } catch {
        finish(null);
      }
    };
    v.onerror = () => finish(null);
    setTimeout(() => finish(null), 8000);
  });
}

/** Sube un archivo a una URL firmada de Supabase Storage mostrando el progreso. */
export function uploadSigned(url: string, file: Blob, onProgress?: (p: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(String(xhr.status))));
    xhr.onerror = () => reject(new Error("red"));
    xhr.send(file);
  });
}
