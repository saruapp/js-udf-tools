// shared/udf-converter/builders/StylesBuilder.ts
import { HTMLElement } from 'node-html-parser';
import { ColorConverter } from '../converters/ColorConverter';
import { UDFStyle } from '../models/UDFStyles';

export class StylesBuilder {
  private styleCache: Map<string, UDFStyle> = new Map();
  private elementStyleMap: Map<HTMLElement, string> = new Map();

  /**
   * Hesaplanmış stilleri UDF stillerine dönüştürür.
   * @param computedStyles - HTMLParser'dan gelen element → stil haritası
   * @returns Benzersiz UDF stilleri listesi
   */
  build(computedStyles: Map<HTMLElement, Record<string, string>>): UDFStyle[] {
    this.styleCache.clear();
    this.elementStyleMap.clear();

    // Önce tüm stilleri oluştur ve elementleri stillerle eşleştir
    for (const [element, styles] of computedStyles.entries()) {
      const styleName = this.getOrCreateStyle(styles, element, computedStyles);
      this.elementStyleMap.set(element, styleName);
    }

    return Array.from(this.styleCache.values());
  }

  /**
   * Bir element için stil adını döndürür (önceden oluşturulmuşsa cache'den)
   */
  getStyleNameForElement(element: HTMLElement): string | undefined {
    return this.elementStyleMap.get(element);
  }

  /**
   * Stil varsa cache'den alır, yoksa oluşturur.
   */
  private getOrCreateStyle(
    styles: Record<string, string>,
    element: HTMLElement,
    computedStyles: Map<HTMLElement, Record<string, string>>,
  ): string {
    const styleName = this.generateStyleName(styles);

    if (!this.styleCache.has(styleName)) {
      // Parent stil adını bul (varsa)
      const parentStyleName = this.findParentStyle(element, computedStyles);

      const udfStyle = this.createUDFStyle(styleName, styles, parentStyleName);
      this.styleCache.set(styleName, udfStyle);
    }

    return styleName;
  }

  private createUDFStyle(
    name: string,
    styles: Record<string, string>,
    parentStyleName?: string,
  ): UDFStyle {
    return {
      name,
      family: this.getFontFamily(styles['font-family']),
      size: this.parseFontSize(styles['font-size']),
      bold: styles['font-weight'] === 'bold' || styles['font-weight'] === '700',
      italic: styles['font-style'] === 'italic',
      underline: styles['text-decoration']?.includes('underline'),
      strikethrough: styles['text-decoration']?.includes('line-through'),
      foreground: ColorConverter.toUDFInt(styles['color']),
      background: ColorConverter.toUDFInt(styles['background-color']),
      parent: parentStyleName, // ⭐ parent stil adı burada atanıyor
      description: `Stil ${name}`,
    };
  }

  /**
   * Stil adı oluşturur (benzersiz olmalı)
   */
  public generateStyleName(styles: Record<string, string>): string {
    const parts = [
      this.getFontFamily(styles['font-family']).replace(/\s+/g, ''),
      styles['font-size'] || '12',
      styles['font-weight'] === 'bold' ? 'bold' : '',
      styles['font-style'] === 'italic' ? 'italic' : '',
      styles['text-decoration']?.includes('underline') ? 'underline' : '',
      styles['color'] ? ColorConverter.toUDFInt(styles['color']) : '',
      styles['background-color'] ? `bg${ColorConverter.toUDFInt(styles['background-color'])}` : '',
    ].filter(Boolean);

    return parts.join('_') || 'default';
  }

  /**
   * Parent stil adını bulur
   */
  private findParentStyle(
    element: HTMLElement,
    computedStyles: Map<HTMLElement, Record<string, string>>,
  ): string | undefined {
    const parent = element.parentNode;
    if (!parent) return undefined;

    const parentStyles = computedStyles.get(parent);
    if (!parentStyles) return undefined;

    // Parent için stil adı oluştur (ama cache'e ekleme, sadece isim lazım)
    return this.generateStyleName(parentStyles);
  }

  /**
   * Font boyutunu parse eder (örn: "12pt" -> 12)
   */
  private parseFontSize(fontSize?: string): number {
    if (!fontSize) return 12;
    const match = fontSize.match(/^(\d+(?:\.\d+)?)(px|pt|em|rem)?$/);
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2];
      if (unit === 'px') return Math.round(value * 0.75);
      if (unit === 'pt') return value;
      if (unit === 'em' || unit === 'rem') return value * 12;
    }
    return 12;
  }

  /**
   * Font ailesini alır
   */
  private getFontFamily(fontFamily?: string): string {
    if (!fontFamily) return 'Times New Roman';
    const families = fontFamily.split(',').map((f) => f.trim().replace(/['"]/g, ''));
    return families[0] || 'Times New Roman';
  }
}
