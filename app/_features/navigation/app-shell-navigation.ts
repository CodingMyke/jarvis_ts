export type AppShellSectionKey =
  | "dashboard"
  | "projects"
  | "academy"
  | "academyReels"
  | "academyCourses"
  | "reflections"
  | "learning"
  | "progression"
  | "news"
  | "settings";

export interface AppShellNavigationItem {
  key: AppShellSectionKey;
  href: `/${string}`;
  label: string;
  title: string;
  enabled: boolean;
}

export const APP_SHELL_MAIN_NAVIGATION: readonly AppShellNavigationItem[] = [
  {
    key: "dashboard",
    href: "/dashboard",
    label: "Dashboard",
    title: "Dashboard",
    enabled: true,
  },
  {
    key: "projects",
    href: "/projects",
    label: "Progetti",
    title: "Progetti",
    enabled: false,
  },
  {
    key: "reflections",
    href: "/reflections",
    label: "Riflessioni",
    title: "Riflessioni",
    enabled: false,
  },
  {
    key: "learning",
    href: "/learning",
    label: "Apprendimento",
    title: "Apprendimento",
    enabled: false,
  },
  {
    key: "progression",
    href: "/progression",
    label: "Progressione",
    title: "Progressione",
    enabled: true,
  },
  {
    key: "news",
    href: "/news",
    label: "Notizie",
    title: "Notizie",
    enabled: false,
  },
] as const;

export const APP_SHELL_ACADEMY_NAVIGATION = [
  {
    key: "academyReels",
    href: "/academy/reels",
    label: "Reel",
    title: "Accademia",
    enabled: true,
  },
  {
    key: "academyCourses",
    href: "/academy/courses",
    label: "Corsi",
    title: "Accademia",
    enabled: true,
  },
] as const satisfies readonly AppShellNavigationItem[];

export const APP_SHELL_ACADEMY_NAVIGATION_ITEM: AppShellNavigationItem = {
  key: "academy",
  href: "/academy",
  label: "Accademia",
  title: "Accademia",
  enabled: true,
};

export const APP_SHELL_SETTINGS_NAVIGATION: AppShellNavigationItem = {
  key: "settings",
  href: "/settings",
  label: "Impostazioni",
  title: "Impostazioni",
  enabled: true,
};

const APP_SHELL_ALL_NAVIGATION: readonly AppShellNavigationItem[] = [
  ...APP_SHELL_MAIN_NAVIGATION,
  ...APP_SHELL_ACADEMY_NAVIGATION,
  APP_SHELL_ACADEMY_NAVIGATION_ITEM,
  APP_SHELL_SETTINGS_NAVIGATION,
];

export function isAcademyPathname(pathname: string | null | undefined): boolean {
  const safePathname = pathname && pathname.trim().length > 0 ? pathname : "/dashboard";

  return safePathname === APP_SHELL_ACADEMY_NAVIGATION_ITEM.href
    || safePathname.startsWith(`${APP_SHELL_ACADEMY_NAVIGATION_ITEM.href}/`);
}

export function getAppShellNavigationItemFromPath(
  pathname: string | null | undefined,
): AppShellNavigationItem {
  const safePathname = pathname && pathname.trim().length > 0 ? pathname : "/dashboard";

  const matchingItem = APP_SHELL_ALL_NAVIGATION.find((item) => (
    safePathname === item.href || safePathname.startsWith(`${item.href}/`)
  ));

  return matchingItem ?? APP_SHELL_MAIN_NAVIGATION[0];
}
