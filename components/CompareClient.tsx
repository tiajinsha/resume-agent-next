"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Select,
  Tooltip,
  message,
  Button as AntButton,
  Input as AntInput,
} from "antd";
import { Card, Avatar, SkillTag, ScoreRing, StatusPill } from "./ui";
import { I } from "./icons";
import PageLayout from "./PageLayout";
import type {
  Candidate,
  JobDescription,
  MatchResult,
  User,
} from "@/lib/db/schema";

type Props = { candidates: Candidate[]; jds: JobDescription[]; user: User };
type DimKey = "skill" | "experience" | "education";

const CANDIDATE_COLORS: readonly string[] = ["#1677ff", "#52c41a", "#fa541c"];

// ── Utilities ────────────────────────────────────────────────────────────────

function getScoreColor(score: number): string {
  return score >= 80
    ? "var(--score-100)"
    : score >= 65
      ? "var(--score-80)"
      : score >= 50
        ? "var(--score-60)"
        : score >= 30
          ? "var(--score-40)"
          : "var(--score-0)";
}

function rowStyle(
  _rowIndex: number,
  extra?: React.CSSProperties,
): React.CSSProperties {
  return {
    padding: "14px 18px",
    borderBottom: "1px solid var(--border)",
    ...extra,
  };
}

// ── SVG Radar Chart ──────────────────────────────────────────────────────────

function SvgRadarChart({
  selected,
  filterJdId,
  getMatchResult,
  size = 240,
}: {
  selected: Candidate[];
  filterJdId: string;
  getMatchResult: (c: Candidate, jdId: string) => MatchResult | null;
  size?: number;
}) {
  const SIZE = size,
    CX = SIZE / 2,
    CY = SIZE / 2,
    MAX_R = SIZE * 0.36;
  const AXES = [
    { label: "技能", angle: -90 },
    { label: "经验", angle: 30 },
    { label: "教育", angle: 150 },
  ];
  const RINGS = [25, 50, 75, 100];

  function pt(pct: number, angleDeg: number): [number, number] {
    const rad = (angleDeg * Math.PI) / 180;
    const d = (pct / 100) * MAX_R;
    return [CX + d * Math.cos(rad), CY + d * Math.sin(rad)];
  }

  const hasAny = selected.some((c) => getMatchResult(c, filterJdId) !== null);
  if (!hasAny) return null;

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      {/* Rings */}
      {RINGS.map((pct) => (
        <polygon
          key={pct}
          points={AXES.map((a) => pt(pct, a.angle).join(",")).join(" ")}
          fill="none"
          stroke="var(--border)"
          strokeWidth={pct === 100 ? 1.5 : 1}
        />
      ))}
      {/* Ring value labels */}
      <text
        x={CX + 3}
        y={CY - MAX_R * 0.5 + 1}
        fontSize={8}
        fill="var(--fg-subtle)"
        dominantBaseline="middle"
      >
        50
      </text>
      <text
        x={CX + 3}
        y={CY - MAX_R + 1}
        fontSize={8}
        fill="var(--fg-subtle)"
        dominantBaseline="middle"
      >
        100
      </text>
      {/* Axes */}
      {AXES.map(({ angle }) => {
        const [tx, ty] = pt(100, angle);
        return (
          <line
            key={angle}
            x1={CX}
            y1={CY}
            x2={tx}
            y2={ty}
            stroke="var(--border)"
            strokeWidth={1}
          />
        );
      })}
      {/* Axis labels */}
      {AXES.map(({ label, angle }) => {
        const [lx, ly] = pt(118, angle);
        return (
          <text
            key={label}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={11}
            fontWeight={500}
            fill="var(--fg-muted)"
          >
            {label}
          </text>
        );
      })}
      {/* Candidate polygons */}
      {selected.map((c, i) => {
        const r = getMatchResult(c, filterJdId);
        if (!r) return null;
        const color = CANDIDATE_COLORS[i % CANDIDATE_COLORS.length];
        const pts = AXES.map(({ angle }, j) =>
          pt(
            [r.skill.score, r.experience.score, r.education.score][j],
            angle,
          ).join(","),
        ).join(" ");
        return (
          <polygon
            key={c.id}
            points={pts}
            fill={`${color}26`}
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        );
      })}
      <circle cx={CX} cy={CY} r={3} fill="var(--border-strong)" />
    </svg>
  );
}

