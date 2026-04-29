'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar, Btn, Input, Card, Avatar } from './ui';
import { I } from './icons';
import type { Candidate, User } from '@/lib/db/schema';

export default function CandidateEditClient({ initial, user }: { initial: Candidate; user: User }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name:       initial.name ?? '',
    email:      initial.email ?? '',
    phone:      initial.phone ?? '',
    city:       initial.city ?? '',
    age:        initial.age ?? '',
    targetRole: initial.targetRole ?? '',
    role:       initial.role ?? '',
    company:    initial.company ?? '',
    years:      initial.years ?? 0,
    school:     initial.school ?? '',
    major:      initial.major ?? '',
    degree:     initial.degree ?? '',
    gradDate:   initial.gradDate ?? '',
    skills:     (initial.skills ?? []).join(', '),
    summary:    initial.summary ?? '',
  });
  const [saving, setSaving] = useState(false);

  const setField = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function save() {
    setSaving(true);
    const body = {
      name:       form.name    || null,
      email:      form.email   || null,
      phone:      form.phone   || null,
      city:       form.city    || null,
      age:        form.age === '' ? null : Number(form.age),
      targetRole: form.targetRole || null,
      role:       form.role    || null,
      company:    form.company || null,
      years:      Number(form.years) || null,
      school:     form.school  || null,
      major:      form.major   || null,
      degree:     form.degree  || null,
      gradDate:   form.gradDate || null,
      skills:     form.skills.split(',').map((s) => s.trim()).filter(Boolean),
      summary:    form.summary,
    };
    const r = await fetch(`/api/candidates/${initial.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (r.ok) router.push(`/candidates/${initial.id}`);
    else alert(`保存失败 (HTTP ${r.status})`);
  }

  const labelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500, marginBottom: 6 };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 44px)', background: 'var(--bg-sunken)' }}>
      <Sidebar active="dashboard" user={user} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ height: 56, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12, background: 'var(--bg)' }}>
          <Btn size="sm" icon={<I.ChevL />} variant="ghost" onClick={() => router.push(`/candidates/${initial.id}`)}>返回详情</Btn>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <Btn size="sm" onClick={() => router.push(`/candidates/${initial.id}`)}>取消</Btn>
            <Btn size="sm" variant="primary" icon={<I.Check />} onClick={save} disabled={saving}>{saving ? '保存中…' : '保存'}</Btn>
          </div>
        </div>

        <div style={{ padding: 24, flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 900, margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar name={form.name || '?'} size={48} />
            <div style={{ fontSize: 18, fontWeight: 600 }}>{form.name || '(未命名)'}</div>
          </div>

          <Card style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>基本信息</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div><div style={labelStyle}>姓名</div><Input value={form.name} onChange={setField('name') as any} /></div>
              <div><div style={labelStyle}>邮箱</div><Input value={form.email} onChange={setField('email') as any} /></div>
              <div><div style={labelStyle}>电话</div><Input value={form.phone} onChange={setField('phone') as any} /></div>
              <div><div style={labelStyle}>城市</div><Input value={form.city} onChange={setField('city') as any} /></div>
              <div><div style={labelStyle}>年龄</div><Input type="number" value={form.age} onChange={setField('age') as any} /></div>
              <div><div style={labelStyle}>求职意向</div><Input value={form.targetRole} onChange={setField('targetRole') as any} /></div>
            </div>
          </Card>

          <Card style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>工作</div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: 14 }}>
              <div><div style={labelStyle}>公司</div><Input value={form.company} onChange={setField('company') as any} /></div>
              <div><div style={labelStyle}>岗位</div><Input value={form.role} onChange={setField('role') as any} /></div>
              <div><div style={labelStyle}>总年限</div><Input type="number" value={form.years} onChange={setField('years') as any} /></div>
            </div>
          </Card>

          <Card style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>教育</div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', gap: 14 }}>
              <div><div style={labelStyle}>学校</div><Input value={form.school} onChange={setField('school') as any} /></div>
              <div><div style={labelStyle}>专业</div><Input value={form.major} onChange={setField('major') as any} /></div>
              <div><div style={labelStyle}>学历</div><Input value={form.degree} onChange={setField('degree') as any} /></div>
              <div><div style={labelStyle}>毕业时间</div><Input placeholder="如 2019.07" value={form.gradDate} onChange={setField('gradDate') as any} /></div>
            </div>
          </Card>

          <Card style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>技能(英文逗号分隔)</div>
            <Input value={form.skills} onChange={setField('skills') as any} />
          </Card>

          <Card style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>AI 评语</div>
            <textarea value={form.summary} onChange={setField('summary')} style={{
              minHeight: 80, padding: 12, borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--bg-elevated)', fontFamily: 'var(--font-sans)', fontSize: 13,
              color: 'var(--fg)', lineHeight: 1.55, resize: 'vertical', outline: 'none',
            }} />
          </Card>
        </div>
      </div>
    </div>
  );
}
