// tests/fixtures/make-sample.mjs
//
// Generates tests/fixtures/sample.pdf for the extraction tests.
//
// We first try pdfkit (fast, offline, byte-reproducible).
// If the resulting file is NOT parseable by pdf-parse v1.1.4 under our
// Node 22 environment (observed "bad XRef entry" regardless of pdfkit
// version), we fall back to a known-good public domain PDF (py-pdf's
// crazyones.pdf).
//
// The committed tests/fixtures/sample.pdf is the canonical fixture:
// regenerating is only needed when you deliberately want to refresh it.
import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import https from 'node:https';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const OUTPUT = 'tests/fixtures/sample.pdf';
const FALLBACK_URL =
  'https://raw.githubusercontent.com/py-pdf/pypdf/main/resources/crazyones.pdf';

function makeWithPdfKit() {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.fontSize(20).text('Zhang Yuanzhe');
    doc
      .fontSize(12)
      .text('Senior Frontend Engineer at Alibaba. Skills: React, TypeScript.');
    doc.end();
  });
}

function download(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', reject);
  });
}

async function parseable(buf) {
  try {
    const pdfParse = require('pdf-parse/lib/pdf-parse.js');
    const r = await pdfParse(buf);
    return r.numpages >= 1 && r.text.length > 0;
  } catch {
    return false;
  }
}

const pk = await makeWithPdfKit();
if (await parseable(pk)) {
  fs.writeFileSync(OUTPUT, pk);
  console.log('pdfkit OK ->', OUTPUT, pk.length, 'bytes');
} else {
  console.warn('pdfkit output rejected by pdf-parse; downloading fallback');
  const fb = await download(FALLBACK_URL);
  if (!(await parseable(fb))) {
    throw new Error('Fallback PDF also unparseable');
  }
  fs.writeFileSync(OUTPUT, fb);
  console.log('fallback OK ->', OUTPUT, fb.length, 'bytes');
}
