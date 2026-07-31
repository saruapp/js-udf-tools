import { File, Paths } from 'expo-file-system';
import { IFile, IFileSystem } from '../../interfaces/IFileSystem';

class RNFile implements IFile {
  private file: File;

  constructor(filePath: string) {
    this.file = new File(filePath);
  }

  get uri() {
    return this.file.uri;
  }

  get name() {
    return this.file.name;
  }

  get exists() {
    return this.file.exists;
  }

  get size() {
    return this.file.size;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async write(content: Uint8Array | string) {
    this.file.write(content);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async info() {
    return this.file.info();
  }

  async bytes(): Promise<Uint8Array> {
    return await this.file.bytes();
  }
}

export class RNFileSystem implements IFileSystem {
  getFile(filePath: string): IFile {
    return new RNFile(filePath);
  }

  getDocumentDirectory(): string {
    return Paths.document.uri;
  }

  getCacheDirectory(): string {
    return Paths.cache.uri;
  }

  join(...paths: string[]): string {
    return Paths.join(...paths);
  }
}
