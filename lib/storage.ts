// lib/storage.ts
import { mkdirSync, writeFileSync, readFileSync, unlinkSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? 'data/uploads';

export function pdfPathFor(id: string): string {
  return `${UPLOADS_DIR}/${id}.pdf`;
}

export function absolutePath(p: string): string {
  return resolve(p);
}

export function writePdf(relPath: string, buffer: Buffer): void {
  const abs = absolutePath(relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, buffer);
}

export function readPdf(relPath: string): Buffer {
  return readFileSync(absolutePath(relPath));
}

export function deletePdf(relPath: string): void {
  const abs = absolutePath(relPath);
  if (existsSync(abs)) unlinkSync(abs);
}
