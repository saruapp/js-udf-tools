// shared/udf-converter/builders/ElementsBuilder.ts
import { HTMLElement } from 'node-html-parser';
import {
  UDFCell,
  UDFElement,
  UDFFooter,
  UDFHeader,
  UDFImage,
  UDFParagraph,
  UDFRow,
  UDFTable,
} from '../models/UDFElements';
import { ContentBuildResult, TextPiece } from './ContentBuilder';
import { StylesBuilder } from './StylesBuilder';

export class ElementsBuilder {
  private stylesBuilder: StylesBuilder;
  private computedStyles: Map<HTMLElement, Record<string, string>>;
  private allPieces: any[] = [];
  private imageOffsets: Map<HTMLElement, number> = new Map();

  constructor(stylesBuilder: StylesBuilder) {
    this.stylesBuilder = stylesBuilder;
    this.computedStyles = new Map();
    this.allPieces = [];
  }

  /**
   * ContentBuilder çıktısını kullanarak UDF elemanlarını oluşturur.
   * @param contentResult - ContentBuilder'ın ürettiği fullText ve blok metin parçaları
   * @param computedStyles - her element için hesaplanmış stiller
   * @returns UDF elemanları dizisi
   */
  build(
    contentResult: ContentBuildResult,
    computedStyles: Map<HTMLElement, Record<string, string>>,
  ): UDFElement[] {
    this.computedStyles = computedStyles;
    this.imageOffsets = contentResult.imageOffsets;
    const elements: UDFElement[] = [];
    const { blockElements, blockTextPieces } = contentResult;

    for (const pieces of contentResult.blockTextPieces.values()) {
      this.allPieces.push(...pieces);
    }

    const validBlocks = blockElements.filter((block) => {
      const pieces = blockTextPieces.get(block) || [];
      const tag = block.tagName?.toLowerCase();

      // Root elementi ele (tag'i olmayan)
      if (!tag) return false;

      // Sayfa sonu işareti (boş div olabilir; metin şartı aranmaz).
      if (this.isPageBreak(block)) return true;

      // ⭐ ÖZEL ELEMENTLER (her zaman tut)
      if (tag === 'table') return true;
      if (tag === 'header') return true;
      if (tag === 'footer') return true;
      // Tablo içindeki img'ler createTable tarafından ele alınır
      if (tag === 'img') return !this.isInsideTable(block);

      // Kapsayıcıları ele
      if (tag === 'ul' || tag === 'ol') return false;
      if (tag === 'th' || tag === 'td' || tag === 'tr') return false;

      // Sadece metin içeren blokları al
      return pieces.length > 0;
    });

    for (const block of validBlocks) {
      const pieces = blockTextPieces.get(block) || [];
      const tag = block.tagName?.toLowerCase();

      // `page-break-before: always` → gerçek <page-break/>; metin varsa
      // ardından normal blok olarak devam eder.
      if (this.isPageBreak(block)) {
        elements.push({ type: 'page-break' });
        if (pieces.length === 0) continue;
      }

      // ⭐ HEADER
      if (tag === 'header') {
        elements.push(this.createHeader(block, pieces));
      }
      // ⭐ FOOTER
      else if (tag === 'footer') {
        elements.push(this.createFooter(block, pieces));
      }
      // ⭐ TABLO
      else if (tag === 'table') {
        elements.push(this.createTable(block, pieces));
      }
      // Liste elemanları
      else if (tag === 'li') {
        const parent = block.parentNode;
        const parentTag = parent?.tagName?.toLowerCase();

        elements.push(
          this.createParagraph(block, pieces, {
            bulleted: parentTag === 'ul',
            numbered: parentTag === 'ol',
            listLevel: this.getListLevel(block),
          }),
        );
      }
      // Başlık ve paragraf
      else if (tag === 'p' || /^h[1-6]$/.test(tag || '')) {
        elements.push(this.createParagraph(block, pieces));
      }
      // Resim — UDF spec requires <image> inside <paragraph>
      else if (tag === 'img') {
        elements.push(this.createImageParagraph(block));
      }
      // Diğer bloklar (div, section, article, main)
      else if (pieces.length > 0) {
        elements.push(this.createParagraph(block, pieces));
      }
    }

    return elements;
  }

