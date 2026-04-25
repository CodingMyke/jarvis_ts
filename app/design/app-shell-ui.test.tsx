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

vi.mock("next/navigation", () => ({
  usePathname: () => appShellMocks.pathname,
}));

vi.mock("@/app/design/templates/app-shell/useAppShellAssistant", () => ({
  useAppShellAssistant: () => appShellAssistantMocks,
}));

vi.mock("@/app/design/templates/app-shell/AppShellAssistantProvider", () => ({
  AppShellAssistantProvider: ({ children }: React.PropsWithChildren) => children,
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
});
