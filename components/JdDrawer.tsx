'use client';
import { useEffect } from 'react';
import { Btn } from './ui';
import { I } from './icons';
import JdMatchPanel from './JdMatchPanel';
import type { MatchResult } from '@/lib/db/schema';

type Props = {
  open: boolean;
  onClose: () => void;
  candidateId: string;
  extractionStatus: string;
  initialMatchResults: MatchResult[];
  autoMatchFailed?: boolean;
  onMatchComplete?: () => void;
};

export default function JdDrawer({ open, onClose, candidateId, extractionStatus, initialMatchResults, autoMatchFailed, onMatchComplete }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div style={{
      position: 'fixed',
      right: 0,
      top: 44,
      bottom: 0,
      width: 380,
      zIndex: 30,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
      borderLeft: '1px solid var(--border)',
      boxShadow: open ? '-4px 0 24px rgba(0,0,0,0.08)' : 'none',
      transform: open ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 260ms var(--ease-sift)',
      pointerEvents: open ? 'auto' : 'none',
    }}>
      <div style={{
        height: 48,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        gap: 8,
      }}>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>JD 匹配</span>
        <Btn size="sm" variant="ghost" icon={<I.X />} onClick={onClose} />
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <JdMatchPanel
          candidateId={candidateId}
          extractionStatus={extractionStatus}
          initialMatchResults={initialMatchResults}
          autoMatchFailed={autoMatchFailed}
          onMatchComplete={onMatchComplete}
        />
      </div>
    </div>
  );
}
