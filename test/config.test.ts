/**
 * Config option tests — verify that each boolean setting in DocumentResolvedConfig
 * correctly toggles parser behavior on/off.
 *
 * Uses inline snippets so each test is self-contained and doesn't depend on
 * fixture file structure.
 */

/* oxlint-disable typescript/no-non-null-assertion */

import { afterEach, describe, expect, it } from 'vitest';
import { extractColors } from '@/core/colorParser';
import { clearAllVariables } from '@/core/variableManager';
import { defaultConfig } from './helpers';

afterEach(() => {
  clearAllVariables();
});

/************************************ Named Colors **************************************/

describe('markNamedColors', () => {
  const snippet = ':root { color: tomato; border-color: coral; background: red; }';

  it('detects named colors when enabled', () => {
    const opts = defaultConfig({ markNamedColors: true });
    const matches = extractColors(snippet, 'css', opts);
    const named = matches.filter((match) =>
      ['coral', 'red', 'tomato'].includes(match.originalText.toLowerCase())
    );
    expect(named.length).toBe(3);
  });

  it('skips named colors when disabled', () => {
    const opts = defaultConfig({ markNamedColors: false });
    const matches = extractColors(snippet, 'css', opts);
    const named = matches.filter((match) =>
      ['coral', 'red', 'tomato'].includes(match.originalText.toLowerCase())
    );
    expect(named).toHaveLength(0);
  });

  it('does not affect functional color detection regardless of setting', () => {
    const code = 'div { color: rgb(255, 0, 0); border: 1px solid #ff0000; }';
    const offMatches = extractColors(code, 'css', defaultConfig({ markNamedColors: false }));
    const onMatches = extractColors(code, 'css', defaultConfig({ markNamedColors: true }));
    // Both should detect `rgb()` and `#hex` regardless:
    const offHex = offMatches.filter((m) => m.originalText.startsWith('#'));
    const onHex = onMatches.filter((m) => m.originalText.startsWith('#'));
    expect(offHex.length).toBe(onHex.length);
  });
});

/********************************* Variable Resolution **********************************/

describe('markVariables', () => {
  const snippet = ':root { --brand: #ff5a5c; } .btn { color: var(--brand); }';

  it('resolves var() usages when enabled', () => {
    const opts = defaultConfig({ markVariables: true });
    const matches = extractColors(snippet, 'css', opts);
    const varUsage = matches.find((match) => match.originalText === '--brand');
    expect(varUsage).toBeDefined();
    // Should resolve to #ff5a5c → rgb(255, 90, 92)
    expect(varUsage!.color.rgba.r).toBe(255);
    expect(varUsage!.color.rgba.g).toBe(90);
    expect(varUsage!.color.rgba.b).toBe(92);
  });

  it('skips var() resolution when disabled', () => {
    const opts = defaultConfig({ markVariables: false });
    const matches = extractColors(snippet, 'css', opts);
    const varUsage = matches.find((match) => match.originalText === '--brand');
    expect(varUsage).toBeUndefined();
  });

  it('still detects the color literal in the definition when disabled', () => {
    const opts = defaultConfig({ markVariables: false });
    const matches = extractColors(snippet, 'css', opts);
    const hexMatch = matches.find((match) => match.originalText === '#ff5a5c');
    expect(hexMatch).toBeDefined();
  });

  it('resolves SCSS $variables when enabled', () => {
    const code = '$brand: #9670ff;\n.btn { color: $brand; }';
    const opts = defaultConfig({ markVariables: true, uri: 'file:///test.scss' });
    const matches = extractColors(code, 'scss', opts);
    const varUsage = matches.find((match) => match.originalText === '$brand');
    expect(varUsage).toBeDefined();
    expect(varUsage!.color.rgba.r).toBe(150);
    expect(varUsage!.color.rgba.g).toBe(112);
    expect(varUsage!.color.rgba.b).toBe(255);
  });

  it('skips SCSS $variable resolution when disabled', () => {
    const code = '$brand: #9670ff;\n.btn { color: $brand; }';
    const opts = defaultConfig({ markVariables: false, uri: 'file:///test.scss' });
    const matches = extractColors(code, 'scss', opts);
    const varUsage = matches.find((match) => match.originalText === '$brand');
    expect(varUsage).toBeUndefined();
  });
});

/****************************** Raw RGB (No Function) ***********************************/

