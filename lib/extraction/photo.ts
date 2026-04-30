// Extract the largest embedded JPEG from a PDF buffer.
// PDFs embed JPEGs as-is (DCTDecode filter), so we can locate them by
// scanning for JPEG SOI (FF D8 FF) and EOI (FF D9) byte sequences.
// The largest JPEG found is most likely the candidate headshot.

const MIN_JPEG_BYTES = 8_000; // skip tiny icons / decorations

export function extractLargestJpeg(pdfBuf: Buffer): Buffer | null {
  const results: Buffer[] = [];
  let pos = 0;

  while (pos < pdfBuf.length - 3) {
    // Locate JPEG SOI: FF D8 FF (SOI + first marker byte)
    if (pdfBuf[pos] !== 0xFF || pdfBuf[pos + 1] !== 0xD8 || pdfBuf[pos + 2] !== 0xFF) {
      pos++;
      continue;
    }

    // Scan forward for EOI: FF D9
    let end = pos + 3;
    let found = false;
    while (end < pdfBuf.length - 1) {
      if (pdfBuf[end] === 0xFF && pdfBuf[end + 1] === 0xD9) {
        end += 2;
        found = true;
        break;
      }
      end++;
    }

    if (found) {
      const candidate = pdfBuf.slice(pos, end);
      if (candidate.length >= MIN_JPEG_BYTES) {
        results.push(candidate);
      }
      pos = end;
    } else {
      pos++;
    }
  }

  if (results.length === 0) return null;
  return results.reduce((a, b) => a.length > b.length ? a : b);
}
