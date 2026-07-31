import { ContentBuilder } from '../src/builders/ContentBuilder';
import { HTMLParser } from '../src/parsers/HTMLParser';

describe('ContentBuilder', () => {
  let contentBuilder: ContentBuilder;
  let parser: HTMLParser;

  beforeEach(() => {
    contentBuilder = new ContentBuilder();
    parser = new HTMLParser();
  });

  it('should extract text from a paragraph', () => {
    const html = '<p>Merhaba Dünya</p>';
    const parsed = parser.parse(html);
    const result = contentBuilder.build(parsed.root, parsed.computedStyles);

    expect(result.fullText).toBe('Merhaba Dünya');
    expect(result.blockElements.length).toBe(1);
  });

  it('should handle multiple paragraphs', () => {
    const html = '<p>Birinci</p><p>Ikinci</p>';
    const parsed = parser.parse(html);
    const result = contentBuilder.build(parsed.root, parsed.computedStyles);

    expect(result.fullText).toBe('BirinciIkinci');
    expect(result.blockElements.length).toBe(2);
  });

  it('should register image placeholders', () => {
    const html = '<p><img src="data:image/png;base64,abc" alt="test" /></p>';
    const parsed = parser.parse(html);
    const result = contentBuilder.build(parsed.root, parsed.computedStyles);

    expect(result.fullText).toBe('\uFFFC');
    expect(result.imageOffsets.size).toBe(1);
  });

  it('should handle text with images mixed', () => {
    const html = '<p>Before <img src="data:image/png;base64,abc" alt="img" /> After</p>';
    const parsed = parser.parse(html);
    const result = contentBuilder.build(parsed.root, parsed.computedStyles);

    expect(result.fullText).toBe('Before \uFFFC After');
  });

  it('should handle headings', () => {
    const html = '<h1>Baslik</h1><p>Icerik</p>';
    const parsed = parser.parse(html);
    const result = contentBuilder.build(parsed.root, parsed.computedStyles);

    expect(result.blockElements.length).toBe(2);
    expect(result.fullText).toContain('Baslik');
    expect(result.fullText).toContain('Icerik');
  });

  it('should handle empty HTML', () => {
    const html = '<p></p>';
    const parsed = parser.parse(html);
    const result = contentBuilder.build(parsed.root, parsed.computedStyles);

    expect(result.fullText).toBe('');
    expect(result.blockElements.length).toBe(0);
  });
});
