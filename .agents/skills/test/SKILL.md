---
name: test
description: Guidelines and commands for running tests and maintaining the Color Tracr test suite.
---

# Test

In accordance with the validation policy in `AGENTS.md` Section 4, use this skill to create, organize, run, and maintain tests for Color Tracr.

---

## 1. Architecture

Tests use **vitest** and are located in the `test/` directory. The core function `extractColors()` from `src/core/colorParser.ts` is a pure function – it takes `(text, languageId, options)` and returns `ColorMatch[]`. Tests call it directly without needing a VS Code instance.

### Key Files

| File                       | Purpose                                                                        |
| -------------------------- | ------------------------------------------------------------------------------ |
| `test/languages.test.ts`   | Per-language fixture tests – basic detection across all languages              |
| `test/issues.test.ts`      | Bug regression tests from ISSUES.md (must never regress)                       |
| `test/config.test.ts`      | Config option toggle tests (named colors, variables, raw formats, ARGB, alpha) |
| `test/helpers.ts`          | `defaultConfig()`, `readFixture()`, `matchAtOccurrence()` helpers              |
| `test/fixtures/`           | Sample files in various languages (CSS, SCSS, JS, etc.)                        |
| `test/__mocks__/vscode.ts` | Minimal VS Code API mock for transitive imports                                |
| `vitest.config.mts`        | Vitest config with `@/` path alias and vscode mock                             |

### Global State

The `variableManager` stores variables globally. Always call `clearAllVariables()` in `afterEach` to reset state between tests:

```typescript
import { clearAllVariables } from '@/core/variableManager';

afterEach(() => clearAllVariables());
```

---

## 2. Test Organization

1.  **Group by Feature Area:** Use `describe()` blocks organized by feature (e.g., "SASS Issues", "CSS Issues", "C# Issues", "Core: test.css").
2.  **Descriptive Names:** Test names should clearly state what is being verified:
    -   ✅ `'S3: Variable definition name $blue is NOT highlighted as named color'`
    -   ❌ `'test blue variable'`
3.  **Both Positive and Negative Assertions:** For each feature, test both:
    -   Correct matches ARE produced (position, RGBA values)
    -   False positives are NOT produced (suppressions work)
4.  **Fixture-Driven:** Tests read from fixture files in `test/fixtures/`. For bug reproductions, create dedicated fixture files (e.g., `issues-sass.scss`).

---

## 3. Writing Tests

### Asserting Correct Matches

```typescript
it('detects hex color #c0ffee', () => {
  const matches = extractColors(text, 'css', opts);
  const match = matches.find((match) => match.originalText === '#c0ffee');
  expect(match).toBeDefined();
  expect(match!.color.rgba.r).toBe(192);
  expect(match!.color.rgba.g).toBe(255);
  expect(match!.color.rgba.b).toBe(238);
});
```

### Asserting No False Positives

```typescript
it('.red selector is NOT highlighted', () => {
  const matches = extractColors(text, 'css', opts);
  const selectorLine = text.indexOf('.red {');
  const falseMatch = matches.filter(
    (match) =>
      match.originalText === 'red' &&
      match.startOffset >= selectorLine &&
      match.startOffset < selectorLine + 5
  );
  expect(falseMatch).toHaveLength(0);
});
```

### Asserting Variable Resolution

```typescript
it('var(--main-bg) resolves to correct color', () => {
  const matches = extractColors(text, 'css', opts);
  const usage = matches.find((match) => match.originalText === '--main-bg');
  expect(usage).toBeDefined();
  expect(usage!.color.rgba.r).toBe(192);
});
```

---

## 4. Running Tests

### Single Run

```bash
pnpm run test
```

### Watch Mode (re-runs on file save)

```bash
pnpm run test:watch
```

### Full Validation + Tests

```bash
pnpm run type-check; pnpm run lint; pnpm run fmt; pnpm run compile; pnpm run test
```

---

## 5. Adding New Fixtures

When reproducing a bug:

1.  Create a new fixture file in `test/fixtures/` (e.g., `issues-sass.scss`).
2.  Include the minimal code that reproduces the bug, with clear comments explaining expected behavior.
3.  Add corresponding tests in `test/colorParser.test.ts` that assert both the fix and the absence of the original bug.

---

## 6. Lint Rules in Test Files

Test files may legitimately use patterns that are disallowed in production code. Use file-level oxlint disable comments:

```typescript
/* oxlint-disable typescript/no-non-null-assertion, no-shadow */
```

Keep these to the minimum necessary set of rules.
