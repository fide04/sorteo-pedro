import { cn } from "@/lib/utils";

/** Boleto con talón perforado. Las muescas son transparentes (máscara CSS), sirven sobre cualquier fondo. */
export function Ticket({
  children,
  stub,
  animate = false,
  tilt = true,
  sheen = false,
  className,
}: {
  children: React.ReactNode;
  stub: React.ReactNode;
  animate?: boolean;
  tilt?: boolean;
  sheen?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("ticket", tilt && "ticket-tilt", tilt && animate && "ticket-in", className)}
    >
      <div className="ticket-body relative bg-white p-5 text-ink sm:p-6">
        {children}
        {sheen && <div className="holo" aria-hidden />}
      </div>
      <div className="ticket-stub bg-pink flex w-16 items-center justify-center text-white sm:w-20">{stub}</div>
    </div>
  );
}

export function StubText({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-narrow text-[28px] leading-none font-extrabold tracking-wide [writing-mode:vertical-rl] sm:text-[34px]">
      {children}
    </span>
  );
}
