// lib/extraction/worker.ts
import { sql, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { candidates, users, jobDescriptions, type MatchResult } from '../db/schema';
import { readPdf, photoPathFor, writePhoto } from '../storage';
import { parsePdf } from './pdf';
import { extractLargestJpeg } from './photo';
import { callDeepSeekStream } from './llm';
import { callMatchAI } from '../matching/llm';
import { evalProjects } from './project-eval';
import { ExtractedResume } from '../validation';
import { ExtractionError, toUserMessage } from '../errors';
import { deriveFlat } from './derive';
import * as bus from './event-bus';
import { SECTION_KEYS } from './sections';

export async function runExtraction(id: string): Promise<void> {
  const row = db.select().from(candidates).where(eq(candidates.id, id)).get();
  if (!row || row.extractionStatus === 'parsed') return;

  db.update(candidates).set({
    extractionStatus: 'extracting',
    extractionAttempts: sql`extraction_attempts + 1`,
    updatedAt: new Date(),
  }).where(eq(candidates.id, id)).run();

  try {
    const buf = readPdf(row.pdfPath);
    const { text, numpages } = await parsePdf(buf);
    if (!text.trim()) throw new ExtractionError('pdf_empty');

    const seenSections = new Set<string>();
    let buffer = '';
    for await (const chunk of callDeepSeekStream(text)) {
      buffer += chunk;
      bus.publish(id, { type: 'chunk', text: chunk });
      for (const key of SECTION_KEYS) {
        if (!seenSections.has(key) && buffer.includes(`"${key}":`)) {
          seenSections.add(key);
          bus.publish(id, { type: 'status', section: key });
        }
      }
    }

    if (!buffer.trim()) throw new ExtractionError('llm_empty');
    let raw: unknown;
    try {
      raw = JSON.parse(buffer);
    } catch {
      throw new ExtractionError('llm_invalid_json');
    }

    let parsed = ExtractedResume.parse(raw);

    // 项目 AI 评估（先于首次 DB 写入，实现单次写入）
    const projects = parsed.projects ?? [];
    if (projects.length > 0) {
      try {
        const evals = await evalProjects(projects);
        parsed = {
          ...parsed,
          projects: projects.map((p, i) => ({
            ...p,
            aiSummary: evals[i]?.aiSummary ?? null,
            valueTag:  evals[i]?.valueTag  ?? null,
          })),
        };
      } catch (e) {
        console.error(`[project-eval:${id}]`, e);
        parsed = { ...parsed, projectEvalFailed: true };
      }
    }

    const flat = deriveFlat(parsed);

    // Try to extract headshot photo from PDF (no-op if none found)
    let photoPath: string | null = null;
    try {
      const jpeg = extractLargestJpeg(buf);
      if (jpeg) {
        photoPath = photoPathFor(id);
        writePhoto(photoPath, jpeg);
      }
    } catch (e) {
      console.warn(`[photo-extract:${id}]`, e);
    }

    db.update(candidates).set({
      ...flat,
      extractedJson: parsed,
      pdfPages: numpages,
      ...(photoPath !== null ? { photoPath } : {}),
      extractionStatus: 'parsed',
      extractionError: null,
      updatedAt: new Date(),
    }).where(eq(candidates.id, id)).run();

    const updated = db.select().from(candidates).where(eq(candidates.id, id)).get()!;

    // 自动 JD 匹配（若用户绑定了默认 JD）
    if (updated.userId) {
      const userRow = db.select({ defaultJdId: users.defaultJdId }).from(users).where(eq(users.id, updated.userId)).get();
      if (userRow?.defaultJdId) {
        const jd = db.select().from(jobDescriptions).where(eq(jobDescriptions.id, userRow.defaultJdId)).get();
        if (jd) {
          try {
            const aiResult = await callMatchAI(jd, updated);
            const overall = Math.round(
              aiResult.skill.score      * jd.skillWeight      / 100 +
              aiResult.experience.score * jd.experienceWeight / 100 +
              aiResult.education.score  * jd.educationWeight  / 100,
            );
            const newResult: MatchResult = {
              jdId:       jd.id,
              jdTitle:    jd.title,
              overall,
              skill:      aiResult.skill,
              experience: aiResult.experience,
              education:  aiResult.education,
              summary:    aiResult.summary,
              weights:    { skill: jd.skillWeight, experience: jd.experienceWeight, education: jd.educationWeight },
              matchedAt:  Date.now(),
            };
            const existing = (updated.matchResults ?? []).filter(r => r.jdId !== jd.id).slice(0, 9);
            db.update(candidates).set({ matchResults: [newResult, ...existing], updatedAt: new Date() }).where(eq(candidates.id, id)).run();
            const withMatch = db.select().from(candidates).where(eq(candidates.id, id)).get()!;
            bus.publish(id, { type: 'done', candidate: withMatch });
          } catch (e) {
            console.error(`[auto-match:${id}]`, e);
            bus.publish(id, { type: 'done', candidate: updated, autoMatchFailed: true });
          }
          return;
        }
      }
    }

    bus.publish(id, { type: 'done', candidate: updated });
  } catch (err) {
    const message = toUserMessage(err);
    db.update(candidates).set({
      extractionStatus: 'error',
      extractionError: message,
      updatedAt: new Date(),
    }).where(eq(candidates.id, id)).run();
    bus.publish(id, { type: 'error', message });
    console.error(`[extraction:${id}]`, err);
  } finally {
    bus.clear(id);
  }
}
