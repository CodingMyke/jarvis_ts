import Link from "next/link";
import { GearIcon } from "@/app/design/atoms/shared";

export function AssistantActionsLink() {
  return (
    <Link
      href="/settings"
      className="absolute bottom-6 left-6 flex h-10 w-10 items-center justify-center rounded-app border border-line bg-surface text-copy-muted transition-colors hover:bg-interactive hover:text-copy focus:outline-none focus:ring-2 focus:ring-accent/20"
      aria-label="Impostazioni"
    >
      <GearIcon className="h-5 w-5" />
    </Link>
  );
}