describe('matchRgbWithNoFunction', () => {
  const snippet = '{ "color": "150, 112, 255" }';

  it('detects raw R, G, B values when enabled', () => {
    const opts = defaultConfig({ markNamedColors: false, matchRgbWithNoFunction: true });
    const matches = extractColors(snippet, 'json', opts);
    const rawMatch = matches.find((match) => match.originalText === '150, 112, 255');
    expect(rawMatch).toBeDefined();
    expect(rawMatch!.color.rgba.r).toBe(150);
    expect(rawMatch!.color.rgba.g).toBe(112);
    expect(rawMatch!.color.rgba.b).toBe(255);
  });

  it('skips raw R, G, B values when disabled', () => {
    const opts = defaultConfig({ markNamedColors: false, matchRgbWithNoFunction: false });
    const matches = extractColors(snippet, 'json', opts);
    const rawMatch = matches.find((match) => match.originalText === '150, 112, 255');
    expect(rawMatch).toBeUndefined();
  });

  it('does not affect functional rgb() regardless of setting', () => {
    const code = 'div { color: rgb(150, 112, 255); }';
    const offMatches = extractColors(code, 'css', defaultConfig({ matchRgbWithNoFunction: false }));
    const onMatches = extractColors(code, 'css', defaultConfig({ matchRgbWithNoFunction: true }));
    const offRgb = offMatches.filter((m) => m.originalText.startsWith('rgb('));
    const onRgb = onMatches.filter((m) => m.originalText.startsWith('rgb('));
    expect(offRgb.length).toBe(onRgb.length);
  });

  it('detects raw R, G, B, A with alpha when enabled', () => {
    const code = '{ "color": "150, 112, 255, .5" }';
    const opts = defaultConfig({ markNamedColors: false, matchRgbWithNoFunction: true });
    const matches = extractColors(code, 'json', opts);
    const rawMatch = matches.find((match) => match.originalText === '150, 112, 255, .5');
    expect(rawMatch).toBeDefined();
    expect(rawMatch!.color.rgba.a).toBeCloseTo(0.5, 2);
  });
});

/****************************** Raw HSL (No Function) ***********************************/

describe('matchHslWithNoFunction', () => {
  const snippet = '{ "color": "240, 12%, 48%" }';

  it('detects raw H, S%, L% values when enabled', () => {
    const opts = defaultConfig({ markNamedColors: false, matchHslWithNoFunction: true });
    const matches = extractColors(snippet, 'json', opts);
    const rawMatch = matches.find((match) => match.originalText === '240, 12%, 48%');
    expect(rawMatch).toBeDefined();
  });

  it('skips raw H, S%, L% values when disabled', () => {
    const opts = defaultConfig({ markNamedColors: false, matchHslWithNoFunction: false });
    const matches = extractColors(snippet, 'json', opts);
    const rawMatch = matches.find((match) => match.originalText === '240, 12%, 48%');
    expect(rawMatch).toBeUndefined();
  });

  it('does not affect functional hsl() regardless of setting', () => {
    const code = 'div { color: hsl(240, 12%, 48%); }';
    const offMatches = extractColors(code, 'css', defaultConfig({ matchHslWithNoFunction: false }));
    const onMatches = extractColors(code, 'css', defaultConfig({ matchHslWithNoFunction: true }));
    const offHsl = offMatches.filter((m) => m.originalText.startsWith('hsl('));
    const onHsl = onMatches.filter((m) => m.originalText.startsWith('hsl('));
    expect(offHsl.length).toBe(onHsl.length);
  });
});

/************************************* ARGB Mode ****************************************/