  private isPageBreak(el: HTMLElement): boolean {
    const styles = this.computedStyles.get(el) || {};
    return styles['page-break-before'] === 'always';
  }

  /**
   * Liste elemanlarını işler
   */
  private processList(
    block: HTMLElement,
    pieces: TextPiece[],
    tag: string,
    elements: UDFElement[],
  ): void {
    const listItems = block.querySelectorAll('li');
    for (const li of listItems) {
      const liPieces = this.getPiecesForElement(li, pieces);
      elements.push(
        this.createParagraph(li, liPieces, {
          bulleted: tag === 'ul',
          numbered: tag === 'ol',
          listLevel: this.getListLevel(block),
        }),
      );
    }
  }

  /**
   * Bir elementin altındaki text parçalarını filtreler.
   */
  // ElementsBuilder.ts
  private getPiecesForElement(el: HTMLElement, allPieces: TextPiece[]): TextPiece[] {
    // ⭐ ownerElement'ı kullanarak filtrele
    return allPieces.filter((piece) => {
      // piece.ownerElement, bu elementin alt ağacında mı?
      let current = piece.ownerElement;
      while (current) {
        if (current === el) return true;
        current = current.parentNode;
      }
      return false;
    });
  }

  /**
   * Paragraf oluşturur
   */
  private createParagraph(
    el: HTMLElement,
    pieces: TextPiece[],
    options?: { bulleted?: boolean; numbered?: boolean; listLevel?: number },
  ): UDFParagraph {
    const styles = this.computedStyles.get(el) || {};
    const alignment = this.getAlignment(styles['text-align']);
    const leftIndent = this.getIndent(styles['margin-left']);
    const rightIndent = this.getIndent(styles['margin-right']);
    const firstLineIndent = this.getIndent(styles['text-indent']);
    const spaceBefore = this.getSpacing(styles['margin-top']);
    const spaceAfter = this.getSpacing(styles['margin-bottom']);
    const lineSpacing = this.getLineSpacing(styles['line-height']);

    const contents = pieces.map((p) => {
      const pieceStyles = this.computedStyles.get(p.element) || {};
      return {
        startOffset: p.startOffset,
        length: p.length,
        family: this.getFontFamily(pieceStyles['font-family']),
        size: this.parseFontSize(pieceStyles['font-size']),
        bold: pieceStyles['font-weight'] === 'bold' || pieceStyles['font-weight'] === '700',
        italic: pieceStyles['font-style'] === 'italic',
        underline: pieceStyles['text-decoration']?.includes('underline'),
        strikethrough: pieceStyles['text-decoration']?.includes('line-through'),
        foreground: this.getColorInt(pieceStyles['color']),
        background: this.getColorInt(pieceStyles['background-color']),
      };
    });

    return {
      type: 'paragraph',
      alignment,
      leftIndent,
      rightIndent,
      firstLineIndent,
      spaceBefore,
      spaceAfter,
      lineSpacing,
      bulleted: options?.bulleted,
      numbered: options?.numbered,
      listLevel: options?.listLevel,
      contents,
    };
  }

