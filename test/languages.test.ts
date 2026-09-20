/**
 * Per-language fixture tests — verify that colors are correctly detected
 * across all supported languages using the standard fixture files.
 */

/* oxlint-disable typescript/no-non-null-assertion, no-shadow */

import { afterEach, describe, expect, it } from 'vitest';
import { extractColors } from '@/core/colorParser';
import { clearAllVariables } from '@/core/variableManager';
import { defaultConfig, readFixture } from './helpers';

afterEach(() => {
  clearAllVariables();
});

/************************************** CSS Tests ***************************************/

describe('CSS (test.css)', () => {
  const text = readFixture('test.css');
  const lang = 'css';
  const opts = defaultConfig({ uri: 'file:///test/test.css' });

  it('detects hex colors', () => {
    const matches = extractColors(text, lang, opts);
    const hexMatches = matches.filter((match) => match.originalText.startsWith('#'));
    expect(hexMatches.length).toBeGreaterThan(0);
  });

  it('detects rgb/rgba functional colors', () => {
    const matches = extractColors(text, lang, opts);
    const rgbMatches = matches.filter(
      (match) => match.originalText.startsWith('rgb(') || match.originalText.startsWith('rgba(')
    );
    expect(rgbMatches.length).toBeGreaterThan(0);
  });

  it('detects hsl/hsla functional colors', () => {
    const matches = extractColors(text, lang, opts);
    const hslMatches = matches.filter(
      (match) => match.originalText.startsWith('hsl(') || match.originalText.startsWith('hsla(')
    );
    expect(hslMatches.length).toBeGreaterThan(0);
  });

  it('detects named CSS colors in values', () => {
    const matches = extractColors(text, lang, opts);
    const namedMatches = matches.filter((match) =>
      ['coral', 'red', 'tomato', 'transparent'].includes(match.originalText.toLowerCase())
    );
    expect(namedMatches.length).toBeGreaterThan(0);
  });

  it('resolves CSS custom properties via var()', () => {
    const matches = extractColors(text, lang, opts);
    const varUsages = matches.filter(
      (match) => match.originalText.startsWith('--') && !match.originalText.includes(':')
    );
    expect(varUsages.length).toBeGreaterThan(0);
  });
});

/************************************* SCSS Tests ***************************************/

