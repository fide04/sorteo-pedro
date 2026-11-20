// Escena de atardecer estilo Vice City: sol con franjas, mar turquesa y palmeras.
// Dibujada desde cero en SVG (sin material de Rockstar).

const FROND = "M0 0C26-30 74-34 118-6C78-20 32-16 0 0Z";

function palm(x: number, y: number, h: number, lean: number, flip = false) {
  const top = { x: x + lean, y: y - h };
  const trunk = `M${x - 7} ${y}C${x - 3} ${y - h * 0.45} ${x + lean * 0.4} ${y - h * 0.8} ${top.x - 4} ${top.y}L${top.x + 5} ${top.y + 1}C${x + lean * 0.4 + 8} ${y - h * 0.8} ${x + 5} ${y - h * 0.45} ${x + 7} ${y}Z`;
  const angles = [-168, -140, -112, -80, -48, -18, 12];
  const s = h / 230;
  return (
    <g key={`${x}-${y}`} transform={flip ? `translate(${2 * x} 0) scale(-1 1)` : undefined}>
      <g className={h < 200 ? "palm-sway slow" : "palm-sway"}>
        <path d={trunk} />
        {angles.map((a) => (
          <path key={a} d={FROND} transform={`translate(${top.x} ${top.y}) rotate(${a}) scale(${s})`} />
        ))}
      </g>
    </g>
  );
}

function Skyline({ x, heights }: { x: number; heights: number[] }) {
  let cx = x;
  return (
    <g fill="#4a1170" opacity="0.9">
      {heights.map((h, i) => {
        const w = 14 + ((i * 7) % 12);
        const r = (
          <g key={i}>
            <rect x={cx} y={232 - h} width={w} height={h} />
            {h > 36 &&
              Array.from({ length: Math.floor((h - 12) / 12) }, (_, k) => (
                <rect key={k} className="window" x={cx + 4} y={232 - h + 6 + k * 12} width={w - 8} height="3" fill="#ffd25a" />
              ))}
          </g>
        );
        cx += w + 2;
        return r;
      })}
    </g>
  );
}

export function ViceScene({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={className} aria-hidden>
      {/* sol, ciudad y mar: se recorta a los lados en pantallas angostas */}
      <svg viewBox="0 0 1200 300" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 size-full">
        <defs>
          <linearGradient id="vs-sun" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd25a" />
            <stop offset="0.55" stopColor="#ff8a3d" />
            <stop offset="1" stopColor="#ff2e88" />
          </linearGradient>
          <linearGradient id="vs-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#14d4c4" />
            <stop offset="1" stopColor="#0a5d78" />
          </linearGradient>
          <mask id="vs-slats">
            <rect width="1200" height="300" fill="#fff" />
            <g className="sun-slats">
              {[-1, 0, 1, 2, 3, 4, 5].map((i) => (
                <rect key={i} x="0" y={150 + i * 14} width="1200" height={2 + Math.max(0, i) * 1.6} fill="#000" />
              ))}
            </g>
          </mask>
        </defs>
        {/* al hacer scroll el sol se hunde detrás del mar (ver .sun-set en globals.css) */}
        <g className="sun-set">
          <circle cx="600" cy="232" r="190" fill="#ff8a3d" opacity="0.18" className="sun-glow" />
          <circle cx="600" cy="232" r="140" fill="url(#vs-sun)" mask="url(#vs-slats)" />
        </g>
        <g className="city-lights">
          <Skyline x={360} heights={[22, 48, 30, 70, 40, 26, 56, 34]} />
          <Skyline x={680} heights={[30, 62, 38, 80, 28, 52, 24, 44]} />
        </g>
        <rect y="232" width="1200" height="68" fill="url(#vs-sea)" />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect
            key={i}
            className="sea-glint"
            style={{ animationDelay: `${-i * 0.6}s` }}
            x={600 - (120 - i * 22)}
            y={240 + i * 11}
            width={(120 - i * 22) * 2}
            height="3"
            rx="1.5"
            fill="#ffd25a"
            opacity={0.7 - i * 0.12}
          />
        ))}
      </svg>
      {/* palmeras ancladas a los bordes: siempre visibles, también en el celular */}
      <svg viewBox="0 0 260 300" preserveAspectRatio="xMinYMax meet" className={compact ? "absolute bottom-0 left-0 h-[85%] -translate-x-1/4" : "absolute bottom-0 left-0 h-full -translate-x-[12%]"}>
        <g fill="#1b0833">
          {palm(70, 300, 250, 34)}
          {palm(170, 300, 180, 46)}
        </g>
      </svg>
      <svg viewBox="0 0 260 300" preserveAspectRatio="xMaxYMax meet" className={compact ? "absolute right-0 bottom-0 h-[85%] translate-x-1/4" : "absolute right-0 bottom-0 h-full translate-x-[12%]"}>
        <g fill="#1b0833" transform="translate(260 0) scale(-1 1)">
          {palm(70, 300, 260, 34)}
          {palm(170, 300, 165, 40)}
        </g>
      </svg>
    </div>
  );
}

/** Estrellas de "nivel de búsqueda" del HUD, usadas como contador de tiendas visitadas. */
export function WantedStars({ filled, total, className, small = false }: { filled: number; total: number; className?: string; small?: boolean }) {
  return (
    <span className={className} role="img" aria-label={`${filled} de ${total} tiendas visitadas`}>
      {Array.from({ length: total }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" className={small ? "inline-block size-4" : "inline-block size-7 sm:size-8"} aria-hidden>
          <path
            d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z"
            fill={i < filled ? "#ffd25a" : "transparent"}
            stroke="#1b0833"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
}
