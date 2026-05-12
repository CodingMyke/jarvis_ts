// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShellTemplate } from "@/app/design/templates/app-shell/AppShellTemplate";
import { AppSidebar } from "@/app/design/organisms/navigation/AppSidebar";
import { AppTopbar } from "@/app/design/organisms/navigation/AppTopbar";

const appShellMocks = vi.hoisted(() => ({
  pathname: "/dashboard",
}));

const appShellAssistantMocks = vi.hoisted(() => ({
  listeningMode: "idle" as "idle" | "wake_word" | "connected",
  logoBorderClassName: "border-white/10",
  onLogoToggle: vi.fn(),
}));

const appShellProgressionMocks = vi.hoisted(() => ({
  hasProgressionDeadlineWarning: false,
  openProgressionHistory: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => appShellMocks.pathname,
}));

vi.mock("@/app/design/templates/app-shell/useAppShellAssistant", () => ({
  useAppShellAssistant: () => appShellAssistantMocks,
}));

vi.mock("@/app/design/templates/app-shell/AppShellAssistantProvider", () => ({
  AppShellAssistantProvider: ({ children }: React.PropsWithChildren) => children,
}));

vi.mock("@/app/design/templates/app-shell/useAppShellProgression", () => ({
  useAppShellProgression: () => appShellProgressionMocks,
}));

