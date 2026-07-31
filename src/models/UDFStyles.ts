// shared/udf-converter/models/UDFStyles.ts
export interface UDFStyle {
  name: string;
  family: string;
  size: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  foreground?: number; // UDF integer color
  background?: number;
  parent?: string;
  description?: string;
}
