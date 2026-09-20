/**
 * Bug regression tests — reproduce every issue from ISSUES.md and verify
 * the fix holds. These tests must never regress.
 */

/* oxlint-disable typescript/no-non-null-assertion, no-shadow */

import { afterEach, describe, expect, it } from 'vitest';
import { extractColors } from '@/core/colorParser';
import { clearAllVariables } from '@/core/variableManager';
import { defaultConfig, matchAtOccurrence, readFixture } from './helpers';

afterEach(() => {
  clearAllVariables();
});

/********************************* SASS Issue Tests *************************************/

describe('SASS Issues (test.scss)', () => {
  const text = readFixture('test.scss');
  const lang = 'scss';
  const opts = defaultConfig({ uri: 'file:///test/test.scss' });

  it('S1: SASS map values ARE highlighted as colors', () => {
    const matches = extractColors(text, lang, opts);
    const rgbaMatches = matches.filter(
      (match) => match.originalText.startsWith('rgba(') || match.originalText.startsWith('rgb(')
    );
    expect(rgbaMatches.length).toBeGreaterThan(0);
  });

  it('S2: SASS map keys are NOT highlighted as named colors', () => {
    const matches = extractColors(text, lang, opts);
    const mapKeyBlack = text.indexOf("'black':");
    const mapKeyRed = text.indexOf("'red':");
    const mapKeyPurple = text.indexOf("'purple':");
    const mapKeyWhite = text.indexOf("'white':");

    for (const keyOffset of [mapKeyBlack, mapKeyRed, mapKeyPurple, mapKeyWhite]) {
      if (keyOffset === -1) {
        throw new Error('Map key not found in fixture');
      }
      const covering = matches.filter(
        (match) =>
          match.startOffset >= keyOffset &&
          match.endOffset <= keyOffset + 10 &&
          !match.originalText.startsWith('rgb')
      );
      expect(covering, `Map key at offset ${keyOffset} should not be highlighted`).toHaveLength(0);
    }
  });

  it('S3: variable definition name $blue is NOT highlighted as named color', () => {
    const matches = extractColors(text, lang, opts);
    const defPos = text.indexOf('$blue:');
    expect(defPos).not.toBe(-1);
    const namedBlueMatches = matches.filter(
      (match) =>
        match.originalText.toLowerCase() === 'blue' &&
        match.startOffset >= defPos &&
        match.startOffset < defPos + 10
    );
    expect(namedBlueMatches).toHaveLength(0);
  });

  it('S4: variable usage $blue resolves to its assigned value, not named color', () => {
    const matches = extractColors(text, lang, opts);
    const usagePos = text.indexOf('background-color: $blue;');
    expect(usagePos).not.toBe(-1);
    const usageMatch = matches.find(
      (match) => match.startOffset >= usagePos && match.originalText === '$blue'
    );
    expect(usageMatch).toBeDefined();
    // Fixture defines $blue: rgba(0, 0, 255, 1)
    expect(usageMatch!.color.rgba.r).toBe(0);
    expect(usageMatch!.color.rgba.g).toBe(0);
    expect(usageMatch!.color.rgba.b).toBe(255);
    expect(usageMatch!.color.rgba.a).toBe(1);
  });

  it('S5: variable definition $bluish does NOT get decorated as $blue', () => {
    const matches = extractColors(text, lang, opts);
    const defPos = text.indexOf('$bluish:');
    expect(defPos).not.toBe(-1);
    const partialMatch = matches.find(
      (match) =>
        match.startOffset >= defPos &&
        match.startOffset < defPos + 6 &&
        match.originalText === '$blue'
    );
    expect(partialMatch, '$bluish should not partially match $blue').toBeUndefined();
  });

  it('S1 (map-get): map-get($orgColors, "red") resolves to stored map color', () => {
    const matches = extractColors(text, lang, opts);
    const staticMapGet = text.indexOf("map-get($orgColors, 'red')");
    if (staticMapGet !== -1) {
      const mgMatch = matches.find(
        (match) => match.startOffset === staticMapGet && match.originalText.startsWith('map-get')
      );
      expect(mgMatch).toBeDefined();
      // 'red' entry: rgba(226, 6, 19, 1)
      expect(mgMatch!.color.rgba.r).toBe(226);
    }
  });

  it('SCSS override: $override-color usage resolves to positionally closest definition', () => {
    const matches = extractColors(text, lang, opts);

    // 1st usage (after $override-color: #ff0000) → should be red:
    const firstUsage = matchAtOccurrence(matches, text, '$override-color', 2);
    expect(firstUsage).toBeDefined();
    expect(firstUsage!.color.rgba.r).toBe(255);
    expect(firstUsage!.color.rgba.g).toBe(0);
    expect(firstUsage!.color.rgba.b).toBe(0);

    // 2nd usage (after $override-color: #00ff00) → should be green:
    const secondUsage = matchAtOccurrence(matches, text, '$override-color', 4);
    expect(secondUsage).toBeDefined();
    expect(secondUsage!.color.rgba.r).toBe(0);
    expect(secondUsage!.color.rgba.g).toBe(255);
    expect(secondUsage!.color.rgba.b).toBe(0);
  });

  it('SCSS override: $override-color resolves to named color override (blue)', () => {
    const matches = extractColors(text, lang, opts);

    // 3rd usage (after $override-color: blue) → should be blue:
    const thirdUsage = matchAtOccurrence(matches, text, '$override-color', 6);
    expect(thirdUsage).toBeDefined();
    expect(thirdUsage!.color.rgba.r).toBe(0);
    expect(thirdUsage!.color.rgba.g).toBe(0);
    expect(thirdUsage!.color.rgba.b).toBe(255);
  });

  it('LESS override: @less-color usage resolves to positionally closest definition', () => {
    const matches = extractColors(text, lang, opts);

    // 1st usage (after @less-color: #ff0000) → should be red:
    const firstUsage = matchAtOccurrence(matches, text, '@less-color', 2);
    expect(firstUsage).toBeDefined();
    expect(firstUsage!.color.rgba.r).toBe(255);
    expect(firstUsage!.color.rgba.g).toBe(0);
    expect(firstUsage!.color.rgba.b).toBe(0);

    // 2nd usage (after @less-color: #0000ff) → should be blue:
    const secondUsage = matchAtOccurrence(matches, text, '@less-color', 4);
    expect(secondUsage).toBeDefined();
    expect(secondUsage!.color.rgba.r).toBe(0);
    expect(secondUsage!.color.rgba.g).toBe(0);
    expect(secondUsage!.color.rgba.b).toBe(255);
  });
});