  /**
   * Tablo oluşturur
   */
  /**
   * Tablo oluşturur
   */
  private createTable(el: HTMLElement, allPieces: TextPiece[]): UDFTable {
    const rows: UDFRow[] = [];
    const tableRows = el.querySelectorAll('tr');

    for (const rowEl of tableRows) {
      const cells: UDFCell[] = [];
      const cellEls = rowEl.querySelectorAll('td, th');

      for (const cellEl of cellEls) {
        const cellPieces = this.allPieces.filter((p) => {
          let current = p.ownerElement;
          while (current) {
            if (current === cellEl) return true;
            current = current.parentNode as HTMLElement;
          }
          return false;
        });

        const paragraphs: UDFParagraph[] = [];
        if (cellPieces.length > 0) {
          paragraphs.push(this.createParagraph(cellEl, cellPieces));
        }

        // Hücrede metin olmasa bile resim varsa paragrafa sar
        const imgEls = cellEl.querySelectorAll('img');
        for (const imgEl of imgEls) {
          paragraphs.push(this.createImageParagraph(imgEl));
        }

        const cellStyles = this.computedStyles.get(cellEl) || {};
        const colspan = cellEl.getAttribute('colspan');
        const rowspan = cellEl.getAttribute('rowspan');

        cells.push({
          colspan: colspan ? parseInt(colspan) : undefined,
          rowspan: rowspan ? parseInt(rowspan) : undefined,
          bgColor: this.getColorInt(cellStyles['background-color']),
          vAlign: this.getVAlign(cellStyles['vertical-align']),
          hAlign: this.getHAlign(cellStyles['text-align']),
          paragraphs,
        });
      }
      rows.push({ cells });
    }

    // Tablo genel stillerini al
    const tableStyles = this.computedStyles.get(el) || {};
    const columnCount = this.getColumnCount(el);

    return {
      type: 'table',
      columnCount,
      columnSpans: this.getColumnSpans(el, columnCount),
      border: tableStyles['border'] || 'borderCell',
      alignment: this.getAlignment(tableStyles['text-align']),
      rows,
    };
  }

  /**
   * Resim içeren bir paragraf oluşturur.
   * UDF spec: <image> elemanı <paragraph> içinde olmalıdır.
   */
  private createImageParagraph(el: HTMLElement): UDFParagraph {
    const image = this.extractImage(el);

    const parentBlock = el.parentNode;
    const parentStyles = this.computedStyles.get(parentBlock) || {};

    const imgOffset = this.imageOffsets.get(el);
    if (imgOffset !== undefined) {
      image.startOffset = imgOffset;
      image.length = 1;
    }

    return {
      type: 'paragraph',
      alignment: this.getAlignment(parentStyles['text-align']),
      image,
      contents: [],
    };
  }

  /**
   * HTML <img> elementinden UDFImage çıkarır.
   * data:image URI ise base64 prefix'ini soyup sadece ham base64'ü alır.
   */
  private extractImage(el: HTMLElement): UDFImage {
    const src = el.getAttribute('src') || '';
    let imageData = src;

    if (src.startsWith('data:image')) {
      const base64Match = src.match(/^data:image\/[^;]+;base64,(.+)$/);
      if (base64Match) {
        imageData = base64Match[1];
      }
    } else {
      // Dosya yolu ise, dosyayı okuyup base64'e çevir
      // TODO: Dosya okuma işlemi
    }

    const width = el.getAttribute('width');
    const height = el.getAttribute('height');
    const alt = el.getAttribute('alt') || '';
    const styles = this.computedStyles.get(el) || {};

    return {
      type: 'image',
      imageData,
      width: width ? parseFloat(width) : undefined,
      height: height ? parseFloat(height) : undefined,
      family: 'Times New Roman',
      size: 10,
      alignment: this.getAlignment(styles['text-align']),
      description: alt,
    };
  }

  /**
   * Header oluşturur
   */
  private createHeader(el: HTMLElement, pieces: TextPiece[]): UDFHeader {
    const styles = this.computedStyles.get(el) || {};

    return {
      type: 'header',
      background: this.getColorInt(styles['background-color']),
      foreground: this.getColorInt(styles['color']),
      paragraphs: [this.createParagraph(el, pieces)],
    };
  }

  /**
   * Footer oluşturur
   */
  private createFooter(el: HTMLElement, pieces: TextPiece[]): UDFFooter {
    const styles = this.computedStyles.get(el) || {};

    return {
      type: 'footer',
      background: this.getColorInt(styles['background-color']),
      foreground: this.getColorInt(styles['color']),
      paragraphs: [this.createParagraph(el, pieces)],
    };
  }

  // ==================== YARDIMCI METODLAR ====================

  /**
   * Metin hizalamasını UDF alignment değerine çevirir
   */
  private getAlignment(textAlign?: string): number {
    const map: Record<string, number> = {
      left: 0,
      center: 1,
      right: 2,
      justify: 3,
    };
    return map[textAlign || 'left'] ?? 0;
  }

