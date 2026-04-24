---
name: react
description: React implementation guidelines for component design, state management, hooks, context, and store decisions. Use when writing or refactoring React components and client-side UI architecture.
---

# React Implementation Guide

## Scope
- Use this skill when writing or refactoring React components
- Use this skill when deciding between local state, custom hooks, local context, or Zustand
- Use this skill together with `code-style` when the task also changes file structure or component placement

## Component Design
- Use functional components with hooks
- Prefer small, focused components with a single clear responsibility
- Prefer composition over large monolithic components
- Keep presentational components free from data fetching and domain mutation logic when possible
- Split large components by responsibility first, not by arbitrary line count
- Avoid deeply nested JSX when a smaller subcomponent would make intent clearer
- A component tree should expose the minimum public props needed by its parent

## Hooks
- Prefer derived state before introducing new state
- Minimize `useState` and `useEffect`; add them only when they represent real UI state or a real external synchronization
- Extract non-trivial component logic into custom hooks
- Keep each custom hook focused on one behavior or coordination concern
- Do not define non-trivial custom hooks in the same file as an exported component
- Put shared hooks in the related feature or alongside the owning subtree when they are local

## State Management Decision Rules
- Use local component state for isolated UI state
- Use a custom hook when the main need is behavior reuse or stateful logic reuse
- Use local React context when state is shared by one component and its descendants inside the same subtree
- Do not introduce a global store just to reduce prop drilling
- Use Zustand only for domain-level shared state that is consumed or mutated from multiple independent parts of the app
- Do not create screen-wide stores unless the state truly crosses subtree boundaries
- UI-only transient state such as hover, expansion, temporary dialogs, and local selection should stay out of Zustand unless multiple independent branches need it

## Context vs Zustand
- Prefer local context for one subtree with one responsibility
- Prefer Zustand for reusable domain state, remote collections, or app-wide client caches
- If two domains behave the same from a UX and lifecycle perspective, structure them with the same architectural pattern unless there is a strong reason not to
- Stores should live under the related feature (`app/_features/<domain>/state`)
- Context values should be narrow and specific; avoid dumping an entire screen model into one context unless the whole subtree truly depends on it

## UI Architecture
- Redesign components based on their real responsibility and interaction model
- Prefer templates and organisms that orchestrate smaller parts cleanly
- Keep domain orchestration in feature hooks or domain modules, not in leaf UI components
- Avoid mixing domain mapping, network calls, state orchestration, and large JSX trees in the same component
- Model domains with equivalent UX and lifecycle in a symmetrical way

## Practical Defaults
- Start with local state
- Promote to a custom hook when logic is reused or obscures the component
- Promote to local context when multiple descendants need the same subtree-local state
- Promote to Zustand only when the state becomes a true shared domain concern
