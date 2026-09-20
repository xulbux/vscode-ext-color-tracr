/**
 * Regex-based color extraction from text.
 *
 * Matches diverse color formats.
 * Each match is converted to a `ColorData` object for downstream use.
 */

import {
  MIXED_CSS_LANGUAGES,
  NAMED_COLORS,
  PURE_CSS_LANGUAGES,
  WORD_RX,
} from '@/consts/namedColors';
import { SPECIAL_TRANSPARENT } from '@/consts/specialColors';
import { TAILWIND_DEFAULTS } from '@/consts/tailwindColors';
import type { ColorData, ColorMatch, DocumentResolvedConfig } from '@/types';
import { mergeNonOverlapping } from '@/utils/ranges';
import { extractWithStrategies, strategies } from './strategies';
import { getVariable, setVariable } from './variableManager';

const tailwindDefaultCache = new Map<string, ColorData>();
function getTailwindDefault(
  colorName: string,
  options?: DocumentResolvedConfig
): ColorData | undefined {
  let colorData = tailwindDefaultCache.get(colorName);
  if (colorData) {
    return colorData;
  }

  const hex = TAILWIND_DEFAULTS.get(colorName);
  if (hex === SPECIAL_TRANSPARENT) {
    colorData = {
      css: 'transparent',
      opaqueCss: 'transparent',
      rgba: { a: 0, b: 0, g: 0, r: 0 },
      special: SPECIAL_TRANSPARENT,
    };
    tailwindDefaultCache.set(colorName, colorData);
  } else if (hex && options) {
    colorData = extractWithStrategies(hex, options);
    if (colorData) {
      tailwindDefaultCache.set(colorName, colorData);
    }
  }
  return colorData;
}

// ------------------------------------ REGEX PATTERNS -----------------------------------

