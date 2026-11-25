import JSZip from 'jszip';
import { create } from 'xmlbuilder2';
import { UDFDocument } from '../models/UDFDocument';
import {
  UDFCell,
  UDFContentReference,
  UDFElement,
  UDFFooter,
  UDFHeader,
  UDFImage,
  UDFParagraph,
  UDFRow,
  UDFTable,
} from '../models/UDFElements';
import { UDFProperties } from '../models/UDFProperties';
import { UDFStyle } from '../models/UDFStyles';

/** Parsed model — kept as an alias so callers can name the direction. */
export type ParsedUdfDocument = UDFDocument;

interface XmlNode {
  nodeType: number;
  nodeName: string;
  childNodes: ArrayLike<XmlNode>;
  textContent: string | null;
  getAttribute(name: string): string | null;
}

function elementChildren(node: XmlNode): XmlNode[] {
  const children: XmlNode[] = [];
  for (let index = 0; index < node.childNodes.length; index += 1) {
    const child = node.childNodes[index];
    if (child.nodeType === 1) children.push(child);
  }
  return children;
}

function childrenNamed(node: XmlNode, name: string): XmlNode[] {
  return elementChildren(node).filter((child) => child.nodeName === name);
}

function first(node: XmlNode | undefined, name: string): XmlNode | undefined {
  return node ? elementChildren(node).find((child) => child.nodeName === name) : undefined;
}

function attr(node: XmlNode | undefined, name: string): string | null {
  return node?.getAttribute(name) ?? null;
}

function textAttr(node: XmlNode | undefined, name: string): string | undefined {
  const value = attr(node, name)?.trim();
  return value ? value : undefined;
}

