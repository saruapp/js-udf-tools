// shared/udf-converter/builders/ZIPBuilder.ts
import JSZip from 'jszip';
import { IFile, IFileSystem } from '../interfaces/IFileSystem';

export class ZIPBuilder {
  constructor(private fs: IFileSystem) {}

  async createUDF(xmlContent: string, outputPath: string): Promise<IFile> {
    const zip = new JSZip();

    // content.xml'i ekle
    zip.file('content.xml', xmlContent);

    // ZIP oluştur
    const zipData = await zip.generateAsync({ type: 'uint8array' });

    // Platform-agnostic olarak dosyaya yaz
    const file = this.fs.getFile(outputPath);
    await file.write(zipData);

    return file;
  }
}