/** Matches `var(--name)` and also SCSS `$name` and LESS `@name`. Excludes definitions (followed by `:`). */
const VAR_USE_RX =
  /(?:var\(\s*(?<name1>--[a-zA-Z0-9_-]+)|(?<name2>[$@][a-zA-Z0-9_-]+)(?![a-zA-Z0-9_-])(?!\s*:))/g;

/** Matches Tailwind CSS color utility classes. */
const TAILWIND_PREFIXES =
  'bg|text|border|ring|fill|stroke|shadow|outline|decoration|accent|caret|divide|placeholder|from|via|to';
const CLASS_RX = new RegExp(
  `(?<prefix>(?:[a-zA-Z0-9_\\[\\]-]+:)*(?:${TAILWIND_PREFIXES})-)(?<colorName>[a-zA-Z0-9_-]+|\\[[^\\]]+\\]|\\(--[^)]+\\))(?<alpha>\\/[0-9.]+|\\/\\[[^\\]]+\\])?`,
  'g'
);

/** Characters that invalidate a Tailwind class boundary (letter, digit, `_`, `-`, `.`, `#`). */
const TW_BOUNDARY_RX = /[a-zA-Z0-9_\-.#]/;

/** Matches block comments, HTML comments (`<!-- -->`), and line comments (`//`). */
const COMMENT_RX = /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\/|<!--(?:[^-]|-(?!->))*-->|\/\/.*$/gm;

/**
 * `<style>…</style>` blocks in mixed-language files; content captured in group `css`.
 * The `d` flag exposes the group's start/end offsets via `match.indices`.
 */
const STYLE_BLOCK_RX = /<style\b[^>]*>(?<css>[\s\S]*?)<\/style>/dgi;

/**
 * `style="…"`, `:style="…"` and `v-bind:style="…"` attributes; the quoted value
 * is captured (group `dq` for double quotes, group `sq` for single quotes).
 */
const STYLE_ATTR_RX = /\bstyle\s*=\s*(?:"(?<dq>[^"]*)"|'(?<sq>[^']*)')/dgi;

// --------------------------------------- HELPERS ---------------------------------------

const regexCache = new Map<string, RegExp>();

/** Strategies paired with their precomputed named-capture-group id (computed once at load). */
const strategyGroups = strategies.map((strategy) => ({
  groupId: strategy.id.replace(/-/g, '_'),
  strategy,
}));

function getRegex(options: DocumentResolvedConfig): RegExp {
  const key = `${options.matchRgbWithNoFunction}-${options.matchHslWithNoFunction}-${options.matchOklchWithNoFunction}-${options.matchLchWithNoFunction}-${options.useARGB}`;
  let colorRe = regexCache.get(key);
  if (!colorRe) {
    const patterns: string[] = [];
    for (const { strategy, groupId } of strategyGroups) {
      const pats = strategy.getPatterns ? strategy.getPatterns(options) : [strategy.pattern];
      patterns.push(`(?<${groupId}>${pats.join('|')})`);
    }
    colorRe = new RegExp(patterns.join('|'), 'gi');
    regexCache.set(key, colorRe);
  }
  return colorRe;
}

/** Check if a word is adjacent to a hyphen (part of a utility class like `text-red`). */
function isAdjacentToHyphen(text: string, start: number, end: number): boolean {
  return (start > 0 && text[start - 1] === '-') || (end < text.length && text[end] === '-');
}

/** Resolves a variable name. Falls back to Tailwind default if it starts with `--color-`. */
function resolveVariable(name: string, options?: DocumentResolvedConfig): ColorData | undefined {
  let colorData = getVariable(name);
  if (!colorData && name.startsWith('--color-')) {
    colorData = getTailwindDefault(name.slice(8), options);
  }
  return colorData;
}

// -------------------------------------- EXTRACTORS -------------------------------------

function isPossibleVariableDef(text: string, index: number): boolean {
  let i = index - 1;
  while (i >= 0 && i >= index - 100) {
    const char = text[i];
    if (char === ':') {
      return true;
    }
    if (char !== ' ' && char !== '\t' && char !== '\n' && char !== '\r') {
      return false;
    }
    i -= 1;
  }
  return false;
}

/** Matches a variable definition name immediately preceding a `:` (e.g., `--name:`, `$name:`, `@name:`). */
const VAR_DEF_RX = /(?<name>(?:--|\$|@)[a-zA-Z0-9_-]+)\s*:\s*$/;

/**
 * Return the variable name being defined at `index` (e.g., `--foo` in `--foo: red`),
 * or `undefined` if the position is not a real, non-commented variable definition.
 */
function getVariableDefName(
  text: string,
  index: number,
  isInsideComment: (i: number) => boolean
): string | undefined {
  if (!isPossibleVariableDef(text, index)) {
    return undefined;
  }
  const prefix = text.slice(Math.max(0, index - 100), index);
  if (!prefix.includes('--') && !prefix.includes('$') && !prefix.includes('@')) {
    return undefined;
  }
  const defMatch = prefix.match(VAR_DEF_RX);
  if (defMatch?.groups && !isInsideComment(index)) {
    return defMatch.groups.name;
  }
  return undefined;
}

// oxlint-disable-next-line complexity
function resolveAliasesAndUsages(
  text: string,
  options: DocumentResolvedConfig & { uri?: string; extractOnly?: boolean },
  isInsideComment: (index: number) => boolean,
  directVarDefs: { name: string; color: ColorData; offset: number }[] = []
): ColorMatch[] {
  if (!text.includes('var(') && !text.includes('$') && !text.includes('@')) {
    return [];
  }

  // Collect all variable references in document order, noting which are alias definitions.
  interface VarEntry {
    name: string;
    defName: string | undefined;
    start: number;
    end: number;
    matchText: string;
  }
  const entries: VarEntry[] = [];

  for (const varMatch of text.matchAll(VAR_USE_RX)) {
    const varName = varMatch.groups?.name1 || varMatch.groups?.name2;
    if (varName) {
      const defName = getVariableDefName(text, varMatch.index, isInsideComment);
      const offset = varMatch.index + varMatch[0].indexOf(varName);
      entries.push({
        defName,
        end: offset + varName.length,
        matchText: varName,
        name: varName,
        start: offset,
      });
    }
  }

  if (entries.length === 0 && directVarDefs.length === 0) {
    return [];
  }

  // First pass: resolve all alias definitions for the global variable store.
  // This handles cross-file references and forward references.
  // Later aliases for the same target overwrite earlier ones (last definition wins).
  const aliases = entries
    .filter((e): e is VarEntry & { defName: string } => e.defName !== undefined)
    .map((e) => ({ source: e.name, target: e.defName }));

  let changed = true;
  let iterations = 0;
  while (changed && iterations < 5) {
    changed = false;
    for (const alias of aliases) {
      const colorData = resolveVariable(alias.source, options);
      if (colorData) {
        const existing = getVariable(alias.target);
        if (!existing || existing.css !== colorData.css) {
          setVariable(alias.target, colorData, options.uri ?? '');
          changed = true;
        }
      }
    }
    iterations += 1;
  }

  if (options.extractOnly || !options.markVariables) {
    return [];
  }

  // Second pass: walk entries in document order with positional overrides.
  // When the same variable is redefined at different points in the file (e.g.
  // `--term-bg: var(--term-black)` then later `--term-bg: var(--term-br-black)`),
  // each usage resolves to whatever value was most recently assigned above it.
  //
  // Direct variable definitions (e.g., `--term-bg: #a8f`) are also tracked here
  // so that a direct color assignment overrides a previous var() alias.
  const localOverrides = new Map<string, ColorData>();
  const usageMatches: ColorMatch[] = [];

  // Merge directVarDefs into the positional walk by interleaving them with
  // var-reference entries in document order.
  let directIdx = 0;

  for (const entry of entries) {
    // Inject any direct variable definitions that appear before this entry.
    while (directIdx < directVarDefs.length && directVarDefs[directIdx].offset <= entry.start) {
      const directDef = directVarDefs[directIdx];
      localOverrides.set(directDef.name, directDef.color);
      directIdx += 1;
    }

    if (entry.defName) {
      // Alias definition line: resolve the source and record the local override.
      const colorData = localOverrides.get(entry.name) ?? resolveVariable(entry.name, options);
      if (colorData) {
        localOverrides.set(entry.defName, colorData);
      }
    }

    // Resolve this reference: local overrides first, then global store.
    const colorData = localOverrides.get(entry.name) ?? resolveVariable(entry.name, options);
    if (colorData) {
      usageMatches.push({
        color: colorData,
        endOffset: entry.end,
        originalText: entry.matchText,
        startOffset: entry.start,
      });
    }
  }

  return usageMatches;
}

/** Check if a Tailwind class is properly bounded (not part of a CSS selector or longer word). */
function isValidTailwindBoundary(text: string, index: number): boolean {
  if (index === 0) {
    return true;
  }
  const prevChar = text[index - 1];

  // Invalid boundaries: letter, number, underscore, hyphen, dot (CSS class), hash (CSS ID).
  return !TW_BOUNDARY_RX.test(prevChar);
}

function getTailwindColorData(
  colorName: string,
  options?: DocumentResolvedConfig
): ColorData | undefined {
  if (
    (colorName.startsWith('[') && colorName.endsWith(']')) ||
    (colorName.startsWith('(--') && colorName.endsWith(')'))
  ) {
    const inner = colorName.slice(1, -1);
    if (colorName.startsWith('[')) {
      return extractWithStrategies(inner, options);
    }
    return resolveVariable(inner, options);
  }
  return resolveVariable(`--color-${colorName}`, options);
}

function extractTailwindClasses(text: string, options?: DocumentResolvedConfig): ColorMatch[] {
  if (!text.includes('-')) {
    return [];
  }

  const results: ColorMatch[] = [];
  for (const classMatch of text.matchAll(CLASS_RX)) {
    if (isValidTailwindBoundary(text, classMatch.index)) {
      const prefix = classMatch.groups?.prefix;
      const colorName = classMatch.groups?.colorName;
      const alpha = classMatch.groups?.alpha;

      if (prefix && colorName) {
        let colorData = getTailwindColorData(colorName, options);

        if (colorData) {
          if (alpha) {
            let alphaValue = 1;
            if (alpha.startsWith('/[')) {
              const inner = alpha.slice(2, -1);
              alphaValue = inner.endsWith('%')
                ? Number.parseFloat(inner) / 100
                : Number.parseFloat(inner);
            } else {
              alphaValue = Number.parseFloat(alpha.slice(1)) / 100;
            }

            if (!Number.isNaN(alphaValue)) {
              const newRgba = { ...colorData.rgba, a: colorData.rgba.a * alphaValue };
              colorData = {
                css: `rgb(${newRgba.r} ${newRgba.g} ${newRgba.b} / ${newRgba.a})`,
                opaqueCss: `rgb(${newRgba.r} ${newRgba.g} ${newRgba.b})`,
                rgba: newRgba,
              };
            }
          }

          let offset = classMatch.index + prefix.length;
          let end = classMatch.index + classMatch[0].length;
          let originalText = colorName + (alpha || '');

          if (
            (colorName.startsWith('[') && colorName.endsWith(']')) ||
            (colorName.startsWith('(--') && colorName.endsWith(')'))
          ) {
            offset += 1;
            end = offset + colorName.length - 2;
            originalText = colorName.slice(1, -1);
          }

          results.push({
            color: colorData,
            endOffset: end,
            fullEndOffset: classMatch.index + classMatch[0].length,
            fullStartOffset: classMatch.index,
            originalText,
            startOffset: offset,
          });
        }
      }
    }
  }
  return results;
}

/**
 * Collect the offset ranges of CSS contexts within a mixed-language document:
 * `<style>…</style>` block contents and `style`/`:style` attribute values.
 * Returned ranges are non-overlapping and sorted ascending by start offset.
 */
function collectCssRegions(text: string): { start: number; end: number }[] {
  const regions: { start: number; end: number }[] = [];

  for (const match of text.matchAll(STYLE_BLOCK_RX)) {
    const range = match.indices?.groups?.css;
    if (range) {
      regions.push({ end: range[1], start: range[0] });
    }
  }

  for (const match of text.matchAll(STYLE_ATTR_RX)) {
    const range = match.indices?.groups?.dq ?? match.indices?.groups?.sq;
    if (range) {
      regions.push({ end: range[1], start: range[0] });
    }
  }

  regions.sort((a, b) => a.start - b.start);
  return regions;
}

/** Binary-search whether `offset` falls within any sorted, non-overlapping region. */
function isOffsetInRegions(offset: number, regions: { start: number; end: number }[]): boolean {
  let lo = 0;
  let hi = regions.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const region = regions[mid];
    if (offset < region.start) {
      hi = mid - 1;
    } else if (offset >= region.end) {
      lo = mid + 1;
    } else {
      return true;
    }
  }
  return false;
}

