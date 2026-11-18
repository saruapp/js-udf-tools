/**
 * Represents a file on the platform-specific filesystem.
 * Implementations exist for Node.js and React Native (Expo).
 */
export interface IFile {
  /** The file path or URI. */
  uri: string;
  /** The file name without directory. */
  name: string;
  /** Whether the file currently exists on disk. */
  exists: boolean;
  /** File size in bytes. */
  size: number;
  /** Write content to the file, creating or overwriting. */
  write(content: Uint8Array | string): Promise<void>;
  /** Read the file content as raw bytes. */
  bytes(): Promise<Uint8Array>;
  /** Read the file content as a base64-encoded string. */
  toBase64(): Promise<string>;
  /** Retrieve file metadata. */
  info(): Promise<{
    uri?: string;
    size?: number;
    exists?: boolean;
    modificationTime?: number;
  }>;
}

/**
 * Platform-agnostic filesystem abstraction.
 * Implementations provide file access for their environment.
 */
export interface IFileSystem {
  /** Get a reference to a file at the given path. */
  getFile(path: string): IFile;
  /** The platform's document/documents directory. */
  getDocumentDirectory(): string;
  /** The platform's cache/temporary directory. */
  getCacheDirectory(): string;
  /** Join path segments using platform-appropriate separator. */
  join(...paths: string[]): string;
}
