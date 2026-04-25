// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Button } from "@/app/design/atoms/shared/Button";
import { AuthButton } from "@/app/design/molecules/auth/AuthButton";
import { LoginTemplate } from "@/app/design/templates/auth/LoginTemplate";
import { SettingsTemplate } from "@/app/design/templates/settings/SettingsTemplate";

const authUiMocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  useAuth: vi.fn(),
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

vi.mock("next/image", () => ({
  default: ({
    alt,
    src,
    ...props
    }: {
      alt: string;
      src: string;
    }) =>
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt} src={src} {...props} />,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => authUiMocks.searchParams,
}));

vi.mock("@/app/_features/auth/hooks/useAuth", () => ({
  useAuth: authUiMocks.useAuth,
}));

describe("auth design", () => {
  beforeEach(() => {
    authUiMocks.searchParams = new URLSearchParams();
    authUiMocks.useAuth.mockReset();
  });

  it("renders buttons for loading, signed-in and signed-out auth states", () => {
    const signInWithGoogle = vi.fn();
    const signOut = vi.fn();
    authUiMocks.useAuth.mockReturnValueOnce({
      isLoading: true,
      user: null,
      signInWithGoogle,
      signOut,
    });

    const { rerender } = render(<AuthButton redirectToAfterLogin="/dashboard" />);
    expect(screen.getByText("...")).toBeInTheDocument();

    authUiMocks.useAuth.mockReturnValueOnce({
      isLoading: false,
      user: {
        email: "myke@example.com",
      },
      signInWithGoogle,
      signOut,
    });

    rerender(<AuthButton redirectToAfterLogin="/dashboard" />);
    fireEvent.click(screen.getByRole("button", { name: "Esci" }));
    expect(signOut).toHaveBeenCalledOnce();

    authUiMocks.useAuth.mockReturnValueOnce({
      isLoading: false,
      user: null,
      signInWithGoogle,
      signOut,
    });

    rerender(<AuthButton redirectToAfterLogin="/dashboard" />);
    fireEvent.click(screen.getByRole("button", { name: "Accedi con Google" }));
    expect(signInWithGoogle).toHaveBeenCalledWith("/dashboard");
  });

  it("renders the login template and decodes auth errors from the query string", () => {
    authUiMocks.searchParams = new URLSearchParams("error=Sessione%20scaduta&next=%2Fassistant");
    const signInWithGoogle = vi.fn();
    authUiMocks.useAuth.mockReturnValue({
      isLoading: false,
      user: null,
      signInWithGoogle,
      signOut: vi.fn(),
    });

    render(<LoginTemplate />);

    expect(screen.getByText("Jarvis")).toBeInTheDocument();
    expect(screen.getByText("Voice Workspace")).toBeInTheDocument();
    expect(screen.getByText("Sessione scaduta")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Accedi con Google" }));
    expect(signInWithGoogle).toHaveBeenCalledWith("/assistant");
  });

  it("renders settings for loading, missing users and authenticated users", () => {
    authUiMocks.useAuth.mockReturnValueOnce({
      isLoading: true,
      user: null,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
    });

    const { rerender } = render(<SettingsTemplate />);
    expect(screen.getByText("Caricamento...")).toBeInTheDocument();

    authUiMocks.useAuth.mockReturnValueOnce({
      isLoading: false,
      user: null,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
    });

    rerender(<SettingsTemplate />);
    expect(screen.getByText("Nessun account collegato.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Accedi" })).toHaveAttribute("href", "/");

    const signOut = vi.fn();
    authUiMocks.useAuth.mockReturnValueOnce({
      isLoading: false,
      user: {
        email: "jarvis@example.com",
        user_metadata: {
          avatar_url: "https://example.com/avatar.png",
          full_name: "Jarvis User",
        },
      },
      signInWithGoogle: vi.fn(),
      signOut,
    });

    rerender(<SettingsTemplate />);

    expect(screen.getByText("Account Google")).toBeInTheDocument();
    expect(screen.getByText("Jarvis User")).toBeInTheDocument();
    expect(screen.getByTitle("jarvis@example.com")).toBeInTheDocument();
    expect(screen.getByAltText("Avatar")).toHaveAttribute(
      "src",
      "https://example.com/avatar.png",
    );

    fireEvent.click(screen.getByRole("button", { name: "Esci" }));
    expect(signOut).toHaveBeenCalledOnce();
    expect(screen.queryByRole("link", { name: "Torna all'assistente" })).not.toBeInTheDocument();
  });

  it("renders the shared button variants", () => {
    const onClick = vi.fn();
    render(
      <>
        <Button variant="primary" onClick={onClick}>
          Primario
        </Button>
        <Button variant="secondary">Secondario</Button>
        <Button variant="recording">Recording</Button>
      </>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Primario" }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Recording" })).toBeInTheDocument();
  });
});