/**
 * Check if a named-color match is part of a variable name (`$blue`, `@blue`, `--blue`),
 * a CSS/SCSS selector (`.red`, `#red`), or a quoted string (`'red'`, `"red"`).
 * In all cases the word should NOT be highlighted as a named color.
 */
function isNamedColorInNonValueContext(text: string, offset: number): boolean {
  if (offset <= 0) {
    return false;
  }
  const prev = text[offset - 1];

  // Variable names: $blue, @blue
  if (prev === '$' || prev === '@') {
    return true;
  }
  // CSS custom property names: --blue
  if (prev === '-' && offset > 1 && text[offset - 2] === '-') {
    return true;
  }
  // CSS class selectors: .red
  if (prev === '.') {
    return true;
  }
  // CSS ID selectors: #red (hex colors are handled by the hex strategy, not named-color path)
  if (prev === '#') {
    return true;
  }
  // Quoted strings: 'red', "red"; string literals in CSS/SCSS are never color values
  if (prev === "'" || prev === '"') {
    return true;
  }
  return false;
}

/**
 * Matches quoted SASS/SCSS map keys followed by a colon: `'key':` or `"key":`.
 * The entire quoted key portion (including quotes) is captured as a suppressed range
 * so that named colors inside map keys are not highlighted.
 */
