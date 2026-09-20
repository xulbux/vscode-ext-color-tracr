/**
 * Minimal vscode mock for unit tests.
 * Only the parser and variable manager are tested — they don't use vscode APIs directly.
 * This mock satisfies any transitive `import * as vscode from 'vscode'` at the module level.
 */

/* oxlint-disable no-empty-function */

export const window = {};
export const workspace = {};
export const DecorationRangeBehavior = { ClosedClosed: 0 };
export function ColorInformation() {}
