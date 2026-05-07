// 健康检查端点 — Docker HEALTHCHECK / 反向代理 / 监控探针使用
// 不查 DB / 不调 LLM / 不读文件,响应时间 < 1ms
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export function GET() {
  return NextResponse.json({ ok: true, ts: Date.now() });
}