const SASS_MAP_KEY_RX = /['"][a-zA-Z0-9_-]+['"]\s*:/g;

function collectSassMapKeyRanges(text: string): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  for (const match of text.matchAll(SASS_MAP_KEY_RX)) {
    // Suppress from the start of the quoted key up to (but not including) the colon.
    ranges.push({ end: match.index + match[0].indexOf(':'), start: match.index });
  }
  return ranges;
}

function extractNamedColors(
  text: string,
  languageId: string,
  options: DocumentResolvedConfig & { uri?: string; extractOnly?: boolean },
  isInsideComment: (index: number) => boolean
): ColorMatch[] {
  const isPureCss = PURE_CSS_LANGUAGES.has(languageId);
  const isMixedCss = MIXED_CSS_LANGUAGES.has(languageId);

  if (!isPureCss && !isMixedCss) {
    return [];
  }

  // In mixed-language files the whole document is NOT CSS, so named colors must only be matched inside real
  // CSS contexts (`<style>` blocks and `style`/`:style` attributes); never in class names, scripts, or markup.
  const cssRegions = isMixedCss ? collectCssRegions(text) : undefined;

  // In SCSS/SASS/LESS files, suppress named-color matches inside map keys.
  const sassMapKeyRanges =
    isPureCss && languageId !== 'css' ? collectSassMapKeyRanges(text) : undefined;

  const results: ColorMatch[] = [];
  for (const wordMatch of text.matchAll(WORD_RX)) {
    const word = wordMatch[0].toLowerCase();
    const rgb = NAMED_COLORS.get(word);
    if (rgb) {
      const offset = wordMatch.index;
      const end = offset + wordMatch[0].length;

      // In mixed-language files, only accept matches inside CSS contexts.
      const inCssContext = !cssRegions || isOffsetInRegions(offset, cssRegions);

      // Skip words adjacent to hyphens (e.g., utility classes or variables).
      const isClassFragment = isAdjacentToHyphen(text, offset, end);

      // Skip named colors in variable names ($blue, @blue, --blue) or selectors (.red, #red).
      const isNonValue = isNamedColorInNonValueContext(text, offset);

      // Skip named colors inside SASS map keys ('black': ..., 'red': ...).
      const isMapKey =
        sassMapKeyRanges !== undefined && isOffsetInRegions(offset, sassMapKeyRanges);

      if (inCssContext && !isClassFragment && !isNonValue && !isMapKey) {
        const colorData: ColorData =
          rgb === SPECIAL_TRANSPARENT
            ? {
                css: 'transparent',
                opaqueCss: 'transparent',
                rgba: { a: 0, b: 0, g: 0, r: 0 },
                special: SPECIAL_TRANSPARENT,
              }
            : {
                css: wordMatch[0],
                opaqueCss: wordMatch[0],
                rgba: { a: 1, b: rgb[2], g: rgb[1], r: rgb[0] },
              };

        const defName = getVariableDefName(text, offset, isInsideComment);
        if (defName) {
          setVariable(defName, colorData, options.uri ?? '');
        }

        results.push({
          color: colorData,
          endOffset: end,
          originalText: wordMatch[0],
          startOffset: offset,
        });
      }
    }
  }
  return results;
}
// ----------------------------------- @PROPERTY SUPPORT ---------------------------------

