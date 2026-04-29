'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Sidebar, TopBar, Card, Avatar, SkillTag, ScoreRing } from './ui';
import type { Candidate, JobDescription, MatchResult, User } from '@/lib/db/schema';

type Props = {
  candidates: Candidate[];
  jds: JobDescription[];
  user: User;
};

function MiniScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? 'var(--score-100)' : score >= 65 ? 'var(--score-80)' : score >= 50 ? 'var(--score-60)' : score >= 30 ? 'var(--score-40)' : 'var(--score-0)';
  return (
    <div style={{ height: 3, background: 'var(--bg-sunken)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: score + '%', background: color, borderRadius: 2 }} />
    </div>
  );
}

export default function CompareClient({ candidates, jds, user }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterJdId, setFilterJdId] = useState<string>(jds[0]?.id ?? '');

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return [...prev.slice(1), id];
      return [...prev, id];
    });
  }

  const selected = selectedIds
    .map(id => candidates.find(c => c.id === id))
    .filter(Boolean) as Candidate[];

  function getMatchResult(c: Candidate, jdId: string): MatchResult | null {
    return (c.matchResults ?? []).find(r => r.jdId === jdId) ?? null;
  }

  const dimensions: { key: keyof MatchResult; label: string }[] = [
    { key: 'skill',      label: '技能' },
    { key: 'experience', label: '经验' },
    { key: 'education',  label: '教育' },
  ];

  function bestInDimension(key: 'skill' | 'experience' | 'education'): number {
    return Math.max(0, ...selected.map(c => {
      const r = getMatchResult(c, filterJdId);
      return r ? (r[key] as { score: number }).score : 0;
    }));
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 44px)', background: 'var(--bg-sunken)' }}>
      <Sidebar active="compare" user={user} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar title="对比分析" subtitle="选择 2–3 位候选人进行并排对比" />

        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* 候选人选择区 */}
          <Card style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginBottom: 12, fontWeight: 500 }}>
              选择候选人（最多 3 位，已选 {selectedIds.length} 位）
            </div>
            {candidates.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--fg-subtle)', textAlign: 'center', padding: 20 }}>
                暂无已解析的候选人。前往<Link href="/upload" style={{ color: 'var(--accent)', textDecoration: 'none', margin: '0 4px' }}>上传</Link>开始。
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {candidates.map(c => {
                  const sel = selectedIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleSelect(c.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                        border: '1px solid ' + (sel ? 'var(--accent-300)' : 'var(--border)'),
                        background: sel ? 'var(--accent-bg-subtle)' : 'var(--bg-elevated)',
                        color: sel ? 'var(--accent-700)' : 'var(--fg)',
                      }}
                    >
                      <Avatar name={c.name ?? '?'} size={24} />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{c.name ?? '(未提取)'}</div>
                        <div style={{ fontSize: 11, color: sel ? 'var(--accent-600)' : 'var(--fg-subtle)' }}>{c.role ?? '—'}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {/* 对比面板 */}
          {selected.length >= 2 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* JD 选择器 */}
              {jds.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, color: 'var(--fg-subtle)', whiteSpace: 'nowrap' }}>对照岗位</span>
                  <select
                    value={filterJdId}
                    onChange={e => setFilterJdId(e.target.value)}
                    style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg)', outline: 'none', cursor: 'pointer' }}
                  >
                    {jds.map(jd => <option key={jd.id} value={jd.id}>{jd.title}</option>)}
                  </select>
                </div>
              )}

              {/* 对比列 */}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${selected.length}, 1fr)`, gap: 14 }}>
                {selected.map(c => {
                  const result = getMatchResult(c, filterJdId);
                  const dimBests = {
                    skill:      bestInDimension('skill'),
                    experience: bestInDimension('experience'),
                    education:  bestInDimension('education'),
                  };

                  return (
                    <Card key={c.id} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {/* 头像 + 基本信息 */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
                        <Avatar name={c.name ?? '?'} size={52} />
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>{c.name ?? '(未提取)'}</div>
                          <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginTop: 2 }}>{c.role ?? '—'}</div>
                          {c.school && <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 1 }}>{c.school}</div>}
                        </div>
                      </div>

                      <div style={{ height: 1, background: 'var(--border)' }} />

                      {/* 技能 */}
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>技能</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {(c.skills ?? []).slice(0, 6).map(s => <SkillTag key={s}>{s}</SkillTag>)}
                          {(c.skills?.length ?? 0) > 6 && <span style={{ fontSize: 11, color: 'var(--fg-subtle)', alignSelf: 'center' }}>+{(c.skills?.length ?? 0) - 6}</span>}
                        </div>
                      </div>

                      <div style={{ height: 1, background: 'var(--border)' }} />

                      {/* JD 匹配分数 */}
                      {jds.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>JD 匹配</div>
                          {result ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                              <ScoreRing score={result.overall} size={80} label="综合" />
                              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {dimensions.map(({ key, label }) => {
                                  const dim = result[key] as { score: number; comment: string };
                                  const isBest = dim.score === dimBests[key as 'skill' | 'experience' | 'education'] && dimBests[key as 'skill' | 'experience' | 'education'] > 0;
                                  return (
                                    <div key={key}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-muted)', marginBottom: 3 }}>
                                        <span>{label}</span>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: isBest ? 700 : 400, color: isBest ? 'var(--accent-700)' : 'var(--fg-muted)' }}>{dim.score}</span>
                                      </div>
                                      <MiniScoreBar score={dim.score} />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: 'var(--fg-subtle)', textAlign: 'center' }}>
                              <Link href={`/candidates/${c.id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>前往详情开始匹配</Link>
                            </div>
                          )}
                        </div>
                      )}

                      <div style={{ height: 1, background: 'var(--border)' }} />

                      {/* 元信息 */}
                      <div style={{ fontSize: 11, color: 'var(--fg-subtle)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {c.degree && <span>{c.degree}{c.major ? ` · ${c.major}` : ''}</span>}
                        {c.years != null && <span>{c.years} 年工作经验</span>}
                        {c.city && <span>{c.city}</span>}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : (
            <Card style={{ padding: 40, textAlign: 'center', color: 'var(--fg-subtle)' }}>
              <div style={{ fontSize: 14 }}>请从上方选择 2–3 位候选人进行并排对比</div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