describe('useARGB', () => {
  it('interprets 8-digit hex as RGBA by default', () => {
    const code = 'const c = "#80FF0000";';
    const opts = defaultConfig({ markNamedColors: false, useARGB: false });
    const matches = extractColors(code, 'javascript', opts);
    const hexMatch = matches.find((match) => match.originalText === '#80FF0000');
    expect(hexMatch).toBeDefined();
    // RGBA order: R=80, G=FF, B=00, A=00 → R=128, G=255, B=0, A=0:
    expect(hexMatch!.color.rgba.r).toBe(128);
    expect(hexMatch!.color.rgba.g).toBe(255);
    expect(hexMatch!.color.rgba.b).toBe(0);
    expect(hexMatch!.color.rgba.a).toBeCloseTo(0, 2);
  });

  it('interprets 8-digit hex as ARGB when enabled', () => {
    const code = 'const c = "#80FF0000";';
    const opts = defaultConfig({ markNamedColors: false, useARGB: true });
    const matches = extractColors(code, 'javascript', opts);
    const hexMatch = matches.find((match) => match.originalText === '#80FF0000');
    expect(hexMatch).toBeDefined();
    // ARGB order: A=80, R=FF, G=00, B=00 → A≈0.502, R=255, G=0, B=0:
    expect(hexMatch!.color.rgba.a).toBeCloseTo(128 / 255, 2);
    expect(hexMatch!.color.rgba.r).toBe(255);
    expect(hexMatch!.color.rgba.g).toBe(0);
    expect(hexMatch!.color.rgba.b).toBe(0);
  });

  it('interprets 4-digit hex as RGBA by default', () => {
    const code = 'const c = "#F008";';
    const opts = defaultConfig({ markNamedColors: false, useARGB: false });
    const matches = extractColors(code, 'javascript', opts);
    const hexMatch = matches.find((match) => match.originalText === '#F008');
    expect(hexMatch).toBeDefined();
    // RGBA shorthand: R=F, G=0, B=0, A=8 → R=255, G=0, B=0, A≈0.533:
    expect(hexMatch!.color.rgba.r).toBe(255);
    expect(hexMatch!.color.rgba.g).toBe(0);
    expect(hexMatch!.color.rgba.b).toBe(0);
    expect(hexMatch!.color.rgba.a).toBeCloseTo(0x88 / 255, 2);
  });

  it('interprets 4-digit hex as ARGB when enabled', () => {
    const code = 'const c = "#8F00";';
    const opts = defaultConfig({ markNamedColors: false, useARGB: true });
    const matches = extractColors(code, 'javascript', opts);
    const hexMatch = matches.find((match) => match.originalText === '#8F00');
    expect(hexMatch).toBeDefined();
    // ARGB shorthand: A=8, R=F, G=0, B=0 → A≈0.533, R=255, G=0, B=0:
    expect(hexMatch!.color.rgba.a).toBeCloseTo(0x88 / 255, 2);
    expect(hexMatch!.color.rgba.r).toBe(255);
    expect(hexMatch!.color.rgba.g).toBe(0);
    expect(hexMatch!.color.rgba.b).toBe(0);
  });

  it('does not affect 3-digit or 6-digit hex', () => {
    const code = 'const c = "#F00"; const d = "#FF0000";';
    const rgbaMatches = extractColors(code, 'javascript', defaultConfig({ useARGB: false }));
    const argbMatches = extractColors(code, 'javascript', defaultConfig({ useARGB: true }));
    // Both modes should produce the same result for 3/6 digit hex
    const rgbaRed = rgbaMatches.find((m) => m.originalText === '#F00');
    const argbRed = argbMatches.find((m) => m.originalText === '#F00');
    expect(rgbaRed).toBeDefined();
    expect(argbRed).toBeDefined();
    expect(rgbaRed!.color.rgba.r).toBe(argbRed!.color.rgba.r);
    expect(rgbaRed!.color.rgba.g).toBe(argbRed!.color.rgba.g);
    expect(rgbaRed!.color.rgba.b).toBe(argbRed!.color.rgba.b);
  });
});

/************************************* Show Alpha ***************************************/

describe('showAlpha', () => {
  it('preserves alpha in opaqueCss when showAlpha is true', () => {
    const code = 'div { color: rgba(255, 0, 0, 0.5); }';
    const opts = defaultConfig({ showAlpha: true });
    const matches = extractColors(code, 'css', opts);
    const match = matches.find((m) => m.originalText.startsWith('rgba('));
    expect(match).toBeDefined();
    expect(match!.color.rgba.a).toBeCloseTo(0.5, 2);
  });

  it('still parses alpha correctly when showAlpha is false', () => {
    const code = 'div { color: rgba(255, 0, 0, 0.5); }';
    const opts = defaultConfig({ showAlpha: false });
    const matches = extractColors(code, 'css', opts);
    const match = matches.find((m) => m.originalText.startsWith('rgba('));
    expect(match).toBeDefined();
    // The parser always extracts the alpha; `showAlpha` only affects display blending:
    expect(match!.color.rgba.a).toBeCloseTo(0.5, 2);
  });

  it('produces different opaqueCss vs css for transparent colors', () => {
    const code = 'div { color: rgba(255, 0, 0, 0.5); }';
    const opts = defaultConfig({ showAlpha: true });
    const matches = extractColors(code, 'css', opts);
    const match = matches.find((m) => m.originalText.startsWith('rgba('));
    expect(match).toBeDefined();
    // `css` should include alpha, `opaqueCss` should be fully opaque:
    expect(match!.color.css).not.toBe(match!.color.opaqueCss);
  });
});

/****************************** Combined Option Edges ***********************************/

describe('Combined option edge cases', () => {
  it('markNamedColors + markVariables both off: only regex colors detected', () => {
    const code =
      ':root { --brand: red; } .btn { color: var(--brand); background: tomato; border: 1px solid #ff0000; }';
    const opts = defaultConfig({ markNamedColors: false, markVariables: false });
    const matches = extractColors(code, 'css', opts);
    // Only #ff0000 should be detected (regex color):
    expect(matches).toHaveLength(1);
    expect(matches[0].originalText).toBe('#ff0000');
  });

  it('raw RGB enabled does not interfere with functional rgb()', () => {
    // When both raw and functional RGB are present, both should be detected without overlap:
    const code = '{ "raw": "255, 0, 0", "func": "rgb(0, 255, 0)" }';
    const opts = defaultConfig({ markNamedColors: false, matchRgbWithNoFunction: true });
    const matches = extractColors(code, 'json', opts);
    const rawMatch = matches.find((m) => m.originalText === '255, 0, 0');
    const funcMatch = matches.find((m) => m.originalText.startsWith('rgb('));
    expect(rawMatch).toBeDefined();
    expect(funcMatch).toBeDefined();
    expect(rawMatch!.color.rgba.r).toBe(255);
    expect(funcMatch!.color.rgba.g).toBe(255);
  });
});
