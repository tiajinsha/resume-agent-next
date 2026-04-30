'use client';
import { useState } from 'react';
import { Form, Input, InputNumber, Select, Button, Space } from 'antd';
import { CheckOutlined, PlusOutlined, LeftOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Card, SkillTag } from './ui';
import PageLayout from './PageLayout';
import type { JobDescription, User } from '@/lib/db/schema';
import { DEGREE_LEVELS } from '@/lib/validation';

type View = 'list' | 'create' | 'edit';

type FormState = {
  title: string;
  description: string;
  requiredSkillsText: string;
  bonusSkillsText: string;
  minYears: number | null;
  requiredDegree: string;
  skillWeight: number;
  experienceWeight: number;
  educationWeight: number;
};

const emptyForm = (): FormState => ({
  title: '', description: '', requiredSkillsText: '',
  bonusSkillsText: '', minYears: null, requiredDegree: '不限',
  skillWeight: 50, experienceWeight: 35, educationWeight: 15,
});

function jdToForm(jd: JobDescription): FormState {
  return {
    title:              jd.title,
    description:        jd.description,
    requiredSkillsText: (jd.requiredSkills ?? []).join(', '),
    bonusSkillsText:    (jd.bonusSkills ?? []).join(', '),
    minYears:           jd.minYears ?? null,
    requiredDegree:     jd.requiredDegree,
    skillWeight:        jd.skillWeight ?? 50,
    experienceWeight:   jd.experienceWeight ?? 35,
    educationWeight:    jd.educationWeight ?? 15,
  };
}

function parseSkills(text: string): string[] {
  return text.split(/[,，\n]/).map(s => s.trim()).filter(Boolean);
}