/** Matches `@property` blocks and captures the variable name and `initial-value`. */
const AT_PROPERTY_RX =
  /@property\s+(?<propName>--[a-zA-Z0-9_-]+)\s*\{[^}]*initial-value:\s*(?<initValue>[^;}\n]+)/g;

/**
 * Pre-pass: extract color definitions from CSS `@property` rules.
 * Registers the `initial-value` color under the property's custom-property name
 * so that `var(--name)` references resolve correctly.
 */
function extractPropertyDefinitions(
  text: string,
  options: DocumentResolvedConfig & { uri?: string }
): void {
  for (const match of text.matchAll(AT_PROPERTY_RX)) {
    const { propName, initValue } = match.groups as { propName: string; initValue: string };
    const valueStr = initValue.trim();
    const colorData = extractWithStrategies(valueStr, options);
    if (colorData) {
      setVariable(propName, colorData, options.uri ?? '');
    }
  }
}

// ---------------------------------- SASS MAP SUPPORT -----------------------------------

/** VS Code language IDs that support SASS map syntax. */
const SASS_LANGUAGES: ReadonlySet<string> = new Set<string>(['sass', 'scss', 'less']);

/** Matches SASS map variable definitions: `$name: (` */
const SASS_MAP_DEF_START_RX = /(?<mapName>\$[a-zA-Z0-9_-]+)\s*:\s*\(/g;

/** Matches `map-get($mapName, 'key')` or `map.get($mapName, 'key')`. */
const SASS_MAP_GET_RX =
  /map[-.]get\(\s*(?<mapRef>\$[a-zA-Z0-9_-]+)\s*,\s*['"](?<lookupKey>[a-zA-Z0-9_-]+)['"]\s*\)/g;

/** Find the closing `)` matching an opening `(` at `openIndex`, respecting nesting. */
function findClosingParen(text: string, openIndex: number): number {
  let depth = 1;
  for (let i = openIndex + 1; i < text.length; i += 1) {
    if (text[i] === '(') {
      depth += 1;
    } else if (text[i] === ')') {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

/**
 * Split a SASS map body on commas at nesting depth 0.
 * Handles nested function calls like `rgba(...)` correctly.
 */
function splitMapEntries(body: string): string[] {
  const entries: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < body.length; i += 1) {
    if (body[i] === '(') {
      depth += 1;
    } else if (body[i] === ')') {
      depth -= 1;
    } else if (body[i] === ',' && depth === 0) {
      entries.push(body.slice(start, i));
      start = i + 1;
    }
  }
  const last = body.slice(start).trim();
  if (last) {
    entries.push(body.slice(start));
  }
  return entries;
}

/** Extracts the key and value from a single SASS map entry string like `'key': value`. */
const SASS_MAP_ENTRY_RX = /^\s*['"]?(?<entryKey>[a-zA-Z0-9_-]+)['"]?\s*:\s*(?<entryValue>[\s\S]+)$/;

/**
 * Pre-pass: parse SASS map definitions and register each key-value pair
 * as a virtual variable `$mapName::keyName` for map-get resolution.
 * Skips nested sub-maps (values starting with `(`) to avoid incorrect matches.
 */
function extractSassMapDefinitions(
  text: string,
  options: DocumentResolvedConfig & { uri?: string }
): void {
  for (const mapMatch of text.matchAll(SASS_MAP_DEF_START_RX)) {
    const { mapName } = mapMatch.groups as { mapName: string };
    const openParen = mapMatch.index + mapMatch[0].length - 1;
    const closeParen = findClosingParen(text, openParen);
    if (closeParen !== -1) {
      const mapBody = text.slice(openParen + 1, closeParen);
      const entries = splitMapEntries(mapBody);

      for (const entry of entries) {
        const entryMatch = SASS_MAP_ENTRY_RX.exec(entry);
        if (entryMatch?.groups) {
          const key = entryMatch.groups.entryKey;
          const valueStr = entryMatch.groups.entryValue.trim();
          // Skip nested sub-maps (values starting with `(`) to avoid incorrect matches.
          if (!valueStr.startsWith('(')) {
            const colorData = extractWithStrategies(valueStr, options);
            if (colorData) {
              setVariable(`${mapName}::${key}`, colorData, options.uri ?? '');
            }
          }
        }
      }
    }
  }
}

/**
 * Resolve `map-get($mapName, 'key')` calls to previously registered map entries.
 * Returns `ColorMatch` results for each successfully resolved call.
 */
function extractSassMapGets(
  text: string,
  options: DocumentResolvedConfig & { uri?: string; extractOnly?: boolean }
): ColorMatch[] {
  if (options.extractOnly) {
    return [];
  }
  const results: ColorMatch[] = [];
  for (const match of text.matchAll(SASS_MAP_GET_RX)) {
    const { mapRef, lookupKey } = match.groups as { mapRef: string; lookupKey: string };
    const colorData = getVariable(`${mapRef}::${lookupKey}`);
    if (colorData) {
      results.push({
        color: colorData,
        endOffset: match.index + match[0].length,
        originalText: match[0],
        startOffset: match.index,
      });
    }
  }
  return results;
}

// -------------------------------------- PUBLIC API -------------------------------------

/**
 * Extract all color literals from `text`.
 *
 * @param text         The source text to scan.
 * @param languageId   VS Code language ID of the document (for named-color filtering).
 */
export function extractColors(
  text: string,
  languageId: string,
  options: DocumentResolvedConfig & { uri?: string; extractOnly?: boolean }
): ColorMatch[] {
  let results: ColorMatch[] = [];

  // Lazy-calculate comment ranges to avoid registering commented-out variable definitions.
  let commentRanges: { start: number; end: number }[] | undefined = undefined;

  function isInsideComment(index: number): boolean {
    if (!commentRanges) {
      commentRanges = [];
      for (const match of text.matchAll(COMMENT_RX)) {
        if (!(match[0].startsWith('//') && match.index > 0 && text[match.index - 1] === ':')) {
          commentRanges.push({ end: match.index + match[0].length, start: match.index });
        }
      }
      // `matchAll` returns matches sorted by start index automatically.
    }

    let left = 0;
    let right = commentRanges.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const range = commentRanges[mid];
      if (index < range.start) {
        right = mid - 1;
      } else if (index >= range.end) {
        left = mid + 1;
      } else {
        return true;
      }
    }
    return false;
  }

  const colorRe = getRegex(options);

  // [0] CSS @property definitions: extract `initial-value` colors before the main scan
  //     so `var(--name)` usages can resolve to the @property's initial value.
  extractPropertyDefinitions(text, options);

  // [0b] SASS map definitions: extract key-value pairs from `$map: (...)` so
  //      `map-get($map, 'key')` calls can be resolved to their stored colors.
  if (SASS_LANGUAGES.has(languageId)) {
    extractSassMapDefinitions(text, options);
  }

  // [1] Functional and hexa colors (all languages):
  const regexMatches: ColorMatch[] = [];

  for (const match of text.matchAll(colorRe)) {
    let colorData: ColorData | undefined = undefined;
    const { groups } = match;
    if (groups) {
      for (const { strategy, groupId } of strategyGroups) {
        if (groups[groupId] !== undefined) {
          colorData = strategy.extract(match[0], options);
          break;
        }
      }
    } else {
      colorData = extractWithStrategies(match[0], options);
    }

    if (colorData) {
      const defName = getVariableDefName(text, match.index, isInsideComment);
      if (defName) {
        setVariable(defName, colorData, options.uri ?? '');
      }

      regexMatches.push({
        color: colorData,
        endOffset: match.index + match[0].length,
        originalText: match[0],
        startOffset: match.index,
      });
    }
  }

  // [2] Named CSS colors (run before Tailwind so their definitions are registered):
  let namedMatches: ColorMatch[] = [];
  if (options.markNamedColors) {
    namedMatches = extractNamedColors(text, languageId, options, isInsideComment);
  }

  // [3] Tailwind classes:
  // Most specific; Run after variable registrations so `resolveVariable` works, but passed
  // to `mergeNonOverlapping` FIRST so it overrides generic matches and preserves alpha.
  let tailwindMatches: ColorMatch[] = [];
  if (options.markTailwind && !options.extractOnly) {
    tailwindMatches = extractTailwindClasses(text, options);
  }

  // Merge them (Tailwind overrides overlapping regex matches and named matches)
  results = mergeNonOverlapping(tailwindMatches, regexMatches);
  results = mergeNonOverlapping(results, namedMatches);

  if (options.extractOnly) {
    return results;
  }

  // [4] Extract and resolve variable aliases, and CSS variable usages:
  // Build `directVarDefs` from ALL color matches (regex + named) so the positional
  // override system sees every variable definition regardless of how the color was
  // detected (hex, rgb, named CSS color, @property, etc.):
  const directVarDefs: { name: string; color: ColorData; offset: number }[] = [];
  const allColorMatches = [...regexMatches, ...namedMatches];
  for (const colorMatch of allColorMatches) {
    const defName = getVariableDefName(text, colorMatch.startOffset, isInsideComment);
    if (defName) {
      directVarDefs.push({
        color: colorMatch.color,
        name: defName,
        offset: colorMatch.startOffset,
      });
    }
  }

  // Sort by offset so the positional walk interleaves them correctly:
  directVarDefs.sort((defA, defB) => defA.offset - defB.offset);

  const usageMatches = resolveAliasesAndUsages(text, options, isInsideComment, directVarDefs);

  if (options.markVariables && usageMatches.length > 0) {
    results = mergeNonOverlapping(results, usageMatches);
  }

  // [5] SASS map-get() resolution:
  if (SASS_LANGUAGES.has(languageId)) {
    const mapGetMatches = extractSassMapGets(text, options);
    if (mapGetMatches.length > 0) {
      results = mergeNonOverlapping(results, mapGetMatches);
    }
  }

  return results;
}
