import { ContentBuilder } from '../builders/ContentBuilder';
import { ElementsBuilder } from '../builders/ElementsBuilder';
import { StylesBuilder } from '../builders/StylesBuilder';
import { XMLBuilder } from '../builders/XMLBuilder';
import { ZIPBuilder } from '../builders/ZIPBuilder';
import { IFile, IFileSystem } from '../interfaces/IFileSystem';
import { HTMLParser } from '../parsers/HTMLParser';

/**
 * Main entry point for converting HTML to UDF format.
 *
 * Orchestrates a 6-step pipeline:
 * 1. Resolve file-path images to data URIs (if `resourceDir` provided)
 * 2. Parse HTML with CSS via `HTMLParser`
 * 3. Build deduplicated styles via `StylesBuilder`
 * 4. Serialize text into CDATA pool with offset tracking via `ContentBuilder`
 * 5. Map HTML elements to UDF elements via `ElementsBuilder`
 * 6. Assemble `content.xml` and package as ZIP via `XMLBuilder` + `ZIPBuilder`
 *
 * @example
 * ```typescript
 * import { UDFConverter } from 'js-udf-tools';
 * import { NodeFileSystem } from 'js-udf-tools';
 *
 * const converter = new UDFConverter(new NodeFileSystem());
 * const html = '<p>Merhaba</p>';
 * const file = await converter.convert(html, "cikti.udf");
 * console.log(file.size, "bytes yazıldı");
 * ```
 *
 * @example
 * ```typescript
 * // With image from local file and custom margins
 * const file = await converter.convert(html, "cikti.udf", {
 *   pageSize: "A4",
 *   margins: { top: 56.69, bottom: 56.69, left: 70.86, right: 70.86 },
 *   resourceDir: "./assets",
 * });
 * ```
 */
export class UDFConverter {
  private fs: IFileSystem;
  private zipBuilder: ZIPBuilder;

  constructor(fs: IFileSystem) {
    this.fs = fs;
    this.zipBuilder = new ZIPBuilder(fs);
  }

  /**
   * Convert an HTML string to a UDF file.
   *
   * @param html - HTML string (full document with `<body>` or fragment)
   * @param outputPath - Destination path for the `.udf` file
   * @param options.pageSize - Page size: `"A4"` or `"LETTER"` (default: numeric `"1"`)
   * @param options.margins - Custom page margins in points
   * @param options.resourceDir - Base directory for resolving relative `<img>` paths
   * @returns The written file reference
   */
  async convert(
    html: string,
    outputPath: string,
    options?: {
      pageSize?: 'A4' | 'LETTER';
      margins?: { top: number; bottom: number; left: number; right: number };
      resourceDir?: string;
    },
  ): Promise<IFile> {
    // 0. Resolve file-path images to data URIs
    if (options?.resourceDir) {
      html = await this.resolveImagePaths(html, options.resourceDir);
    }

    // 1. HTML parse et
    const parser = new HTMLParser();
    const parsed = parser.parse(html);

    // 2. Stilleri oluştur
    const stylesBuilder = new StylesBuilder();
    const styles = stylesBuilder.build(parsed.computedStyles);

    // 3. ContentBuilder
    const contentBuilder = new ContentBuilder();
    const contentResult = contentBuilder.build(parsed.root, parsed.computedStyles);

    const elementsBuilder = new ElementsBuilder(stylesBuilder);
    const elements = elementsBuilder.build(contentResult, parsed.computedStyles);

    // 3. Properties
    const properties = {
      pageFormat: {
        mediaSizeName: options?.pageSize || '1',
        leftMargin: options?.margins?.left ?? 42.525,
        rightMargin: options?.margins?.right ?? 42.525,
        topMargin: options?.margins?.top ?? 42.525,
        bottomMargin: options?.margins?.bottom ?? 42.525,
        paperOrientation: '1',
        headerFOffset: 20.0,
        footerFOffset: 20.0,
      },
    };

    // 4. UDF Document
    const udfDoc = {
      template: { format_id: '1.8', isTemplate: false },
      content: contentResult.fullText,
      properties,
      elements,
      styles,
    };

    // 5. XML oluştur
    const xmlBuilder = new XMLBuilder();
    const xmlContent = xmlBuilder.build(udfDoc as any);

    // 6. ZIP oluştur ve kaydet
    return await this.zipBuilder.createUDF(xmlContent, outputPath);
  }

  private async resolveImagePaths(html: string, resourceDir: string): Promise<string> {
    const imgRegex = /<img\s[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/g;
    const replacements: { original: string; replacement: string }[] = [];
    let match: RegExpExecArray | null;

    while ((match = imgRegex.exec(html)) !== null) {
      const src = match[1];
      if (src.startsWith('data:')) continue;

      const imgPath = this.fs.join(resourceDir, src);
      const mime = this.getMimeType(src);
      try {
        const file = this.fs.getFile(imgPath);
        const bytes = await file.bytes();
        const base64 = Buffer.from(bytes).toString('base64');
        const dataUri = `data:${mime};base64,${base64}`;
        replacements.push({ original: match[0], replacement: match[0].replace(src, dataUri) });
      } catch {
        console.warn(`Resim dosyası okunamadı: ${imgPath}`);
      }
    }

    let result = html;
    for (const { original, replacement } of replacements) {
      result = result.replace(original, replacement);
    }
    return result;
  }

  private getMimeType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const mimeMap: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      bmp: 'image/bmp',
      webp: 'image/webp',
    };
    return mimeMap[ext] || 'image/png';
  }
}
