// @vitest-environment jsdom
// used the fkg testing skill zioo

import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MicrophoneIcon } from "@/app/design/atoms/shared/icons/MicrophoneIcon";
import { ChatBubble } from "@/app/design/molecules/assistant/ChatBubble";
import { AssistantActionsLink } from "@/app/design/organisms/assistant/AssistantActionsLink";
import { AssistantClock } from "@/app/design/organisms/assistant/AssistantClock";
import { FloatingChat } from "@/app/design/organisms/assistant/FloatingChat";
import { FloatingChatProvider } from "@/app/design/organisms/assistant/floating-chat/FloatingChatContext";
import { VoiceOrbPanel } from "@/app/design/organisms/assistant/VoiceOrbPanel";
import { useFloatingChatContext } from "@/app/design/organisms/assistant/floating-chat/useFloatingChatContext";
import { AssistantStatusPanel } from "@/app/design/organisms/assistant/AssistantStatusPanel";
import { useAssistantDateTime } from "@/app/design/templates/assistant/useAssistantDateTime";

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

function DateTimeProbe() {
  const { date, dateRef, day, dayRef, time, timeRef } = useAssistantDateTime();

  return (
    <AssistantClock
      day={day}
      date={date}
      time={time}
      timeRef={timeRef}
      dayRef={dayRef}
      dateRef={dateRef}
    />
  );
}

function FloatingContextProbe() {
  const {
    isDialogAnimatedIn,
    isDialogVisible,
    isExpanded,
    isHovered,
    showControls,
    closeDeleteDialog,
    confirmDelete,
    handleMouseEnter,
    handleMouseLeave,
    openDeleteDialog,
    toggleExpanded,
  } = useFloatingChatContext();

  return (
    <div>
      <span data-testid="expanded">{String(isExpanded)}</span>
      <span data-testid="hovered">{String(isHovered)}</span>
      <span data-testid="controls">{String(showControls)}</span>
      <span data-testid="dialog-visible">{String(isDialogVisible)}</span>
      <span data-testid="dialog-animated">{String(isDialogAnimatedIn)}</span>
      <button onClick={handleMouseEnter}>enter</button>
      <button onClick={handleMouseLeave}>leave</button>
      <button onClick={toggleExpanded}>toggle</button>
      <button onClick={openDeleteDialog}>open</button>
      <button onClick={closeDeleteDialog}>close</button>
      <button onClick={confirmDelete}>confirm</button>
    </div>
  );
}

