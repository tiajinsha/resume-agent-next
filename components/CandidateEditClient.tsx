'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Input, InputNumber, Button, Row, Col, Space } from 'antd';
import { CheckOutlined, LeftOutlined } from '@ant-design/icons';
import { Card, Avatar } from './ui';
import PageLayout from './PageLayout';
import type { Candidate, User } from '@/lib/db/schema';

type FormValues = {
  name: string;
  email: string;
  phone: string;
  city: string;
  age: number | null;
  targetRole: string;
  role: string;
  company: string;
  years: number | null;
  school: string;
  major: string;
  degree: string;
  gradDate: string;
  skills: string;
  summary: string;
};

export default function CandidateEditClient({ initial, user }: { initial: Candidate; user: User }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<FormValues>();
  const nameValue = Form.useWatch('name', form);

  async function save() {
    let values: FormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    const body = {
      name:       values.name     || null,
      email:      values.email    || null,
      phone:      values.phone    || null,
      city:       values.city     || null,
      age:        values.age ?? null,
      targetRole: values.targetRole || null,
      role:       values.role     || null,
      company:    values.company  || null,
      years:      values.years ?? null,
      school:     values.school   || null,
      major:      values.major    || null,
      degree:     values.degree   || null,
      gradDate:   values.gradDate || null,
      skills:     values.skills.split(',').map((s) => s.trim()).filter(Boolean),
      summary:    values.summary,
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

  const initialValues: FormValues = {
    name:       initial.name ?? '',
    email:      initial.email ?? '',
    phone:      initial.phone ?? '',
    city:       initial.city ?? '',
    age:        initial.age ?? null,
    targetRole: initial.targetRole ?? '',
    role:       initial.role ?? '',
    company:    initial.company ?? '',
    years:      initial.years ?? null,
    school:     initial.school ?? '',
    major:      initial.major ?? '',
    degree:     initial.degree ?? '',
    gradDate:   initial.gradDate ?? '',
    skills:     (initial.skills ?? []).join(', '),
    summary:    initial.summary ?? '',
  };

  return (
    <PageLayout
      user={user}
      activeKey="/dashboard"
      title={nameValue || '(未命名)'}
      headerRight={
        <Space>
          <Button size="small" icon={<LeftOutlined />} onClick={() => router.push(`/candidates/${initial.id}`)}>返回详情</Button>
          <Button size="small" onClick={() => router.push(`/candidates/${initial.id}`)}>取消</Button>
          <Button size="small" type="primary" icon={<CheckOutlined />} onClick={save} loading={saving}>{saving ? '保存中…' : '保存'}</Button>
        </Space>
      }
    >
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 900, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar name={nameValue || '?'} size={48} />
          <div style={{ fontSize: 18, fontWeight: 600 }}>{nameValue || '(未命名)'}</div>
        </div>

        <Form form={form} initialValues={initialValues} layout="vertical" requiredMark={false}>
          <Card style={{ padding: 20, marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>基本信息</div>
            <Row gutter={14}>
              <Col span={12}><Form.Item label="姓名" name="name"><Input /></Form.Item></Col>
              <Col span={12}><Form.Item label="邮箱" name="email"><Input /></Form.Item></Col>
              <Col span={12}><Form.Item label="电话" name="phone"><Input /></Form.Item></Col>
              <Col span={12}><Form.Item label="城市" name="city"><Input /></Form.Item></Col>
              <Col span={12}><Form.Item label="年龄" name="age"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={12}><Form.Item label="求职意向" name="targetRole"><Input /></Form.Item></Col>
            </Row>
          </Card>

          <Card style={{ padding: 20, marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>工作</div>
            <Row gutter={14}>
              <Col span={10}><Form.Item label="公司" name="company"><Input /></Form.Item></Col>
              <Col span={10}><Form.Item label="岗位" name="role"><Input /></Form.Item></Col>
              <Col span={4}><Form.Item label="总年限" name="years"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
            </Row>
          </Card>

          <Card style={{ padding: 20, marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>教育</div>
            <Row gutter={14}>
              <Col span={6}><Form.Item label="学校" name="school"><Input /></Form.Item></Col>
              <Col span={6}><Form.Item label="专业" name="major"><Input /></Form.Item></Col>
              <Col span={6}><Form.Item label="学历" name="degree"><Input /></Form.Item></Col>
              <Col span={6}><Form.Item label="毕业时间" name="gradDate"><Input placeholder="如 2019.07" /></Form.Item></Col>
            </Row>
          </Card>

          <Card style={{ padding: 20, marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>技能（英文逗号分隔）</div>
            <Form.Item name="skills" noStyle>
              <Input />
            </Form.Item>
          </Card>

          <Card style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>AI 评语</div>
            <Form.Item name="summary" noStyle>
              <Input.TextArea rows={4} />
            </Form.Item>
          </Card>
        </Form>
      </div>
    </PageLayout>
  );
}
