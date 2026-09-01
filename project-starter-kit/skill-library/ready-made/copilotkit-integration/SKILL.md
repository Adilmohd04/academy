---
name: copilotkit-integration
description: >
  Pattern guidelines for building in-app AI copilots, chat sidebars, and agentic UI experiences in Next.js using CopilotKit.
metadata:
  origin: project-starter-kit
---

# CopilotKit Integration & In-App AI Agents

Implementing bidirectional AI-to-UI communication, allowing the AI to read application state and trigger functional UI actions in Next.js and React.

## When to Activate

- When building an in-app AI copilot, chat sidebar, or assistant.
- When you need an LLM to read the current client-side state of your React components.
- When the AI needs to trigger actions or run client-side JavaScript functions (e.g. submit forms, change views, drag inputs).

## Architecture / Key Concepts

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend Layer                 │
│  [Layout Provider] ──> [useCopilotReadable (Expose)]    │
│                    ──> [useCopilotAction (Trigger UI)]  │
└────────────────────────────┬────────────────────────────┘
                             │ (SSE / JSON stream)
                             ▼
┌─────────────────────────────────────────────────────────┐
│                    API Backend Runtime                  │
│               [app/api/copilotkit/route.ts]             │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                       LLM Provider                      │
│            (OpenAI, Anthropic, or Gemini)               │
└─────────────────────────────────────────────────────────┘
```

## Core Types / Interfaces

```typescript
import { CopilotRuntime, copilotRuntimeNextJSAppRouterEndpoint } from "@copilotkit/runtime";

// API endpoints route types
export type CopilotKitEndpointConfig = {
  runtime: CopilotRuntime;
  endpoint: string;
};
```

## Patterns

### 1. App Router Runtime Endpoint
Create the Next.js API route (`app/api/copilotkit/route.ts`) to handle communication streams between the frontend hooks and the LLM runtime:

```typescript
import { CopilotRuntime, copilotRuntimeNextJSAppRouterEndpoint, GoogleGenAIAdapter } from "@copilotkit/runtime";
import { NextRequest } from "next/server";

const serviceAdapter = new GoogleGenAIAdapter({
  model: "gemini-2.0-flash", // or your preferred model
});

const runtime = new CopilotRuntime();

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });
  return handleRequest(req);
};
```

### 2. Client Side Provider Setup
Wrap your root layout (`app/layout.tsx`) or a specific route layout in `<CopilotKit>` to enable the context:

```tsx
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css"; // Required styles

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <CopilotSidebar
        instructions="You are an active assistant helping the user navigate this workspace."
        defaultOpen={false}
        clickOutsideToClose={true}
      >
        {children}
      </CopilotSidebar>
    </CopilotKit>
  );
}
```

### 3. Exposing App State to AI (`useCopilotReadable`)
Use this hook to provide read-only context to the AI about what is currently visible or selected in the UI:

```tsx
'use client';

import { useCopilotReadable } from "@copilotkit/react-core";
import { useState } from "react";

export function DecisionIntakeForm() {
  const [formData, setFormData] = useState({
    decisionName: "Career Pivot",
    timeline: "3 weeks",
    savings: 15000,
  });

  // Expose state to the AI assistant context
  useCopilotReadable({
    description: "The current decision intake form data being drafted by the user.",
    value: formData,
  });

  return (
    <div>
      {/* Your form UI */}
    </div>
  );
}
```

### 4. Registering AI-Executable Actions (`useCopilotAction`)
Define actions the AI can invoke when the user asks it to change settings or make updates:

```tsx
'use client';

import { useCopilotAction } from "@copilotkit/react-core";
import { useState } from "react";

export function SlidersPanel() {
  const [financialWeight, setFinancialWeight] = useState(50);

  // Register action that the AI can call
  useCopilotAction({
    name: "updateFinancialWeight",
    description: "Updates the weight slider representing the user's focus on financial stability.",
    parameters: [
      {
        name: "newWeight",
        type: "number",
        description: "The new weight value from 0 (lowest) to 100 (highest priority).",
        required: true,
      },
    ],
    handler: async ({ newWeight }) => {
      setFinancialWeight(newWeight);
    },
  });

  return (
    <input
      type="range"
      value={financialWeight}
      onChange={(e) => setFinancialWeight(Number(e.target.value))}
    />
  );
}
```

## Implementation Guidelines

- **Next.js SSR Hydration Safety**: Load UI components like `<CopilotSidebar>` inside client components (`'use client'`) to prevent server-side hydration mismatches.
- **Context Minimization**: Avoid sending massive lists or raw DB tables into `useCopilotReadable`. Summarize or filter the data first to keep token consumption and response latencies low.
- **Security Check on Handlers**: Do not register raw destructive actions (like deleting accounts or making payments) without intermediate human confirmation toggles in the handler itself.

## Anti-Patterns

- **Don't expose functions that lack validation**: Always validate parameters inside the `handler` callback of `useCopilotAction`. Do not trust the LLM parameters blindly.
- **Don't use CopilotKit for background loops**: CopilotKit is optimized for real-time human-in-the-loop chat sidebars. For completely autonomous background workflows, use orchestrators like LangGraph or basic CRON scripts instead.

## Example Prompts

- "Add a CopilotKit sidebar to the main dashboard."
- "Expose the current decision results data to the AI chat context using useCopilotReadable."
- "Create a copilot action that allows the AI to update the timeline slider in the intake form."