vi.mock("@/app/design/templates/app-shell/AppShellProgressionProvider", () => ({
  AppShellProgressionProvider: ({ children }: React.PropsWithChildren) => children,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("app shell design", () => {
  beforeEach(() => {
    appShellMocks.pathname = "/dashboard";
    appShellAssistantMocks.listeningMode = "idle";
    appShellAssistantMocks.logoBorderClassName = "border-white/10";
    appShellAssistantMocks.onLogoToggle.mockReset();
    appShellProgressionMocks.hasProgressionDeadlineWarning = false;
    appShellProgressionMocks.openProgressionHistory.mockReset();
  });

  it("renders the desktop shell with active item and disabled sections", () => {
    render(
      <AppShellTemplate>
        <div>Dashboard content</div>
      </AppShellTemplate>,
    );

    expect(screen.getAllByText("Jarvis")).not.toHaveLength(0);
    expect(screen.getAllByText("Personal OS")).not.toHaveLength(0);
    const topbar = screen.getByTestId("app-shell-topbar");
    expect(topbar.className).toContain("sticky");
    expect(within(topbar).getByText("Dashboard")).toBeInTheDocument();
    const desktopSidebar = screen.getByTestId("app-sidebar-desktop");
    expect(desktopSidebar.className).toContain("w-56");

    const dashboardItem = within(desktopSidebar).getByTestId("nav-item-dashboard");
    expect(dashboardItem).toHaveAttribute("aria-current", "page");
    expect(within(dashboardItem).queryByText("Presto")).not.toBeInTheDocument();

    const projectsItem = within(desktopSidebar).getByTestId("nav-item-projects");
    expect(projectsItem).toHaveAttribute("aria-disabled", "true");
    expect(projectsItem).toHaveAttribute("data-active", "false");
    expect(within(projectsItem).getByText("Presto")).toBeInTheDocument();

    const progressionItem = within(desktopSidebar).getByTestId("nav-item-progression");
    expect(progressionItem).not.toHaveAttribute("aria-disabled");
    expect(within(progressionItem).queryByText("Presto")).not.toBeInTheDocument();
  });

  it("renders app shell without throwing provider errors", () => {
    expect(() =>
      render(
        <AppShellTemplate>
          <div>Content</div>
        </AppShellTemplate>,
      ),
    ).not.toThrow();
  });

  it("shows disabled placeholder routes as active when opened directly", () => {
    render(
      <AppSidebar currentPathname="/projects" />,
    );

    const projectsItem = screen.getByTestId("nav-item-projects");
    expect(projectsItem).toHaveAttribute("aria-disabled", "true");
    expect(projectsItem).toHaveAttribute("data-active", "true");
  });

  it("expands the academy section on desktop to reveal dashboard, reels, and courses", () => {
    render(<AppSidebar currentPathname="/dashboard" />);

    const desktopSidebar = screen.getByTestId("app-sidebar-desktop");
    expect(within(desktopSidebar).queryByTestId("nav-item-academy-dashboard")).not.toBeInTheDocument();
    expect(within(desktopSidebar).queryByText("Reel")).not.toBeInTheDocument();
    expect(within(desktopSidebar).queryByText("Corsi")).not.toBeInTheDocument();

    fireEvent.click(within(desktopSidebar).getByRole("button", { name: "Apri Accademia" }));

    expect(within(desktopSidebar).getByTestId("nav-item-academy-dashboard")).toBeInTheDocument();
    expect(within(desktopSidebar).getByText("Reel")).toBeInTheDocument();
    expect(within(desktopSidebar).getByText("Corsi")).toBeInTheDocument();
  });

  it("expands the academy section on mobile to reveal dashboard, reels, and courses", () => {
    render(<AppSidebar currentPathname="/dashboard" variant="mobile" />);

    const mobileSidebar = screen.getByTestId("app-sidebar-mobile");
    expect(within(mobileSidebar).queryByTestId("nav-item-academy-dashboard")).not.toBeInTheDocument();
    expect(within(mobileSidebar).queryByText("Reel")).not.toBeInTheDocument();
    expect(within(mobileSidebar).queryByText("Corsi")).not.toBeInTheDocument();

    fireEvent.click(within(mobileSidebar).getByRole("button", { name: "Apri Accademia" }));

    expect(within(mobileSidebar).getByTestId("nav-item-academy-dashboard")).toBeInTheDocument();
    expect(within(mobileSidebar).getByText("Reel")).toBeInTheDocument();
    expect(within(mobileSidebar).getByText("Corsi")).toBeInTheDocument();
  });

  it("marks academy subroutes active and keeps the academy title in the topbar", () => {
    appShellMocks.pathname = "/academy/dashboard";

    const { rerender } = render(<AppShellTemplate><div>Academy content</div></AppShellTemplate>);

    const desktopSidebar = screen.getByTestId("app-sidebar-desktop");
    expect(within(desktopSidebar).getByTestId("nav-item-academy-dashboard")).toBeInTheDocument();
    expect(within(desktopSidebar).getByTestId("nav-item-academy-dashboard")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByTestId("app-shell-topbar")).toHaveTextContent("Accademia");

    appShellMocks.pathname = "/academy/reels";

    rerender(<AppShellTemplate><div>Academy content</div></AppShellTemplate>);

    const reelsDesktopSidebar = screen.getByTestId("app-sidebar-desktop");
    expect(within(reelsDesktopSidebar).getByText("Reel")).toBeInTheDocument();
    expect(within(reelsDesktopSidebar).getByTestId("nav-item-academy-reels")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByTestId("app-shell-topbar")).toHaveTextContent("Accademia");

    appShellMocks.pathname = "/academy/courses";

    rerender(<AppShellTemplate><div>Academy content</div></AppShellTemplate>);

    const rerenderedDesktopSidebar = screen.getByTestId("app-sidebar-desktop");
    expect(within(rerenderedDesktopSidebar).getByText("Corsi")).toBeInTheDocument();
    expect(
      within(rerenderedDesktopSidebar).getByTestId("nav-item-academy-courses"),
    ).toHaveAttribute("aria-current", "page");
    expect(screen.getByTestId("app-shell-topbar")).toHaveTextContent("Accademia");

    appShellMocks.pathname = "/academy/reels/published";

    rerender(<AppShellTemplate><div>Academy content</div></AppShellTemplate>);

    const publishedDesktopSidebar = screen.getByTestId("app-sidebar-desktop");
    expect(within(publishedDesktopSidebar).getByTestId("nav-item-academy-reels")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByTestId("app-shell-topbar")).toHaveTextContent("Accademia");
  });

  it("keeps the academy parent link pointed at /academy/dashboard across academy routes", () => {
    const { rerender } = render(<AppSidebar currentPathname="/academy/reels" />);

    const desktopSidebar = screen.getByTestId("app-sidebar-desktop");
    const academyLink = within(desktopSidebar).getByTestId("nav-item-academy");
    const academyToggle = within(desktopSidebar).getByRole("button", { name: "Chiudi Accademia" });

    expect(academyLink).toHaveAttribute("href", "/academy/dashboard");
    expect(academyLink).not.toHaveAttribute("aria-current");
    expect(academyLink).not.toHaveAttribute("aria-disabled");
    expect(academyToggle).toHaveAttribute("aria-expanded", "true");
    expect(academyToggle).toHaveAttribute("aria-controls", "app-sidebar-academy-children");
    expect(academyToggle).not.toHaveAttribute("aria-current");

    rerender(<AppSidebar currentPathname="/academy/dashboard" />);

    const rerenderedSidebar = screen.getByTestId("app-sidebar-desktop");
    expect(within(rerenderedSidebar).getByTestId("nav-item-academy")).toHaveAttribute(
      "href",
      "/academy/dashboard",
    );
    expect(within(rerenderedSidebar).getByTestId("nav-item-academy")).toHaveAttribute(
      "data-active",
      "true",
    );
  });

  it("uses the chevron as toggle only and keeps row navigation separate", () => {
    const onNavigate = vi.fn();

    render(<AppSidebar currentPathname="/dashboard" onNavigate={onNavigate} />);

    const desktopSidebar = screen.getByTestId("app-sidebar-desktop");
    const academyLink = within(desktopSidebar).getByTestId("nav-item-academy");
    const academyToggle = within(desktopSidebar).getByRole("button", { name: "Apri Accademia" });

    fireEvent.click(academyToggle);

    expect(onNavigate).not.toHaveBeenCalled();
    expect(academyToggle).toHaveAttribute("aria-expanded", "true");
    expect(academyLink).toHaveAttribute("href", "/academy/dashboard");

    fireEvent.click(academyLink);

    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it("renders logo control as button and toggles assistant without navigation", () => {
    render(<AppSidebar currentPathname="/dashboard" />);

    const logoButton = screen.getByTestId("app-sidebar-logo-toggle");
    expect(logoButton.tagName).toBe("BUTTON");
    expect(logoButton).toHaveClass("border-white/10");

    fireEvent.click(logoButton);

    expect(appShellAssistantMocks.onLogoToggle).toHaveBeenCalledOnce();
  });

  it("applies wake-word and connected border colors", () => {
    appShellAssistantMocks.listeningMode = "wake_word";
    appShellAssistantMocks.logoBorderClassName = "border-amber-400/80";

    const { rerender } = render(<AppSidebar currentPathname="/dashboard" />);
    expect(screen.getByTestId("app-sidebar-logo-toggle")).toHaveClass("border-amber-400/80");

    appShellAssistantMocks.listeningMode = "connected";
    appShellAssistantMocks.logoBorderClassName = "border-cyan-400/80";

    rerender(<AppSidebar currentPathname="/dashboard" />);
    expect(screen.getByTestId("app-sidebar-logo-toggle")).toHaveClass("border-cyan-400/80");
  });

  it("selects topbar title from shared navigation config", () => {
    const { rerender } = render(
      <AppTopbar currentPathname="/settings" onOpenMobileSidebar={vi.fn()} />,
    );

    expect(screen.getByText("Impostazioni")).toBeInTheDocument();

    rerender(<AppTopbar currentPathname="/learning" onOpenMobileSidebar={vi.fn()} />);

    expect(screen.getByText("Apprendimento")).toBeInTheDocument();
  });

  it("shows progression warning badges on desktop and mobile navigation", () => {
    appShellProgressionMocks.hasProgressionDeadlineWarning = true;

    render(
      <>
        <AppSidebar currentPathname="/dashboard" />
        <AppSidebar currentPathname="/dashboard" variant="mobile" />
      </>,
    );

    const desktopSidebar = screen.getByTestId("app-sidebar-desktop");
    const mobileSidebar = screen.getByTestId("app-sidebar-mobile");

    expect(
      within(desktopSidebar).getByTestId("nav-warning-progression"),
    ).toBeInTheDocument();
    expect(
      within(mobileSidebar).getByTestId("nav-warning-progression"),
    ).toBeInTheDocument();
    expect(
      within(desktopSidebar).queryByTestId("nav-warning-dashboard"),
    ).not.toBeInTheDocument();
  });

  it("shows the progression history button in the topbar on the progression route", () => {
    appShellMocks.pathname = "/progression";
    appShellProgressionMocks.openProgressionHistory = vi.fn();

    render(
      <AppShellTemplate>
        <div>Progression content</div>
      </AppShellTemplate>,
    );

    const topbar = screen.getByTestId("app-shell-topbar");
    const historyButton = within(topbar).getByRole("button", { name: "Cronologia XP" });

    expect(historyButton).toBeInTheDocument();

    fireEvent.click(historyButton);

    expect(appShellProgressionMocks.openProgressionHistory).toHaveBeenCalledOnce();
  });
});
