import { File, Paths } from 'expo-file-system';
import { IFile, IFileSystem } from '../../interfaces/IFileSystem';

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

  async toBase64(): Promise<string> {
    const bytes = await this.bytes();
    return bytesToBase64(bytes);
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
