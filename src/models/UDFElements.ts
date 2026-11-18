// shared/udf-converter/models/UDFElements.ts

export type UDFElementType = 'paragraph' | 'table' | 'image' | 'header' | 'footer' | 'page-break';

export interface UDFParagraph {
  type: 'paragraph';
  alignment: number; // 0-left, 1-center, 2-right, 3-justify
  leftIndent?: number;
  rightIndent?: number;
  firstLineIndent?: number;
  spaceBefore?: number;
  spaceAfter?: number;
  lineSpacing?: number;
  bulleted?: boolean;
  numbered?: boolean;
  listLevel?: number;
  /** UDF `TabSet` değeri (örn. "36.0:0:0,105.0:0:0"). */
  tabStops?: string;
  contents: UDFContentReference[];
  image?: UDFImage;
}

export interface UDFContentReference {
  startOffset: number;
  length: number;
  /** Metin değil sekme karakteri: `<tab/>` olarak yazılır. */
  isTab?: boolean;
  family?: string;
  size?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  foreground?: number;
  background?: number;
}

export interface UDFTable {
  type: 'table';
  rows: UDFRow[];
  columnCount?: number;
  columnSpans?: string;
  border?: string;
  alignment?: number;
}

export interface UDFRow {
  cells: UDFCell[];
}

export interface UDFCell {
  colspan?: number;
  rowspan?: number;
  bgColor?: number; // UDF integer color
  vAlign?: 'top' | 'middle' | 'bottom';
  hAlign?: 'left' | 'center' | 'right' | 'justify';
  paragraphs: UDFParagraph[];
}

export interface UDFImage {
  type: 'image';
  imageData: string; // base64
  width?: number;
  height?: number;
  startOffset?: number;
  length?: number;
  family?: string;
  size?: number;
  alignment?: number;
  description?: string;
}

export interface UDFHeader {
  type: 'header';
  paragraphs: UDFParagraph[];
  background?: number;
  foreground?: number;
}

export interface UDFFooter {
  type: 'footer';
  paragraphs: UDFParagraph[];
  background?: number;
  foreground?: number;
}

export interface UDFPageBreak {
  type: 'page-break';
}

export type UDFElement = UDFParagraph | UDFTable | UDFImage | UDFHeader | UDFFooter | UDFPageBreak;
