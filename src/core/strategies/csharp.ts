import type { ColorData, ColorParsingStrategy } from '@/types';
import { clampAlpha, clampChannel, parseColorTokens } from '@/utils/strategy';

export const csharpStrategy: ColorParsingStrategy = {
  /** Extracts C# `Color.FromArgb(A, R, G, B)` and `Color.FromArgb(R, G, B)` color data. */
  extract(matchText: string): ColorData | undefined {
    const tokens = parseColorTokens(matchText, ['color.fromargb'], { minTokens: 3 });
    if (!tokens) {
      return undefined;
    }

    let r = 0;
    let g = 0;
    let b = 0;
    let a = 1;

    if (tokens.length >= 4) {
      // Color.FromArgb(A, R, G, B):
      a = clampAlpha(Number.parseInt(tokens[0], 10) / 255);
      r = clampChannel(Number.parseInt(tokens[1], 10));
      g = clampChannel(Number.parseInt(tokens[2], 10));
      b = clampChannel(Number.parseInt(tokens[3], 10));
    } else {
      // Color.FromArgb(R, G, B); implicitly opaque:
      r = clampChannel(Number.parseInt(tokens[0], 10));
      g = clampChannel(Number.parseInt(tokens[1], 10));
      b = clampChannel(Number.parseInt(tokens[2], 10));
    }

    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b) || Number.isNaN(a)) {
      return undefined;
    }

    return {
      css: `rgba(${r}, ${g}, ${b}, ${a})`,
      opaqueCss: `rgb(${r}, ${g}, ${b})`,
      rgba: { a, b, g, r },
    };
  },
  id: 'csharp',
  pattern: String.raw`Color\.FromArgb\(\s*\d+\s*(?:,\s*\d+\s*){2,3}\)`,
};