describe("assistant design", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T09:30:00+01:00"));
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0)),
    );
    vi.stubGlobal(
      "cancelAnimationFrame",
      vi.fn((frameId: number) => window.clearTimeout(frameId)),
    );

    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        return 480;
      },
    });

    Object.defineProperty(HTMLElement.prototype, "scrollTop", {
      configurable: true,
      writable: true,
      value: 0,
    });
  });

  it("throws when the floating chat context is used outside its provider", () => {
    expect(() => renderHook(() => useFloatingChatContext())).toThrow(
      "useFloatingChatContext must be used within FloatingChatProvider",
    );
  });

  it("renders floating chat messages, auto-scrolls and confirms chat deletion", async () => {
    const onDeleteChat = vi.fn();
    const { container } = render(
      <FloatingChat
        messages={[
          {
            id: "assistant-1",
            text: "**Aggiornamento** completato",
            thinking: "Verifico i dettagli",
            isUser: false,
          },
        ]}
        title=" Sessione attiva "
        onDeleteChat={onDeleteChat}
      />,
    );

    const scrollContainer = container.querySelector(".chat-fade-top") as HTMLDivElement;
    expect(scrollContainer.scrollTop).toBe(480);

    fireEvent.click(screen.getByLabelText("Espandi chat"));

    expect(screen.getByText("Sessione attiva")).toBeInTheDocument();
    expect(screen.getByText("Aggiornamento")).toBeInTheDocument();
    expect(screen.getByText(/Ragionamento/)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Elimina chat" })[0] as HTMLElement);

    expect(
      screen.getByText(/Sei sicuro di voler eliminare definitivamente questa chat/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Elimina chat" })[1] as HTMLElement);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(onDeleteChat).toHaveBeenCalledOnce();
  });

  it("renders nothing when the floating chat has no messages", () => {
    const { container } = render(<FloatingChat messages={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("updates the floating chat provider state for hover, expansion and dialog lifecycle", async () => {
    const onDeleteChat = vi.fn();
    render(
      <FloatingChatProvider onDeleteChat={onDeleteChat}>
        <FloatingContextProbe />
      </FloatingChatProvider>,
    );

    fireEvent.click(screen.getByText("enter"));
    expect(screen.getByTestId("hovered")).toHaveTextContent("true");
    expect(screen.getByTestId("controls")).toHaveTextContent("true");

    fireEvent.click(screen.getByText("leave"));
    expect(screen.getByTestId("hovered")).toHaveTextContent("false");

    fireEvent.click(screen.getByText("toggle"));
    expect(screen.getByTestId("expanded")).toHaveTextContent("true");
    expect(screen.getByTestId("controls")).toHaveTextContent("true");

    fireEvent.click(screen.getByText("open"));
    expect(screen.getByTestId("dialog-visible")).toHaveTextContent("true");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByTestId("dialog-animated")).toHaveTextContent("true");

    fireEvent.click(screen.getByText("close"));
    expect(screen.getByTestId("dialog-visible")).toHaveTextContent("true");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(screen.getByTestId("dialog-visible")).toHaveTextContent("false");

    fireEvent.click(screen.getByText("toggle"));
    fireEvent.click(screen.getByText("open"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    fireEvent.click(screen.getByText("confirm"));

    expect(onDeleteChat).toHaveBeenCalledOnce();
    expect(screen.getByTestId("expanded")).toHaveTextContent("false");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(screen.getByTestId("dialog-visible")).toHaveTextContent("false");
  });

  it("updates the assistant clock refs over time", async () => {
    render(<DateTimeProbe />);

    const initialTime = new Date().toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });

    expect(screen.getByText(initialTime)).toBeInTheDocument();

    vi.setSystemTime(new Date("2026-03-15T09:31:00+01:00"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    const updatedTime = new Date().toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });

    expect(screen.getByText(updatedTime)).toBeInTheDocument();
  });

  it("renders user, markdown and thinking chat bubbles", () => {
    const markdown = [
      "# Titolo",
      "## Sottotitolo",
      "### Sezione",
      "Paragrafo con **grassetto**, *corsivo* e `inline`.",
      "",
      "- Primo",
      "- Secondo",
      "",
      "1. Uno",
      "2. Due",
      "",
      "> Nota utile",
      "",
      "[Documentazione](https://example.com)",
      "",
      "```ts",
      "const answer = 42;",
      "```",
    ].join("\n");

    const { container, rerender } = render(
      <ChatBubble
        message={{
          id: "assistant-1",
          text: markdown,
          thinking: "Sto ragionando",
          isUser: false,
        }}
        isExpanded
      />,
    );

    expect(screen.getByText("Titolo")).toBeInTheDocument();
    expect(screen.getByText("Sottotitolo")).toBeInTheDocument();
    expect(screen.getByText("Sezione")).toBeInTheDocument();
    expect(screen.getByText("grassetto").tagName).toBe("STRONG");
    expect(screen.getByText("corsivo").tagName).toBe("EM");
    expect(screen.getByText("Primo").tagName).toBe("LI");
    expect(screen.getByText("Uno").tagName).toBe("LI");
    expect(screen.getByRole("link", { name: "Documentazione" })).toHaveAttribute(
      "href",
      "https://example.com",
    );
    expect(container.querySelector("blockquote")).toHaveTextContent("Nota utile");
    expect(container.querySelector("pre")).toHaveTextContent("const answer = 42;");
    expect(container.querySelector("code.font-mono")).toHaveTextContent("inline");
    expect(screen.getByText("Sto ragionando")).toBeInTheDocument();

    rerender(
      <ChatBubble
        message={{
          id: "user-1",
          text: "Messaggio utente",
          isUser: true,
        }}
      />,
    );

    expect(screen.getByText("Messaggio utente")).toBeInTheDocument();

    rerender(
      <ChatBubble
        message={{
          id: "assistant-2",
          text: "",
          thinking: "Solo pensiero",
          isUser: false,
        }}
      />,
    );

    expect(screen.getByText("Solo pensiero")).toBeInTheDocument();
  });

  it("renders the voice orb, assistant status and actions link", () => {
    const onClick = vi.fn();
    render(
      <>
        <VoiceOrbPanel state="speaking" audioLevel={0.8} onClick={onClick} />
        <AssistantStatusPanel assistantName="Jarvis" listeningMode="wake_word" />
        <AssistantActionsLink />
        <MicrophoneIcon />
      </>,
    );

    const orb = screen.getByRole("button", { name: "Ferma assistente vocale" });

    fireEvent.pointerDown(orb);
    fireEvent.pointerUp(orb);
    fireEvent.keyDown(orb, { key: "Enter" });
    fireEvent.click(orb);

    expect(onClick).toHaveBeenCalledTimes(2);
    expect(screen.getByText('In attesa... Dì "Jarvis"')).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Impostazioni" })).toHaveAttribute(
      "href",
      "/settings",
    );
  });
});
