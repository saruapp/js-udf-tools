import * as fs from 'fs';
import * as path from 'path';
import { IFile, IFileSystem } from '../../interfaces/IFileSystem';

class NodeFile implements IFile {
  constructor(private filePath: string) {}

  get uri() {
    return this.filePath;
  }
  get name() {
    return path.basename(this.filePath);
  }
  get exists() {
    return fs.existsSync(this.filePath);
  }
  get size() {
    try {
      return fs.statSync(this.filePath).size;
    } catch {
      return 0;
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async write(content: Uint8Array | string) {
    if (typeof content === 'string') {
      fs.writeFileSync(this.filePath, content);
    } else {
      fs.writeFileSync(this.filePath, Buffer.from(content));
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async bytes(): Promise<Uint8Array> {
    const buffer = fs.readFileSync(this.filePath);
    return new Uint8Array(buffer);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async info() {
    try {
      const stats = fs.statSync(this.filePath);
      return {
        uri: this.filePath,
        size: stats.size,
        modificationTime: stats.mtimeMs,
        exists: true,
      };
    } catch {
      return { exists: false, uri: this.filePath, size: 0 };
    }
  }
}

export class NodeFileSystem implements IFileSystem {
  getFile(filePath: string): IFile {
    return new NodeFile(filePath);
  }

  getDocumentDirectory(): string {
    return process.cwd() + '/documents';
  }

  getCacheDirectory(): string {
    return process.cwd() + '/cache';
  }

  join(...paths: string[]): string {
    return path.join(...paths);
  }
}
