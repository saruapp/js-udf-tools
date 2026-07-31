/**
 * @packageDocumentation
 * Converts HTML documents into UYAP UDF (Ulusal Yargı Ağı Projesi Doküman
 * Formatı) files. The converter parses HTML with inline CSS, serializes text
 * into a CDATA pool with offset references, and produces a ZIP archive
 * containing `content.xml` compatible with the UYAP UDF editor.
 *
 * @example
 * ```typescript
 * import { UDFConverter } from 'js-udf-tools';
 * import { NodeFileSystem } from 'js-udf-tools';
 *
 * const converter = new UDFConverter(new NodeFileSystem());
 * const html = '<p style="text-align:center">Merhaba dünya</p>';
 * const file = await converter.convert(html, "output.udf");
 * ```
 */

export { UDFConverter } from './core/UDFConverter';
export { IFile, IFileSystem } from './interfaces/IFileSystem';
export { NodeFileSystem } from './adapters/node/NodeFileSystem';
