// shared/udf-converter/converters/ColorConverter.ts

export class ColorConverter {
  static toUDFInt(colorStr: string | undefined): number | undefined {
    if (!colorStr) return undefined;

    try {
      // ⭐ Renk isimleri için map
      const namedColors: Record<string, number> = {
        yellow: -256,
        red: -65536,
        blue: -16776961,
        green: -16711936,
        navy: -16777088,
        black: -16777216,
        white: -1,
        gray: -6250336,
        silver: -4144960,
        maroon: -8388608,
        purple: -8388480,
        fuchsia: -65281,
        lime: -16711936,
        olive: -8355840,
        teal: -16744320,
        aqua: -16711681,
      };

      // Renk ismi kontrolü
      const lowerColor = colorStr.toLowerCase().trim();
      if (namedColors[lowerColor]) {
        return namedColors[lowerColor];
      }

      // Hex renk (#RRGGBB)
      if (colorStr.startsWith('#')) {
        return this.hexToInt(colorStr);
      }

      // rgb(r,g,b)
      if (colorStr.startsWith('rgb')) {
        return this.rgbToInt(colorStr);
      }
    } catch (e) {
      console.warn('Renk dönüşüm hatası:', colorStr, e);
    }

    return undefined;
  }

  private static hexToInt(hex: string): number {
    let hexValue = hex.substring(1);
    if (hexValue.length === 3) {
      hexValue = hexValue
        .split('')
        .map((c) => c + c)
        .join('');
    }
    const r = parseInt(hexValue.substring(0, 2), 16);
    const g = parseInt(hexValue.substring(2, 4), 16);
    const b = parseInt(hexValue.substring(4, 6), 16);
    return 0xff000000 | (r << 16) | (g << 8) | b;
  }

  private static rgbToInt(rgb: string): number {
    const match = rgb.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (!match) return -16777216;
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    return 0xff000000 | (r << 16) | (g << 8) | b;
  }
}