  /**
   * Dikey hizalamayı UDF vAlign değerine çevirir
   */
  private getVAlign(verticalAlign?: string): 'top' | 'middle' | 'bottom' {
    if (verticalAlign?.includes('top')) return 'top';
    if (verticalAlign?.includes('bottom')) return 'bottom';
    return 'middle';
  }

  /**
   * Yatay hizalamayı UDF hAlign değerine çevirir
   */
  private getHAlign(textAlign?: string): 'left' | 'center' | 'right' | 'justify' {
    const map: Record<string, 'left' | 'center' | 'right' | 'justify'> = {
      left: 'left',
      center: 'center',
      right: 'right',
      justify: 'justify',
    };
    return map[textAlign || 'left'] ?? 'left';
  }

  /**
   * CSS indent değerini UDF indent değerine çevirir (punto)
   */
  private getIndent(value?: string): number {
    if (!value) return 0;
    const match = value.match(/^(\d+(?:\.\d+)?)(px|pt|em|rem)?$/);
    if (match) {
      const num = parseFloat(match[1]);
      const unit = match[2];
      if (unit === 'px') return num * 0.75;
      if (unit === 'pt') return num;
      if (unit === 'em' || unit === 'rem') return num * 12;
    }
    return 0;
  }

  /**
   * CSS spacing değerini UDF spacing değerine çevirir
   */
  private getSpacing(value?: string): number {
    return this.getIndent(value);
  }

  /**
   * CSS line-height değerini UDF line spacing değerine çevirir
   */
  private getLineSpacing(value?: string): number {
    if (!value) return 1.0;
    if (value === 'normal') return 1.2;
    const match = value.match(/^(\d+(?:\.\d+)?)$/);
    if (match) return parseFloat(match[1]);
    return 1.0;
  }

  /**
   * Liste seviyesini hesaplar (iç içe listeler için)
   */
  private getListLevel(el: HTMLElement): number {
    let level = 0;
    let parent = el.parentNode as HTMLElement | null;
    while (parent) {
      const tag = parent.tagName?.toLowerCase();
      if (tag === 'ul' || tag === 'ol') {
        level++;
      }
      parent = parent.parentNode;
    }
    return level;
  }

  /**
   * Renk değerini UDF integer değerine çevirir
   */
  private getColorInt(color?: string): number | undefined {
    if (!color) return undefined;

    try {
      // Hex renk (#RRGGBB)
      if (color.startsWith('#')) {
        const hex = color.substring(1);
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return 0xff000000 | (r << 16) | (g << 8) | b;
      }

      // RGB renk (rgb(r,g,b))
      const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (rgbMatch) {
        const r = parseInt(rgbMatch[1]);
        const g = parseInt(rgbMatch[2]);
        const b = parseInt(rgbMatch[3]);
        return 0xff000000 | (r << 16) | (g << 8) | b;
      }
    } catch {
      console.warn('Renk dönüşüm hatası:', color);
    }

    return undefined;
  }

  /**
   * Font ailesini alır
   */
  private getFontFamily(fontFamily?: string): string {
    if (!fontFamily) return 'Times New Roman';
    const families = fontFamily.split(',').map((f) => f.trim().replace(/['"]/g, ''));
    return families[0] || 'Times New Roman';
  }

  /**
   * Font boyutunu parse eder
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
   * Bir elementin tablo içinde olup olmadığını kontrol eder.
   */
  private isInsideTable(el: HTMLElement): boolean {
    let current: HTMLElement | null = el.parentNode;
    while (current) {
      const tag = current.tagName?.toLowerCase();
      if (tag === 'table') return true;
      current = current.parentNode;
    }
    return false;
  }

  /**
   * Tablodaki sütun sayısını hesaplar
   */
  private getColumnCount(tableEl: HTMLElement): number {
    const firstRow = tableEl.querySelector('tr');
    if (!firstRow) return 1;
    return firstRow.querySelectorAll('td, th').length;
  }

  /**
   * Sütun genişliklerini hesaplar
   */
  private getColumnSpans(tableEl: HTMLElement, columnCount: number): string {
    // Varsayılan olarak eşit genişlik
    const width = 100 / columnCount;
    return Array(columnCount).fill(`${width}%`).join(',');
  }
}
