import Link from "next/link";
import {
  APP_SHELL_MAIN_NAVIGATION,
  APP_SHELL_SETTINGS_NAVIGATION,
  type AppShellNavigationItem,
  getAppShellNavigationItemFromPath,
} from "@/app/_features/navigation/app-shell-navigation";

type SidebarVariant = "desktop" | "mobile";

export interface AppSidebarProps {
  currentPathname: string;
  onNavigate?: () => void;
  variant?: SidebarVariant;
}

function getNavItemClasses(isActive: boolean, isEnabled: boolean): string {
  const baseClasses = [
    "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition-colors",
    "focus:outline-none focus:ring-2 focus:ring-accent/20",
  ];

  if (isActive) {
    return [
      ...baseClasses,
      "border-accent/40 bg-accent/15 text-foreground",
    ].join(" ");
  }

  if (isEnabled) {
    return [
      ...baseClasses,
      "border-white/10 bg-white/5 text-muted hover:bg-white/10 hover:text-foreground",
    ].join(" ");
  }

  return [
    ...baseClasses,
    "cursor-not-allowed border-white/10 bg-white/5 text-muted/80",
  ].join(" ");
}

function NavItem({
  item,
  isActive,
  onNavigate,
}: {
  item: AppShellNavigationItem;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  const navItemClassName = getNavItemClasses(isActive, item.enabled);
  const badge = item.enabled ? null : (
    <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-xs text-muted">
      Presto
    </span>
  );

  if (!item.enabled) {
    return (
      <div
        data-testid={`nav-item-${item.key}`}
        data-active={isActive}
        aria-disabled="true"
        aria-current={isActive ? "page" : undefined}
        className={navItemClassName}
      >
        <span>{item.label}</span>
        {badge}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      data-testid={`nav-item-${item.key}`}
      data-active={isActive}
      aria-disabled="false"
      aria-current={isActive ? "page" : undefined}
      className={navItemClassName}
      onClick={onNavigate}
    >
      <span>{item.label}</span>
      {badge}
    </Link>
  );
}

export function AppSidebar({
  currentPathname,
  onNavigate,
  variant = "desktop",
}: AppSidebarProps) {
  const activeItem = getAppShellNavigationItemFromPath(currentPathname);
  const isDesktop = variant === "desktop";

  const sidebarClassName = isDesktop
    ? "hidden h-dvh w-56 flex-col border-r border-white/10 bg-background/95 md:flex"
    : "flex h-full w-72 flex-col border-r border-white/10 bg-background";

  return (
    <aside
      data-testid={isDesktop ? "app-sidebar-desktop" : "app-sidebar-mobile"}
      className={sidebarClassName}
      aria-label="Navigazione principale"
    >
      <div className="border-b border-white/10 p-4">
        <Link
          href="/dashboard"
          className="block rounded-xl border border-white/10 bg-white/5 px-3 py-3 transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-accent/20"
          onClick={onNavigate}
        >
          <p className="text-lg font-semibold text-foreground">Jarvis</p>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Personal OS</p>
        </Link>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {APP_SHELL_MAIN_NAVIGATION.map((item) => (
            <NavItem
              key={item.key}
              item={item}
              isActive={activeItem.key === item.key}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>

      <div className="border-t border-white/10 p-4">
        <NavItem
          item={APP_SHELL_SETTINGS_NAVIGATION}
          isActive={activeItem.key === APP_SHELL_SETTINGS_NAVIGATION.key}
          onNavigate={onNavigate}
        />
      </div>
    </aside>
  );
}