export default function JdClient({ initial, user, initialDefaultJdId }: { initial: JobDescription[]; user: User; initialDefaultJdId: string | null }) {
  const [view, setView] = useState<View>('list');
  const [editing, setEditing] = useState<JobDescription | null>(null);
  const [items, setItems] = useState<JobDescription[]>(initial);
  const [saving, setSaving] = useState(false);
  const [defaultJdId, setDefaultJdId] = useState<string | null>(initialDefaultJdId);
  const [settingDefault, setSettingDefault] = useState<string | null>(null);
  const [antForm] = Form.useForm<FormState>();

  function startCreate() {
    setEditing(null);
    antForm.setFieldsValue(emptyForm());
    setView('create');
  }

  function startEdit(jd: JobDescription) {
    setEditing(jd);
    antForm.setFieldsValue(jdToForm(jd));
    setView('edit');
  }

  async function save() {
    let values: FormState;
    try {
      values = await antForm.validateFields();
    } catch {
      return;
    }
    const skillW = values.skillWeight ?? 0;
    const expW = values.experienceWeight ?? 0;
    const eduW = values.educationWeight ?? 0;
    if (skillW + expW + eduW !== 100) {
      antForm.setFields([{ name: 'skillWeight', errors: ['权重之和必须为 100'] }]);
      return;
    }
    setSaving(true);
    const body = {
      title:            values.title,
      description:      values.description,
      requiredSkills:   parseSkills(values.requiredSkillsText),
      bonusSkills:      parseSkills(values.bonusSkillsText),
      minYears:         values.minYears ?? null,
      requiredDegree:   values.requiredDegree,
      skillWeight:      skillW,
      experienceWeight: expW,
      educationWeight:  eduW,
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

  return (
    <PageLayout
      user={user}
      activeKey="/jd"
      title="岗位 JD"
      subtitle="管理岗位要求，供 AI 候选人匹配使用"
      headerRight={
        view === 'list'
          ? <Button type="primary" size="small" icon={<PlusOutlined />} onClick={startCreate}>新建 JD</Button>
          : <Button size="small" icon={<LeftOutlined />} onClick={() => setView('list')}>返回列表</Button>
      }
    >
      <div style={{ padding: '24px 28px' }}>
          {view === 'list' && (
            <>
              {items.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center', color: 'var(--fg-subtle)' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                  <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>暂无岗位 JD</div>
                  <div style={{ fontSize: 13, marginBottom: 20 }}>点击「新建 JD」开始配置候选人评分维度</div>
                  <Button type="primary" icon={<PlusOutlined />} onClick={startCreate}>新建 JD</Button>
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
                        <Space>
                          <Button
                            type="text" size="small"
                            icon={<EditOutlined />}
                            onClick={() => startEdit(jd)}
                          />
                          <Button
                            type="text" size="small" danger
                            icon={<DeleteOutlined />}
                            onClick={() => remove(jd)}
                          />
                        </Space>
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
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              <Card style={{ padding: 24 }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>{view === 'create' ? '新建岗位 JD' : '编辑岗位 JD'}</div>

                <Form form={antForm} layout="vertical" requiredMark={false}>
                  <Form.Item label="岗位名称" name="title" rules={[{ required: true, message: '请输入岗位名称' }]}>
                    <Input placeholder="如：高级前端工程师" />
                  </Form.Item>

                  <Form.Item label="职位描述" name="description" rules={[{ required: true, message: '请输入职位描述' }]}>
                    <Input.TextArea placeholder="描述岗位职责、业务背景等…" rows={4} />
                  </Form.Item>

                  <Form.Item label="必备技能（逗号或换行分隔）" name="requiredSkillsText">
                    <Input.TextArea placeholder="React, TypeScript, Node.js" rows={2} />
                  </Form.Item>

                  <Form.Item noStyle shouldUpdate>
                    {({ getFieldValue }) => {
                      const preview = parseSkills(getFieldValue('requiredSkillsText') ?? '');
                      return preview.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: -12, marginBottom: 16 }}>
                          {preview.map(s => <SkillTag key={s} strong>{s}</SkillTag>)}
                        </div>
                      ) : null;
                    }}
                  </Form.Item>

                  <Form.Item label="加分技能（逗号或换行分隔）" name="bonusSkillsText">
                    <Input.TextArea placeholder="GraphQL, Docker, Rust" rows={2} />
                  </Form.Item>

                  <Form.Item noStyle shouldUpdate>
                    {({ getFieldValue }) => {
                      const preview = parseSkills(getFieldValue('bonusSkillsText') ?? '');
                      return preview.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: -12, marginBottom: 16 }}>
                          {preview.map(s => <SkillTag key={s}>{s}</SkillTag>)}
                        </div>
                      ) : null;
                    }}
                  </Form.Item>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <Form.Item label="最低工作年限（年）" name="minYears">
                      <InputNumber min={0} max={50} placeholder="0" style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item label="学历要求" name="requiredDegree">
                      <Select options={DEGREE_LEVELS.map(d => ({ label: d, value: d }))} />
                    </Form.Item>
                  </div>

                  {/* 权重设置 */}
                  <div style={{ padding: 16, background: 'var(--bg-sunken)', borderRadius: 10, marginBottom: 16 }}>
                    <Form.Item noStyle shouldUpdate>
                      {({ getFieldValue }) => {
                        const total = (getFieldValue('skillWeight') ?? 0) + (getFieldValue('experienceWeight') ?? 0) + (getFieldValue('educationWeight') ?? 0);
                        return (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <span style={{ fontSize: 11, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>匹配权重（合计需为 100）</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: total === 100 ? 'var(--success-700, #15803d)' : 'var(--danger-700)' }}>{total}/100</span>
                          </div>
                        );
                      }}
                    </Form.Item>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                      {([
                        { label: '技能匹配', name: 'skillWeight' as const },
                        { label: '经验匹配', name: 'experienceWeight' as const },
                        { label: '教育背景', name: 'educationWeight' as const },
                      ]).map(({ label, name }) => (
                        <Form.Item key={name} label={<span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{label}</span>} name={name}>
                          <InputNumber min={0} max={100} style={{ width: '100%' }} addonAfter="%" />
                        </Form.Item>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <Button onClick={() => setView('list')}>取消</Button>
                    <Button type="primary" icon={<CheckOutlined />} onClick={save} loading={saving}>
                      {saving ? '保存中…' : '保存'}
                    </Button>
                  </div>
                </Form>
              </Card>
            </div>
          )}
      </div>
    </PageLayout>
  );
}