describe('SCSS (test.scss)', () => {
  const text = readFixture('test.scss');
  const lang = 'scss';
  const opts = defaultConfig({ uri: 'file:///test/test.scss' });

  it('detects hex and rgb colors', () => {
    const matches = extractColors(text, lang, opts);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('resolves SCSS $variable usages', () => {
    const matches = extractColors(text, lang, opts);
    const dollarVars = matches.filter((match) => match.originalText.startsWith('$'));
    expect(dollarVars.length).toBeGreaterThan(0);
  });
});

/*************************************** C# Tests ***************************************/

describe('C# (test.cs)', () => {
  const text = readFixture('test.cs');
  const lang = 'csharp';
  const opts = defaultConfig({ markNamedColors: false, uri: 'file:///test/test.cs' });

  it('detects Color.FromArgb(A, R, G, B) with correct RGBA', () => {
    const matches = extractColors(text, lang, opts);
    const match = matches.find((m) => m.originalText.includes('255, 150, 112, 255'));
    expect(match).toBeDefined();
    expect(match!.color.rgba.a).toBeCloseTo(1, 1);
    expect(match!.color.rgba.r).toBe(150);
    expect(match!.color.rgba.g).toBe(112);
    expect(match!.color.rgba.b).toBe(255);
  });

  it('detects Color.FromArgb(R, G, B) as fully opaque', () => {
    const matches = extractColors(text, lang, opts);
    const match = matches.find((m) => m.originalText === 'Color.FromArgb(255, 0, 0)');
    expect(match).toBeDefined();
    expect(match!.color.rgba.a).toBe(1);
    expect(match!.color.rgba.r).toBe(255);
    expect(match!.color.rgba.g).toBe(0);
    expect(match!.color.rgba.b).toBe(0);
  });

  it('detects Color.FromArgb with half-alpha correctly', () => {
    const matches = extractColors(text, lang, opts);
    const match = matches.find((m) => m.originalText.includes('127, 255, 0, 0'));
    expect(match).toBeDefined();
    expect(match!.color.rgba.a).toBeCloseTo(127 / 255, 2);
    expect(match!.color.rgba.r).toBe(255);
  });
});

/*********************************** JavaScript Tests ***********************************/

describe('JavaScript (test.js)', () => {
  const text = readFixture('test.js');
  const lang = 'javascript';
  const opts = defaultConfig({ markNamedColors: false, uri: 'file:///test/test.js' });

  it('detects hex colors in JS strings', () => {
    const matches = extractColors(text, lang, opts);
    const hexMatches = matches.filter((match) => match.originalText.startsWith('#'));
    expect(hexMatches.length).toBeGreaterThan(0);
  });

  it('detects rgb() in JS', () => {
    const matches = extractColors(text, lang, opts);
    const rgbMatches = matches.filter((match) => match.originalText.startsWith('rgb'));
    expect(rgbMatches.length).toBeGreaterThan(0);
  });
});

/************************************* HTML Tests ***************************************/

describe('HTML (test.html)', () => {
  const text = readFixture('test.html');
  const lang = 'html';
  const opts = defaultConfig({ uri: 'file:///test/test.html' });

  it('detects colors in style blocks', () => {
    const matches = extractColors(text, lang, opts);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('detects named colors only inside CSS contexts', () => {
    const matches = extractColors(text, lang, opts);
    for (const match of matches) {
      if (['blue', 'green', 'red'].includes(match.originalText.toLowerCase())) {
        const before = text.slice(0, match.startOffset);
        const hasStyleContext =
          before.lastIndexOf('<style') > before.lastIndexOf('</style') ||
          before.lastIndexOf('style=') > before.lastIndexOf('>');
        expect(
          hasStyleContext,
          `Named color "${match.originalText}" at offset ${match.startOffset} should be in CSS context`
        ).toBe(true);
      }
    }
  });
});

/*********************************** Python Tests ***************************************/

describe('Python (test.py)', () => {
  const text = readFixture('test.py');
  const lang = 'python';
  const opts = defaultConfig({ markNamedColors: false, uri: 'file:///test/test.py' });

  it('detects hex colors in Python', () => {
    const matches = extractColors(text, lang, opts);
    const hexMatches = matches.filter((match) => match.originalText.startsWith('#'));
    expect(hexMatches.length).toBeGreaterThan(0);
  });
});

/************************************* JSON Tests ***************************************/

describe('JSON (test.json)', () => {
  const text = readFixture('test.json');
  const lang = 'json';
  const opts = defaultConfig({ markNamedColors: false, uri: 'file:///test/test.json' });

  it('detects hex colors in JSON values', () => {
    const matches = extractColors(text, lang, opts);
    const hexMatches = matches.filter((match) => match.originalText.startsWith('#'));
    expect(hexMatches.length).toBeGreaterThan(0);
  });
});

/************************************* Rust Tests ***************************************/

describe('Rust (test.rs)', () => {
  const text = readFixture('test.rs');
  const lang = 'rust';
  const opts = defaultConfig({ markNamedColors: false, uri: 'file:///test/test.rs' });

  it('detects hex and rgb colors in Rust', () => {
    const matches = extractColors(text, lang, opts);
    expect(matches.length).toBeGreaterThan(0);
  });
});

/************************************** Vue Tests ***************************************/

describe('Vue (test.vue)', () => {
  const text = readFixture('test.vue');
  const lang = 'vue';
  const opts = defaultConfig({ uri: 'file:///test/test.vue' });

  it('detects colors in Vue <style> blocks', () => {
    const matches = extractColors(text, lang, opts);
    expect(matches.length).toBeGreaterThan(0);
  });
});