function numberAttr(node: XmlNode | undefined, name: string): number | undefined {
  const value = attr(node, name);
  if (value === null || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function boolAttr(node: XmlNode | undefined, name: string): boolean | undefined {
  const value = attr(node, name);
  if (value === null) return undefined;
  return value === 'true' || value === '1';
}

function parseStyle(node: XmlNode): UDFStyle {
  return {
    name: textAttr(node, 'name') ?? '',
    description: textAttr(node, 'description'),
    family: textAttr(node, 'family') ?? 'Times New Roman',
    size: numberAttr(node, 'size') ?? 12,
    bold: boolAttr(node, 'bold'),
    italic: boolAttr(node, 'italic'),
    underline: boolAttr(node, 'underline'),
    strikethrough: boolAttr(node, 'strikethrough'),
    foreground: numberAttr(node, 'foreground'),
    background: numberAttr(node, 'background'),
    parent: textAttr(node, 'parent'),
  };
}

function parseContent(node: XmlNode): UDFContentReference {
  return {
    startOffset: numberAttr(node, 'startOffset') ?? 0,
    length: numberAttr(node, 'length') ?? 0,
    isTab: node.nodeName === 'tab' ? true : undefined,
    family: textAttr(node, 'family'),
    size: numberAttr(node, 'size'),
    bold: boolAttr(node, 'bold'),
    italic: boolAttr(node, 'italic'),
    underline: boolAttr(node, 'underline'),
    strikethrough: boolAttr(node, 'strikethrough'),
    foreground: numberAttr(node, 'foreground'),
    background: numberAttr(node, 'background'),
    style: textAttr(node, 'style'),
  };
}

function parseImage(node: XmlNode): UDFImage {
  return {
    type: 'image',
    imageData: attr(node, 'imageData') ?? '',
    width: numberAttr(node, 'width'),
    height: numberAttr(node, 'height'),
    startOffset: numberAttr(node, 'startOffset'),
    length: numberAttr(node, 'length'),
    family: textAttr(node, 'family'),
    size: numberAttr(node, 'size'),
    alignment: numberAttr(node, 'alignment'),
    description: textAttr(node, 'description'),
  };
}

function parseParagraph(node: XmlNode): UDFParagraph {
  const image = first(node, 'image');
  const contents: UDFContentReference[] = [];
  for (const child of elementChildren(node)) {
    if (child.nodeName === 'content' || child.nodeName === 'tab' || child.nodeName === 'space') {
      contents.push(parseContent(child));
    }
  }
  return {
    type: 'paragraph',
    alignment: numberAttr(node, 'Alignment') ?? 0,
    leftIndent: numberAttr(node, 'LeftIndent'),
    rightIndent: numberAttr(node, 'RightIndent'),
    firstLineIndent: numberAttr(node, 'FirstLineIndent'),
    spaceBefore: numberAttr(node, 'SpaceBefore'),
    spaceAfter: numberAttr(node, 'SpaceAfter'),
    lineSpacing: numberAttr(node, 'LineSpacing'),
    bulleted: boolAttr(node, 'Bulleted'),
    numbered: boolAttr(node, 'Numbered'),
    listLevel: numberAttr(node, 'ListLevel'),
    tabStops: textAttr(node, 'TabSet'),
    style: textAttr(node, 'style'),
    contents,
    image: image ? parseImage(image) : undefined,
  };
}

function parseCell(node: XmlNode): UDFCell {
  return {
    colspan: numberAttr(node, 'colspan'),
    rowspan: numberAttr(node, 'rowspan'),
    bgColor: numberAttr(node, 'bgColor'),
    vAlign: textAttr(node, 'vAlign') as UDFCell['vAlign'],
    hAlign: textAttr(node, 'hAlign') as UDFCell['hAlign'],
    paragraphs: childrenNamed(node, 'paragraph').map(parseParagraph),
  };
}

function parseTable(node: XmlNode): UDFTable {
  const rows: UDFRow[] = childrenNamed(node, 'row').map((row) => ({
    cells: childrenNamed(row, 'cell').map(parseCell),
  }));
  return {
    type: 'table',
    rows,
    columnCount: numberAttr(node, 'columnCount'),
    columnSpans: textAttr(node, 'columnSpans'),
    border: textAttr(node, 'border'),
    alignment: numberAttr(node, 'alignment'),
  };
}

function parseHeader(node: XmlNode): UDFHeader {
  return {
    type: 'header',
    paragraphs: childrenNamed(node, 'paragraph').map(parseParagraph),
    background: numberAttr(node, 'background'),
    foreground: numberAttr(node, 'foreground'),
  };
}

function parseFooter(node: XmlNode): UDFFooter {
  return {
    type: 'footer',
    paragraphs: childrenNamed(node, 'paragraph').map(parseParagraph),
    background: numberAttr(node, 'background'),
    foreground: numberAttr(node, 'foreground'),
  };
}

function parseElement(node: XmlNode): UDFElement | null {
  switch (node.nodeName) {
    case 'paragraph':
      return parseParagraph(node);
    case 'table':
      return parseTable(node);
    case 'image':
      return parseImage(node);
    case 'header':
      return parseHeader(node);
    case 'footer':
      return parseFooter(node);
    case 'page-break':
      return { type: 'page-break' };
    default:
      return null;
  }
}

function parsePageFormat(node: XmlNode | undefined): UDFProperties['pageFormat'] {
  const orientation = attr(node, 'paperOrientation');
  return {
    mediaSizeName: textAttr(node, 'mediaSizeName') ?? '1',
    leftMargin: numberAttr(node, 'leftMargin') ?? 70.86,
    rightMargin: numberAttr(node, 'rightMargin') ?? 70.86,
    topMargin: numberAttr(node, 'topMargin') ?? 56.69,
    bottomMargin: numberAttr(node, 'bottomMargin') ?? 56.69,
    paperOrientation: orientation === '2' || orientation === 'landscape' ? 'landscape' : 'portrait',
    headerFOffset: numberAttr(node, 'headerFOffset'),
    footerFOffset: numberAttr(node, 'footerFOffset'),
  };
}

/**
 * Parses a UYAP UDF file (ZIP + content.xml) into the document model.
 *
 * Mirror of `XMLBuilder`: CDATA text pool + offset references, hierarchical
 * styles and the element tree. Unknown elements are skipped (fail-soft);
 * anything that is not a readable UDF throws with a Turkish message so the
 * HTTP layer can map it to a validation error.
 */
export async function parseUdf(bytes: Uint8Array | ArrayBuffer): Promise<ParsedUdfDocument> {
  let root: XmlNode;
  try {
    const zip = await JSZip.loadAsync(bytes);
    const contentFile = zip.file('content.xml');
    if (!contentFile) throw new Error('content.xml bulunamadı');
    const xml = await contentFile.async('string');
    root = create(xml).root().node as unknown as XmlNode;
    if (!root || root.nodeName !== 'template') {
      throw new Error('kök eleman <template> değil');
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'bilinmeyen hata';
    throw new Error(`UDF içeriği okunamadı: ${detail}`);
  }

  const template = first(root, 'template') ?? root;
  const elementsNode = first(root, 'elements');
  const stylesNode = first(root, 'styles');
  const propertiesNode = first(root, 'properties');

  const elements: UDFElement[] = [];
  if (elementsNode) {
    for (const child of elementChildren(elementsNode)) {
      const parsed = parseElement(child);
      if (parsed) elements.push(parsed);
    }
  }

  return {
    template: {
      format_id: textAttr(template, 'format_id') ?? '',
      webID: textAttr(template, 'webID'),
      institutionID: textAttr(template, 'institutionID'),
      isTemplate: boolAttr(template, 'isTemplate'),
      description: textAttr(template, 'description'),
    },
    content: first(root, 'content')?.textContent ?? '',
    properties: {
      pageFormat: parsePageFormat(first(propertiesNode, 'pageFormat')),
    },
    elements,
    styles: stylesNode
      ? childrenNamed(stylesNode, 'style')
          .map(parseStyle)
          .filter((style) => style.name)
      : [],
  };
}

/* ------------------------------------------------------------------ HTML */

interface ResolvedStyle {
  family?: string;
  size?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  foreground?: number;
  background?: number;
}

const ALIGNMENTS = ['left', 'center', 'right', 'justify'];
const PAGE_SIZES: Record<string, string> = {
  '1': 'A4',
  '2': 'Letter',
  '3': 'Legal',
  A4: 'A4',
  LETTER: 'Letter',
  LEGAL: 'Legal',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** UDF signed 32-bit color → #rrggbb. */
function color(value: number): string {
  return `#${(value >>> 0).toString(16).padStart(8, '0').slice(-6)}`;
}

function imageMime(base64: string): string {
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('R0lGOD')) return 'image/gif';
  return 'image/png';
}

function styleMap(styles: UDFStyle[]): Map<string, UDFStyle> {
  return new Map(styles.map((style) => [style.name, style]));
}

/** Style chain (parent → child); inline props override the chain. */
function resolveStyle(
  styles: Map<string, UDFStyle>,
  name: string | undefined,
  inline: ResolvedStyle,
): ResolvedStyle {
  const chain: UDFStyle[] = [];
  const seen = new Set<string>();
  let current = name ? styles.get(name) : undefined;
  while (current && !seen.has(current.name)) {
    seen.add(current.name);
    chain.unshift(current);
    current = current.parent ? styles.get(current.parent) : undefined;
  }

  const resolved: ResolvedStyle = {};
  for (const style of chain) {
    if (style.family) resolved.family = style.family;
    if (style.size !== undefined) resolved.size = style.size;
    if (style.bold !== undefined) resolved.bold = style.bold;
    if (style.italic !== undefined) resolved.italic = style.italic;
    if (style.underline !== undefined) resolved.underline = style.underline;
    if (style.strikethrough !== undefined) resolved.strikethrough = style.strikethrough;
    if (style.foreground !== undefined) resolved.foreground = style.foreground;
    if (style.background !== undefined) resolved.background = style.background;
  }
  for (const [key, value] of Object.entries(inline) as Array<
    [keyof ResolvedStyle, ResolvedStyle[keyof ResolvedStyle]]
  >) {
    if (value !== undefined) (resolved as Record<string, unknown>)[key] = value;
  }
  return resolved;
}

function cssOf(style: ResolvedStyle): string {
  const css: string[] = [];
  if (style.family) css.push(`font-family:'${style.family}'`);
  if (style.size !== undefined) css.push(`font-size:${style.size}pt`);
  if (style.bold) css.push('font-weight:bold');
  if (style.italic) css.push('font-style:italic');
  if (style.underline) css.push('text-decoration:underline');
  if (style.strikethrough) {
    css.push(
      style.underline ? 'text-decoration:underline line-through' : 'text-decoration:line-through',
    );
  }
  if (style.foreground !== undefined) css.push(`color:${color(style.foreground)}`);
  if (style.background !== undefined) css.push(`background:${color(style.background)}`);
  return css.join(';');
}

function paragraphCss(paragraph: UDFParagraph): string {
  const css: string[] = [];
  const alignment = ALIGNMENTS[paragraph.alignment] ?? 'left';
  if (alignment !== 'left') css.push(`text-align:${alignment}`);
  if (paragraph.leftIndent) css.push(`margin-left:${paragraph.leftIndent}pt`);
  if (paragraph.rightIndent) css.push(`margin-right:${paragraph.rightIndent}pt`);
  if (paragraph.firstLineIndent) css.push(`text-indent:${paragraph.firstLineIndent}pt`);
  if (paragraph.spaceBefore) css.push(`margin-top:${paragraph.spaceBefore}pt`);
  if (paragraph.spaceAfter) css.push(`margin-bottom:${paragraph.spaceAfter}pt`);
  if (paragraph.lineSpacing && paragraph.lineSpacing !== 1) {
    css.push(`line-height:${paragraph.lineSpacing}`);
  }
  return css.join(';');
}

function renderImage(image: UDFImage): string {
  if (!image.imageData) return '';
  const mime = imageMime(image.imageData);
  const sizeCss: string[] = [];
  if (image.width) sizeCss.push(`width:${image.width}px`);
  if (image.height) sizeCss.push(`height:${image.height}px`);
  const style = sizeCss.length > 0 ? ` style="${sizeCss.join(';')}"` : '';
  return `<img src="data:${mime};base64,${escapeHtml(image.imageData)}" alt="${escapeHtml(
    image.description ?? '',
  )}"${style}>`;
}

function renderParagraphContent(
  doc: ParsedUdfDocument,
  styles: Map<string, UDFStyle>,
  paragraph: UDFParagraph,
): string {
  let out = '';
  let visible = false;
  for (const reference of paragraph.contents) {
    if (reference.isTab) {
      out += '<span class="udf-tab">&#9;</span>';
      visible = true;
      continue;
    }
    const text = doc.content.slice(reference.startOffset, reference.startOffset + reference.length);
    // The writer appends a CDATA `\n` piece to every paragraph; it is a
    // separator, not visible content.
    if (!text || text === '\n') continue;
    const resolved = resolveStyle(styles, reference.style ?? paragraph.style, {
      family: reference.family,
      size: reference.size,
      bold: reference.bold,
      italic: reference.italic,
      underline: reference.underline,
      strikethrough: reference.strikethrough,
      foreground: reference.foreground,
      background: reference.background,
    });
    const css = cssOf(resolved);
    out += css ? `<span style="${css}">${escapeHtml(text)}</span>` : escapeHtml(text);
    visible = true;
  }
  return visible ? out : '';
}

function renderParagraph(
  doc: ParsedUdfDocument,
  styles: Map<string, UDFStyle>,
  paragraph: UDFParagraph,
  tag: 'p' | 'li' = 'p',
): string {
  const image = paragraph.image ? renderImage(paragraph.image) : '';
  const content = renderParagraphContent(doc, styles, paragraph);
  const css = paragraphCss(paragraph);
  const inner = `${image}${content}` || '&nbsp;';
  return css ? `<${tag} style="${css}">${inner}</${tag}>` : `<${tag}>${inner}</${tag}>`;
}

function renderCell(doc: ParsedUdfDocument, styles: Map<string, UDFStyle>, cell: UDFCell): string {
  const attrs: string[] = [];
  if (cell.colspan && cell.colspan > 1) attrs.push(`colspan="${cell.colspan}"`);
  if (cell.rowspan && cell.rowspan > 1) attrs.push(`rowspan="${cell.rowspan}"`);
  const css: string[] = [];
  if (cell.bgColor !== undefined) css.push(`background:${color(cell.bgColor)}`);
  if (cell.vAlign) css.push(`vertical-align:${cell.vAlign}`);
  if (cell.hAlign) css.push(`text-align:${cell.hAlign}`);
  if (css.length > 0) attrs.push(`style="${css.join(';')}"`);
  const suffix = attrs.length > 0 ? ` ${attrs.join(' ')}` : '';
  const paragraphs = cell.paragraphs
    .map((paragraph) => renderParagraph(doc, styles, paragraph))
    .join('');
  return `<td${suffix}>${paragraphs}</td>`;
}

function renderTable(
  doc: ParsedUdfDocument,
  styles: Map<string, UDFStyle>,
  table: UDFTable,
): string {
  const rows = table.rows
    .map(
      (row: UDFRow) =>
        `<tr>${row.cells.map((cell) => renderCell(doc, styles, cell)).join('')}</tr>`,
    )
    .join('');
  return `<table>${rows}</table>`;
}

function renderElements(
  doc: ParsedUdfDocument,
  styles: Map<string, UDFStyle>,
  elements: UDFElement[],
  inList: boolean,
): string {
  let out = '';
  for (let index = 0; index < elements.length; index += 1) {
    const element = elements[index];
    switch (element.type) {
      case 'paragraph': {
        if (inList || (!element.bulleted && !element.numbered)) {
          out += renderParagraph(doc, styles, element);
          break;
        }
        const listTag = element.bulleted ? 'ul' : 'ol';
        const items: string[] = [];
        let cursor = index;
        while (cursor < elements.length) {
          const item = elements[cursor];
          if (item.type !== 'paragraph' || (element.bulleted ? !item.bulleted : !item.numbered)) {
            break;
          }
          items.push(renderParagraph(doc, styles, item, 'li'));
          cursor += 1;
        }
        out += `<${listTag}>${items.join('')}</${listTag}>`;
        index = cursor - 1;
        break;
      }
      case 'table':
        out += renderTable(doc, styles, element);
        break;
      case 'image':
        out += `<p>${renderImage(element)}</p>`;
        break;
      case 'page-break':
        out += '<div style="break-after:page"></div>';
        break;
      case 'header':
      case 'footer':
        break;
      default:
        break;
    }
  }
  return out;
}

function renderPageCss(properties: UDFProperties): string {
  const format = properties.pageFormat;
  const size = PAGE_SIZES[format.mediaSizeName] ?? 'A4';
  const orientation = format.paperOrientation === 'landscape' ? ' landscape' : '';
  return `@page{size:${size}${orientation};margin:${format.topMargin}pt ${format.rightMargin}pt ${format.bottomMargin}pt ${format.leftMargin}pt;}`;
}

export interface RenderUdfHtmlOptions {
  /** `flow` (varsayılan) = akış/PDF; `paper` = ekran için A4 kâğıt düzeni. */
  layout?: 'flow' | 'paper';
}

/**
 * Renders a parsed UDF as a standalone HTML document.
 *
 * Used by the portal viewer and by the UDF→PDF conversion (HTML → Chromium).
 * The output is self-contained (inline CSS, data-URI images) and safe to put
 * in an iframe (`sandbox`) or a headless browser.
 *
 * `layout`:
 * - `flow` (varsayılan) — akış düzeni; PDF dönüşümü bu çıktıyı kullanır.
 * - `paper` — ekran için A4 kâğıt: `.udf-page` sarmalayıcı, `pageFormat`
 *   kenar boşlukları, koyu zemin + gölge. Dar kapsayıcıda (telefon tarayıcısı
 *   veya RN WebView) `zoom` ile orantılı küçülür; betik gerekmez.
 */
export function renderUdfHtml(
  doc: ParsedUdfDocument,
  options: RenderUdfHtmlOptions = {},
): string {
  const styles = styleMap(doc.styles);
  const headers = doc.elements
    .filter((element): element is UDFHeader => element.type === 'header')
    .map((header) => `<header>${renderElements(doc, styles, header.paragraphs, true)}</header>`)
    .join('');
  const footers = doc.elements
    .filter((element): element is UDFFooter => element.type === 'footer')
    .map((footer) => `<footer>${renderElements(doc, styles, footer.paragraphs, true)}</footer>`)
    .join('');
  const body = renderElements(doc, styles, doc.elements, false);

  if (options.layout === 'paper') {
    return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${renderPageCss(doc.properties)}
*{box-sizing:border-box}
html{background:#e9edf2}
body{margin:0;font-family:'Times New Roman',serif;font-size:12pt;line-height:1.15;color:#000}
p{margin:0;white-space:pre-wrap}
header,footer{display:block;margin:0 0 6pt}
table{border-collapse:collapse;width:100%}
td{border:0.5pt solid #000;padding:2pt 4pt;vertical-align:top}
.udf-tab{white-space:pre}
img{max-width:100%}
.udf-sheet-viewport{container-type:inline-size;width:100%;min-height:100vh;padding:24px 12px;background:#e9edf2;overflow:auto}
.udf-page{width:21cm;min-height:29.7cm;margin:0 auto;padding:${paperPadding(doc.properties)};background:#fff;box-shadow:0 10px 30px rgba(15,23,42,0.18);zoom:min(1, calc(100cqw / 21cm))}
@media print{html,.udf-sheet-viewport{background:#fff}.udf-sheet-viewport{padding:0}.udf-page{width:auto;min-height:0;padding:0;box-shadow:none;zoom:1}}
</style>
</head>
<body>
<div class="udf-sheet-viewport"><div class="udf-page">${headers}${body}${footers}</div></div>
</body>
</html>`;
  }

  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${renderPageCss(doc.properties)}
*{box-sizing:border-box}
body{margin:0;font-family:'Times New Roman',serif;font-size:12pt;line-height:1.15;color:#000}
p{margin:0;white-space:pre-wrap}
header,footer{display:block;margin:0 0 6pt}
table{border-collapse:collapse;width:100%}
td{border:0.5pt solid #000;padding:2pt 4pt;vertical-align:top}
.udf-tab{white-space:pre}
img{max-width:100%}
</style>
</head>
<body>
${headers}${body}${footers}
</body>
</html>`;
}

/** Ekran (A4 kâğıt) için sayfa kenar boşlukları: UDF pt → CSS px. */
function paperPadding(properties: UDFProperties): string {
  const format = properties.pageFormat;
  const px = (pt: number) => Math.round((pt * 96) / 72 * 100) / 100;
  return `${px(format.topMargin)}px ${px(format.rightMargin)}px ${px(format.bottomMargin)}px ${px(format.leftMargin)}px`;
}
