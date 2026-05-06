"use client";
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Btn, Avatar, StatusPill, Card, SkillTag, SchoolTierBadge } from "./ui";
import PageLayout from "./PageLayout";
import JdMatchPanel from "./JdMatchPanel";
import { I } from "./icons";
import { useCandidateStream } from "@/hooks/useCandidateStream";
import type { Candidate, CandidateStatus, User } from "@/lib/db/schema";

export default function CandidateDetailClient({
  initial,
  user,
}: {
  initial: Candidate;
  user: User;
}) {
  const router = useRouter();
  const { streaming, final, error, autoMatchFailed, activeSection, seenSections } =
    useCandidateStream(initial);
  const [c, setC] = useState(initial);

  useEffect(() => {
    if (
      final.extractionStatus === "parsed" &&
      c.extractionStatus !== "parsed"
    ) {
      setC(final);
    }
  }, [final, c.extractionStatus]);

  const isStreaming = streaming !== null && !error;

  async function updateStatus(next: CandidateStatus) {
    const r = await fetch(`/api/candidates/${c.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (r.ok) setC(await r.json());
  }

  async function onDelete() {
    if (!confirm(`确认删除候选人「${c.name ?? c.id}」?`)) return;
    const r = await fetch(`/api/candidates/${c.id}`, { method: "DELETE" });
    if (r.ok) router.push("/dashboard");
  }

  async function onRetry() {
    const r = await fetch(`/api/candidates/${c.id}/retry`, { method: "POST" });
    if (r.ok) window.location.reload();
  }

  const headerBasic = streaming?.basic ?? {
    name: c.name,
    email: c.email,
    phone: c.phone,
    city: c.city,
    age: c.age,
  };
  const headerTargetRole = streaming ? streaming.targetRole : c.targetRole;
  const headerRole = streaming ? (streaming.works?.[0]?.role ?? null) : c.role;
  const headerCompany = streaming
    ? (streaming.works?.[0]?.company ?? null)
    : c.company;
  const headerSchool = streaming
    ? (streaming.educations?.[0]?.school ?? null)
    : c.school;
  const headerDegree = streaming
    ? (streaming.educations?.[0]?.degree ?? null)
    : c.degree;
  const headerSchoolTier = streaming
    ? (streaming.educations?.[0]?.schoolTier ?? null)
    : (c.extractedJson?.educations?.[0]?.schoolTier ?? null);
  const headerYears = c.years;
  const headerSummary = streaming
    ? streaming.summary
    : c.extractedJson?.summary;

  return (
    <PageLayout
      user={user}
      activeKey="/dashboard"
      title={
        isStreaming && !headerBasic.name
          ? "解析中…"
          : (headerBasic.name ?? c.id)
      }
      subtitle="候选人详情"
      headerRight={
        <div style={{ display: "flex", gap: 8 }}>
          <Btn
            size="sm"
            icon={<I.ChevL />}
            variant="ghost"
            onClick={() => router.push("/dashboard")}
          >
            返回
          </Btn>
          <Link href={`/candidates/${c.id}/edit`}>
            <Btn size="sm" icon={<I.Edit />}>
              编辑
            </Btn>
          </Link>
          <Btn size="sm" variant="danger" onClick={onDelete}>
            删除
          </Btn>
        </div>
      }
      contentStyle={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <StreamingScroller streaming={streaming} isStreaming={isStreaming}>
        {error ? (
          <Card style={{ padding: 32 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--danger-700)",
                marginBottom: 10,
              }}
            >
              解析失败
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--fg-muted)",
                lineHeight: 1.6,
              }}
            >
              {error}
            </div>
            <div style={{ marginTop: 16 }}>
              <Btn variant="primary" onClick={onRetry}>
                重试
              </Btn>
            </div>
          </Card>
        ) : (
          <StreamingSections
            c={c}
            streaming={streaming}
            isStreaming={isStreaming}
            activeSection={activeSection}
            seenSections={seenSections}
            onUpdateStatus={updateStatus}
            candidateId={c.id}
            autoMatchFailed={autoMatchFailed}
            headerBasic={headerBasic}
            headerTargetRole={headerTargetRole}
            headerRole={headerRole}
            headerCompany={headerCompany}
            headerSchool={headerSchool}
            headerDegree={headerDegree}
            headerSchoolTier={headerSchoolTier}
            headerYears={headerYears}
            headerSummary={headerSummary}
          />
        )}
      </StreamingScroller>
    </PageLayout>
  );
}

const PDF_NATURAL_W = 794;
const PDF_NATURAL_H = 1123;
const PDF_SCALE = 230 / PDF_NATURAL_W; // ≈ 0.290
// Fixed height shorter than both A4 (325px) and US Letter (306px) at this scale,
// so page content always fills the container — no viewer background shows at bottom.
const PDF_THUMB_H = 295;

function PdfCard({
  candidateId,
  isStreaming,
  pdfPages,
}: {
  candidateId: string;
  isStreaming: boolean;
  pdfPages?: number | null;
}) {
  const [loaded, setLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const docSkel: React.CSSProperties = {
    borderRadius: 3,
    background: "linear-gradient(90deg, #e8e8e8 25%, #f4f4f4 50%, #e8e8e8 75%)",
    backgroundSize: "200% 100%",
    animation: "sift-shimmer 1.6s ease-in-out infinite",
    flexShrink: 0,
  };

  return (
    <>
      <Card style={{ padding: 0, overflow: "hidden", width: 230 }}>
        {/* Header */}
        <div
          style={{
            padding: "8px 12px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11,
            color: "var(--fg-subtle)",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          <I.File size={12} />
          PDF 原文
          {pdfPages != null && (
            <span
              style={{
                fontSize: 10,
                color: "var(--fg-subtle)",
                fontWeight: 400,
                letterSpacing: 0,
              }}
            >
              · {pdfPages} 页
            </span>
          )}
          {isStreaming && (
            <span
              style={{
                marginLeft: "auto",
                fontSize: 10,
                color: "var(--accent)",
                fontWeight: 600,
                letterSpacing: "0.06em",
              }}
            >
              解析中
            </span>
          )}
        </div>

        {/* Thumbnail: A4 full-page scaled to 230px wide */}
        <div
          style={{
            position: "relative",
            width: 230,
            height: PDF_THUMB_H,
            overflow: "hidden",
            background: "#fff",
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* Document skeleton — shown until iframe loads */}
          {!loaded && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 1,
                background: "#fff",
                padding: "20px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 0,
              }}
            >
              <div
                style={{
                  ...docSkel,
                  height: 10,
                  width: "55%",
                  marginBottom: 18,
                }}
              />
              {[88, 72, 82, 65, 90, 70, 60, 78].map((w, i) => (
                <div
                  key={i}
                  style={{
                    ...docSkel,
                    height: 7,
                    width: `${w}%`,
                    marginBottom: 7,
                    animationDelay: `${i * 0.07}s`,
                  }}
                />
              ))}
              <div style={{ height: 14 }} />
              <div
                style={{
                  ...docSkel,
                  height: 9,
                  width: "40%",
                  marginBottom: 12,
                }}
              />
              {[85, 68, 75, 55].map((w, i) => (
                <div
                  key={i}
                  style={{
                    ...docSkel,
                    height: 7,
                    width: `${w}%`,
                    marginBottom: 7,
                    animationDelay: `${(i + 8) * 0.07}s`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Scaled iframe — fades in on load */}
          <div
            style={{
              width: PDF_NATURAL_W,
              height: PDF_NATURAL_H,
              transform: `scale(${PDF_SCALE})`,
              transformOrigin: "top left",
              pointerEvents: "none",
              opacity: loaded ? 1 : 0,
              transition: "opacity 0.4s ease",
            }}
          >
            <iframe
              src={`/api/candidates/${candidateId}/pdf#toolbar=0&navpanes=0&scrollbar=0`}
              style={{ width: "100%", height: "100%", border: "none" }}
              title="PDF 缩略图"
              onLoad={() => setLoaded(true)}
            />
          </div>

          {/* Magic mirror animation — only after PDF is visible */}
          {isStreaming && loaded && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                overflow: "hidden",
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(180deg, rgba(120,80,255,0.04) 0%, transparent 40%, rgba(60,160,255,0.03) 70%, rgba(220,100,255,0.04) 100%)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  height: "34%",
                  background:
                    "linear-gradient(to bottom, transparent 0%, rgba(180,140,255,0.06) 20%, rgba(255,255,255,0.5) 44%, rgba(160,230,255,0.28) 56%, rgba(210,160,255,0.06) 80%, transparent 100%)",
                  animation: "sift-mirror 3.5s ease-in-out infinite",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  height: "18%",
                  background:
                    "linear-gradient(to bottom, transparent 0%, rgba(200,180,255,0.16) 50%, transparent 100%)",
                  animation: "sift-mirror 3.5s ease-in-out infinite",
                  animationDelay: "0.22s",
                }}
              />
            </div>
          )}

          {/* Chrome cover */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              boxShadow: "inset 0 0 0 8px var(--bg-elevated)",
              pointerEvents: "none",
              zIndex: 2,
            }}
          />

          {/* Hover overlay with preview button */}
          {hovered && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0, 0, 0, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 3,
                pointerEvents: "auto",
              }}
            >
              <Btn
                size="sm"
                variant="primary"
                icon={<I.Eye size={14} />}
                onClick={() => setShowModal(true)}
                style={{ pointerEvents: "auto" }}
              >
                预览
              </Btn>
            </div>
          )}
        </div>
      </Card>

      {/* PDF Preview Modal — rendered via Portal */}
      {mounted &&
        showModal &&
        createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
            }}
            onClick={() => setShowModal(false)}
          >
            <div
              style={{
                background: "var(--bg-elevated)",
                borderRadius: 12,
                boxShadow: "var(--shadow-3)",
                width: "90%",
                maxWidth: 900,
                height: "90vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                pointerEvents: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  borderBottom: "1px solid var(--border)",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)" }}
                >
                  PDF 原文
                </div>
                <Btn
                  size="sm"
                  variant="ghost"
                  icon={<I.X size={16} />}
                  onClick={() => setShowModal(false)}
                />
              </div>

              {/* Modal content — PDF full view */}
              <div style={{ flex: 1, overflow: "hidden", background: "#fff" }}>
                <iframe
                  src={`/api/candidates/${candidateId}/pdf#toolbar=1&navpanes=1&scrollbar=1`}
                  style={{ width: "100%", height: "100%", border: "none" }}
                  title="PDF 全屏预览"
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function StreamingScroller({
  streaming,
  isStreaming,
  children,
}: {
  streaming: ReturnType<typeof useCandidateStream>["streaming"];
  isStreaming: boolean;
  children: React.ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!isStreaming) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (!bottomRef.current || !scrollRef.current) return;
      const el = scrollRef.current;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      if (atBottom)
        bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    });
    return () => cancelAnimationFrame(rafRef.current);
  }, [streaming, isStreaming]);

  return (
    <div
      ref={scrollRef}
      style={{ flex: 1, padding: "20px 28px", overflow: "auto" }}
    >
      {children}
      <div ref={bottomRef} style={{ height: 1 }} />
    </div>
  );
}

