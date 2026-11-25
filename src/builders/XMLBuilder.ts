// shared/udf-converter/builders/XMLBuilder.ts
import { create } from 'xmlbuilder2';
import { UDFDocument } from '../models/UDFDocument';
import {
  UDFElement,
  UDFFooter,
  UDFHeader,
  UDFImage,
  UDFPageBreak,
  UDFParagraph,
  UDFTable,
} from '../models/UDFElements';
import { UDFProperties } from '../models/UDFProperties';
import { UDFStyle } from '../models/UDFStyles';

export class XMLBuilder {
  /**
   * UDFDocument modelini alır ve content.xml içeriğini string olarak döndürür.
   */
  build(doc: UDFDocument): string {
    const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('template', {
      format_id: doc.template.format_id,
      webID: doc.template.webID,
      institutionID: doc.template.institutionID,
      description: doc.template.description,
    });

    // <content> bölümü: ham metin CDATA içinde
    root.ele('content').dat(doc.content);

    // <properties> bölümü
    this.buildProperties(root, doc.properties);

    // <elements> bölümü
    this.buildElements(root, doc.elements);

    // <styles> bölümü
    this.buildStyles(root, doc.styles);

    // Opsiyonel <data>
    if (doc.data) {
      // data yapısını da oluşturabiliriz, şimdilik atlıyoruz
    }

    // XML'i string olarak döndür
    return root.end({ prettyPrint: true });
  }

  private buildProperties(parent: any, properties: UDFProperties) {
    const propsElem = parent.ele('properties');
    const pf = properties.pageFormat;
    if (pf) {
      propsElem.ele('pageFormat', {
        mediaSizeName: pf.mediaSizeName,
        leftMargin: pf.leftMargin,
        rightMargin: pf.rightMargin,
        topMargin: pf.topMargin,
        bottomMargin: pf.bottomMargin,
        paperOrientation: pf.paperOrientation,
        headerFOffset: pf.headerFOffset,
        footerFOffset: pf.footerFOffset,
      });
    }
    // bgImage vb. eklenebilir
  }

  private buildElements(parent: any, elements: UDFElement[]) {
    const elementsElem = parent.ele('elements', { resolver: 'hvl-default' }); // varsayılan resolver

    for (const el of elements) {
      switch (el.type) {
        case 'paragraph':
          this.buildParagraph(elementsElem, el);
          break;
        case 'table':
          this.buildTable(elementsElem, el);
          break;
        case 'image':
          this.buildImage(elementsElem, el);
          break;
        case 'header':
          this.buildHeader(elementsElem, el);
          break;
        case 'footer':
          this.buildFooter(elementsElem, el);
          break;
        case 'page-break':
          this.buildPageBreak(elementsElem, el);
          break;
      }
    }
  }

  private buildParagraph(parent: any, p: UDFParagraph) {
    const attrs: Record<string, any> = { Alignment: p.alignment };
    attrs.LeftIndent = p.leftIndent ?? 0;
    attrs.RightIndent = p.rightIndent ?? 0;
    if (p.firstLineIndent !== undefined && p.firstLineIndent !== 0)
      attrs.FirstLineIndent = p.firstLineIndent;
    if (p.spaceBefore) attrs.SpaceBefore = p.spaceBefore;
    if (p.spaceAfter) attrs.SpaceAfter = p.spaceAfter;
    if (p.lineSpacing && p.lineSpacing !== 1) attrs.LineSpacing = p.lineSpacing;
    if (p.bulleted) attrs.Bulleted = p.bulleted;
    if (p.numbered) attrs.Numbered = p.numbered;
    if (p.listLevel !== undefined && p.listLevel !== 0) attrs.ListLevel = p.listLevel;
    if (p.tabStops) attrs.TabSet = p.tabStops;

    const pElem = parent.ele('paragraph', attrs);

    if (p.image) {
      this.buildImage(pElem, p.image);
    }

    for (const content of p.contents) {
      if (content.isTab) {
        pElem.ele('tab', {
          startOffset: content.startOffset,
          length: content.length,
        });
        continue;
      }
      const contentAttrs: Record<string, any> = {
        startOffset: content.startOffset,
        length: content.length,
      };
      if (content.family) contentAttrs.family = content.family;
      if (content.size !== undefined) contentAttrs.size = content.size;
      if (content.bold) contentAttrs.bold = content.bold;
      if (content.italic) contentAttrs.italic = content.italic;
      if (content.underline) contentAttrs.underline = content.underline;
      if (content.strikethrough) contentAttrs.strikethrough = content.strikethrough;
      if (content.foreground !== undefined) contentAttrs.foreground = content.foreground;
      if (content.background !== undefined) contentAttrs.background = content.background;
      pElem.ele('content', contentAttrs);
    }
  }

  private buildTable(parent: any, t: UDFTable) {
    const tableElem = parent.ele('table');
    // TODO: sütun genişlikleri, border vs.
    for (const row of t.rows) {
      const rowElem = tableElem.ele('row');
      for (const cell of row.cells) {
        const cellElem = rowElem.ele('cell', {
          colspan: cell.colspan,
          rowspan: cell.rowspan,
          bgColor: cell.bgColor,
          vAlign: cell.vAlign,
          hAlign: cell.hAlign,
        });
        for (const para of cell.paragraphs) {
          this.buildParagraph(cellElem, para);
        }
      }
    }
  }

  private buildImage(parent: any, img: UDFImage) {
    parent.ele('image', {
      family: img.family,
      size: img.size,
      imageData: img.imageData,
      startOffset: img.startOffset,
      length: img.length,
      width: img.width,
      height: img.height,
      alignment: img.alignment,
      description: img.description,
    });
  }

  private buildHeader(parent: any, h: UDFHeader) {
    const headerElem = parent.ele('header');
    for (const para of h.paragraphs) {
      this.buildParagraph(headerElem, para);
    }
  }

  private buildFooter(parent: any, f: UDFFooter) {
    const footerElem = parent.ele('footer');
    for (const para of f.paragraphs) {
      this.buildParagraph(footerElem, para);
    }
  }

  private buildPageBreak(parent: any, _pb: UDFPageBreak) {
    parent.ele('page-break');
  }

  private buildStyles(parent: any, styles: UDFStyle[]) {
    const stylesElem = parent.ele('styles');
    stylesElem.ele('style', {
      name: 'default',
      description: 'Geçerli',
      family: 'Dialog',
      size: 12,
      bold: false,
      italic: false,
      foreground: -13421773,
      FONT_ATTRIBUTE_KEY:
        'javax.swing.plaf.FontUIResource[family=Dialog,name=Dialog,style=plain,size=12]',
    });
    stylesElem.ele('style', {
      name: 'hvl-default',
      description: 'Gövde',
      family: 'Times New Roman',
      size: 12,
    });
    for (const s of styles) {
      stylesElem.ele('style', {
        name: s.name,
        description: s.description,
        family: s.family,
        size: s.size,
        bold: s.bold,
        italic: s.italic,
        underline: s.underline,
        strikethrough: s.strikethrough,
        foreground: s.foreground,
        background: s.background,
        parent: s.parent || 'hvl-default',
      });
    }
  }
}
