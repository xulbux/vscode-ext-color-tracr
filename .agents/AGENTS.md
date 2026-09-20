# Agent Guidelines for `color-tracr`

When working on this repository, any AI agent or automated assistant must adhere strictly to the following rules to maintain the codebase's integrity, performance, and correctness.

## 1. Package Manager

This project uses **pnpm** as its package manager. Always use `pnpm` (e.g., `pnpm i`, `pnpm run <script>`, `pnpm exec <tool>`, `pnpm dlx <tool>`). **Never** use `npm`, `npx`, or `yarn`.

## 2. Strict Typing

Everything must be meticulously and strictly type-hinted. Do not ever use `any` unless it is fundamentally impossible to type otherwise. All code must be fully statically analyzable.

-   **No `@ts-ignore` Comments:** `@ts-ignore` comments are forbidden. You must instead use `@ts-expect-error` with a descriptive reason comment (e.g., `// @ts-expect-error: VS Code API returns unknown`). The ONLY exception is when `@ts-expect-error` itself fails because the error actually occurs, and rewriting the code to bypass the error would decrease performance or reduce readability.

## 3. Performance & Lightweight Design

This is a VS Code extension that runs on every keystroke and file open. **Performance is critical** – both startup time and per-scan throughput.

-   **Lazy Initialization:** Avoid eager computation at module load time. Defer heavy work (regex compilation, data structure construction) until first use where practical.
-   **Regex Best Practices:** Prefer non-backtracking patterns. Use possessive-style character classes with word-boundary lookaheads instead of relying on regex backtracking.
-   **Avoid Unnecessary Allocations:** Reuse objects and arrays where possible. Prefer `for` loops over `.map()/.filter()` chains when the intermediate arrays aren't needed.
-   **DRY Principle (Don't Repeat Yourself):** Always strive to prevent redundant code and duplicate logic. Abstract repeated patterns into reusable helper functions. When a feature depends on data produced by multiple processing stages (e.g., regex matches, named colors, @property definitions), always feed **all** sources into a single unified code path instead of tapping only one source and duplicating the handling for others.
-   **Bundle Size:** The extension is bundled with esbuild into a single `dist/extension.js`. Avoid adding heavyweight npm dependencies – prefer small, focused utility functions written in-house.
-   **Correctness over Coverage:** Rather not mark something than risk marking it incorrectly. Preventing false positives is more important than achieving 100% color detection.

## 4. Validation & Testing

After making any code changes, you must validate them by running the full suite of formatters, linters, type checkers, and tests:

```bash
pnpm run type-check; pnpm run lint; pnpm run fmt; pnpm run compile; pnpm run test
```

Fix all problems and warnings until they are completely resolved (zero errors, zero warnings, and zero lint issues). Use the `test` skill for testing guidelines and commands, and the `build` skill for packaging and installation.

-   **Regression Tests for Bug Fixes:** Every bug fix **must** include a test that reproduces the original bug and verifies the fix. If such a test does not already exist, create one in `test/issues.test.ts` before considering the fix complete. This prevents regressions and ensures the same problem never resurfaces.

## 5. Ask, Don't Assume

If you run into anything you are not sure about (ambiguous requirements, complex architectural decisions, edge cases), **ask first**. Do not make assumptions about the desired behavior.

## 6. Code Structure & Readability

-   **Logical Placement:** Do not mindlessly append new code to the end of a file. Always insert new code in a logical location that groups related functionality together.
-   **Private Constants Placement:** Private constants and module-level variables (e.g., regex patterns, lookup tables, caches) should always be defined directly below the imports at the top of the file.
-   **Spacing & Formatting:** Keep the code "spacy" and readable, matching the current formatting conventions of the repository.
-   **Imports Placement:** Always place imports at the top of the file.
-   **Naming Conventions:**
    -   **Descriptive Variable Names (CRITICAL):** Single-letter variables (e.g., `x`, `c`, `r`) are strictly banned. You MUST use fully descriptive variable names (e.g., `ch` or `channel`, `red`, `modifier`). The ONLY exceptions are `i` (and rarely `j`) for loop indices, and `n` for mathematical counts.
    -   **Predicates & Booleans:** Predicate functions and boolean properties must always start with `is` or `has` (e.g., `isValidColor`, `hasAlpha`, `isInsideComment`).
    -   **Verb-First for Actions & Getters:** Functions performing actions or fetching data should start with an active verb (e.g., `extractColors`, `getVariable`, `resolveAliases`).
-   **Organization:** When introducing large data structures (like hardcoded maps or arrays), keep them strictly organized and structured. Default to sorting elements alphabetically unless a specific logical order is required.
-   **Maintain Documentation Integrity:** Preserve all existing comments and docstrings that are unrelated to your code changes, unless the user specifies otherwise.
-   **Comments:** Use JSDoc for all exported functions and types. Internal helpers should have at least a brief one-liner comment explaining purpose.
-   **Section Separators:** To visually separate distinct logical sections of code (e.g., groups of tests, regions in fixture files, feature areas in large modules), use **block-comment separators** padded with `*` characters at one of two fixed widths:
    -   **Top-Level Separators:** Exactly **90 characters** wide – used for major file-level sections.
    -   **Internal Separators:** Exactly **65 characters** wide – used for sub-sections inside a class or block (indentation is not counted toward the width).
    -   **Text Formatting:** The text must be in **Title Case** and padded with a single space on each side before the `*` characters.
    -   **Centering & Parity:** Center the text within the `*` padding. When the total `*` padding is odd, the **left** side gets **one fewer `*`** than the right.
    -   **Example (top-level, 90 chars):** `/********************************* Variable Definitions *********************************/`
    -   **Example (internal, 65 chars):** `/************************* Edge Cases **************************/`

## 7. Rule & Skill Authoring (Single Source of Truth)

To keep agent guidelines clean, maintainable, and free of contradictions, adhere strictly to the Single Source of Truth (SSOT) principle:

-   **Define Once:** Every rule, standard, or guideline must be defined in exactly ONE canonical location:
    -   **`AGENTS.md`:** Repository-wide core policies (strict typing, performance, code structure, naming conventions, validation).
    -   **Skills (`.agents/skills/<skill>/SKILL.md`):** Specialized domain-specific workflows (`test` for test suite guidelines; `build` for packaging and installation).
-   **Reference, Never Duplicate:** When a rule defined in one location also applies in another, do NOT duplicate or re-explain the rule. Instead, reference and point directly to its canonical definition.
-   **Synchronize References:** If a canonical rule is updated or moved, verify that all external references pointing to it are kept accurate.
