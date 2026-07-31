import { ColorConverter } from '../src/converters/ColorConverter';

describe('ColorConverter', () => {
  describe('toUDFInt', () => {
    it('should return undefined for undefined input', () => {
      expect(ColorConverter.toUDFInt(undefined)).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(ColorConverter.toUDFInt('')).toBeUndefined();
    });

    it('should convert hex colors to UDF int', () => {
      const result = ColorConverter.toUDFInt('#000000');
      expect(result).toBeDefined();
      expect(result! & 0x00FFFFFF).toBe(0);
    });

    it('should convert #FFFFFF to white', () => {
      const result = ColorConverter.toUDFInt('#FFFFFF');
      expect(result).toBeDefined();
      expect(result! & 0x00FFFFFF).toBe(0xFFFFFF);
    });

    it('should convert #FF0000 to red', () => {
      const result = ColorConverter.toUDFInt('#FF0000');
      expect(result).toBeDefined();
      expect(result! & 0x000000FF).toBe(0);
      expect((result! >> 16) & 0xFF).toBe(0xFF);
    });

    it('should convert 3-digit hex colors', () => {
      const result = ColorConverter.toUDFInt('#F00');
      expect(result).toBeDefined();
      expect((result! >> 16) & 0xFF).toBe(0xFF);
    });

    it('should convert named color "black"', () => {
      const result = ColorConverter.toUDFInt('black');
      expect(result).toBe(-16777216);
    });

    it('should convert named color "white"', () => {
      const result = ColorConverter.toUDFInt('white');
      expect(result).toBe(-1);
    });

    it('should convert named color "red"', () => {
      const result = ColorConverter.toUDFInt('red');
      expect(result).toBe(-65536);
    });

    it('should convert rgb(r,g,b) format', () => {
      const result = ColorConverter.toUDFInt('rgb(255, 255, 255)');
      expect(result).toBeDefined();
      expect(result! & 0x00FFFFFF).toBe(0xFFFFFF);
    });

    it('should convert rgb(255, 0, 0) to red', () => {
      const result = ColorConverter.toUDFInt('rgb(255, 0, 0)');
      expect(result).toBeDefined();
      expect((result! >> 16) & 0xFF).toBe(0xFF);
    });
  });
});