// ── AnimatedBar ──────────────────────────────────────────────────────────────

function AnimatedBar({
  score,
  delay = 0,
  isBest = false,
  animKey,
  comment,
}: {
  score: number;
  delay?: number;
  isBest?: boolean;
  animKey: number;
  comment?: string;
}) {
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = fillRef.current;
    if (!el) return;
    el.style.transition = "none";
    el.style.width = "0%";
    void el.offsetWidth;
    const id = setTimeout(() => {
      el.style.transition = "width var(--dur-slow) var(--ease-sift)";
      el.style.width = score + "%";
    }, delay);
    return () => clearTimeout(id);
  }, [animKey, score, delay]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Tooltip title={comment || undefined}>
        <div
          style={{
            flex: 1,
            height: 6,
            background: "var(--bg-sunken)",
            borderRadius: 3,
            overflow: "hidden",
            cursor: comment ? "help" : "default",
          }}
        >
          <div
            ref={fillRef}
            style={{
              height: "100%",
              width: "0%",
              background: getScoreColor(score),
              borderRadius: 3,
              filter: isBest ? "brightness(1.1)" : undefined,
            }}
          />
        </div>
      </Tooltip>
      {isBest && (
        <span
          style={{
            fontSize: 10,
            color: "var(--success-700)",
            whiteSpace: "nowrap",
            fontWeight: 600,
          }}
        >
          最优
        </span>
      )}
    </div>
  );
}

// ── CandidatePickerCard ──────────────────────────────────────────────────────

function CandidatePickerCard({
  candidate,
  selected,
  onClick,
  matchScore,
}: {
  candidate: Candidate;
  selected: boolean;
  onClick: () => void;
  matchScore: number | null;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        minWidth: 150,
        padding: 12,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 5,
        alignItems: "center",
        textAlign: "center",
        borderRadius: 8,
        cursor: "pointer",
        border: selected
          ? "2px solid var(--accent-500)"
          : "1px solid var(--border-strong)",
        background: selected ? "var(--accent-bg-subtle)" : "var(--bg-elevated)",
        transition:
          "transform var(--dur-base) var(--ease-sift), border var(--dur-base) var(--ease-sift), background var(--dur-base) var(--ease-sift), box-shadow var(--dur-base) var(--ease-sift)",
        transform: hovered ? "translateY(-3px)" : "none",
        boxShadow: hovered ? "var(--shadow-2)" : "none",
      }}
    >
      <Avatar name={candidate.name ?? "?"} size={28} />
      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: selected ? "var(--accent-700)" : "var(--fg)",
          }}
        >
          {candidate.name ?? "(未提取)"}
        </div>
        <div
          style={{
            fontSize: 11,
            color: selected ? "var(--accent-600)" : "var(--fg-subtle)",
          }}
        >
          {candidate.role ?? "—"}
        </div>
        {matchScore !== null && (
          <div
            style={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: getScoreColor(matchScore),
              marginTop: 2,
              fontWeight: 600,
            }}
          >
            {matchScore}分
          </div>
        )}
        {candidate.years != null && matchScore === null && (
          <div
            style={{ fontSize: 10, color: "var(--fg-subtle)", marginTop: 2 }}
          >
            {candidate.years} 年
          </div>
        )}
      </div>
      {selected && (
        <div
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 16,
            height: 16,
            borderRadius: 999,
            background: "var(--success-500)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <I.Check size={10} style={{ color: "#fff" }} />
        </div>
      )}
    </div>
  );
}

// ── Section Divider ──────────────────────────────────────────────────────────

