export interface UDFProperties {
  pageFormat: {
    mediaSizeName: string; // "A4", "LETTER"
    leftMargin: number;
    rightMargin: number;
    topMargin: number;
    bottomMargin: number;
    paperOrientation: 'portrait' | 'landscape';
    headerFOffset?: number;
    footerFOffset?: number;
  };
  bgImage?: {
    imageData?: string; // base64
    imageSource?: string;
    align?: string;
    repeat?: string;
    watermark?: boolean;
    opacity?: number;
  };
}
