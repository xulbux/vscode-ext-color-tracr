---
name: build
description: Packages the VS Code extension (.vsix) and installs it locally for testing.
---

# Build

Use this skill to package the Color Tracr extension into a `.vsix` file and install it locally in VS Code for manual testing.

## 1. Prerequisites

Before packaging, always run the full validation suite to ensure the build is clean:

```bash
pnpm run type-check; pnpm run lint; pnpm run fmt; pnpm run compile; pnpm run test
```

Fix all issues before proceeding. See `AGENTS.md` Section 4 for the full validation policy.

## 2. Package

Package the extension into a `.vsix` file using `@vscode/vsce`:

```bash
pnpm dlx @vscode/vsce package
```

This produces a file like `color-tracr-X.Y.Z.vsix` in the project root.

## 3. Install Locally

Uninstall the existing version and install the freshly built `.vsix`:

```bash
code --uninstall-extension xulbux.color-tracr; code --install-extension color-tracr-*.vsix
```

Then **reload the VS Code window** (`Ctrl+Shift+P` → "Developer: Reload Window") to activate the new version.

## 4. Clean Up

After verifying the extension works correctly, remove the `.vsix` file:

```bash
rm -f color-tracr-*.vsix
```

## 5. Full One-Liner

For a quick validate → package → reinstall cycle:

```bash
pnpm run type-check && pnpm run lint && pnpm run fmt && pnpm run compile && pnpm run test && pnpm dlx @vscode/vsce package && code --uninstall-extension xulbux.color-tracr; code --install-extension color-tracr-*.vsix
```
