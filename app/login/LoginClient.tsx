'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SiftLogo } from '@/components/ui';

type Mode = 'login' | 'register';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--bg-elevated)', fontFamily: 'var(--font-sans)',
  fontSize: 14, color: 'var(--fg)', outline: 'none', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 500, color: 'var(--fg-muted)', marginBottom: 5, display: 'block',
};

export default function LoginClient({ initialMode, isDev }: { initialMode: Mode; isDev?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const url = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body: Record<string, string> = { username, password };
      if (mode === 'register' && displayName) body.displayName = displayName;

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

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-sunken)',
    }}>
      <div style={{
        width: 380, background: 'var(--bg)', borderRadius: 16,
        border: '1px solid var(--border)', padding: '36px 32px',
        boxShadow: 'var(--shadow-card)',
        display: 'flex', flexDirection: 'column', gap: 24,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <SiftLogo size={32} />
          <div style={{ fontSize: 13, color: 'var(--fg-subtle)', marginTop: 4 }}>
            {mode === 'login' ? '登录以继续' : '创建管理员账号'}
          </div>
        </div>

        {isDev && mode === 'login' && (
          <button
            type="button"
            onClick={() => { setUsername('demo'); setPassword('demo123'); }}
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

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'register' && (
            <div>
              <label style={labelStyle}>显示名称（选填）</label>
              <input
                style={inputStyle} type="text" placeholder="如：张三" value={displayName}
                onChange={e => setDisplayName(e.target.value)} autoComplete="name"
                onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = 'var(--shadow-focus)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          )}
          <div>
            <label style={labelStyle}>用户名</label>
            <input
              style={inputStyle} type="text" placeholder="username" value={username}
              onChange={e => setUsername(e.target.value)} required autoComplete="username"
              onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = 'var(--shadow-focus)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
          <div>
            <label style={labelStyle}>密码{mode === 'register' ? '（至少 6 位）' : ''}</label>
            <input
              style={inputStyle} type="password" placeholder="••••••" value={password}
              onChange={e => setPassword(e.target.value)} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = 'var(--shadow-focus)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {error && (
            <div style={{ fontSize: 12, color: 'var(--danger-700)', background: 'var(--danger-50, #fef2f2)', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--danger-200, #fecaca)' }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', padding: '10px', borderRadius: 8, border: 'none',
              background: loading ? 'var(--accent-300)' : 'var(--accent)',
              color: 'var(--accent-fg)', fontFamily: 'var(--font-sans)',
              fontSize: 14, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
              transition: 'background var(--dur-fast)',
            }}
          >
            {loading ? '处理中…' : mode === 'login' ? '登录' : '创建账号并登录'}
          </button>
        </form>
      </div>
    </div>
  );
}
