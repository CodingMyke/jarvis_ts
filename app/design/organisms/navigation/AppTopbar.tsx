import { HistoryClockIcon } from "@/app/design/atoms/shared/icons/HistoryClockIcon";
import { getAppShellNavigationItemFromPath } from "@/app/_features/navigation/app-shell-navigation";
import { useAppShellProgression } from "@/app/design/templates/app-shell/useAppShellProgression";
import { IconButton } from "@/app/_shared/ui";

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
      className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-app/90 px-4 backdrop-blur-md"
    >
      <button
        type="button"
        className="mr-3 inline-flex h-9 w-9 items-center justify-center rounded-app border border-line bg-surface text-copy-muted transition-colors hover:bg-interactive hover:text-copy focus:outline-none focus:ring-2 focus:ring-accent/20 md:hidden"
        onClick={onOpenMobileSidebar}
        aria-label="Apri navigazione"
      >
        <span className="text-lg leading-none" aria-hidden>
          ≡
        </span>
      </button>

      <p className="text-sm font-medium uppercase tracking-[0.12em] text-copy-muted">
        {currentItem.title}
      </p>

      {showProgressionHistory ? (
        <IconButton
          className="ml-auto h-7 w-7"
          icon={<HistoryClockIcon className="h-5 w-5" />}
          label="Cronologia XP"
          onClick={openProgressionHistory ?? undefined}
          variant="secondary"
        />
      ) : null}
    </header>
  );
}