/********************************** CSS Issue Tests *************************************/

describe('CSS Issues (test.css)', () => {
  const text = readFixture('test.css');
  const lang = 'css';
  const opts = defaultConfig({ uri: 'file:///test/test.css' });

  it('C1: @property initial-value color is detected', () => {
    const matches = extractColors(text, lang, opts);
    const coffeeMatch = matches.find((match) => match.originalText === '#c0ffee');
    expect(coffeeMatch).toBeDefined();
  });

  it('C1: var(--main-bg-color) resolves to @property initial-value', () => {
    const matches = extractColors(text, lang, opts);
    const varUsage = matches.find((match) => match.originalText === '--main-bg-color');
    expect(varUsage).toBeDefined();
    // #c0ffee = rgb(192, 255, 238)
    expect(varUsage!.color.rgba.r).toBe(192);
    expect(varUsage!.color.rgba.g).toBe(255);
    expect(varUsage!.color.rgba.b).toBe(238);
  });

  it('C2: each var(--term-bg) resolves to its positional override', () => {
    const matches = extractColors(text, lang, opts);
    // 3rd occurrence of --term-bg = usage in .bg-black → rgb(0,0,0)
    const firstUsage = matchAtOccurrence(matches, text, '--term-bg', 3);
    expect(firstUsage).toBeDefined();
    expect(firstUsage!.color.rgba.r).toBe(0);
    expect(firstUsage!.color.rgba.g).toBe(0);
    expect(firstUsage!.color.rgba.b).toBe(0);

    // 5th occurrence = usage in .bg-br-black → rgb(128,128,128)
    const secondUsage = matchAtOccurrence(matches, text, '--term-bg', 5);
    expect(secondUsage).toBeDefined();
    expect(secondUsage!.color.rgba.r).toBe(128);
    expect(secondUsage!.color.rgba.g).toBe(128);
    expect(secondUsage!.color.rgba.b).toBe(128);
  });

  it('C2b: var(--term-bg) resolves to direct color override (#a8f)', () => {
    const matches = extractColors(text, lang, opts);
    // In .bg-custom: --term-bg: #a8f → var(--term-bg) should be #a8f
    const customUsage = matchAtOccurrence(matches, text, '--term-bg', 8);
    expect(customUsage).toBeDefined();
    // #a8f expands to #aa88ff → R=170, G=136, B=255
    expect(customUsage!.color.rgba.r).toBe(170);
    expect(customUsage!.color.rgba.g).toBe(136);
    expect(customUsage!.color.rgba.b).toBe(255);
  });

  it('C2c: var(--term-fg) resolves through alias chain to local #000', () => {
    const matches = extractColors(text, lang, opts);
    // In .fg-black: --term-base-fg: #000; --term-fg: var(--term-base-fg);
    // → var(--term-fg) should resolve to #000 (black)
    const chainUsage = matchAtOccurrence(matches, text, '--term-fg', 3);
    expect(chainUsage).toBeDefined();
    expect(chainUsage!.color.rgba.r).toBe(0);
    expect(chainUsage!.color.rgba.g).toBe(0);
    expect(chainUsage!.color.rgba.b).toBe(0);
  });

  it('C2d: var(--term-fg) resolves to named color override (red)', () => {
    const matches = extractColors(text, lang, opts);
    // In .br-black: --term-fg: red; → var(--term-fg) should be red
    const namedOverride = matchAtOccurrence(matches, text, '--term-fg', 5);
    expect(namedOverride).toBeDefined();
    expect(namedOverride!.color.rgba.r).toBe(255);
    expect(namedOverride!.color.rgba.g).toBe(0);
    expect(namedOverride!.color.rgba.b).toBe(0);
  });

  it('C3: class selector .red is NOT highlighted as named color', () => {
    const matches = extractColors(text, lang, opts);
    const selectorPos = text.indexOf('.red {');
    expect(selectorPos).not.toBe(-1);
    const falsePositives = matches.filter(
      (match) =>
        match.originalText.toLowerCase() === 'red' &&
        match.startOffset >= selectorPos &&
        match.startOffset < selectorPos + 5
    );
    expect(falsePositives).toHaveLength(0);
  });

  it('C3: class selector .blue is NOT highlighted as named color', () => {
    const matches = extractColors(text, lang, opts);
    const selectorPos = text.indexOf('.blue {');
    expect(selectorPos).not.toBe(-1);
    const falsePositives = matches.filter(
      (match) =>
        match.originalText.toLowerCase() === 'blue' &&
        match.startOffset >= selectorPos &&
        match.startOffset < selectorPos + 6
    );
    expect(falsePositives).toHaveLength(0);
  });

  it('C3: ID selector #red is NOT highlighted as named color', () => {
    const matches = extractColors(text, lang, opts);
    const selectorPos = text.indexOf('#red {');
    expect(selectorPos).not.toBe(-1);
    const falsePositives = matches.filter(
      (match) =>
        match.originalText.toLowerCase() === 'red' &&
        match.startOffset >= selectorPos &&
        match.startOffset < selectorPos + 5
    );
    expect(falsePositives).toHaveLength(0);
  });

  it('C3: color values inside selector blocks ARE still highlighted', () => {
    const matches = extractColors(text, lang, opts);
    const hexRed = matches.find((match) => match.originalText === '#ff0000');
    expect(hexRed).toBeDefined();
    const coralValue = matches.find((match) => match.originalText.toLowerCase() === 'coral');
    expect(coralValue).toBeDefined();
  });
});
