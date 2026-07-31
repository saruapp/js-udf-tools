import { HTMLParser } from '../src/parsers/HTMLParser';

describe('HTMLParser', () => {
  let parser: HTMLParser;

  beforeEach(() => {
    parser = new HTMLParser();
  });

  it('should parse simple HTML', () => {
    const result = parser.parse('<p>Merhaba</p>');
    expect(result.root).toBeDefined();
    expect(result.computedStyles.size).toBeGreaterThan(0);
  });

  it('should extract style rules from <style> blocks', () => {
    const html = `
      <style>
        .bold { font-weight: bold; }
      </style>
      <p class="bold">Test</p>
    `;
    const result = parser.parse(html);
    expect(result.styles.has('.bold')).toBe(true);
    expect(result.styles.get('.bold')!['font-weight']).toBe('bold');
  });

  it('should compute inherited styles', () => {
    const html = `
      <style>
        .parent { color: #FF0000; }
      </style>
      <div class="parent">
        <p>Child text</p>
      </div>
    `;
    const result = parser.parse(html);

    const pElement = result.root.querySelector('p');
    expect(pElement).toBeDefined();
    const computed = result.computedStyles.get(pElement!);
    expect(computed).toBeDefined();
    expect(computed!['color']).toBe('#FF0000');
  });

  it('should parse multiple style rules', () => {
    const html = `
      <style>
        h1 { font-size: 24pt; font-weight: bold; }
        .center { text-align: center; }
      </style>
      <h1 class="center">Baslik</h1>
    `;
    const result = parser.parse(html);

    expect(result.styles.has('h1')).toBe(true);
    expect(result.styles.get('h1')!['font-size']).toBe('24pt');
    expect(result.styles.has('.center')).toBe(true);
  });

  it('should handle inline styles', () => {
    const html = '<p style="font-weight: bold; color: blue;">Metin</p>';
    const result = parser.parse(html);

    const pElement = result.root.querySelector('p');
    expect(pElement).toBeDefined();
  });
});
