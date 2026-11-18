import JSZip from 'jszip';
import { UDFConverter } from '../src/core/UDFConverter';
import { IFile, IFileSystem } from '../src/interfaces/IFileSystem';

function bytesToBase64(bytes: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const a = bytes[i];
    const b = i + 1 < len ? bytes[i + 1] : 0;
    const c = i + 2 < len ? bytes[i + 2] : 0;
    result += chars[a >> 2];
    result += chars[((a & 3) << 4) | (b >> 4)];
    result += i + 1 < len ? chars[((b & 15) << 2) | (c >> 6)] : '=';
    result += i + 2 < len ? chars[c & 63] : '=';
  }
  return result;
}

class InMemoryFile implements IFile {
  uri: string;
  name: string;
  exists = false;
  size = 0;
  private content: Uint8Array = new Uint8Array(0);

  constructor(filePath: string) {
    this.uri = filePath;
    this.name = filePath.split('/').pop() || filePath;
  }

  async write(content: Uint8Array | string): Promise<void> {
    if (typeof content === 'string') {
      const encoder = new TextEncoder();
      this.content = encoder.encode(content);
    } else {
      this.content = content;
    }
    this.size = this.content.length;
    this.exists = true;
  }

  async bytes(): Promise<Uint8Array> {
    return this.content;
  }

  async toBase64(): Promise<string> {
    return bytesToBase64(this.content);
  }

  async info() {
    return {
      uri: this.uri,
      size: this.size,
      exists: this.exists,
      modificationTime: Date.now(),
    };
  }

  getContentAsString(): string {
    const decoder = new TextDecoder();
    return decoder.decode(this.content);
  }
}

class InMemoryFileSystem implements IFileSystem {
  private files = new Map<string, InMemoryFile>();

  getFile(path: string): IFile {
    if (!this.files.has(path)) {
      this.files.set(path, new InMemoryFile(path));
    }
    return this.files.get(path)!;
  }

  getDocumentDirectory(): string {
    return '/documents';
  }

  getCacheDirectory(): string {
    return '/cache';
  }

  join(...paths: string[]): string {
    return paths.join('/');
  }
}

describe('UDFConverter', () => {
  let fs: InMemoryFileSystem;
  let converter: UDFConverter;

  beforeEach(() => {
    fs = new InMemoryFileSystem();
    converter = new UDFConverter(fs);
  });

  it('should convert a simple paragraph to UDF', async () => {
    const html = '<p>Merhaba Dünya</p>';
    const file = await converter.convert(html, '/output/test.udf');

    expect(file.exists).toBe(true);
    expect(file.size).toBeGreaterThan(0);
  });

  it('should convert HTML with styles', async () => {
    const html = `
      <style>
        .center { text-align: center; }
      </style>
      <p class="center"><strong>Başlık</strong></p>
    `;
    const file = await converter.convert(html, '/output/styled.udf');

    expect(file.exists).toBe(true);
    expect(file.size).toBeGreaterThan(0);
  });

  it('should convert HTML with a table', async () => {
    const html = `
      <table>
        <tr><th>Ad</th><th>Soyad</th></tr>
        <tr><td>Ali</td><td>Veli</td></tr>
      </table>
    `;
    const file = await converter.convert(html, '/output/table.udf');

    expect(file.exists).toBe(true);
    expect(file.size).toBeGreaterThan(0);
  });

  it('should convert HTML with an image', async () => {
    const html = '<p><img src="data:image/png;base64,iVBORw0KGgo=" alt="test" width="100" height="100" /></p>';
    const file = await converter.convert(html, '/output/image.udf');

    expect(file.exists).toBe(true);
    expect(file.size).toBeGreaterThan(0);
  });

  it('emits the UYAP int mediaSizeName for A4 (editor rejects "A4")', async () => {
    const html = '<p>Test</p>';
    const file = await converter.convert(html, '/output/a4.udf', {
      pageSize: 'A4',
    });

    expect(file.exists).toBe(true);
    const zip = await JSZip.loadAsync(await file.bytes());
    const xml = await zip.file('content.xml')!.async('string');
    expect(xml).toContain('mediaSizeName="1"');
    expect(xml).not.toContain('mediaSizeName="A4"');
  });

  it('defaults mediaSizeName to the same int without options', async () => {
    const file = await converter.convert('<p>Test</p>', '/output/default.udf');

    const zip = await JSZip.loadAsync(await file.bytes());
    const xml = await zip.file('content.xml')!.async('string');
    expect(xml).toContain('mediaSizeName="1"');
  });

  it('should respect margin options', async () => {
    const html = '<p>Test</p>';
    const file = await converter.convert(html, '/output/margins.udf', {
      margins: { top: 50, bottom: 50, left: 60, right: 60 },
    });

    expect(file.exists).toBe(true);
    expect(file.size).toBeGreaterThan(0);
  });

  it('should produce valid ZIP file starting with PK signature', async () => {
    const html = '<p>Test</p>';
    const file = await converter.convert(html, '/output/valid.udf');
    const bytes = await file.bytes();

    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });

  it('should handle HTML with header and footer', async () => {
    const html = `
      <header><p>Ust Bilgi</p></header>
      <p>Icerik</p>
      <footer><p>Alt Bilgi</p></footer>
    `;
    const file = await converter.convert(html, '/output/header-footer.udf');

    expect(file.exists).toBe(true);
    expect(file.size).toBeGreaterThan(0);
  });

  it('should handle nested lists', async () => {
    const html = `
      <ul>
        <li>Madde 1</li>
        <li>Madde 2</li>
      </ul>
    `;
    const file = await converter.convert(html, '/output/list.udf');

    expect(file.exists).toBe(true);
    expect(file.size).toBeGreaterThan(0);
  });
});
