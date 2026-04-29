'use client';
import { useState } from 'react';
import { Sidebar, TopBar, Btn, Card, Input, SkillTag } from './ui';
import { I } from './icons';
import type { JobDescription, User } from '@/lib/db/schema';
import { DEGREE_LEVELS } from '@/lib/validation';

type View = 'list' | 'create' | 'edit';

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: 'var(--fg-subtle)', textTransform: 'uppercase',
  letterSpacing: '0.04em', fontWeight: 500, marginBottom: 6,
};

const textareaStyle: React.CSSProperties = {
  width: '100%', minHeight: 100, padding: '9px 12px',
  borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--bg-elevated)', fontFamily: 'var(--font-sans)',
  fontSize: 13, color: 'var(--fg)', lineHeight: 1.55,
  resize: 'vertical', outline: 'none', boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg-elevated)',
  fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg)',
  outline: 'none', cursor: 'pointer',
};

type FormState = {
  title: string;
  description: string;
  requiredSkillsText: string;
  bonusSkillsText: string;
  minYears: string;
  requiredDegree: string;
  skillWeight: string;
  experienceWeight: string;
  educationWeight: string;
};

const emptyForm = (): FormState => ({
  title: '', description: '', requiredSkillsText: '',
  bonusSkillsText: '', minYears: '', requiredDegree: '不限',
  skillWeight: '50', experienceWeight: '35', educationWeight: '15',
});

function jdToForm(jd: JobDescription): FormState {
  return {
    title:              jd.title,
    description:        jd.description,
    requiredSkillsText: (jd.requiredSkills ?? []).join(', '),
    bonusSkillsText:    (jd.bonusSkills ?? []).join(', '),
    minYears:           jd.minYears != null ? String(jd.minYears) : '',
    requiredDegree:     jd.requiredDegree,
    skillWeight:        String(jd.skillWeight ?? 50),
    experienceWeight:   String(jd.experienceWeight ?? 35),
    educationWeight:    String(jd.educationWeight ?? 15),
  };
}

function parseSkills(text: string): string[] {
  return text.split(/[,，\n]/).map(s => s.trim()).filter(Boolean);
}