function SectionDivider({
  label,
  meta,
}: {
  label: string;
  meta?: React.ReactNode;
}) {
  return (
    <div
      style={{
        gridColumn: "1 / -1",
        background: "var(--bg-sunken)",
        padding: "5px 16px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 11,
        fontWeight: 600,
        color: "var(--fg-subtle)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        borderBottom: "1px solid var(--border)",
        borderTop: "1px solid var(--border)",
      }}
    >
      <span>{label}</span>
      {meta && (
        <span
          style={{
            fontWeight: 400,
            textTransform: "none",
            letterSpacing: 0,
            opacity: 0.85,
          }}
        >
          {meta}
        </span>
      )}
    </div>
  );
}

// ── Compare Grid ─────────────────────────────────────────────────────────────

function CompareGrid({
  selected,
  filterJdId,
  animKey,
  getMatchResult,
  bestInDimension,
  dimensions,
  matchingIds,
  onTriggerMatch,
  currentJd,
}: {
  selected: Candidate[];
  filterJdId: string;
  animKey: number;
  getMatchResult: (c: Candidate, jdId: string) => MatchResult | null;
  bestInDimension: (key: DimKey) => number;
  dimensions: { key: DimKey; label: string }[];
  matchingIds: string[];
  onTriggerMatch: (id: string) => void;
  currentJd: JobDescription | null;
}) {
  const n = selected.length;
  const gridCols = `130px repeat(${n}, 410px)`;

  // Cell style — flat (no hover highlight)
  function cs(
    _rowId: string,
    _colId: string | null,
    ri: number,
    extra?: React.CSSProperties,
  ): React.CSSProperties {
    return rowStyle(ri, extra);
  }

  // No-op — kept so existing call sites compile without spreading event handlers
  function ch(_rowId: string, _colId: string | null) {
    return {};
  }

  // Skill analysis helpers
  // 归一化技能字符串：小写 + 去除所有空白(含全角空格)和常见分隔符(. - /)
  // 让以下写法都能视为同一技能：
  //   Node.js / nodejs / node js / node-js / NODE.JS  → "nodejs"
  //   Vue.js / vuejs / vue js                          → "vuejs"
  //   React Native / react-native / reactnative        → "reactnative"
  //   CI/CD / ci-cd / cicd                             → "cicd"
  // 保留 + # 等有语义的符号(C++、C#)
  function normSkill(s: string): string {
    return s.toLowerCase().replace(/[\s　.\-/]+/g, "");
  }

  const requiredSkills = new Set(
    (currentJd?.requiredSkills ?? []).map(normSkill),
  );
  const allSkillSets = selected.map(
    (c) => new Set((c.skills ?? []).map(normSkill)),
  );

  function isSkillRequired(skill: string) {
    return requiredSkills.has(normSkill(skill));
  }
  function isSkillUniqueToCandidate(skill: string, idx: number) {
    const key = normSkill(skill);
    return !allSkillSets.some((set, i) => i !== idx && set.has(key));
  }
  function missingRequired(idx: number) {
    if (!currentJd) return [];
    return (currentJd.requiredSkills ?? []).filter(
      (s) => !allSkillSets[idx]?.has(normSkill(s)),
    );
  }

  const jdWeightMeta = currentJd ? (
    <span style={{ color: "var(--fg-subtle)" }}>
      技能 {currentJd.skillWeight}% · 经验 {currentJd.experienceWeight}% · 教育{" "}
      {currentJd.educationWeight}%
    </span>
  ) : undefined;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: gridCols,
        justifyContent: "start",
      }}
    >
      {/* ── Header Row (人物速览) ── */}
      <div
        style={cs("header", null, 0, {
          display: "flex",
          alignItems: "center",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--fg-subtle)",
        })}
        {...ch("header", null)}
      >
        候选人
      </div>
      {selected.map((c, i) => {
        const meta = [
          c.years != null ? `${c.years} 年` : null,
          c.degree ? `${c.degree}${c.major ? ` · ${c.major}` : ""}` : null,
          c.school || null,
          c.city || null,
        ].filter(Boolean) as string[];
        return (
          <div
            key={c.id}
            style={cs("header", c.id, 0, {
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              borderLeft: "1px solid var(--border)",
              textAlign: "center",
              padding: "18px 16px",
            })}
            {...ch("header", c.id)}
          >
            <div style={{ position: "relative" }}>
              <Avatar name={c.name ?? "?"} size={56} />
              <div
                style={{
                  position: "absolute",
                  bottom: -2,
                  right: -2,
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  background: CANDIDATE_COLORS[i % CANDIDATE_COLORS.length],
                  border: "2px solid var(--bg)",
                }}
              />
            </div>
            <div style={{ minWidth: 0, width: "100%" }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--fg)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {c.name ?? "(未提取)"}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--fg-subtle)",
                  marginTop: 2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {c.role ?? "—"}
              </div>
              {c.status && (
                <div style={{ marginTop: 6 }}>
                  <StatusPill status={c.status} />
                </div>
              )}
            </div>
            {meta.length > 0 && (
              <div
                style={{
                  width: "100%",
                  paddingTop: 8,
                  borderTop: "1px dashed var(--border)",
                  fontSize: 11,
                  color: "var(--fg-muted)",
                  lineHeight: 1.7,
                }}
              >
                {meta.map((m, idx) => (
                  <div
                    key={idx}
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {m}
                  </div>
                ))}
              </div>
            )}
            <Link
              href={`/candidates/${c.id}`}
              style={{
                fontSize: 11,
                color: "var(--accent)",
                textDecoration: "none",
                marginTop: "auto",
              }}
            >
              查看详情 →
            </Link>
          </div>
        );
      })}

      {/* ── Overall Score Row ── */}
      <div
        style={cs("overall", null, 1, {
          display: "flex",
          alignItems: "center",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--fg-subtle)",
        })}
        {...ch("overall", null)}
      >
        综合评分
      </div>
      {selected.map((c) => {
        const result = getMatchResult(c, filterJdId);
        const isMatchingNow = matchingIds.includes(c.id);
        return (
          <div
            key={c.id}
            style={cs("overall", c.id, 1, {
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: 14,
              padding: "16px 18px",
              borderLeft: "1px solid var(--border)",
            })}
            {...ch("overall", c.id)}
          >
            {isMatchingNow ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 999,
                    background: "var(--bg-sunken)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg
                    width={26}
                    height={26}
                    viewBox="0 0 32 32"
                    style={{ animation: "spin 1s linear infinite" }}
                  >
                    <circle
                      cx={16}
                      cy={16}
                      r={12}
                      fill="none"
                      stroke="var(--border-strong)"
                      strokeWidth={3}
                    />
                    <circle
                      cx={16}
                      cy={16}
                      r={12}
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth={3}
                      strokeDasharray="20 56"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <span style={{ fontSize: 12, color: "var(--fg-subtle)" }}>
                  匹配中…
                </span>
              </div>
            ) : result ? (
              <>
                <ScoreRing
                  key={`${c.id}-${filterJdId}-${animKey}`}
                  score={result.overall}
                  size={64}
                  label="综合"
                />
                {result.summary && (
                  <Tooltip title={result.summary} placement="bottom">
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--fg-muted)",
                        lineHeight: 1.5,
                        cursor: "help",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {result.summary}
                    </div>
                  </Tooltip>
                )}
              </>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 11, color: "var(--fg-subtle)" }}>
                  未匹配
                </div>
                {filterJdId && (
                  <AntButton
                    size="small"
                    type="primary"
                    ghost
                    onClick={() => onTriggerMatch(c.id)}
                  >
                    触发匹配
                  </AntButton>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* ── JD Matching Section ── */}
      <SectionDivider label="JD 匹配" meta={jdWeightMeta} />

      {dimensions.map(({ key, label }, dimIdx) => {
        const best = bestInDimension(key);
        const ri = 3 + dimIdx;
        return (
          <React.Fragment key={key}>
            <div
              style={cs(key, null, ri, {
                display: "flex",
                alignItems: "center",
                fontSize: 12,
                color: "var(--fg-muted)",
                fontWeight: 500,
              })}
              {...ch(key, null)}
            >
              {label}
            </div>
            {selected.map((c) => {
              const result = getMatchResult(c, filterJdId);
              const dim = result
                ? (result[key] as { score: number; comment: string })
                : null;
              const isBest = dim != null && dim.score === best && best > 0;
              const diff = dim && !isBest && best > 0 ? best - dim.score : null;
              return (
                <div
                  key={c.id}
                  style={cs(key, c.id, ri, {
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    borderLeft: "1px solid var(--border)",
                  })}
                  {...ch(key, c.id)}
                >
                  {dim ? (
                    <>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 15,
                          fontWeight: isBest ? 700 : 500,
                          color: isBest ? "var(--accent-700)" : "var(--fg)",
                          minWidth: 28,
                          textAlign: "right",
                        }}
                      >
                        {dim.score}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <AnimatedBar
                          score={dim.score}
                          delay={dimIdx * 80}
                          isBest={isBest}
                          animKey={animKey}
                          comment={dim.comment}
                        />
                      </div>
                      {diff !== null && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--fg-subtle)",
                            fontFamily: "var(--font-mono)",
                            minWidth: 24,
                            textAlign: "right",
                          }}
                        >
                          -{diff}
                        </span>
                      )}
                    </>
                  ) : (
                    <span style={{ fontSize: 11, color: "var(--fg-subtle)" }}>
                      —
                    </span>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        );
      })}

      {/* ── Skills Section ── */}
      <SectionDivider
        label="技能标签"
        meta={currentJd ? <span>紫色 = JD 必需技能</span> : undefined}
      />

      <div
        style={cs("skills", null, 6, {
          display: "flex",
          alignItems: "flex-start",
          fontSize: 12,
          color: "var(--fg-muted)",
          fontWeight: 500,
        })}
        {...ch("skills", null)}
      >
        技能
      </div>
      {selected.map((c, idx) => {
        const skills = c.skills ?? [];
        const missing = missingRequired(idx);
        return (
          <div
            key={c.id}
            style={cs("skills", c.id, 10, {
              display: "flex",
              flexWrap: "wrap",
              gap: 5,
              alignContent: "flex-start",
              borderLeft: "1px solid var(--border)",
            })}
            {...ch("skills", c.id)}
          >
            {skills.slice(0, 10).map((s) => {
              const req = isSkillRequired(s);
              const uniq = isSkillUniqueToCandidate(s, idx);
              return (
                <Tooltip
                  key={s}
                  title={
                    req ? "JD 必需技能" : uniq ? "该候选人独有" : undefined
                  }
                >
                  <span>
                    <SkillTag variant={req ? "strong" : "default"}>
                      {s}
                    </SkillTag>
                  </span>
                </Tooltip>
              );
            })}
            {skills.length > 10 && (
              <span
                style={{
                  fontSize: 11,
                  color: "var(--fg-subtle)",
                  alignSelf: "center",
                }}
              >
                +{skills.length - 10}
              </span>
            )}
            {skills.length === 0 && (
              <span style={{ fontSize: 11, color: "var(--fg-subtle)" }}>—</span>
            )}
            {missing.length > 0 && (
              <div
                style={{
                  width: "100%",
                  marginTop: 6,
                  paddingTop: 6,
                  borderTop: "1px dashed var(--border)",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--fg-subtle)",
                    marginBottom: 4,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  缺失必需
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {missing.slice(0, 5).map((s) => (
                    <SkillTag key={s} variant="muted">
                      {s}
                    </SkillTag>
                  ))}
                  {missing.length > 5 && (
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--fg-subtle)",
                        alignSelf: "center",
                      }}
                    >
                      +{missing.length - 5}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Export ───────────────────────────────────────────────────────────────────

function buildExportText(
  selected: Candidate[],
  filterJdId: string,
  jds: JobDescription[],
  getMatchResult: (c: Candidate, jdId: string) => MatchResult | null,
): string {
  const jd = jds.find((j) => j.id === filterJdId);
  const date = new Date().toLocaleDateString("zh-CN");
  const lines: string[] = [
    `# 候选人对比分析报告`,
    `岗位：${jd?.title ?? "未指定"}`,
    `生成时间：${date}`,
    ``,
  ];
  selected.forEach((c, i) => {
    const r = getMatchResult(c, filterJdId);
    lines.push(`## ${i + 1}. ${c.name ?? "(未提取)"}`);
    lines.push(`职位：${c.role ?? "—"}`);
    lines.push(`工作年限：${c.years != null ? c.years + " 年" : "—"}`);
    lines.push(`学历：${c.degree ?? "—"}${c.major ? ` · ${c.major}` : ""}`);
    lines.push(`院校：${c.school ?? "—"}`);
    lines.push(`城市：${c.city ?? "—"}`);
    if (r) {
      lines.push(``);
      lines.push(`综合评分：${r.overall}`);
      lines.push(`- 技能：${r.skill.score}（${r.skill.comment}）`);
      lines.push(`- 经验：${r.experience.score}（${r.experience.comment}）`);
      lines.push(`- 教育：${r.education.score}（${r.education.comment}）`);
      lines.push(`AI 评价：${r.summary}`);
    } else {
      lines.push(`尚未匹配该岗位。`);
    }
    lines.push(``);
  });
  return lines.join("\n");
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CompareClient({ candidates, jds, user }: Props) {
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterJdId, setFilterJdId] = useState<string>(jds[0]?.id ?? "");
  const [animKey, setAnimKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortByScore, setSortByScore] = useState(false);
  const [matchingIds, setMatchingIds] = useState<string[]>([]);
  const [localResults, setLocalResults] = useState<Record<string, MatchResult>>(
    {},
  );

  const prevSelRef = useRef("");
  const prevJdRef = useRef(filterJdId);

  // ── Session persistence ──
  useEffect(() => {
    try {
      const ids = JSON.parse(
        sessionStorage.getItem("sift-compare-ids") ?? "[]",
      ) as string[];
      const valid = ids.filter((id) => candidates.some((c) => c.id === id));
      if (valid.length > 0) setSelectedIds(valid);
      const jd = sessionStorage.getItem("sift-compare-jd");
      if (jd && jds.some((j) => j.id === jd)) setFilterJdId(jd);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem("sift-compare-ids", JSON.stringify(selectedIds));
    } catch {
      /* ignore */
    }
  }, [selectedIds]);

  useEffect(() => {
    try {
      sessionStorage.setItem("sift-compare-jd", filterJdId);
    } catch {
      /* ignore */
    }
  }, [filterJdId]);

  // ── animKey ──
  useEffect(() => {
    const selStr = selectedIds.join(",");
    if (selStr !== prevSelRef.current || filterJdId !== prevJdRef.current) {
      setAnimKey((k) => k + 1);
      prevSelRef.current = selStr;
      prevJdRef.current = filterJdId;
    }
  }, [selectedIds, filterJdId]);

  // ── Selection ──
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) {
        messageApi.info("最多同时对比 3 位候选人，已自动替换最早选中的");
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  }

  const selected = selectedIds
    .map((id) => candidates.find((c) => c.id === id))
    .filter(Boolean) as Candidate[];

  // ── Match result (server + local fallback) ──
  function getMatchResult(c: Candidate, jdId: string): MatchResult | null {
    const server = (c.matchResults ?? []).find((r) => r.jdId === jdId);
    if (server) return server;
    return localResults[`${c.id}:${jdId}`] ?? null;
  }

  // ── Trigger match ──
  async function triggerMatch(candidateId: string) {
    if (!filterJdId) return;
    setMatchingIds((p) => [...p, candidateId]);
    try {
      const res = await fetch(`/api/candidates/${candidateId}/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdId: filterJdId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        messageApi.error(err.message ?? "匹配失败，请稍后重试");
        return;
      }
      const result: MatchResult = await res.json();
      setLocalResults((p) => ({
        ...p,
        [`${candidateId}:${filterJdId}`]: result,
      }));
      messageApi.success("匹配完成");
      router.refresh();
    } catch {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setMatchingIds((p) => p.filter((id) => id !== candidateId));
    }
  }

  const dimensions: { key: DimKey; label: string }[] = [
    { key: "skill", label: "技能" },
    { key: "experience", label: "经验" },
    { key: "education", label: "教育" },
  ];

  function bestInDimension(key: DimKey): number {
    return Math.max(
      0,
      ...selected.map((c) => {
        const r = getMatchResult(c, filterJdId);
        return r ? (r[key] as { score: number }).score : 0;
      }),
    );
  }

  const currentJd = jds.find((j) => j.id === filterJdId) ?? null;
  const radarHasData = selected.some(
    (c) => getMatchResult(c, filterJdId) !== null,
  );

  // ── Filtered + sorted picker list ──
  const displayedCandidates = useMemo(() => {
    let list = [...candidates];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          (c.name ?? "").toLowerCase().includes(q) ||
          (c.role ?? "").toLowerCase().includes(q),
      );
    }
    if (sortByScore) {
      list.sort((a, b) => {
        const ra =
          (a.matchResults ?? []).find((r) => r.jdId === filterJdId)?.overall ??
          localResults[`${a.id}:${filterJdId}`]?.overall ??
          -1;
        const rb =
          (b.matchResults ?? []).find((r) => r.jdId === filterJdId)?.overall ??
          localResults[`${b.id}:${filterJdId}`]?.overall ??
          -1;
        return rb - ra;
      });
    }
    return list;
  }, [candidates, searchQuery, sortByScore, filterJdId, localResults]);

  // ── Export ──
  function handleExport() {
    const text = buildExportText(selected, filterJdId, jds, getMatchResult);
    navigator.clipboard
      .writeText(text)
      .then(() => {
        messageApi.success("对比报告已复制到剪贴板");
      })
      .catch(() => {
        messageApi.error("复制失败，请检查剪贴板权限");
      });
  }

  return (
    <PageLayout
      user={user}
      activeKey="/compare"
      title="对比分析"
      subtitle="选择 2–3 位候选人进行并排对比"
    >
      {contextHolder}

      <div
        style={{
          padding: "20px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* ── 候选人选择区 ── */}
        <Card style={{ padding: 16 }}>
          {/* Header row */}
          <div
            style={
              {
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
                flexWrap: "wrap",
              } as React.CSSProperties
            }
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--fg-muted)",
              }}
            >
              选择候选人
            </span>
            {selectedIds.length > 0 && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 20,
                  height: 18,
                  padding: "0 6px",
                  borderRadius: 999,
                  background: "var(--accent-500)",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {selectedIds.length}
              </span>
            )}
            <div style={{ flex: 1 }} />
            <AntInput
              size="small"
              placeholder="搜索姓名/职位"
              prefix={<I.Search size={12} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: 160 }}
              allowClear
            />
            <AntButton
              size="small"
              type={sortByScore ? "primary" : "default"}
              ghost={sortByScore}
              icon={<I.Sort size={12} />}
              onClick={() => setSortByScore((v) => !v)}
            >
              按分数排序
            </AntButton>
            {selectedIds.length > 0 && (
              <AntButton
                size="small"
                type="text"
                danger
                onClick={() => setSelectedIds([])}
              >
                清空
              </AntButton>
            )}
          </div>

          {/* Candidate cards */}
          {candidates.length === 0 ? (
            <div
              style={{
                fontSize: 13,
                color: "var(--fg-subtle)",
                textAlign: "center",
                padding: 20,
              }}
            >
              暂无已解析的候选人。前往
              <Link
                href="/upload"
                style={{
                  color: "var(--accent)",
                  textDecoration: "none",
                  margin: "0 4px",
                }}
              >
                上传
              </Link>
              开始。
            </div>
          ) : displayedCandidates.length === 0 ? (
            <div
              style={{
                fontSize: 13,
                color: "var(--fg-subtle)",
                textAlign: "center",
                padding: "12px 0",
              }}
            >
              没有匹配的候选人
            </div>
          ) : (
            <div
              style={
                {
                  display: "flex",
                  gap: 10,
                  overflowX: "auto",
                  paddingTop: 4,
                  paddingBottom: 4,
                  scrollbarWidth: "thin",
                  scrollbarColor: "var(--border-strong) transparent",
                } as React.CSSProperties
              }
            >
              {displayedCandidates.map((c) => {
                const score = getMatchResult(c, filterJdId)?.overall ?? null;
                return (
                  <CandidatePickerCard
                    key={c.id}
                    candidate={c}
                    selected={selectedIds.includes(c.id)}
                    onClick={() => toggleSelect(c.id)}
                    matchScore={score}
                  />
                );
              })}
            </div>
          )}
        </Card>

        {/* ── 对比主体 ── */}
        {selected.length >= 2 ? (
          <div style={{ display: "flex", gap: 16, alignItems: "stretch" }}>
            {/* ── 对比详情 Card (左,主体) ── */}
            <Card style={{ overflow: "hidden", flex: 1, minWidth: 0 }}>
              {/* JD 选择器 + 导出 */}
              {jds.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border)",
                    background: "var(--bg)",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--fg-subtle)",
                      whiteSpace: "nowrap",
                      fontWeight: 500,
                    }}
                  >
                    对照岗位
                  </span>
                  <Select
                    value={filterJdId}
                    onChange={(v) => setFilterJdId(v)}
                    options={jds.map((jd) => ({
                      label: jd.title,
                      value: jd.id,
                    }))}
                    style={{ minWidth: 220 }}
                  />
                  <div style={{ flex: 1 }} />
                  <AntButton
                    size="small"
                    icon={<I.Download size={13} />}
                    onClick={handleExport}
                    title="复制对比报告到剪贴板"
                  >
                    导出报告
                  </AntButton>
                </div>
              )}

              <CompareGrid
                key={animKey}
                selected={selected}
                filterJdId={filterJdId}
                animKey={animKey}
                getMatchResult={getMatchResult}
                bestInDimension={bestInDimension}
                dimensions={dimensions}
                matchingIds={matchingIds}
                onTriggerMatch={triggerMatch}
                currentJd={currentJd}
              />
            </Card>

            {/* ── 雷达图 Card (右,侧栏) ── */}
            {radarHasData && (
              <Card
                style={{
                  width: 420,
                  flexShrink: 0,
                  padding: 0,
                  animation: "sift-fade-in 0.4s ease both",
                }}
                bodyStyle={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Card header */}
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--fg)",
                    }}
                  >
                    维度对比雷达
                  </div>
                  {currentJd && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--fg-subtle)",
                        marginTop: 2,
                      }}
                    >
                      技能 {currentJd.skillWeight}% · 经验{" "}
                      {currentJd.experienceWeight}% · 教育{" "}
                      {currentJd.educationWeight}%
                    </div>
                  )}
                </div>
                {/* SVG (centered, fills available height) */}
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "16px",
                    minHeight: 0,
                  }}
                >
                  <SvgRadarChart
                    selected={selected}
                    filterJdId={filterJdId}
                    getMatchResult={getMatchResult}
                    size={380}
                  />
                </div>
                {/* Legend (bottom) */}
                <div
                  style={{
                    padding: "10px 16px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {selected.map((c, i) => {
                    const r = getMatchResult(c, filterJdId);
                    return (
                      <div
                        key={c.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 3,
                            flexShrink: 0,
                            background:
                              CANDIDATE_COLORS[i % CANDIDATE_COLORS.length],
                          }}
                        />
                        <span
                          style={{
                            fontSize: 12,
                            color: "var(--fg)",
                            fontWeight: 500,
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {c.name ?? "(未提取)"}
                        </span>
                        {r && (
                          <span
                            style={{
                              fontSize: 12,
                              fontFamily: "var(--font-mono)",
                              color: "var(--fg-subtle)",
                              flexShrink: 0,
                            }}
                          >
                            {r.overall} 分
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>
        ) : (
          <div
            style={{
              animation: "sift-fade-in 0.4s ease both",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "60px 24px",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 999,
                background: "var(--bg-sunken)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 8,
              }}
            >
              <I.Compare size={28} style={{ color: "var(--fg-subtle)" }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)" }}>
              选择候选人开始对比
            </div>
            <div style={{ fontSize: 13, color: "var(--fg-subtle)" }}>
              请从上方选择 2–3 位候选人进行并排对比
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
