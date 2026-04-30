'use client';
import { useState } from 'react';
import { Form, Input, InputNumber, Select, Button, Space, Divider, Tag, Tooltip } from 'antd';
import { CheckOutlined, PlusOutlined, LeftOutlined, EditOutlined, DeleteOutlined, StarFilled, StarOutlined, ClockCircleOutlined, ReadOutlined, BarChartOutlined } from '@ant-design/icons';
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
      <div style={{ padding: '28px 32px' }}>
          {view === 'list' && (
            <>
              {items.length === 0 ? (
                <div style={{ padding: 80, textAlign: 'center', color: 'var(--fg-subtle)' }}>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--fg)' }}>暂无岗位 JD</div>
                  <div style={{ fontSize: 13, marginBottom: 24, color: 'var(--fg-subtle)' }}>点击「新建 JD」开始配置候选人评分维度</div>
                  <Button type="primary" icon={<PlusOutlined />} onClick={startCreate}>新建 JD</Button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 20 }}>
                  {items.map(jd => (
                    <Card key={jd.id} style={{ display: 'flex', flexDirection: 'column' }}>
                      {/* Header: title + actions */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 20px 16px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>{jd.title}</span>
                            {defaultJdId === jd.id && (
                              <Tag color="blue" style={{ fontSize: 11, lineHeight: '18px', padding: '0 6px', borderRadius: 4 }}>默认</Tag>
                            )}
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {jd.description || <span style={{ color: 'var(--fg-subtle)', fontStyle: 'italic' }}>暂无描述</span>}
                          </div>
                        </div>
                        <Space size={4}>
                          <Tooltip title="编辑">
                            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => startEdit(jd)} />
                          </Tooltip>
                          <Tooltip title="删除">
                            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => remove(jd)} />
                          </Tooltip>
                        </Space>
                      </div>

                      {/* Skills */}
                      {(jd.requiredSkills ?? []).length > 0 && (
                        <div style={{ padding: '0 20px 16px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {(jd.requiredSkills ?? []).slice(0, 6).map(s => (
                            <SkillTag key={s} strong>{s}</SkillTag>
                          ))}
                          {(jd.requiredSkills ?? []).length > 6 && (
                            <span style={{ fontSize: 12, color: 'var(--fg-subtle)', alignSelf: 'center' }}>
                              +{(jd.requiredSkills ?? []).length - 6} 项
                            </span>
                          )}
                        </div>
                      )}

                      <Divider style={{ margin: 0 }} />

                      {/* Meta info */}
                      <div style={{ padding: '12px 20px', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                        {jd.minYears != null && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-muted)' }}>
                            <ClockCircleOutlined style={{ fontSize: 12 }} />
                            {jd.minYears} 年以上
                          </span>
                        )}
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-muted)' }}>
                          <ReadOutlined style={{ fontSize: 12 }} />
                          {jd.requiredDegree}
                        </span>
                        <Tooltip title={`技能 ${jd.skillWeight ?? 50}% · 经验 ${jd.experienceWeight ?? 35}% · 学历 ${jd.educationWeight ?? 15}%`}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-muted)', cursor: 'default' }}>
                            <BarChartOutlined style={{ fontSize: 12 }} />
                            权重 {jd.skillWeight ?? 50}/{jd.experienceWeight ?? 35}/{jd.educationWeight ?? 15}
                          </span>
                        </Tooltip>
                        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--fg-subtle)' }}>
                          {new Date(jd.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>

                      <Divider style={{ margin: 0 }} />

                      {/* Default toggle */}
                      <div style={{ padding: '12px 20px' }}>
                        <Button
                          block
                          size="small"
                          type={defaultJdId === jd.id ? 'primary' : 'default'}
                          ghost={defaultJdId === jd.id}
                          icon={defaultJdId === jd.id ? <StarFilled /> : <StarOutlined />}
                          loading={settingDefault === jd.id}
                          onClick={() => toggleDefault(jd)}
                          style={{ fontSize: 12 }}
                        >
                          {defaultJdId === jd.id ? '已设为默认（上传自动匹配）' : '设为默认 JD'}
                        </Button>
                      </div>
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

                <Form form={antForm} layout="vertical" requiredMark={false} initialValues={emptyForm()}>
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
                          <InputNumber
                            min={0} max={100}
                            style={{ width: '100%' }}
                            formatter={v => `${v}%`}
                            parser={v => Number(v?.replace('%', '')) as unknown as 0}
                          />
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
