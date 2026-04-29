// lib/extraction/pdf.ts
// Import from internal lib to avoid pdf-parse/index.js CommonJS side effect
// that tries to read ./test/data/05-versions-space.pdf at load time.
// @ts-expect-error no types for internal path
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { ExtractionError } from '../errors';

export interface ParsedPdf {
  text: string;
  numpages: number;
}

export async function parsePdf(buffer: Buffer): Promise<ParsedPdf> {
  try {
    const result = await pdfParse(buffer);
    return { text: result.text, numpages: result.numpages };
  } catch (err) {
    throw new ExtractionError('pdf_parse_failed', String(err));
  }
}
