/**
 * Test helper utilities for Color Tracr tests.
 */

/* oxlint-disable unicorn/prefer-module */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { ColorMatch, DocumentResolvedConfig } from '@/types';

const FIXTURES = path.resolve(__dirname, 'fixtures');

/** Read a fixture file by name from the test/fixtures/ directory. */
export function readFixture(name: string): string {
  return readFileSync(path.resolve(FIXTURES, name), 'utf8');
}

/** Default resolved config that enables all features. */
export function defaultConfig(
  overrides?: Partial<DocumentResolvedConfig & { uri?: string }>
): DocumentResolvedConfig & { uri: string } {
  return {
    editorBackground: { a: 1, b: 30, g: 30, r: 30 },
    enable: true,
    markNamedColors: true,
    markTailwind: false,
    markVariables: true,
    markerType: 'highlight',
    matchHslWithNoFunction: false,
    matchLchWithNoFunction: false,
    matchOklchWithNoFunction: false,
    matchRgbWithNoFunction: false,
    showAlpha: true,
    uri: 'file:///test.css',
    useARGB: false,
    ...overrides,
  };
}

/**
 * Find the Nth occurrence of `substr` in `text` and return any match covering it.
 * Useful for testing positional variable resolution where the same variable
 * appears multiple times with different values.
 */
export function matchAtOccurrence(
  matches: ColorMatch[],
  text: string,
  substr: string,
  occurrence = 1
): ColorMatch | undefined {
  let from = 0;
  for (let n = 0; n < occurrence; n += 1) {
    const idx = text.indexOf(substr, from);
    if (idx === -1) {
      return undefined;
    }
    if (n === occurrence - 1) {
      return matches.find(
        (match) => match.startOffset <= idx && match.endOffset >= idx + substr.length
      );
    }
    from = idx + 1;
  }
  return undefined;
}

/**
 * Assert that NO match covers the given substring anywhere in the text.
 * Throws a descriptive error if a false positive is found.
 */
export function assertNoMatchAt(matches: ColorMatch[], text: string, substring: string): void {
  let searchFrom = 0;
  let idx = text.indexOf(substring, searchFrom);
  while (idx !== -1) {
    for (const match of matches) {
      if (match.startOffset <= idx && match.endOffset >= idx + substring.length) {
        throw new Error(
          `Expected no match at "${substring}" (offset ${idx}), but found match [${match.startOffset}:${match.endOffset}]`
        );
      }
    }
    searchFrom = idx + 1;
    idx = text.indexOf(substring, searchFrom);
  }
}