export default function JdClient({ initial, user, initialDefaultJdId }: { initial: JobDescription[]; user: User; initialDefaultJdId: string | null }) {
  const [view, setView] = useState<View>('list');
  const [editing, setEditing] = useState<JobDescription | null>(null);
  const [items, setItems] = useState<JobDescription[]>(initial);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [defaultJdId, setDefaultJdId] = useState<string | null>(initialDefaultJdId);
  const [settingDefault, setSettingDefault] = useState<string | null>(null);

  function startCreate() {
    setEditing(null);
    setForm(emptyForm());
    setView('create');
  }

  function startEdit(jd: JobDescription) {
    setEditing(jd);
    setForm(jdToForm(jd));
    setView('edit');
  }

  function setF(k: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value }));
  }

  const weightSum = Number(form.skillWeight || 0) + Number(form.experienceWeight || 0) + Number(form.educationWeight || 0);

  async function save() {
    setSaving(true);
    const body = {
      title:            form.title,
      description:      form.description,
      requiredSkills:   parseSkills(form.requiredSkillsText),
      bonusSkills:      parseSkills(form.bonusSkillsText),
      minYears:         form.minYears ? Number(form.minYears) : null,
      requiredDegree:   form.requiredDegree,
      skillWeight:      Number(form.skillWeight || 0),
      experienceWeight: Number(form.experienceWeight || 0),
      educationWeight:  Number(form.educationWeight || 0),
    };
    try {
      if (editing) {
        const r = await fetch(`/api/jd/${editing.id}`, {
          method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
        });
        if (r.ok) {
          const updated = await r.json();
          setItems(prev => prev.map(i => i.id === editing.id ? updated : i));
          setView('list');
        }
      } else {
        const r = await fetch('/api/jd', {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
        });
        if (r.ok) {
          const created = await r.json();
          setItems(prev => [created, ...prev]);
          setView('list');
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove(jd: JobDescription) {
    if (!confirm(`确认删除岗位「${jd.title}」？`)) return;
    const r = await fetch(`/api/jd/${jd.id}`, { method: 'DELETE' });
    if (r.ok) {
      setItems(prev => prev.filter(i => i.id !== jd.id));
      if (defaultJdId === jd.id) setDefaultJdId(null);
    }
  }

  async function toggleDefault(jd: JobDescription) {
    const next = defaultJdId === jd.id ? null : jd.id;
    setSettingDefault(jd.id);
    try {
      const r = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ defaultJdId: next }),
      });
      if (r.ok) setDefaultJdId(next);
    } finally {
      setSettingDefault(null);
    }
  }

  const requiredSkillsPreview = parseSkills(form.requiredSkillsText);
  const bonusSkillsPreview    = parseSkills(form.bonusSkillsText);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 44px)', background: 'var(--bg-sunken)' }}>
      <Sidebar active="jd" user={user} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar
          title="岗位 JD"
          subtitle="管理岗位要求，供 AI 候选人匹配使用"
          right={
            view === 'list'
              ? <Btn variant="primary" size="sm" icon={<I.Plus />} onClick={startCreate}>新建 JD</Btn>
              : <Btn size="sm" variant="ghost" icon={<I.ChevL />} onClick={() => setView('list')}>返回列表</Btn>
          }
        />

        <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
          {view === 'list' && (
            <>
              {items.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center', color: 'var(--fg-subtle)' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                  <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>暂无岗位 JD</div>
                  <div style={{ fontSize: 13, marginBottom: 20 }}>点击「新建 JD」开始配置候选人评分维度</div>
                  <Btn variant="primary" icon={<I.Plus />} onClick={startCreate}>新建 JD</Btn>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                  {items.map(jd => (
                    <Card key={jd.id} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>{jd.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {jd.description}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button type="button" onClick={() => startEdit(jd)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-subtle)', cursor: 'pointer' }}>
                            <I.Edit size={14} />
                          </button>
                          <button type="button" onClick={() => remove(jd)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--danger-700)', cursor: 'pointer' }}>
                            <I.Trash size={14} />
                          </button>
                        </div>
                      </div>

                      {(jd.requiredSkills ?? []).length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {(jd.requiredSkills ?? []).slice(0, 5).map(s => (
                            <SkillTag key={s} strong>{s}</SkillTag>
                          ))}
                          {(jd.requiredSkills ?? []).length > 5 && (
                            <span style={{ fontSize: 11, color: 'var(--fg-subtle)', alignSelf: 'center' }}>+{(jd.requiredSkills ?? []).length - 5}</span>
                          )}
                        </div>
                      )}

                      <div style={{ fontSize: 11, color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {jd.minYears != null && <span>{jd.minYears} 年以上</span>}
                        <span>{jd.requiredDegree}</span>
                        <span style={{ color: 'var(--fg-subtle)' }}>技{jd.skillWeight ?? 50}·验{jd.experienceWeight ?? 35}·学{jd.educationWeight ?? 15}</span>
                        <span style={{ marginLeft: 'auto' }}>{new Date(jd.createdAt).toLocaleDateString('zh-CN')}</span>
                      </div>

                      <button
                        type="button"
                        disabled={settingDefault === jd.id}
                        onClick={() => toggleDefault(jd)}
                        style={{
                          width: '100%', padding: '6px 0', borderRadius: 7, cursor: 'pointer',
                          border: '1px solid ' + (defaultJdId === jd.id ? 'var(--accent-300)' : 'var(--border)'),
                          background: defaultJdId === jd.id ? 'var(--accent-bg-subtle)' : 'transparent',
                          color: defaultJdId === jd.id ? 'var(--accent-700)' : 'var(--fg-subtle)',
                          fontSize: 12, fontFamily: 'var(--font-sans)', fontWeight: defaultJdId === jd.id ? 600 : 400,
                          transition: 'all var(--dur-fast)',
                        }}
                      >
                        {defaultJdId === jd.id ? '✓ 已设为默认（上传自动匹配）' : '设为默认 JD'}
                      </button>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {(view === 'create' || view === 'edit') && (
            <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Card style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{view === 'create' ? '新建岗位 JD' : '编辑岗位 JD'}</div>

                <div>
                  <div style={labelStyle}>岗位名称 *</div>
                  <Input placeholder="如：高级前端工程师" value={form.title} onChange={setF('title') as any} />
                </div>

                <div>
                  <div style={labelStyle}>职位描述 *</div>
                  <textarea style={textareaStyle} placeholder="描述岗位职责、业务背景等…" value={form.description} onChange={setF('description')}
                    onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = 'var(--shadow-focus)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }} />
                </div>

                <div>
                  <div style={labelStyle}>必备技能（逗号或换行分隔）</div>
                  <textarea style={{ ...textareaStyle, minHeight: 60 }} placeholder="React, TypeScript, Node.js" value={form.requiredSkillsText} onChange={setF('requiredSkillsText')}
                    onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = 'var(--shadow-focus)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }} />
                  {requiredSkillsPreview.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                      {requiredSkillsPreview.map(s => <SkillTag key={s} strong>{s}</SkillTag>)}
                    </div>
                  )}
                </div>

                <div>
                  <div style={labelStyle}>加分技能（逗号或换行分隔）</div>
                  <textarea style={{ ...textareaStyle, minHeight: 60 }} placeholder="GraphQL, Docker, Rust" value={form.bonusSkillsText} onChange={setF('bonusSkillsText')}
                    onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = 'var(--shadow-focus)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }} />
                  {bonusSkillsPreview.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                      {bonusSkillsPreview.map(s => <SkillTag key={s}>{s}</SkillTag>)}
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <div style={labelStyle}>最低工作年限（年）</div>
                    <Input type="number" placeholder="0" value={form.minYears} onChange={setF('minYears') as any} />
                  </div>
                  <div>
                    <div style={labelStyle}>学历要求</div>
                    <select style={selectStyle} value={form.requiredDegree} onChange={setF('requiredDegree')}>
                      {DEGREE_LEVELS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                {/* 权重设置 */}
                <div style={{ padding: '16px', background: 'var(--bg-sunken)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={labelStyle}>匹配权重（合计需为 100）</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: weightSum === 100 ? 'var(--success-700, #15803d)' : 'var(--danger-700)' }}>
                      {weightSum}/100
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    {([
                      { label: '技能匹配', key: 'skillWeight' as const },
                      { label: '经验匹配', key: 'experienceWeight' as const },
                      { label: '教育背景', key: 'educationWeight' as const },
                    ] as const).map(({ label, key }) => (
                      <div key={key}>
                        <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 4 }}>{label}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input
                            type="number" min={0} max={100} value={form[key]}
                            onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                            style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-elevated)', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg)', outline: 'none', boxSizing: 'border-box' }}
                          />
                          <span style={{ fontSize: 12, color: 'var(--fg-subtle)', flexShrink: 0 }}>%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {weightSum !== 100 && (
                    <div style={{ fontSize: 11, color: 'var(--danger-700)' }}>权重之和必须为 100，当前为 {weightSum}</div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)' }}>
                    综合分 = 技能×{form.skillWeight || 0}% + 经验×{form.experienceWeight || 0}% + 学历×{form.educationWeight || 0}%
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <Btn onClick={() => setView('list')}>取消</Btn>
                  <Btn variant="primary" icon={<I.Check />} onClick={save} disabled={saving || !form.title || !form.description || weightSum !== 100}>
                    {saving ? '保存中…' : '保存'}
                  </Btn>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
