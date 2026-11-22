import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import JSZip from 'jszip';
import { UDFConverter } from '../src/core/UDFConverter';
import { NodeFileSystem } from '../src/adapters/node/NodeFileSystem';
import { parseUdf, renderUdfHtml, type ParsedUdfDocument } from '../src/parsers/UDFParser';

/**
 * UDF → HTML parser contract (docs/Docs.md — UDFParser SPEC).
 *
 * The parser is the inverse of the writer: ZIP + content.xml → UDFDocument →
 * standalone HTML. It must preserve visible content, structure and formatting,
 * fail-soft on unknown elements and reject non-UDF input.
 */
describe('parseUdf', () => {
  let workDir: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'udf-parser-'));
  });

  afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it('parses a generated UDF back into the document model', async () => {
    const converter = new UDFConverter(new NodeFileSystem());
    const path = join(workDir, 'ornek.udf');
    await converter.convert(
      '<html><body><h1>BAŞLIK</h1><p>Merhaba <strong>dünya</strong></p></body></html>',
      path,
    );

    const doc = await parseUdf(await readFile(path));

    expect(doc.content).toContain('BAŞLIK');
    expect(doc.content).toContain('Merhaba');
    expect(doc.template.format_id).toBeTruthy();
    expect(doc.styles.some((style) => style.name === 'hvl-default')).toBe(true);
    expect(doc.elements.some((element) => element.type === 'paragraph')).toBe(true);
    expect(doc.properties.pageFormat.mediaSizeName).toBeTruthy();
  });

  it('rejects input that is not a UDF zip', async () => {
    await expect(parseUdf(Buffer.from('bu bir udf degil'))).rejects.toThrow(/UDF/);
  });

  it('rejects a zip without content.xml', async () => {
    const zip = new JSZip();
    zip.file('baska.txt', 'x');
    const bytes = await zip.generateAsync({ type: 'nodebuffer' });

    await expect(parseUdf(bytes)).rejects.toThrow(/content\.xml/);
  });

  it('rejects malformed content.xml', async () => {
    const zip = new JSZip();
    zip.file('content.xml', '<template><content');
    const bytes = await zip.generateAsync({ type: 'nodebuffer' });

    await expect(parseUdf(bytes)).rejects.toThrow(/UDF/);
  });
});

describe('renderUdfHtml', () => {
  const doc = (overrides: Partial<ParsedUdfDocument> = {}): ParsedUdfDocument => ({
    template: { format_id: 'test' },
    content: 'Merhaba dünya\nİkinci satır\n',
    properties: {
      pageFormat: {
        mediaSizeName: '1',
        leftMargin: 70.86,
        rightMargin: 70.86,
        topMargin: 56.69,
        bottomMargin: 56.69,
        paperOrientation: 'portrait',
      },
    },
    styles: [
      { name: 'default', family: 'Dialog', size: 12 },
      { name: 'hvl-default', family: 'Times New Roman', size: 12 },
    ],
    elements: [
      {
        type: 'paragraph',
        alignment: 3,
        leftIndent: 36,
        spaceAfter: 6,
        lineSpacing: 1.5,
        contents: [
          { startOffset: 0, length: 7 },
          { startOffset: 8, length: 5, bold: true, foreground: -16777216 },
        ],
      },
    ],
    ...overrides,
  });

  it('renders a standalone HTML document with page format and paragraph styles', () => {
    const html = renderUdfHtml(doc());

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('@page');
    expect(html).toContain('size:A4');
    expect(html).toContain('margin:56.69pt 70.86pt 56.69pt 70.86pt');
    expect(html).toContain('text-align:justify');
    expect(html).toContain('margin-left:36pt');
    expect(html).toContain('margin-bottom:6pt');
    expect(html).toContain('line-height:1.5');
    expect(html).toContain('Merhaba');
    expect(html).toContain('dünya');
    expect(html).toContain('font-weight:bold');
    expect(html).toContain('color:#000000');
  });

  it('renders bullets, tabs, page breaks, header/footer and images', () => {
    const html = renderUdfHtml(
      doc({
        content: 'Madde\tSon\n',
        elements: [
          {
            type: 'header',
            paragraphs: [{ type: 'paragraph', alignment: 1, contents: [] }],
          },
          {
            type: 'paragraph',
            alignment: 0,
            bulleted: true,
            contents: [
              { startOffset: 0, length: 5 },
              { startOffset: 5, length: 1, isTab: true },
              { startOffset: 6, length: 3 },
            ],
          },
          { type: 'page-break' },
          {
            type: 'paragraph',
            alignment: 0,
            contents: [{ startOffset: 0, length: 5 }],
            image: { type: 'image', imageData: '/9j/4AAQSkZJRg==' },
          },
          {
            type: 'footer',
            paragraphs: [{ type: 'paragraph', alignment: 2, contents: [] }],
          },
        ],
      }),
    );

    expect(html).toContain('<header>');
    expect(html).toContain('<footer>');
    expect(html).toContain('<li>');
    expect(html).toContain('class="udf-tab"');
    expect(html).toContain('break-after:page');
    expect(html).toContain('src="data:image/jpeg;base64,/9j/4AAQSkZJRg=="');
  });

  it('renders tables with spans and cell formatting', () => {
    const html = renderUdfHtml(
      doc({
        content: 'A\nB\n',
        elements: [
          {
            type: 'table',
            rows: [
              {
                cells: [
                  {
                    colspan: 2,
                    bgColor: -65536,
                    vAlign: 'middle',
                    hAlign: 'center',
                    paragraphs: [
                      {
                        type: 'paragraph',
                        alignment: 0,
                        contents: [{ startOffset: 0, length: 1 }],
                      },
                    ],
                  },
                  {
                    paragraphs: [
                      {
                        type: 'paragraph',
                        alignment: 0,
                        contents: [{ startOffset: 2, length: 1 }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
    );

    expect(html).toContain('<table');
    expect(html).toContain('colspan="2"');
    expect(html).toContain('background:#ff0000');
    expect(html).toContain('vertical-align:middle');
    expect(html).toContain('text-align:center');
    expect(html).toContain('>B<');
  });

  it('escapes HTML from the document text', () => {
    const html = renderUdfHtml(
      doc({
        content: '<script>alert(1)</script>\n',
        elements: [
          {
            type: 'paragraph',
            alignment: 0,
            contents: [{ startOffset: 0, length: 25 }],
          },
        ],
      }),
    );

    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });

  it('survives unknown elements and slices past the content end', () => {
    const html = renderUdfHtml(
      doc({
        content: 'abc\n',
        elements: [
          { type: 'weird' } as never,
          {
            type: 'paragraph',
            alignment: 0,
            contents: [{ startOffset: 10, length: 5 }],
          },
        ],
      }),
    );

    expect(html).toContain('<p');
  });

  it('maps landscape orientation and unknown media sizes', () => {
    const landscape = renderUdfHtml(
      doc({
        properties: {
          pageFormat: {
            mediaSizeName: '2',
            leftMargin: 20,
            rightMargin: 20,
            topMargin: 20,
            bottomMargin: 20,
            paperOrientation: 'landscape',
          },
        },
      }),
    );
    expect(landscape).toContain('size:Letter landscape');

    const fallback = renderUdfHtml(
      doc({
        properties: {
          pageFormat: {
            mediaSizeName: 'bilinmiyor',
            leftMargin: 20,
            rightMargin: 20,
            topMargin: 20,
            bottomMargin: 20,
            paperOrientation: 'portrait',
          },
        },
      }),
    );
    expect(fallback).toContain('size:A4');
  });
});
