'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Input, Button, Tabs, Alert } from 'antd';
import { SiftLogo } from '@/components/ui';

type Mode = 'login' | 'register';

export default function LoginClient({ initialMode, isDev }: { initialMode: Mode; isDev?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm();

  async function submit(values: { username: string; password: string; displayName?: string }) {
    setLoading(true);
    setError(null);
    try {
      const url = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body: Record<string, string> = { username: values.username, password: values.password };
      if (mode === 'register' && values.displayName) body.displayName = values.displayName;

      const r = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await r.json();

      if (!r.ok) {
        const msg: Record<string, string> = {
          invalid_credentials: '用户名或密码错误',
          username_taken:      '用户名已被占用',
          registration_closed: '当前不开放注册，请联系管理员',
          validation:          '输入格式有误，请检查',
        };
        setError(msg[data.error] ?? '操作失败，请重试');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo() {
    form.setFieldsValue({ username: 'demo', password: 'demo123' });
  }

  const tabItems = [
    { key: 'login', label: '登录' },
    { key: 'register', label: '注册' },
  ];

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-sunken)',
    }}>
      <div style={{
        width: 380, background: 'var(--bg)', borderRadius: 16,
        border: '1px solid var(--border)', padding: '36px 32px',
        boxShadow: 'var(--shadow-2)',
        display: 'flex', flexDirection: 'column', gap: 24,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <SiftLogo size={32} />
          <div style={{ fontSize: 13, color: 'var(--fg-subtle)', marginTop: 4 }}>
            {mode === 'login' ? '登录以继续' : '创建账号'}
          </div>
        </div>

        <Tabs
          centered
          items={tabItems}
          activeKey={mode}
          onChange={(k) => { setMode(k as Mode); setError(null); form.resetFields(); }}
        />

        {isDev && mode === 'login' && (
          <button
            type="button"
            onClick={fillDemo}
            style={{
              width: '100%', padding: '8px', borderRadius: 8,
              border: '1px dashed var(--accent-300)',
              background: 'var(--accent-bg-subtle)', color: 'var(--accent-700)',
              fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <span style={{ opacity: 0.6 }}>DEV</span>
            填入演示账号 demo / demo123
          </button>
        )}

        <Form form={form} layout="vertical" onFinish={submit} requiredMark={false}>
          {mode === 'register' && (
            <Form.Item label="显示名称（选填）" name="displayName">
              <Input placeholder="如：张三" autoComplete="name" />
            </Form.Item>
          )}
          <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="username" autoComplete="username" />
          </Form.Item>
          <Form.Item
            label={`密码${mode === 'register' ? '（至少 6 位）' : ''}`}
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </Form.Item>

          {error && (
            <Form.Item>
              <Alert type="error" message={error} showIcon />
            </Form.Item>
          )}

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              {loading ? '处理中…' : mode === 'login' ? '登录' : '创建账号并登录'}
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
