// shared/udf-converter/models/UDFDocument.ts
import { UDFElement } from './UDFElements';
import { UDFProperties } from './UDFProperties';
import { UDFStyle } from './UDFStyles';

export interface UDFDocument {
  template: {
    format_id: string;
    webID?: string;
    institutionID?: string;
    isTemplate?: boolean;
    description?: string;
  };
  content: string; // CDATA içindeki ham metin
  properties: UDFProperties;
  elements: UDFElement[];
  styles: UDFStyle[];
  data?: Record<string, any>; // opsiyonel
}
