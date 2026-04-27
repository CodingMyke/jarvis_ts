import { HistoryClockIcon } from "@/app/design/atoms/shared/icons/HistoryClockIcon";
import { getAppShellNavigationItemFromPath } from "@/app/_features/navigation/app-shell-navigation";
import { useAppShellProgression } from "@/app/design/templates/app-shell/useAppShellProgression";
import { Button } from "../../atoms/shared";

export interface AppTopbarProps {
  currentPathname: string;
  onOpenMobileSidebar: () => void;
}

export function AppTopbar({
  currentPathname,
  onOpenMobileSidebar,
}: AppTopbarProps) {
  const currentItem = getAppShellNavigationItemFromPath(currentPathname);
  const { openProgressionHistory } = useAppShellProgression();
  const showProgressionHistory = currentPathname === "/progression" && openProgressionHistory !== null;

  return (
    <header
      data-testid="app-shell-topbar"
      className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/10 bg-background/90 px-4 backdrop-blur-md"
    >
      <button
        type="button"
        className="mr-3 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-muted transition-colors hover:bg-white/10 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 md:hidden"
        onClick={onOpenMobileSidebar}
        aria-label="Apri navigazione"
      >
        <span className="text-lg leading-none" aria-hidden>
          ≡
        </span>
      </button>

      <p className="text-sm font-medium uppercase tracking-[0.12em] text-muted">
        {currentItem.title}
      </p>

      {showProgressionHistory ? (
        <Button
          variant="secondary"
          className="ml-auto h-7 w-7 !p-1"
          aria-label="Cronologia XP"
          onClick={openProgressionHistory}
        >
          <HistoryClockIcon className="h-5 w-5" />
        </Button>
      ) : null}
    </header>
  );
}
