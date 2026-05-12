import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@/app/design/atoms/shared";
import {
  APP_SHELL_MAIN_NAVIGATION,
  APP_SHELL_ACADEMY_NAVIGATION,
  APP_SHELL_SETTINGS_NAVIGATION,
  type AppShellNavigationItem,
  getAppShellNavigationItemFromPath,
  isAcademyPathname,
} from "@/app/_features/navigation/app-shell-navigation";
import { useAppShellAssistant } from "@/app/design/templates/app-shell/useAppShellAssistant";
import { useAppShellProgression } from "@/app/design/templates/app-shell/useAppShellProgression";

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

function getNavItemTestId(itemKey: AppShellNavigationItem["key"]): string {
  return `nav-item-${String(itemKey).replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()}`;
}

function NavItem({
  item,
  isActive,
  onNavigate,
  showWarning = false,
  testId,
}: {
  item: AppShellNavigationItem;
  isActive: boolean;
  onNavigate?: () => void;
  showWarning?: boolean;
  testId?: string;
}) {
  const navItemClassName = getNavItemClasses(isActive, item.enabled);
  const navItemTestId = testId ?? getNavItemTestId(item.key);
  const warningBadge = showWarning ? (
    <span
      data-testid={`nav-warning-${String(item.key).replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()}`}
      aria-label={`${item.label} deadline warning`}
      className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.55)]"
    />
  ) : null;
  const disabledBadge = item.enabled ? null : (
    <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-xs text-muted">
      Presto
    </span>
  );
  const badge = warningBadge ?? disabledBadge;

  if (!item.enabled) {
    return (
      <div
        data-testid={navItemTestId}
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
      data-testid={navItemTestId}
      data-active={isActive}
      aria-current={isActive ? "page" : undefined}
      className={navItemClassName}
      onClick={onNavigate}
    >
      <span>{item.label}</span>
      {badge}
    </Link>
  );
}

function AcademySection({
  isExpanded,
  isActive,
  activeItemKey,
  onToggle,
  onNavigate,
}: {
  isExpanded: boolean;
  isActive: boolean;
  activeItemKey: AppShellNavigationItem["key"];
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const toggleLabel = isExpanded ? "Chiudi Accademia" : "Apri Accademia";
  return (
    <div className="space-y-2">
      <button
        type="button"
        data-testid="nav-item-academy"
        data-active={isActive}
        aria-expanded={isExpanded}
        aria-controls="app-sidebar-academy-children"
        aria-label={toggleLabel}
        className={getNavItemClasses(isActive, true)}
        onClick={() => {
          onToggle();
          onNavigate?.();
        }}
      >
        <span>Accademia</span>
        <span aria-hidden="true">
          {isExpanded ? (
            <ChevronUpIcon className="h-4 w-4" />
          ) : (
            <ChevronDownIcon className="h-4 w-4" />
          )}
        </span>
      </button>

      {isExpanded ? (
        <div id="app-sidebar-academy-children" className="space-y-2 pl-3">
          {APP_SHELL_ACADEMY_NAVIGATION.map((item) => (
            <NavItem
              key={item.key}
              item={item}
              isActive={activeItemKey === item.key}
              onNavigate={onNavigate}
              testId={getNavItemTestId(item.key)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AppSidebar({
  currentPathname,
  onNavigate,
  variant = "desktop",
}: AppSidebarProps) {
  const activeItem = getAppShellNavigationItemFromPath(currentPathname);
  const isAcademyRoute = isAcademyPathname(currentPathname);
  const [isAcademyExpanded, setIsAcademyExpanded] = useState(isAcademyRoute);
  const isDesktop = variant === "desktop";
  const { listeningMode, logoBorderClassName, onLogoToggle } = useAppShellAssistant();
  const { hasProgressionDeadlineWarning } = useAppShellProgression();

  useEffect(() => {
    setIsAcademyExpanded(isAcademyRoute);
  }, [isAcademyRoute]);

  const sidebarClassName = isDesktop
    ? "hidden h-dvh w-56 flex-col border-r border-white/10 bg-background/95 md:flex"
    : "flex h-full w-72 flex-col border-r border-white/10 bg-background";

  const logoAriaLabel =
    listeningMode === "idle"
      ? "Enable voice assistant"
      : "Disable voice assistant";

  return (
    <aside
      data-testid={isDesktop ? "app-sidebar-desktop" : "app-sidebar-mobile"}
      className={sidebarClassName}
      aria-label="Navigazione principale"
    >
      <div className="border-b border-white/10 p-4">
        <button
          type="button"
          data-testid="app-sidebar-logo-toggle"
          className={[
            "block w-full rounded-xl border bg-white/5 px-3 py-3 text-left transition-colors",
            "hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-accent/20",
            logoBorderClassName,
          ].join(" ")}
          onClick={onLogoToggle}
          aria-label={logoAriaLabel}
        >
          <p className="text-lg font-semibold text-foreground">Jarvis</p>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Personal OS</p>
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {APP_SHELL_MAIN_NAVIGATION.map((item) => (
            <Fragment key={item.key}>
              <NavItem
                item={item}
                isActive={activeItem.key === item.key}
                onNavigate={onNavigate}
                showWarning={item.key === "progression" && hasProgressionDeadlineWarning}
              />
              {item.key === "projects" ? (
                <AcademySection
                  isExpanded={isAcademyExpanded}
                  isActive={isAcademyRoute}
                  activeItemKey={activeItem.key}
                  onToggle={() => setIsAcademyExpanded((currentValue) => !currentValue)}
                  onNavigate={onNavigate}
                />
              ) : null}
            </Fragment>
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
