// lib/errors.ts
import { ZodError } from 'zod';

export type ExtractionErrorCode =
  | 'pdf_parse_failed'
  | 'pdf_empty'
  | 'llm_empty'
  | 'llm_invalid_json'
  | 'llm_schema_invalid'
  | 'llm_http_error'
  | 'unknown';

export class ExtractionError extends Error {
  code: ExtractionErrorCode;
  httpStatus?: number;
  constructor(code: ExtractionErrorCode, detail?: string, httpStatus?: number) {
    super(detail ?? code);
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

const MESSAGES: Record<ExtractionErrorCode, (e?: ExtractionError) => string> = {
  pdf_parse_failed:   () => '文件无法解析,可能已加密或损坏',
  pdf_empty:          () => 'PDF 无可提取文本,可能是图像版简历',
  llm_empty:          () => 'AI 服务异常,请稍后重试',
  llm_invalid_json:   () => 'AI 返回格式错误,请重新解析',
  llm_schema_invalid: () => 'AI 输出结构不完整',
  llm_http_error:     (e) => `AI 服务返回错误(HTTP ${e?.httpStatus ?? '未知'})`,
  unknown:            () => '解析失败,请重新尝试',
};

export function toUserMessage(err: unknown): string {
  let msg: string;
  if (err instanceof ExtractionError) {
    msg = MESSAGES[err.code](err);
  } else if (err instanceof ZodError) {
    msg = MESSAGES.llm_schema_invalid();
  } else {
    msg = MESSAGES.unknown();
  }
  return msg.slice(0, 500);
}
