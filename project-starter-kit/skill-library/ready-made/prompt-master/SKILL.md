---
name: prompt-master
description: >
  Pattern guidelines for structuring, testing, and optimizing AI prompts for any model (OpenAI, Gemini, Claude, etc.) using the Prompt Master methodology.
metadata:
  origin: project-starter-kit
---

# Prompt Master — Universal Prompt Optimization

Designing clean, token-efficient, and structured system instructions for LLMs that guarantee reliable output schemas (JSON/XML) and eliminate hallucinations.

## When to Activate

- When drafting system prompts or user prompts for your AI agents and features.
- When configuring structured outputs (like JSON response requirements) for model APIs.
- When optimizing existing prompts to decrease token sizes and increase execution speed.

## Architecture / Key Concepts

### The Universal Fingerprint Method (4 Questions)
To create any optimized prompt, first run the goal through this diagnostic fingerprint:
1. **Goal**: What exactly is the AI's role and expected deliverable?
2. **Context**: What data, variables, or state will the AI receive?
3. **Constraints**: What are the strict rules, limits, or styling choices it must follow?
4. **Target Model**: What specific model is executing this prompt (determines XML vs JSON formatting, system instruction configurations, etc.)?

---

## Core Types / Interfaces

```typescript
// The schema definition for prompt variables
export interface PromptContext {
  role: string;
  instructions: string[];
  outputFormat: "json" | "xml" | "markdown";
  jsonSchema?: object;
  examples?: Array<{ input: string; output: string }>;
}
```

## Patterns

### 1. The Structured Output System Prompt
Ensure the LLM strictly returns raw JSON that maps to your application types without markdown clutter. Include strict guidelines on how to handle empty data and unexpected inputs:

```
You are an expert system analyzer. Your sole task is to analyze the user's decision context and output a valid JSON object matching the schema below.

[RULES]
1. DO NOT wrap the output in markdown code blocks (e.g. no ```json).
2. DO NOT add any trailing conversational text before or after the JSON.
3. Every numeric score must be an integer between 0 and 100.
4. If a field cannot be computed, return a null value.

[CONTEXT]
User Decision: {{decision}}
Timeline: {{timeline}}

[JSON SCHEMA]
{
  "assumptions": [
    {
      "assumption": "string",
      "why_wrong": "string",
      "what_changes": "string"
    }
  ],
  "confidence_score": "number"
}

[RESPONSE]
```

### 2. Conversational Refusal / Alignment
Prevent AI from making decisions for the user (Responsible AI):

```
[CONSTRAINTS]
- You must act as a decision advisor and analyst.
- You are strictly FORBIDDEN from choosing an option for the user or recommending a specific path.
- If the user asks "What should I do?" or "Which option is better?", you must refuse politely and list the tradeoffs of both options, letting the user make the final choice.
```

## Implementation Guidelines

- **Gemini JSON Enforcement**: When querying Gemini models (like `gemini-2.0-flash`), configure the model initialization with `responseMimeType: 'application/json'` in the generation config. This guarantees the model outputs a valid JSON string matching your schema.
- **Prompt Token Budgets**: Avoid verbose padding. Keep instructions direct, active, and command-focused. Every 100 extra tokens in a system prompt adds cost and latency to every user interaction.
- **Markdown Sanitization**: Always sanitize JSON strings on the client side to strip accidental backticks (` ```json ` or ` ``` `) in case the model overrides the system constraints.

## Anti-Patterns

- **Avoid the "Expert Role" Fallacy**: Writing "Act as a senior software engineer who went to Harvard" consumes tokens without improving performance. Instead, provide concrete rules and reference schemas.
- **Don't leave data parsing open-ended**: Asking the AI to "output some details about the scenarios" leads to unpredictable frontend crashes. Always define a strict JSON schema.

## Example Prompts

- "Optimize my system prompt using Prompt Master rules."
- "Write a system instruction block that guarantees raw JSON output for Gemini."
- "Create an adversarial testing prompt to check if my agent breaks under invalid inputs."
