// tests/pdf.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parsePdf } from '@/lib/extraction/pdf';

describe('parsePdf', () => {
  it('extracts text and page count from a valid PDF', async () => {
    const buf = readFileSync('tests/fixtures/sample.pdf');
    const result = await parsePdf(buf);
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.numpages).toBeGreaterThanOrEqual(1);
  });

  it('throws ExtractionError(pdf_parse_failed) on non-PDF bytes', async () => {
    await expect(parsePdf(Buffer.from('not a pdf'))).rejects.toMatchObject({
      code: 'pdf_parse_failed',
    });
  });
});
