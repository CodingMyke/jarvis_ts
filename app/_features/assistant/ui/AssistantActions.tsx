import Link from "next/link";
import { GearIcon } from "@/app/_shared";

export function AssistantActions() {
  return (
    <Link
      href="/settings"
      className="absolute bottom-6 left-6 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-muted transition-colors hover:bg-white/10 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20"
      aria-label="Impostazioni"
    >
      <GearIcon className="h-5 w-5" />
    </Link>
  );
}