const PARSE_STEPS = [
  { key: 'basic',      label: '基本信息' },
  { key: 'educations', label: '教育背景' },
  { key: 'works',      label: '工作经历' },
  { key: 'projects',   label: '项目经历' },
  { key: 'skills',     label: '技能' },
];

function ParsingProgress({ activeSection, seenSections }: {
  activeSection: string | null;
  seenSections: Set<string>;
}) {
  const activeStep = PARSE_STEPS.find(s => s.key === activeSection);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 0,
      padding: '10px 16px',
      background: 'var(--bg)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      animation: 'sift-fade-in 0.3s ease both',
    }}>
      {PARSE_STEPS.map((step, i) => {
        const isActive = step.key === activeSection;
        const isDone = seenSections.has(step.key) && !isActive;
        return (
          <React.Fragment key={step.key}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 52 }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                background: isDone ? 'var(--accent)' : isActive ? 'var(--accent-400)' : 'var(--border-strong)',
                boxShadow: isActive ? '0 0 0 3px var(--accent-bg-subtle)' : 'none',
                animation: isActive ? 'sift-pulse 1.2s ease-in-out infinite' : 'none',
                transition: 'background 0.3s ease, box-shadow 0.3s ease',
              }} />
              <span style={{
                fontSize: 10, fontWeight: isActive ? 600 : 400,
                color: isDone ? 'var(--accent)' : isActive ? 'var(--fg)' : 'var(--fg-subtle)',
                whiteSpace: 'nowrap', transition: 'color 0.3s ease',
              }}>
                {isDone ? '✓ ' : ''}{step.label}
              </span>
            </div>
            {i < PARSE_STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 1, marginBottom: 14,
                background: seenSections.has(step.key) ? 'var(--accent)' : 'var(--border)',
                transition: 'background 0.4s ease',
              }} />
            )}
          </React.Fragment>
        );
      })}
      {activeStep && (
        <div style={{
          marginLeft: 12, fontSize: 11, color: 'var(--accent)',
          animation: 'sift-pulse 1.5s ease-in-out infinite',
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          正在提取 {activeStep.label}…
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        color: "var(--fg-subtle)",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        fontWeight: 500,
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

function BulletDot({ color = "var(--accent-300)" }: { color?: string }) {
  return (
    <div
      style={{
        width: 8,
        height: 8,
        borderRadius: 999,
        background: color,
        flexShrink: 0,
        marginTop: 4,
      }}
    />
  );
}

const SKEL_STYLE: React.CSSProperties = {
  borderRadius: 5,
  background:
    "linear-gradient(90deg, var(--bg-sunken) 25%, var(--bg-elevated) 50%, var(--bg-sunken) 75%)",
  backgroundSize: "200% 100%",
  animation: "sift-shimmer 1.6s ease-in-out infinite",
};

function Skel({ w = "100%", h = 12 }: { w?: string; h?: number }) {
  return <div style={{ height: h, width: w, marginBottom: 6, ...SKEL_STYLE }} />;
}

function SkelSection({
  rows = 3,
  title = false,
}: {
  rows?: number;
  title?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {title && <Skel w="40%" h={14} />}
      {Array.from({ length: rows }).map((_, i) => (
        <Skel key={i} w={`${80 - i * 12}%`} h={11} />
      ))}
    </div>
  );
}

function StreamingSections({
  c,
  streaming,
  isStreaming,
  activeSection,
  seenSections,
  onUpdateStatus,
  candidateId,
  autoMatchFailed,
  headerBasic,
  headerTargetRole,
  headerRole,
  headerCompany,
  headerSchool,
  headerDegree,
  headerSchoolTier,
  headerYears,
  headerSummary,
}: {
  c: Candidate;
  streaming: ReturnType<typeof useCandidateStream>["streaming"];
  isStreaming: boolean;
  activeSection: string | null;
  seenSections: Set<string>;
  onUpdateStatus: (next: CandidateStatus) => void;
  candidateId: string;
  autoMatchFailed: boolean;
  headerBasic: any;
  headerTargetRole: string | null | undefined;
  headerRole: string | null | undefined;
  headerCompany: string | null | undefined;
  headerSchool: string | null | undefined;
  headerDegree: string | null | undefined;
  headerSchoolTier: any;
  headerYears: number | null;
  headerSummary: string | undefined | null;
}) {
  const src: any = streaming ??
    c.extractedJson ?? {
      educations: [],
      works: [],
      projects: [],
      skills: [],
      summary: "",
    };

  const edus = (src.educations ?? []).filter(
    (e: any) => e && typeof e === "object",
  );
  const works = (src.works ?? []).filter(
    (w: any) => w && typeof w === "object",
  );
  const prjs = (src.projects ?? []).filter(
    (p: any) => p && typeof p === "object",
  );
  const skills = src.skills ?? [];
  const summary = typeof src.summary === "string" ? src.summary : "";
  const selfEval =
    typeof src.selfEvaluation === "string" ? src.selfEvaluation : null;

  const placeholder = isStreaming ? "" : "—";

  // Streaming: show section when server signals it started.
  // Done: show section only when it has actual content.
  const showEducations = isStreaming ? seenSections.has('educations') : edus.length > 0;
  const showWorks      = isStreaming ? seenSections.has('works')      : works.length > 0;
  const showProjects   = isStreaming ? seenSections.has('projects')   : prjs.length > 0;
  const showSkills     = isStreaming ? seenSections.has('skills')     : skills.length > 0;
  const showSelfEval   = isStreaming ? seenSections.has('selfEvaluation') : !!selfEval;

  // Detect streaming → done transition for settle animation
  const prevIsStreamingRef = useRef(isStreaming);
  const [justFinished, setJustFinished] = useState(false);
  useEffect(() => {
    if (prevIsStreamingRef.current && !isStreaming) {
      setJustFinished(true);
      const t = setTimeout(() => setJustFinished(false), 600);
      return () => clearTimeout(t);
    }
    prevIsStreamingRef.current = isStreaming;
  }, [isStreaming]);

  return (
    <div
      style={{ display: "flex", gap: 20, width: "100%", alignItems: "start" }}
    >
      {/* PDF 缩略图 + 状态流转 — sticky column */}
      <div
        style={{
          flexShrink: 0,
          position: "sticky",
          top: 0,
          height: "fit-content",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <PdfCard
          candidateId={candidateId}
          isStreaming={isStreaming}
          pdfPages={c.pdfPages}
        />

        {/* 状态流转 */}
        {!isStreaming && (
          <Card style={{ padding: 20, width: 230 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--fg)",
                marginBottom: 12,
              }}
            >
              状态流转
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(
                ["待筛选", "初筛通过", "面试中", "已录用", "已淘汰"] as const
              ).map((s) => (
                <Btn
                  key={s}
                  size="sm"
                  variant={c.status === s ? "primary" : "secondary"}
                  onClick={() => onUpdateStatus(s)}
                >
                  {s}
                </Btn>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* 简历内容列 */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          animation: justFinished ? 'sift-settle 0.5s ease both' : undefined,
        }}
      >
        {/* 解析进度条 */}
        {isStreaming && <ParsingProgress activeSection={activeSection} seenSections={seenSections} />}

        {/* 候选人基本信息 */}
        <Card
          style={{
            padding: 20,
            display: "flex",
            gap: 16,
            alignItems: "flex-start",
            animation: 'sift-fade-in 0.3s ease both',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              {/* 姓名 + 年龄 + 状态 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  minHeight: 28,
                }}
              >
                <h1
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    letterSpacing: "-0.015em",
                    color: "var(--fg)",
                    margin: 0,
                  }}
                >
                  {headerBasic.name || (isStreaming ? "" : "(未提取)")}
                </h1>
                {headerBasic.age != null && (
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--fg-subtle)",
                      fontWeight: 400,
                      lineHeight: 1,
                    }}
                  >
                    {headerBasic.age} 岁
                  </span>
                )}
                {c.extractionStatus === "parsed" && (
                  <StatusPill status={c.status} />
                )}
              </div>
              <Avatar
                name={headerBasic.name ?? "?"}
                size={64}
                src={c.photoPath ? `/api/candidates/${c.id}/photo` : null}
              />
            </div>
            {/* 求职意向 */}
            {headerTargetRole && (
              <div style={{ marginTop: 6 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 500,
                    background: "var(--accent-bg-subtle)",
                    color: "var(--accent-700)",
                  }}
                >
                  <I.Target size={11} /> {headerTargetRole}
                </span>
              </div>
            )}

            {/* 职业 + 学历 */}
            {(headerRole || headerCompany || headerSchool) && (
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  marginTop: 8,
                  fontSize: 13,
                  color: "var(--fg-muted)",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                {(headerRole || headerCompany) && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <I.Briefcase
                      size={13}
                      style={{ flexShrink: 0, color: "var(--fg-subtle)" }}
                    />
                    {headerRole}
                    {headerRole && headerCompany ? " · " : ""}
                    {headerCompany}
                    {headerYears != null && (
                      <span
                        style={{ marginLeft: 4, color: "var(--fg-subtle)" }}
                      >
                        {headerYears} 年
                      </span>
                    )}
                  </span>
                )}
                {headerSchool && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <I.School
                      size={13}
                      style={{ flexShrink: 0, color: "var(--fg-subtle)" }}
                    />
                    {headerSchool}
                    {headerDegree ? ` · ${headerDegree}` : ""}
                    {headerSchoolTier && (
                      <SchoolTierBadge tier={headerSchoolTier} />
                    )}
                  </span>
                )}
              </div>
            )}

            {/* 联系信息 */}
            {(headerBasic.city || headerBasic.email || headerBasic.phone) && (
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  marginTop: 6,
                  fontSize: 12,
                  color: "var(--fg-subtle)",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                {headerBasic.city && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <I.MapPin size={12} />
                    {headerBasic.city}
                  </span>
                )}
                {headerBasic.email && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <I.Mail size={12} />
                    {headerBasic.email}
                  </span>
                )}
                {headerBasic.phone && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <I.Phone size={12} />
                    {headerBasic.phone}
                  </span>
                )}
              </div>
            )}

            {/* AI 总结 */}
            {(headerSummary || isStreaming) && (
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--fg-subtle)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    fontWeight: 500,
                    marginBottom: 8,
                  }}
                >
                  AI 总结
                </div>
                {!headerSummary && isStreaming ? (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 0 }}
                  >
                    <div
                      style={{
                        height: 11,
                        width: "90%",
                        borderRadius: 5,
                        background:
                          "linear-gradient(90deg, var(--bg-sunken) 25%, var(--bg-elevated) 50%, var(--bg-sunken) 75%)",
                        backgroundSize: "200% 100%",
                        animation: "sift-shimmer 1.6s ease-in-out infinite",
                        marginBottom: 6,
                      }}
                    />
                    <div
                      style={{
                        height: 11,
                        width: "75%",
                        borderRadius: 5,
                        background:
                          "linear-gradient(90deg, var(--bg-sunken) 25%, var(--bg-elevated) 50%, var(--bg-sunken) 75%)",
                        backgroundSize: "200% 100%",
                        animation: "sift-shimmer 1.6s ease-in-out infinite",
                        marginBottom: 6,
                      }}
                    />
                    <div
                      style={{
                        height: 11,
                        width: "85%",
                        borderRadius: 5,
                        background:
                          "linear-gradient(90deg, var(--bg-sunken) 25%, var(--bg-elevated) 50%, var(--bg-sunken) 75%)",
                        backgroundSize: "200% 100%",
                        animation: "sift-shimmer 1.6s ease-in-out infinite",
                      }}
                    />
                  </div>
                ) : (
                  <p
                    style={{
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: "var(--fg-muted)",
                      margin: 0,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {headerSummary || "—"}
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* 教育背景 */}
        {showEducations && <Card style={{ padding: 0, overflow: "hidden", animation: 'sift-content-in 0.35s ease both' }}>
          <div
            style={{
              padding: "14px 20px 12px",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--fg)",
            }}
          >
            教育背景
          </div>
          {edus.length === 0 ? (
            <div style={{ padding: "0 20px 16px" }}>
              {isStreaming ? (
                <SkelSection rows={2} />
              ) : (
                <div style={{ fontSize: 13, color: "var(--fg-subtle)" }}>
                  {placeholder}
                </div>
              )}
            </div>
          ) : (
            <div style={{ animation: 'sift-content-in 0.25s ease both' }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "var(--bg-sunken)",
                    borderTop: "1px solid var(--border)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  {(["学校", "专业", "学历", "时间"] as const).map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "7px 20px",
                        textAlign: "left",
                        fontSize: 11,
                        fontWeight: 500,
                        color: "var(--fg-subtle)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {edus.map((e: any, i: number) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom:
                        i < edus.length - 1
                          ? "1px solid var(--border)"
                          : "none",
                    }}
                  >
                    <td
                      style={{ padding: "10px 20px", verticalAlign: "middle" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={{ fontWeight: 600, color: "var(--fg)" }}>
                          {e.school || "—"}
                        </span>
                        <SchoolTierBadge tier={e.schoolTier} />
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "10px 20px",
                        verticalAlign: "middle",
                        color: "var(--fg-muted)",
                      }}
                    >
                      {e.major || "—"}
                    </td>
                    <td
                      style={{
                        padding: "10px 20px",
                        verticalAlign: "middle",
                        color: "var(--fg-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {e.degree || "—"}
                    </td>
                    <td
                      style={{
                        padding: "10px 20px",
                        verticalAlign: "middle",
                        color: "var(--fg-subtle)",
                        whiteSpace: "nowrap",
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                      }}
                    >
                      {e.startDate || ""}
                      {e.startDate || e.endDate ? " — " : ""}
                      {e.endDate || (e.startDate ? "至今" : "—")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </Card>}

        {/* 工作经历 */}
        {showWorks && <Card style={{ padding: 20, animation: 'sift-content-in 0.35s ease both' }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--fg)",
              marginBottom: 14,
            }}
          >
            工作经历
          </div>
          {works.length === 0 ? (
            isStreaming ? (
              <SkelSection rows={4} />
            ) : (
              <div style={{ fontSize: 13, color: "var(--fg-subtle)" }}>
                {placeholder}
              </div>
            )
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 18, animation: 'sift-content-in 0.25s ease both' }}>
              {works.map((w: any, i: number) => (
                <div key={i} style={{ display: "flex", gap: 12 }}>
                  <BulletDot color="var(--accent-400)" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {w.company || ""}
                      {w.role ? ` · ${w.role}` : ""}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--fg-subtle)",
                        marginTop: 2,
                      }}
                    >
                      {w.startDate || ""}
                      {w.startDate || w.endDate ? " — " : ""}
                      {w.endDate || ""}
                    </div>
                    {w.description && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--fg-muted)",
                          marginTop: 5,
                          lineHeight: 1.6,
                          fontStyle: "italic",
                        }}
                      >
                        {w.description}
                      </div>
                    )}
                    {Array.isArray(w.highlights) && w.highlights.length > 0 && (
                      <ul
                        style={{
                          fontSize: 12,
                          color: "var(--fg-muted)",
                          margin: "6px 0 0 0",
                          padding: 0,
                          listStyle: "none",
                          lineHeight: 1.6,
                        }}
                      >
                        {w.highlights.map((h: string, j: number) => (
                          <li
                            key={j}
                            style={{ display: "flex", gap: 8, marginBottom: 2 }}
                          >
                            <span
                              style={{
                                color: "var(--fg-subtle)",
                                flexShrink: 0,
                              }}
                            >
                              ·
                            </span>
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>}

        {/* 项目经历 */}
        {showProjects && <Card style={{ padding: 20, animation: 'sift-content-in 0.35s ease both' }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>
              项目经历
            </div>
            {(src as any).projectEvalFailed && (
              <span
                style={{
                  fontSize: 11,
                  color: "var(--warn-700)",
                  background: "var(--warn-100)",
                  border: "1px solid var(--warn-300)",
                  borderRadius: 4,
                  padding: "1px 6px",
                }}
              >
                AI 评估暂不可用
              </span>
            )}
          </div>
          {prjs.length === 0 ? (
            isStreaming ? (
              <SkelSection rows={3} title />
            ) : (
              <div style={{ fontSize: 13, color: "var(--fg-subtle)" }}>
                {placeholder}
              </div>
            )
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20, animation: 'sift-content-in 0.25s ease both' }}>
              {prjs.map((p: any, i: number) => (
                <div
                  key={i}
                  style={{
                    paddingLeft: 12,
                    borderLeft: "2px solid var(--accent)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 600 }}>
                      {p.name || ""}
                    </span>
                    {p.valueTag && !(p.valueTag === "独立完成" && p.role) && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background:
                            p.valueTag === "亮点项目"
                              ? "var(--accent-bg-subtle)"
                              : "var(--bg-sunken)",
                          color:
                            p.valueTag === "亮点项目"
                              ? "var(--accent-700)"
                              : "var(--fg-subtle)",
                          border:
                            "1px solid " +
                            (p.valueTag === "亮点项目"
                              ? "var(--accent-300)"
                              : "var(--border)"),
                          whiteSpace: "nowrap",
                          alignSelf: "center",
                        }}
                      >
                        {p.valueTag}
                      </span>
                    )}
                    {p.role && (
                      <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                        · {p.role}
                      </span>
                    )}
                    {(p.startDate || p.endDate) && (
                      <span style={{ fontSize: 12, color: "var(--fg-subtle)" }}>
                        · {p.startDate || ""}
                        {p.startDate || p.endDate ? " — " : ""}
                        {p.endDate || ""}
                      </span>
                    )}
                    {p.url &&
                      typeof p.url === "string" &&
                      p.url.startsWith("http") && (
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: 12,
                            color: "var(--accent)",
                            marginLeft: "auto",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <I.ArrowR size={12} />
                          {(() => {
                            try {
                              return new URL(p.url).host;
                            } catch {
                              return p.url;
                            }
                          })()}
                        </a>
                      )}
                  </div>
                  {Array.isArray(p.techStack) && p.techStack.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 4,
                        marginTop: 6,
                      }}
                    >
                      {p.techStack.map((t: string, j: number) => (
                        <SkillTag key={j}>{t}</SkillTag>
                      ))}
                    </div>
                  )}
                  {p.description && (
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--fg)",
                        marginTop: 8,
                        lineHeight: 1.6,
                      }}
                    >
                      {p.description}
                    </div>
                  )}
                  {Array.isArray(p.highlights) && p.highlights.length > 0 && (
                    <ul
                      style={{
                        fontSize: 12,
                        color: "var(--fg-muted)",
                        margin: "8px 0 0 0",
                        padding: 0,
                        listStyle: "none",
                        lineHeight: 1.65,
                      }}
                    >
                      {p.highlights.map((h: string, j: number) => (
                        <li
                          key={j}
                          style={{ display: "flex", gap: 8, marginBottom: 2 }}
                        >
                          <span
                            style={{ color: "var(--fg-subtle)", flexShrink: 0 }}
                          >
                            ·
                          </span>
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {p.aiSummary && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--fg-muted)",
                        borderTop: "1px solid var(--border)",
                        paddingTop: 8,
                        marginTop: 8,
                        display: "flex",
                        gap: 6,
                        alignItems: "flex-start",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "var(--accent)",
                          flexShrink: 0,
                          marginTop: 1,
                          letterSpacing: "0.02em",
                        }}
                      >
                        AI
                      </span>
                      <span style={{ lineHeight: 1.55 }}>{p.aiSummary}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>}

        {/* 技能 */}
        {showSkills && <Card style={{ padding: 20, animation: 'sift-content-in 0.35s ease both' }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--fg)",
              marginBottom: 12,
            }}
          >
            技能
          </div>
          {skills.length === 0 ? (
            isStreaming ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {[60, 48, 72, 52, 40, 64].map((w) => (
                  <div
                    key={w}
                    style={{
                      height: 26,
                      width: w,
                      borderRadius: 6,
                      ...SKEL_STYLE,
                    }}
                  />
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "var(--fg-subtle)" }}>
                {placeholder}
              </div>
            )
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, animation: 'sift-content-in 0.25s ease both' }}>
              {skills.map((s: string, i: number) => (
                <SkillTag key={i} variant="default">
                  {s}
                </SkillTag>
              ))}
            </div>
          )}
        </Card>}

        {/* 个人评价 */}
        {showSelfEval && (
          <Card style={{ padding: 20, animation: 'sift-content-in 0.35s ease both' }}>
            <SectionLabel>个人评价</SectionLabel>
            {!selfEval && isStreaming ? (
              <SkelSection rows={3} />
            ) : (
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: "var(--fg-muted)",
                  margin: 0,
                  padding: "10px 12px",
                  background: "var(--bg-sunken)",
                  borderRadius: 8,
                  borderLeft: "3px solid var(--accent-200)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {selfEval}
              </p>
            )}
          </Card>
        )}
      </div>
      {/* end 内容列 */}

      {/* 右侧列：JD 匹配，sticky */}
      <div
        style={{
          flexShrink: 0,
          width: 300,
          position: "sticky",
          top: 0,
          height: "fit-content",
        }}
      >
        <JdMatchPanel
          candidateId={c.id}
          extractionStatus={c.extractionStatus}
          initialMatchResults={c.matchResults ?? []}
          autoMatchFailed={autoMatchFailed}
        />
      </div>
    </div>
  );
}
